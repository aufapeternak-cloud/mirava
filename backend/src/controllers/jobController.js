import { jobService } from '../services/jobService.js';

export const jobController = {
  async createJob(req, res) {
    try {
      const { prompts, ratio, saveTarget, maxWorkers, model, customWidth, customHeight } = req.validatedBody;

      // Build ratio string
      let finalRatio = ratio;
      if (ratio === 'custom' && customWidth && customHeight) {
        finalRatio = `${customWidth}:${customHeight}`;
      }

      const jobData = {
        prompts,
        ratio: finalRatio,
        saveTarget,
        maxWorkers, // Role verification will happen in service layer
        model
      };

      // Create job with role verification and layered backend processing
      const result = await jobService.createJob(req.user.id, jobData);

      res.status(201).json({
        message: 'Job created successfully',
        ...result
      });
      
    } catch (error) {
      console.error(`❌ Job creation failed for user ${req.user.id}:`, error.message);
      
      // Check if it's a role/limit violation
      if (error.message.includes('limit exceeded') || error.message.includes('Access denied')) {
        res.status(403).json({ error: error.message });
      } else {
        res.status(400).json({ error: error.message });
      }
    }
  },

  async getJob(req, res) {
    try {
      const { jobId } = req.params;
      const job = await jobService.getJobStatus(jobId);

      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }

      // Check if this is a Golang-managed job
      if (global.jobMappings && global.jobMappings.has(jobId)) {
        const mapping = global.jobMappings.get(jobId);
        if (mapping.golangJobId) {
          job.golang_job_id = mapping.golangJobId;
          job.managed_by = 'golang';
        }
      }

      res.json({ job });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  async getUserJobs(req, res) {
    try {
      const jobs = await jobService.getUserJobs(req.user.id);
      res.json({ jobs });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  // Callback endpoint for BytePlus service
  async handleByteplusCallback(req, res) {
    try {
      const byteplusData = req.body;
      const nodeJobId = req.headers['x-callback-jobid'] || req.query.nodeJobId; // Support header or query param
      
      if (!nodeJobId) {
        return res.status(400).json({ error: 'Missing Node.js job ID in headers or query' });
      }

      console.log(`📡 Received BytePlus callback for Node job ${nodeJobId}:`, byteplusData);

      const result = await jobService.handleByteplusCallback(nodeJobId, byteplusData);
      
      if (result.success) {
        res.json({ message: 'Callback processed successfully' });
      } else {
        res.status(400).json({ error: result.error });
      }
    } catch (error) {
      console.error('BytePlus callback error:', error);
      res.status(500).json({ error: error.message });
    }
  }
};
