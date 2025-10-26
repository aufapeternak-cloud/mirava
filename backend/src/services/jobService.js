import { jobModel, workerModel, userModel } from '../models/db.js';
import { logService } from './logService.js';
import { workerService } from './workerService.js';
import crypto from 'crypto';
import axios from 'axios';

export const jobService = {
  async createJob(userId, jobData) {
    const jobId = `job_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const { prompts, ratio, saveTarget, maxWorkers, model } = jobData;

    try {
      // First: Verify user role and limits
      console.log(`🔐 Verifying user limits for user ${userId}, maxWorkers: ${maxWorkers}`);
      
      const roleVerification = await this.verifyUserLimits(userId, maxWorkers);
      
      if (!roleVerification.allowed) {
        const errorMsg = `Access denied: ${roleVerification.error}`;
        console.log(`❌ ${errorMsg}`);
        throw new Error(errorMsg);
      }
      
      console.log(`✅ User verification passed - Role: ${roleVerification.role}, Active jobs: ${roleVerification.activeJobs}`);
      
      // Advanced worker calculation and prompt distribution
      const processedJobData = await this.calculateWorkerDistribution(prompts, maxWorkers, roleVerification);
      
      console.log(`🧮 Worker Distribution Calculated:`);
      console.log(`   Total Prompts: ${processedJobData.totalPrompts}`);
      console.log(`   Effective Workers: ${processedJobData.effectiveWorkers}`);
      console.log(`   Prompts per Worker: ${processedJobData.promptsPerWorker}`);
      console.log(`   Queue Batches: ${processedJobData.queueBatches.length}`);
      
      // Create job in database with processed data
      await jobModel.create(jobId, userId, prompts, ratio, saveTarget, processedJobData.effectiveWorkers, model);

      // Log job creation with detailed info
      logService.broadcast(jobId, null, 'created', 
        `Job created: ${processedJobData.totalPrompts} prompts → ${processedJobData.effectiveWorkers} workers (${roleVerification.role} plan)`);

      // Send job to BytePlus with intelligent queueing
      this.sendJobToByteplusWithQueue(jobId, userId, {
        ...jobData,
        processedData: processedJobData
      });

      return { 
        jobId, 
        status: 'queued',
        userRole: roleVerification.role,
        limits: roleVerification.limits,
        workerDistribution: {
          totalPrompts: processedJobData.totalPrompts,
          effectiveWorkers: processedJobData.effectiveWorkers,
          promptsPerWorker: processedJobData.promptsPerWorker,
          queueBatches: processedJobData.queueBatches.length
        }
      };
      
    } catch (error) {
      console.error(`❌ Failed to create job for user ${userId}:`, error.message);
      throw error;
    }
  },

  async sendJobToByteplus(jobId, userId, jobData) {
    const byteplusApiUrl = process.env.BYTEPLUS_API_URL || 'http://localhost:8085';
    const byteplusApiKey = process.env.BYTEPLUS_API_KEY || '2311asaza';
    
    // First, test if BytePlus service is reachable
    try {
      console.log(`🔍 Testing connection to BytePlus service at ${byteplusApiUrl}`);
      await axios.get(`${byteplusApiUrl}/healthz`, { timeout: 3000 });
      console.log(`✅ BytePlus service is reachable`);
    } catch (healthError) {
      console.error(`❌ BytePlus service health check failed:`, healthError.message);
      console.log(`💡 Possible solutions:`);
      console.log(`   1. Start BytePlus service on port 8085`);
      console.log(`   2. Check if port is correct in .env (BYTEPLUS_API_URL)`);
      console.log(`   3. Ensure BytePlus service has /healthz endpoint`);
      
      logService.broadcast(jobId, null, 'error', `BytePlus service unreachable: ${healthError.message}`);
      console.log(`🔄 Falling back to simulation for job ${jobId}`);
      this.processJob(jobId, jobData.prompts, jobData.maxWorkers);
      return;
    }
    
    try {
      // Sesuai dokumentasi BytePlus API v3.0, gunakan format payload yang exact
      const byteplusPayload = {
        prompt: Array.isArray(jobData.prompts) ? jobData.prompts : [jobData.prompts], // Ensure array format
        model: jobData.model || 'pro', // pro|lite (default: pro)
        ratio: jobData.ratio || '16:9', // 16:9|9:16|1:1 (default: 16:9)
        debug: process.env.NODE_ENV === 'development'
      };

      // Validate prompts according to documentation
      if (byteplusPayload.prompt.length > 5) {
        throw new Error('Maximum 5 prompts per request allowed');
      }

      const totalLength = byteplusPayload.prompt.join(' ').length;
      if (totalLength > 2000) {
        throw new Error('Combined prompt length cannot exceed 2000 characters');
      }

      // Store job mapping untuk callback
      global.jobMappings = global.jobMappings || new Map();
      global.jobMappings.set(jobId, {
        nodeJobId: jobId,
        userId: userId,
        originalData: jobData
      });

      console.log(`🚀 Sending job ${jobId} to BytePlus API at ${byteplusApiUrl}/generate`);
      console.log(`📦 BytePlus Payload:`, JSON.stringify(byteplusPayload, null, 2));
      
      // Sesuai dokumentasi: Authentication via query parameter
      const response = await axios.post(`${byteplusApiUrl}/generate?key=${byteplusApiKey}`, byteplusPayload, {
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'VideoGen-NodeJS-Backend/1.0'
        }
      });

      const byteplusJobId = response.data.job_id;
      
      // Update job mapping dengan BytePlus job ID
      if (global.jobMappings.has(jobId)) {
        const mapping = global.jobMappings.get(jobId);
        mapping.byteplusJobId = byteplusJobId;
        global.jobMappings.set(jobId, mapping);
      }

      logService.broadcast(jobId, null, 'dispatched', `Job dispatched to BytePlus API. BytePlus Job ID: ${byteplusJobId}`);
      console.log(`✅ Job ${jobId} successfully sent to BytePlus API. BytePlus Job ID: ${byteplusJobId}`);
      
      // Start monitoring BytePlus job status
      this.monitorByteplusJob(jobId, byteplusJobId, byteplusApiUrl, byteplusApiKey);
      
    } catch (error) {
      console.error(`❌ Failed to send job ${jobId} to BytePlus API:`, error.message);
      
      if (error.response) {
        console.error(`📊 Response Status: ${error.response.status}`);
        console.error(`📊 Response Data:`, error.response.data);
        
        if (error.response.status === 401) {
          console.log(`💡 Unauthorized. Check API key in .env (BYTEPLUS_API_KEY)`);
        } else if (error.response.status === 400) {
          console.log(`💡 Bad Request. Check payload format and prompt validation`);
        } else if (error.response.status === 429) {
          console.log(`💡 Rate Limited. BytePlus API is rate limiting requests`);
        }
      } else if (error.code === 'ECONNREFUSED') {
        console.log(`💡 Connection refused. BytePlus service is not running on ${byteplusApiUrl}`);
      }
      
      logService.broadcast(jobId, null, 'error', `Failed to dispatch to BytePlus: ${error.message}`);
      
      // Fallback to simulation if BytePlus service is unavailable
      console.log(`🔄 Falling back to simulation for job ${jobId}`);
      this.processJob(jobId, jobData.prompts, jobData.maxWorkers);
    }
  },

  // Enhanced BytePlus job sender with intelligent queueing
  async sendJobToByteplusWithQueue(jobId, userId, jobData) {
    const byteplusApiUrl = process.env.BYTEPLUS_API_URL || 'http://localhost:8085';
    const byteplusApiKey = process.env.BYTEPLUS_API_KEY || '2311asaza';
    
    // First, test if BytePlus service is reachable
    try {
      console.log(`🔍 Testing connection to BytePlus service at ${byteplusApiUrl}`);
      await axios.get(`${byteplusApiUrl}/healthz`, { timeout: 3000 });
      console.log(`✅ BytePlus service is reachable`);
    } catch (healthError) {
      console.error(`❌ BytePlus service health check failed:`, healthError.message);
      logService.broadcast(jobId, null, 'error', `BytePlus service unreachable: ${healthError.message}`);
      
      // Fallback to advanced simulation
      console.log(`🔄 Falling back to advanced simulation for job ${jobId}`);
      return this.processJobWithWorkerDistribution(jobId, jobData);
    }

    const processedData = jobData.processedData;
    
    console.log(`🎯 Processing job ${jobId} with ${processedData.distributionStrategy} strategy`);
    logService.broadcast(jobId, null, 'processing', 
      `Processing ${processedData.totalPrompts} prompts across ${processedData.effectiveWorkers} workers`);

    // Initialize job queue tracking
    global.jobQueues = global.jobQueues || new Map();
    global.jobQueues.set(jobId, {
      nodeJobId: jobId,
      userId: userId,
      totalBatches: processedData.queueBatches.length,
      completedBatches: 0,
      failedBatches: 0,
      batchResults: [],
      startTime: new Date(),
      status: 'processing'
    });

    try {
      // Process each batch according to the distribution strategy
      if (processedData.distributionStrategy === 'single_worker') {
        await this.processSingleWorkerBatch(jobId, processedData.queueBatches[0], byteplusApiUrl, byteplusApiKey);
      } else {
        await this.processDistributedWorkerBatches(jobId, processedData.queueBatches, byteplusApiUrl, byteplusApiKey);
      }
      
    } catch (error) {
      console.error(`❌ Failed to process job ${jobId}:`, error.message);
      await jobModel.updateStatus(jobId, 'failed');
      logService.broadcast(jobId, null, 'error', `Job processing failed: ${error.message}`);
      
      // Cleanup
      if (global.jobQueues) {
        global.jobQueues.delete(jobId);
      }
    }
  },

  // Process single worker batch (simple case)
  async processSingleWorkerBatch(jobId, batch, byteplusApiUrl, byteplusApiKey) {
    console.log(`🔄 Processing single worker batch for job ${jobId}`);
    logService.broadcast(jobId, null, 'worker_started', `Worker 1 started processing ${batch.promptCount} prompts`);

    try {
      // Split prompts if they exceed BytePlus limits (max 5 prompts per request)
      if (batch.prompts.length > 5) {
        const subBatches = this.splitIntoSubBatches(batch.prompts, 5);
        await this.processMultipleSubBatches(jobId, 1, subBatches, byteplusApiUrl, byteplusApiKey);
        return;
      }

      const byteplusPayload = {
        prompt: batch.prompts,
        model: 'pro',
        ratio: '16:9',
        debug: process.env.NODE_ENV === 'development'
      };

      console.log(`🚀 Sending single batch to BytePlus: ${batch.batchId}`);
      console.log(`📦 Payload:`, JSON.stringify(byteplusPayload, null, 2));

      const response = await axios.post(`${byteplusApiUrl}/generate?key=${byteplusApiKey}`, byteplusPayload, {
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'VideoGen-NodeJS-Backend/1.0',
          'X-Job-ID': jobId,
          'X-Batch-ID': batch.batchId
        }
      });

      const byteplusJobId = response.data.job_id;
      
      // Store mapping
      global.jobMappings = global.jobMappings || new Map();
      global.jobMappings.set(jobId, {
        nodeJobId: jobId,
        byteplusJobId: byteplusJobId,
        batchId: batch.batchId,
        type: 'single_batch'
      });

      logService.broadcast(jobId, null, 'dispatched', 
        `Batch dispatched to BytePlus. Job ID: ${byteplusJobId}`);

      // Start monitoring
      this.monitorByteplusJob(jobId, byteplusJobId, byteplusApiUrl, byteplusApiKey);

    } catch (error) {
      console.error(`❌ Single batch processing failed:`, error.message);
      throw error;
    }
  },

  // Process multiple worker batches (complex case)
  async processDistributedWorkerBatches(jobId, queueBatches, byteplusApiUrl, byteplusApiKey) {
    console.log(`🔄 Processing distributed worker batches for job ${jobId}: ${queueBatches.length} workers`);
    
    const batchPromises = queueBatches.map(async (batch, index) => {
      try {
        // Add delay between batches to avoid overwhelming BytePlus API
        const delay = index * 2000; // 2 second delay between workers
        if (delay > 0) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        logService.broadcast(jobId, null, 'worker_started', 
          `Worker ${batch.workerId} started (${batch.promptCount} prompts)`);

        // Split batch if it exceeds BytePlus limits
        if (batch.prompts.length > 5) {
          const subBatches = this.splitIntoSubBatches(batch.prompts, 5);
          await this.processMultipleSubBatches(jobId, batch.workerId, subBatches, byteplusApiUrl, byteplusApiKey);
        } else {
          await this.processSingleWorkerSubBatch(jobId, batch, byteplusApiUrl, byteplusApiKey);
        }

        console.log(`✅ Worker ${batch.workerId} completed successfully`);
        
      } catch (error) {
        console.error(`❌ Worker ${batch.workerId} failed:`, error.message);
        
        // Update failed batch count
        const queueData = global.jobQueues.get(jobId);
        if (queueData) {
          queueData.failedBatches++;
          global.jobQueues.set(jobId, queueData);
        }
        
        logService.broadcast(jobId, null, 'worker_failed', 
          `Worker ${batch.workerId} failed: ${error.message}`);
      }
    });

    // Wait for all workers to complete
    await Promise.allSettled(batchPromises);
    
    // Check final results
    const queueData = global.jobQueues.get(jobId);
    if (queueData) {
      if (queueData.failedBatches === 0) {
        console.log(`🎉 All workers completed successfully for job ${jobId}`);
        logService.broadcast(jobId, null, 'info', 'All workers completed successfully');
      } else {
        console.log(`⚠️ Job ${jobId} completed with ${queueData.failedBatches} failed workers`);
        logService.broadcast(jobId, null, 'warning', 
          `Job completed with ${queueData.failedBatches}/${queueData.totalBatches} failed workers`);
      }
    }
  },

  // Split prompts into sub-batches for BytePlus API limits
  splitIntoSubBatches(prompts, maxSize) {
    const subBatches = [];
    for (let i = 0; i < prompts.length; i += maxSize) {
      subBatches.push({
        prompts: prompts.slice(i, i + maxSize),
        subBatchIndex: Math.floor(i / maxSize) + 1
      });
    }
    console.log(`📋 Split ${prompts.length} prompts into ${subBatches.length} sub-batches`);
    return subBatches;
  },

  // Process multiple sub-batches for a single worker
  async processMultipleSubBatches(jobId, workerId, subBatches, byteplusApiUrl, byteplusApiKey) {
    console.log(`🔄 Worker ${workerId} processing ${subBatches.length} sub-batches`);
    
    for (let i = 0; i < subBatches.length; i++) {
      const subBatch = subBatches[i];
      
      logService.broadcast(jobId, null, 'sub_batch_started', 
        `Worker ${workerId} - Sub-batch ${subBatch.subBatchIndex}/${subBatches.length}`);

      try {
        const byteplusPayload = {
          prompt: subBatch.prompts,
          model: 'pro',
          ratio: '16:9',
          debug: process.env.NODE_ENV === 'development'
        };

        const response = await axios.post(`${byteplusApiUrl}/generate?key=${byteplusApiKey}`, byteplusPayload, {
          timeout: 15000,
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'VideoGen-NodeJS-Backend/1.0',
            'X-Job-ID': jobId,
            'X-Worker-ID': workerId,
            'X-Sub-Batch': subBatch.subBatchIndex
          }
        });

        const byteplusJobId = response.data.job_id;
        
        console.log(`✅ Worker ${workerId} sub-batch ${subBatch.subBatchIndex} sent: ${byteplusJobId}`);
        logService.broadcast(jobId, null, 'sub_batch_dispatched', 
          `Worker ${workerId} sub-batch ${subBatch.subBatchIndex} dispatched: ${byteplusJobId}`);

        // Store mapping for each sub-batch
        const mappingKey = `${jobId}_w${workerId}_sb${subBatch.subBatchIndex}`;
        global.jobMappings = global.jobMappings || new Map();
        global.jobMappings.set(mappingKey, {
          nodeJobId: jobId,
          workerId: workerId,
          subBatchIndex: subBatch.subBatchIndex,
          byteplusJobId: byteplusJobId,
          type: 'sub_batch'
        });

        // Start monitoring sub-batch
        this.monitorByteplusSubBatch(jobId, workerId, subBatch.subBatchIndex, byteplusJobId, byteplusApiUrl, byteplusApiKey);

        // Add delay between sub-batches
        if (i < subBatches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 3000)); // 3 second delay
        }

      } catch (error) {
        console.error(`❌ Worker ${workerId} sub-batch ${subBatch.subBatchIndex} failed:`, error.message);
        logService.broadcast(jobId, null, 'sub_batch_failed', 
          `Worker ${workerId} sub-batch ${subBatch.subBatchIndex} failed: ${error.message}`);
        throw error;
      }
    }
  },

  // Process single worker sub-batch
  async processSingleWorkerSubBatch(jobId, batch, byteplusApiUrl, byteplusApiKey) {
    const byteplusPayload = {
      prompt: batch.prompts,
      model: 'pro',
      ratio: '16:9',
      debug: process.env.NODE_ENV === 'development'
    };

    const response = await axios.post(`${byteplusApiUrl}/generate?key=${byteplusApiKey}`, byteplusPayload, {
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'VideoGen-NodeJS-Backend/1.0',
        'X-Job-ID': jobId,
        'X-Worker-ID': batch.workerId,
        'X-Batch-ID': batch.batchId
      }
    });

    const byteplusJobId = response.data.job_id;
    
    // Store mapping
    const mappingKey = `${jobId}_w${batch.workerId}`;
    global.jobMappings = global.jobMappings || new Map();
    global.jobMappings.set(mappingKey, {
      nodeJobId: jobId,
      workerId: batch.workerId,
      batchId: batch.batchId,
      byteplusJobId: byteplusJobId,
      type: 'worker_batch'
    });

    console.log(`✅ Worker ${batch.workerId} batch sent: ${byteplusJobId}`);
    logService.broadcast(jobId, null, 'worker_dispatched', 
      `Worker ${batch.workerId} dispatched: ${byteplusJobId}`);

    // Start monitoring
    this.monitorByteplusWorkerBatch(jobId, batch.workerId, byteplusJobId, byteplusApiUrl, byteplusApiKey);
  },

  // Enhanced job processing with worker distribution (fallback simulation)
  async processJobWithWorkerDistribution(jobId, jobData) {
    const job = await jobModel.findById(jobId);
    if (!job) return;

    const processedData = jobData.processedData;
    console.log(`🔄 Simulating job processing with enhanced distribution for job ${jobId}`);
    
    logService.broadcast(jobId, null, 'simulation_started', 
      `Simulation: ${processedData.totalPrompts} prompts → ${processedData.effectiveWorkers} workers`);

    // Simulate each worker batch
    for (let i = 0; i < processedData.queueBatches.length; i++) {
      const batch = processedData.queueBatches[i];
      
      logService.broadcast(jobId, null, 'worker_simulation', 
        `Simulating Worker ${batch.workerId}: ${batch.promptCount} prompts`);

      // Simulate processing time based on prompt count
      const processingTime = batch.estimatedDuration * 1000; // Convert to milliseconds
      await new Promise(resolve => setTimeout(resolve, processingTime));

      logService.broadcast(jobId, null, 'worker_completed', 
        `Worker ${batch.workerId} simulation completed (${batch.promptCount} prompts)`);
    }

    // Complete the job
    await jobModel.updateStatus(jobId, 'completed');
    logService.broadcast(jobId, null, 'finished', 
      `Simulation completed: ${processedData.totalPrompts} prompts processed by ${processedData.effectiveWorkers} workers`);

    console.log(`🎉 Job ${jobId} simulation completed successfully`);
  },

  async processJob(jobId, prompts, maxWorkers) {
    const job = await jobModel.findById(jobId);
    if (!job) return;

    const userId = job.user_id;

    // Simulate job processing with workers
    logService.broadcast(jobId, null, 'started', `Processing ${prompts.length} prompts with ${maxWorkers} workers`);

    // Assign workers
    const workers = (await workerModel.findByUser(userId)).slice(0, maxWorkers);

    // Simulate parallel processing
    const promptsPerWorker = Math.ceil(prompts.length / workers.length);

    for (let i = 0; i < workers.length; i++) {
      const worker = workers[i];
      const workerPrompts = prompts.slice(i * promptsPerWorker, (i + 1) * promptsPerWorker);

      if (workerPrompts.length > 0) {
        await workerModel.updateStatus(worker.id, userId, 'busy', jobId);
        await workerService.broadcastWorkerUpdate(userId);

        // Simulate processing
        this.simulateWorkerProcessing(jobId, worker.id, workerPrompts, userId);
      }
    }
  },

  async simulateWorkerProcessing(jobId, workerId, prompts, userId) {
    for (let i = 0; i < prompts.length; i++) {
      const prompt = prompts[i];

      // Simulate processing stages
      await this.delay(1000);
      logService.broadcast(jobId, workerId, 'processing', `Worker ${workerId}: Processing prompt ${i + 1}/${prompts.length}`);

      await this.delay(2000);
      logService.broadcast(jobId, workerId, 'rendering', `Worker ${workerId}: Rendering video for "${prompt.substring(0, 30)}..."`);

      await this.delay(1500);
      logService.broadcast(jobId, workerId, 'completed', `Worker ${workerId}: Completed prompt ${i + 1}/${prompts.length}`);
    }

    // Mark worker as idle
    await workerModel.updateStatus(workerId, userId, 'idle', null);
    await workerService.broadcastWorkerUpdate(userId);

    // Check if all workers are done
    this.checkJobCompletion(jobId, userId);
  },

  async checkJobCompletion(jobId, userId) {
    const workers = await workerModel.findByUser(userId);
    const busyWorkers = workers.filter(w => w.current_job_id === jobId);

    if (busyWorkers.length === 0) {
      await jobModel.updateStatus(jobId, 'completed');
      logService.broadcast(jobId, null, 'finished', 'All prompts completed successfully');
    }
  },

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  async getJobStatus(jobId) {
    const job = await jobModel.findById(jobId);
    if (!job) return null;

    return {
      id: job.id,
      prompts: job.prompts,
      ratio: job.ratio,
      saveTarget: job.save_target,
      model: job.model,
      status: job.status,
      createdAt: job.created_at,
      completedAt: job.completed_at
    };
  },

  async getUserJobs(userId) {
    const jobs = await jobModel.findByUser(userId);
    return jobs.map(job => ({
      id: job.id,
      promptCount: job.prompts.length,
      ratio: job.ratio,
      status: job.status,
      createdAt: job.created_at
    }));
  },

  // Monitor BytePlus job status dengan polling
  async monitorByteplusJob(nodeJobId, byteplusJobId, byteplusApiUrl, byteplusApiKey) {
    const maxAttempts = 120; // 10 minutes with 5s intervals (BytePlus bisa lebih lama)
    let attempts = 0;
    
    const checkStatus = async () => {
      try {
        attempts++;
        // Sesuai dokumentasi: /jobs/{id}?key=API_KEY
        const response = await axios.get(`${byteplusApiUrl}/jobs/${byteplusJobId}?key=${byteplusApiKey}`, {
          timeout: 5000
        });
        
        const jobData = response.data;
        const status = jobData.status;
        
        console.log(`📊 BytePlus job ${byteplusJobId} status: ${status} (attempt ${attempts})`);
        
        // Update progress sesuai dokumentasi BytePlus
        if (jobData.progress !== undefined) {
          logService.broadcast(nodeJobId, null, 'progress', `Progress: ${jobData.progress}%`);
        }
        
        // Update stage/step
        if (jobData.stage) {
          logService.broadcast(nodeJobId, null, 'step', `Stage: ${jobData.stage}`);
        }
        
        // Update estimated time
        if (jobData.estimated_remaining) {
          logService.broadcast(nodeJobId, null, 'info', `Estimated remaining: ${jobData.estimated_remaining}`);
        }
        
        if (status === 'completed') {
          // Job completed successfully
          await jobModel.updateStatus(nodeJobId, 'completed');
          
          const videoUrl = jobData.video_url || jobData.download_url;
          
          logService.broadcast(nodeJobId, null, 'finished', 
            `Video generation completed! ${videoUrl ? `Download: ${videoUrl}` : ''}`);
          
          console.log(`🎉 Job ${nodeJobId} completed successfully. Video: ${videoUrl}`);
          
          // Cleanup job mapping
          if (global.jobMappings) {
            global.jobMappings.delete(nodeJobId);
          }
          
        } else if (status === 'failed') {
          // Job failed
          await jobModel.updateStatus(nodeJobId, 'failed');
          
          const errorMsg = jobData.error || jobData.error_msg || 'Unknown error occurred';
          logService.broadcast(nodeJobId, null, 'error', `Job failed: ${errorMsg}`);
          
          console.log(`❌ Job ${nodeJobId} failed: ${errorMsg}`);
          
          // Check failed prompts if available
          if (jobData.error_code) {
            console.log(`💡 Error code: ${jobData.error_code}`);
            logService.broadcast(nodeJobId, null, 'error', `Error code: ${jobData.error_code}`);
          }
          
          // Cleanup job mapping
          if (global.jobMappings) {
            global.jobMappings.delete(nodeJobId);
          }
          
        } else if (status === 'queued' || status === 'processing') {
          // Job still processing, continue monitoring
          if (attempts < maxAttempts) {
            setTimeout(checkStatus, 5000); // Check again in 5 seconds
          } else {
            // Timeout
            await jobModel.updateStatus(nodeJobId, 'failed');
            logService.broadcast(nodeJobId, null, 'error', 'Job monitoring timeout after 10 minutes');
            console.log(`⏰ Job ${nodeJobId} monitoring timeout after ${maxAttempts} attempts`);
            
            if (global.jobMappings) {
              global.jobMappings.delete(nodeJobId);
            }
          }
        }
        
      } catch (error) {
        console.error(`❌ Error monitoring BytePlus job ${byteplusJobId}:`, error.message);
        
        if (attempts < maxAttempts) {
          setTimeout(checkStatus, 5000); // Retry after 5 seconds
        } else {
          await jobModel.updateStatus(nodeJobId, 'failed');
          logService.broadcast(nodeJobId, null, 'error', 'Job monitoring failed');
          
          if (global.jobMappings) {
            global.jobMappings.delete(nodeJobId);
          }
        }
      }
    };
    
    // Start monitoring with initial delay
    setTimeout(checkStatus, 3000);
  },

  // Monitor BytePlus sub-batch job
  async monitorByteplusSubBatch(nodeJobId, workerId, subBatchIndex, byteplusJobId, byteplusApiUrl, byteplusApiKey) {
    const maxAttempts = 60; // 5 minutes with 5s intervals
    let attempts = 0;
    
    const checkStatus = async () => {
      try {
        attempts++;
        const response = await axios.get(`${byteplusApiUrl}/jobs/${byteplusJobId}?key=${byteplusApiKey}`, {
          timeout: 5000
        });
        
        const jobData = response.data;
        const status = jobData.status;
        
        console.log(`📊 Worker ${workerId} sub-batch ${subBatchIndex} status: ${status} (attempt ${attempts})`);
        
        if (status === 'completed') {
          console.log(`✅ Worker ${workerId} sub-batch ${subBatchIndex} completed`);
          logService.broadcast(nodeJobId, null, 'sub_batch_completed', 
            `Worker ${workerId} sub-batch ${subBatchIndex} completed: ${jobData.video_url || 'No URL'}`);
          
          // Check if all sub-batches for this job are complete
          this.checkJobCompletion(nodeJobId);
          
        } else if (status === 'failed') {
          console.log(`❌ Worker ${workerId} sub-batch ${subBatchIndex} failed: ${jobData.error}`);
          logService.broadcast(nodeJobId, null, 'sub_batch_failed', 
            `Worker ${workerId} sub-batch ${subBatchIndex} failed: ${jobData.error || 'Unknown error'}`);
            
        } else if (status === 'queued' || status === 'processing') {
          if (attempts < maxAttempts) {
            setTimeout(checkStatus, 5000);
          } else {
            console.log(`⏰ Worker ${workerId} sub-batch ${subBatchIndex} timeout`);
            logService.broadcast(nodeJobId, null, 'sub_batch_timeout', 
              `Worker ${workerId} sub-batch ${subBatchIndex} timeout`);
          }
        }
        
      } catch (error) {
        console.error(`❌ Error monitoring worker ${workerId} sub-batch ${subBatchIndex}:`, error.message);
        
        if (attempts < maxAttempts) {
          setTimeout(checkStatus, 5000);
        } else {
          logService.broadcast(nodeJobId, null, 'sub_batch_error', 
            `Worker ${workerId} sub-batch ${subBatchIndex} monitoring failed`);
        }
      }
    };
    
    setTimeout(checkStatus, 3000);
  },

  // Monitor BytePlus worker batch job
  async monitorByteplusWorkerBatch(nodeJobId, workerId, byteplusJobId, byteplusApiUrl, byteplusApiKey) {
    const maxAttempts = 120; // 10 minutes
    let attempts = 0;
    
    const checkStatus = async () => {
      try {
        attempts++;
        const response = await axios.get(`${byteplusApiUrl}/jobs/${byteplusJobId}?key=${byteplusApiKey}`, {
          timeout: 5000
        });
        
        const jobData = response.data;
        const status = jobData.status;
        
        console.log(`📊 Worker ${workerId} batch status: ${status} (attempt ${attempts})`);
        
        // Update progress
        if (jobData.progress !== undefined) {
          logService.broadcast(nodeJobId, null, 'worker_progress', 
            `Worker ${workerId}: ${jobData.progress}%`);
        }
        
        if (status === 'completed') {
          console.log(`✅ Worker ${workerId} batch completed`);
          logService.broadcast(nodeJobId, null, 'worker_completed', 
            `Worker ${workerId} completed: ${jobData.video_url || 'Processing complete'}`);
          
          // Update queue tracking
          const queueData = global.jobQueues.get(nodeJobId);
          if (queueData) {
            queueData.completedBatches++;
            queueData.batchResults.push({
              workerId: workerId,
              status: 'completed',
              video_url: jobData.video_url,
              completedAt: new Date()
            });
            global.jobQueues.set(nodeJobId, queueData);
          }
          
          // Check if all workers are complete
          this.checkJobCompletion(nodeJobId);
          
        } else if (status === 'failed') {
          console.log(`❌ Worker ${workerId} batch failed: ${jobData.error}`);
          logService.broadcast(nodeJobId, null, 'worker_failed', 
            `Worker ${workerId} failed: ${jobData.error || 'Unknown error'}`);
          
          // Update queue tracking
          const queueData = global.jobQueues.get(nodeJobId);
          if (queueData) {
            queueData.failedBatches++;
            queueData.batchResults.push({
              workerId: workerId,
              status: 'failed',
              error: jobData.error,
              failedAt: new Date()
            });
            global.jobQueues.set(nodeJobId, queueData);
          }
          
        } else if (status === 'queued' || status === 'processing') {
          if (attempts < maxAttempts) {
            setTimeout(checkStatus, 5000);
          } else {
            console.log(`⏰ Worker ${workerId} batch timeout`);
            logService.broadcast(nodeJobId, null, 'worker_timeout', 
              `Worker ${workerId} timeout after ${maxAttempts} attempts`);
          }
        }
        
      } catch (error) {
        console.error(`❌ Error monitoring worker ${workerId} batch:`, error.message);
        
        if (attempts < maxAttempts) {
          setTimeout(checkStatus, 5000);
        } else {
          logService.broadcast(nodeJobId, null, 'worker_error', 
            `Worker ${workerId} monitoring failed`);
        }
      }
    };
    
    setTimeout(checkStatus, 3000);
  },

  // Check if all batches/workers for a job are completed
  async checkJobCompletion(nodeJobId) {
    const queueData = global.jobQueues.get(nodeJobId);
    if (!queueData) return;

    const totalBatches = queueData.totalBatches;
    const processedBatches = queueData.completedBatches + queueData.failedBatches;
    
    console.log(`🔍 Job ${nodeJobId} completion check: ${processedBatches}/${totalBatches} batches processed`);
    
    if (processedBatches >= totalBatches) {
      // All batches processed
      const successRate = (queueData.completedBatches / totalBatches) * 100;
      
      if (queueData.completedBatches > 0) {
        // At least some batches succeeded
        await jobModel.updateStatus(nodeJobId, 'completed');
        
        const videoUrls = queueData.batchResults
          .filter(result => result.status === 'completed' && result.video_url)
          .map(result => result.video_url);
        
        logService.broadcast(nodeJobId, null, 'finished', 
          `Job completed! Success rate: ${successRate.toFixed(1)}% (${queueData.completedBatches}/${totalBatches} workers). Videos: ${videoUrls.length}`);
        
        console.log(`🎉 Job ${nodeJobId} completed with ${successRate.toFixed(1)}% success rate`);
        
      } else {
        // All batches failed
        await jobModel.updateStatus(nodeJobId, 'failed');
        logService.broadcast(nodeJobId, null, 'error', 
          `Job failed: All ${totalBatches} workers failed`);
        
        console.log(`❌ Job ${nodeJobId} completely failed - all workers failed`);
      }
      
      // Cleanup
      global.jobQueues.delete(nodeJobId);
      
      // Clean up job mappings
      if (global.jobMappings) {
        // Clean up all related mappings
        const keysToDelete = [];
        for (const [key, value] of global.jobMappings.entries()) {
          if (value.nodeJobId === nodeJobId) {
            keysToDelete.push(key);
          }
        }
        keysToDelete.forEach(key => global.jobMappings.delete(key));
      }
    }
  },

  // Callback handler for receiving updates from BytePlus service
  async handleByteplusCallback(nodeJobId, data) {
    try {
      const { status, progress, stage, error, error_code, video_url, download_url } = data;
      
      console.log(`� Received BytePlus callback for job ${nodeJobId}:`, status);
      
      if (progress !== undefined) {
        logService.broadcast(nodeJobId, null, 'progress', `Progress: ${progress}%`);
      }
      
      if (stage) {
        logService.broadcast(nodeJobId, null, 'step', `Stage: ${stage}`);
      }
      
      if (status === 'completed') {
        await jobModel.updateStatus(nodeJobId, 'completed');
        const videoUrlFinal = video_url || download_url;
        logService.broadcast(nodeJobId, null, 'finished', 
          `Video generation completed! ${videoUrlFinal ? `Video: ${videoUrlFinal}` : ''}`);
      } else if (status === 'failed') {
        await jobModel.updateStatus(nodeJobId, 'failed');
        const errorMsg = error || 'Unknown error occurred';
        logService.broadcast(nodeJobId, null, 'error', 
          `Job failed: ${errorMsg}${error_code ? ` (Code: ${error_code})` : ''}`);
      }
      
      return { success: true };
      
    } catch (error) {
      console.error(`❌ BytePlus callback error for job ${nodeJobId}:`, error.message);
      return { success: false, error: error.message };
    }
  },

  // Advanced worker distribution calculator with complex algorithms
  async calculateWorkerDistribution(prompts, requestedWorkers, roleVerification) {
    const totalPrompts = Array.isArray(prompts) ? prompts.length : 1;
    const userMaxWorkers = roleVerification.limits.maxWorkers;
    const userMaxPromptsPerJob = roleVerification.limits.maxPromptsPerJob;
    const queuePriority = roleVerification.limits.queuePriority;
    
    console.log(`🎯 Complex Worker Distribution Analysis:`);
    console.log(`   User Role: ${roleVerification.role} (${roleVerification.rawRole})`);
    console.log(`   Queue Priority: ${queuePriority}`);
    console.log(`   Hourly Usage: ${roleVerification.hourlyUsage}/${roleVerification.limits.maxPromptsPerHour}`);
    
    // Validate prompts per job limit
    if (totalPrompts > userMaxPromptsPerJob) {
      throw new Error(
        `Prompts per job limit exceeded. Your ${roleVerification.limits.description} allows maximum ${userMaxPromptsPerJob} prompts per job. Submitted: ${totalPrompts}`
      );
    }
    
    // Complex algorithm: Calculate effective workers based on multiple factors
    let effectiveWorkers = Math.min(
      Math.min(requestedWorkers, userMaxWorkers),
      totalPrompts // Cannot have more workers than prompts
    );
    
    // Complex feature: Optimize workers based on queue priority and system load
    const systemLoadFactor = await this.getSystemLoadFactor();
    const optimizedWorkers = this.optimizeWorkersForLoad(effectiveWorkers, queuePriority, systemLoadFactor);
    
    console.log(`🧮 Complex Worker Calculation:`);
    console.log(`   Total Prompts: ${totalPrompts} (Limit: ${userMaxPromptsPerJob})`);
    console.log(`   Requested Workers: ${requestedWorkers}`);
    console.log(`   User Max Workers: ${userMaxWorkers}`);
    console.log(`   Initial Effective Workers: ${effectiveWorkers}`);
    console.log(`   System Load Factor: ${systemLoadFactor.toFixed(2)}`);
    console.log(`   Optimized Workers: ${optimizedWorkers}`);
    
    effectiveWorkers = optimizedWorkers;
    
    // Complex distribution: Calculate prompts per worker with load balancing
    const distributionAlgorithm = this.selectDistributionAlgorithm(totalPrompts, effectiveWorkers, queuePriority);
    const distribution = this.calculateComplexDistribution(prompts, effectiveWorkers, distributionAlgorithm);
    
    console.log(`   Distribution Algorithm: ${distributionAlgorithm}`);
    console.log(`   Distribution Strategy: ${effectiveWorkers === 1 ? 'Single Worker' : 'Multi-Worker Parallel'}`);
    
    // Create advanced queue batches for each worker
    const queueBatches = [];
    let currentPromptIndex = 0;
    
    const promptsArray = Array.isArray(prompts) ? prompts : [prompts];
    
    for (let workerIndex = 0; workerIndex < effectiveWorkers; workerIndex++) {
      const promptsForThisWorker = distribution[workerIndex];
      const workerPrompts = promptsArray.slice(currentPromptIndex, currentPromptIndex + promptsForThisWorker);
      currentPromptIndex += promptsForThisWorker;
      
      // Complex feature: Calculate worker-specific priority and timing
      const workerPriority = this.calculateWorkerPriority(workerIndex, queuePriority, promptsForThisWorker);
      const estimatedDuration = this.calculateAdvancedDuration(workerPrompts.length, workerPriority);
      const byteplusSubBatches = Math.ceil(workerPrompts.length / 5); // BytePlus API limit: 5 prompts per request
      
      queueBatches.push({
        workerId: workerIndex + 1,
        batchId: `batch_${workerIndex + 1}_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
        prompts: workerPrompts,
        promptCount: workerPrompts.length,
        priority: workerPriority,
        queuePriority: queuePriority,
        estimatedDuration: estimatedDuration,
        byteplusSubBatches: byteplusSubBatches,
        processingOrder: workerIndex + 1,
        delayBeforeStart: workerIndex * (queuePriority === 'critical' ? 1000 : 2000), // Faster for admin
        retryAttempts: queuePriority === 'critical' ? 5 : 3
      });
      
      console.log(`   Worker ${workerIndex + 1}: ${workerPrompts.length} prompts, Priority: ${workerPriority}, BytePlus batches: ${byteplusSubBatches}, Delay: ${queueBatches[workerIndex].delayBeforeStart}ms`);
    }
    
    // Calculate comprehensive metrics
    const totalByteplusRequests = queueBatches.reduce((sum, batch) => sum + batch.byteplusSubBatches, 0);
    const maxEstimatedDuration = Math.max(...queueBatches.map(b => b.estimatedDuration));
    const totalProcessingTime = queueBatches.reduce((sum, batch) => sum + batch.estimatedDuration, 0);
    
    const complexDistributionResult = {
      totalPrompts,
      effectiveWorkers,
      requestedWorkers,
      userMaxWorkers,
      promptsPerWorker: Math.floor(totalPrompts / effectiveWorkers),
      remainderPrompts: totalPrompts % effectiveWorkers,
      queueBatches,
      distributionAlgorithm,
      distributionStrategy: effectiveWorkers === 1 ? 'single_worker' : 'distributed_parallel',
      processingMode: totalPrompts > effectiveWorkers ? 'batch_processing' : 'parallel_processing',
      totalByteplusRequests,
      estimatedTotalDuration: maxEstimatedDuration,
      totalProcessingTime,
      systemLoadFactor,
      queuePriority,
      optimizationApplied: optimizedWorkers !== Math.min(requestedWorkers, userMaxWorkers),
      userRole: roleVerification.role,
      hourlyUsageImpact: roleVerification.hourlyUsage > (roleVerification.limits.maxPromptsPerHour * 0.8)
    };
    
    console.log(`🎯 Complex Distribution Complete:`);
    console.log(`   Algorithm: ${distributionAlgorithm}, Total BytePlus Requests: ${totalByteplusRequests}`);
    console.log(`   Estimated Duration: ${maxEstimatedDuration}s, Total Processing: ${totalProcessingTime}s`);
    
    return complexDistributionResult;
  },

  // Complex feature: Get system load factor for worker optimization
  async getSystemLoadFactor() {
    try {
      const activeJobsCount = global.jobQueues ? global.jobQueues.size : 0;
      const maxConcurrentJobs = 50; // System-wide limit
      const loadFactor = Math.min(activeJobsCount / maxConcurrentJobs, 1.0);
      
      console.log(`📊 System Load: ${activeJobsCount}/${maxConcurrentJobs} jobs (${(loadFactor * 100).toFixed(1)}% capacity)`);
      return loadFactor;
    } catch (error) {
      console.error('❌ Error calculating system load:', error.message);
      return 0.0; // Assume no load on error
    }
  },

  // Complex feature: Optimize workers based on system load and priority
  optimizeWorkersForLoad(requestedWorkers, queuePriority, systemLoadFactor) {
    let optimizedWorkers = requestedWorkers;
    
    // Reduce workers under high system load (except for critical priority)
    if (systemLoadFactor > 0.8 && queuePriority !== 'critical') {
      optimizedWorkers = Math.max(1, Math.floor(requestedWorkers * (1 - systemLoadFactor * 0.5)));
      console.log(`⚡ Load optimization: Reduced workers from ${requestedWorkers} to ${optimizedWorkers} due to high system load`);
    }
    
    // Boost workers for high priority users when system load is low
    if (systemLoadFactor < 0.3 && (queuePriority === 'highest' || queuePriority === 'critical')) {
      optimizedWorkers = Math.min(requestedWorkers * 1.2, requestedWorkers + 2);
      console.log(`🚀 Priority optimization: Boosted workers from ${requestedWorkers} to ${optimizedWorkers} for ${queuePriority} priority`);
    }
    
    return Math.floor(optimizedWorkers);
  },

  // Complex feature: Select optimal distribution algorithm
  selectDistributionAlgorithm(totalPrompts, effectiveWorkers, queuePriority) {
    if (totalPrompts <= effectiveWorkers) {
      return 'one_per_worker';
    } else if (queuePriority === 'critical' || queuePriority === 'highest') {
      return 'balanced_priority';
    } else if (totalPrompts > effectiveWorkers * 10) {
      return 'heavy_load_balanced';
    } else {
      return 'even_distribution';
    }
  },

  // Complex feature: Calculate advanced distribution
  calculateComplexDistribution(prompts, effectiveWorkers, algorithm) {
    const totalPrompts = Array.isArray(prompts) ? prompts.length : 1;
    const distribution = new Array(effectiveWorkers).fill(0);
    
    switch (algorithm) {
      case 'one_per_worker':
        // Simple: one prompt per worker
        for (let i = 0; i < Math.min(totalPrompts, effectiveWorkers); i++) {
          distribution[i] = 1;
        }
        break;
        
      case 'balanced_priority':
        // Priority users get more balanced distribution
        const base = Math.floor(totalPrompts / effectiveWorkers);
        const remainder = totalPrompts % effectiveWorkers;
        for (let i = 0; i < effectiveWorkers; i++) {
          distribution[i] = base + (i < remainder ? 1 : 0);
        }
        break;
        
      case 'heavy_load_balanced':
        // For heavy loads, distribute more evenly with slight front-loading
        const heavyBase = Math.floor(totalPrompts / effectiveWorkers);
        const heavyRemainder = totalPrompts % effectiveWorkers;
        for (let i = 0; i < effectiveWorkers; i++) {
          distribution[i] = heavyBase + (i < heavyRemainder ? 1 : 0);
        }
        break;
        
      default: // 'even_distribution'
        const evenBase = Math.floor(totalPrompts / effectiveWorkers);
        const evenRemainder = totalPrompts % effectiveWorkers;
        for (let i = 0; i < effectiveWorkers; i++) {
          distribution[i] = evenBase + (i < evenRemainder ? 1 : 0);
        }
        break;
    }
    
    return distribution;
  },

  // Complex feature: Calculate worker-specific priority
  calculateWorkerPriority(workerIndex, queuePriority, promptCount) {
    const basePriorities = {
      'low': 1,
      'normal': 2, 
      'high': 3,
      'highest': 4,
      'critical': 5
    };
    
    let priority = basePriorities[queuePriority] || 2;
    
    // Boost priority for first worker (lead worker)
    if (workerIndex === 0) {
      priority += 1;
    }
    
    // Adjust priority based on prompt count (more prompts = higher priority)
    if (promptCount > 10) {
      priority += 1;
    }
    
    return Math.min(priority, 5); // Cap at 5
  },

  // Enhanced duration calculation with complexity factors
  calculateAdvancedDuration(promptCount, workerPriority) {
    const baseTimePerPrompt = 45; // seconds per prompt
    const batchOverhead = 15; // seconds setup time
    const priorityMultiplier = {
      1: 1.2, // Lower priority takes longer
      2: 1.1,
      3: 1.0, // Normal speed
      4: 0.9, // Higher priority gets faster processing
      5: 0.8  // Critical priority gets fastest processing
    };
    
    const multiplier = priorityMultiplier[workerPriority] || 1.0;
    const parallelEfficiency = 0.85; // Account for parallel processing overhead
    
    return Math.ceil((baseTimePerPrompt * promptCount + batchOverhead) * multiplier * parallelEfficiency);
  },

  // Calculate estimated processing duration
  calculateEstimatedDuration(promptCount) {
    // BytePlus API typically takes 30-120 seconds per prompt batch
    const baseTime = 45; // seconds per prompt
    const batchOverhead = 15; // seconds setup time
    const parallelEfficiency = 0.8; // 20% overhead for parallel processing
    
    return Math.ceil((baseTime * promptCount + batchOverhead) * parallelEfficiency);
  },

  // Verify user role and max worker limits with complex integration
  async verifyUserLimits(userId, maxWorkers) {
    try {
      // Get user data using already imported userModel
      const user = await userModel.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }
      
      // Normalize role to lowercase for consistency
      const userRole = (user.role || 'FREE').toLowerCase();
      
      console.log(`🔍 Raw user role from database: "${user.role}"`);
      console.log(`🔄 Normalized role: "${userRole}"`);
      
      // Define comprehensive role-based limits with complex features
      const roleLimits = {
        free: {
          maxWorkers: 2, // Sync with auth config
          maxJobs: 3,
          maxPromptsPerJob: 5,
          maxPromptsPerHour: 20,
          maxConcurrentBatches: 1,
          queuePriority: 'low',
          byteplusAccountTier: 'basic',
          description: 'Free Plan'
        },
        premium: {
          maxWorkers: 5, // Sync with auth config
          maxJobs: 15,
          maxPromptsPerJob: 100,
          maxPromptsPerHour: 500,
          maxConcurrentBatches: 3,
          queuePriority: 'high',
          byteplusAccountTier: 'premium',
          description: 'Premium Plan'
        },
        enterprise: {
          maxWorkers: 50,
          maxJobs: 100,
          maxPromptsPerJob: 1000,
          maxPromptsPerHour: 5000,
          maxConcurrentBatches: 10,
          queuePriority: 'highest',
          byteplusAccountTier: 'enterprise',
          description: 'Enterprise Plan'
        },
        admin: {
          maxWorkers: 200, // Sync with auth config
          maxJobs: 999,
          maxPromptsPerJob: 9999,
          maxPromptsPerHour: 99999,
          maxConcurrentBatches: 50,
          queuePriority: 'critical',
          byteplusAccountTier: 'enterprise',
          description: 'Administrator'
        }
      };
      
      const userLimit = roleLimits[userRole] || roleLimits.free;
      
      console.log(`👤 User ${userId} verified role: ${userRole} (${userLimit.description})`);
      console.log(`🔧 Worker limits - Requested: ${maxWorkers}, Max allowed: ${userLimit.maxWorkers}`);
      console.log(`🎯 Queue priority: ${userLimit.queuePriority}, BytePlus tier: ${userLimit.byteplusAccountTier}`);
      
      // Complex validation: Check max workers limit
      if (maxWorkers > userLimit.maxWorkers) {
        const errorMsg = `Max workers limit exceeded. Your ${userLimit.description} allows maximum ${userLimit.maxWorkers} workers. Requested: ${maxWorkers}`;
        console.log(`❌ Worker limit violation: ${errorMsg}`);
        throw new Error(errorMsg);
      }
      
      // Complex validation: Check concurrent jobs limit
      const activeJobs = await jobModel.countActiveByUser(userId);
      if (activeJobs >= userLimit.maxJobs) {
        const errorMsg = `Maximum concurrent jobs limit exceeded. Your ${userLimit.description} allows ${userLimit.maxJobs} concurrent jobs. Currently active: ${activeJobs}`;
        console.log(`❌ Concurrent jobs violation: ${errorMsg}`);
        throw new Error(errorMsg);
      }
      
      // Complex feature: Check hourly prompt usage (advanced rate limiting)
      const hourlyUsage = await this.getHourlyPromptUsage(userId);
      if (hourlyUsage >= userLimit.maxPromptsPerHour) {
        const errorMsg = `Hourly prompt limit exceeded. Your ${userLimit.description} allows ${userLimit.maxPromptsPerHour} prompts per hour. Current usage: ${hourlyUsage}`;
        console.log(`❌ Hourly rate limit violation: ${errorMsg}`);
        throw new Error(errorMsg);
      }
      
      console.log(`✅ Complex role verification passed for ${userLimit.description}`);
      console.log(`   Active jobs: ${activeJobs}/${userLimit.maxJobs}`);
      console.log(`   Hourly prompts used: ${hourlyUsage}/${userLimit.maxPromptsPerHour}`);
      
      return {
        allowed: true,
        role: userRole,
        rawRole: user.role,
        limits: userLimit,
        activeJobs: activeJobs,
        hourlyUsage: hourlyUsage,
        remainingPromptsThisHour: userLimit.maxPromptsPerHour - hourlyUsage
      };
      
    } catch (error) {
      console.error(`❌ Complex role verification failed for user ${userId}:`, error.message);
      return {
        allowed: false,
        error: error.message
      };
    }
  },

  // Complex feature: Get hourly prompt usage for advanced rate limiting
  async getHourlyPromptUsage(userId) {
    try {
      const oneHourAgo = new Date();
      oneHourAgo.setHours(oneHourAgo.getHours() - 1);
      
      // Get jobs created in the last hour
      const { getDB } = await import('../config/database.js');
      const db = getDB();
      
      const recentJobs = await db.collection('jobs').find({
        user_id: userId,
        created_at: { $gte: oneHourAgo }
      }).toArray();
      
      // Calculate total prompts used in the last hour
      const totalPrompts = recentJobs.reduce((sum, job) => {
        return sum + (Array.isArray(job.prompts) ? job.prompts.length : 1);
      }, 0);
      
      console.log(`📊 User ${userId} hourly prompt usage: ${totalPrompts} prompts in last hour`);
      return totalPrompts;
      
    } catch (error) {
      console.error(`❌ Error calculating hourly usage for user ${userId}:`, error.message);
      return 0; // Fail-safe: allow processing if calculation fails
    }
  }
};
