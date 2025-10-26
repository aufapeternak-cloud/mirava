import capcutService from '../services/capcutService.js';
import { jobModel } from '../models/db.js';
import { roleConfig } from '../config/auth.js';

export const generateVideoController = async (req, res) => {
  try {
    const { prompt, ratio = '16:9', mode = 'browser' } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Check if user has access to CapCut
    if (!roleConfig[userRole]?.canUseCapCut) {
      return res.status(403).json({
        error: 'CapCut API is only available for Premium and Admin users'
      });
    }

    // Validate input
    if (!prompt || prompt.trim().length === 0) {
      return res.status(400).json({
        error: 'Prompt is required'
      });
    }

    if (!capcutService.isValidRatio(ratio)) {
      return res.status(400).json({
        error: 'Invalid aspect ratio. Use: 16:9, 9:16, or 1:1'
      });
    }

    if (!capcutService.isValidMode(mode)) {
      return res.status(400).json({
        error: 'Invalid mode. Use: browser or api'
      });
    }

    // Call CapCut API
    const result = await capcutService.generateVideo(prompt, ratio, mode);

    // Store job in database
    const jobId = `capcut_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await jobModel.create(jobId, userId, [prompt], ratio, 'capcut', 1, 'capcut');

    res.json({
      success: true,
      jobId,
      capcutJobId: result.jobId,
      status: result.status,
      message: result.message
    });
  } catch (error) {
    console.error('Generate video error:', error);
    res.status(500).json({
      error: error.message || 'Failed to generate video'
    });
  }
};

export const checkStatusController = async (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Check if user has access to CapCut
    if (!roleConfig[userRole]?.canUseCapCut) {
      return res.status(403).json({
        error: 'CapCut API is only available for Premium and Admin users'
      });
    }

    if (!jobId) {
      return res.status(400).json({
        error: 'Job ID is required'
      });
    }

    // Check status from CapCut
    const status = await capcutService.checkStatus(jobId);

    // Update job in database if completed
    if (status.status === 'completed' || status.status === 'failed') {
      const dbJobId = `capcut_${jobId}`;
      const job = await jobModel.findById(dbJobId);

      if (job && job.user_id === userId) {
        await jobModel.updateStatus(dbJobId, status.status);
      }
    }

    res.json({
      success: true,
      ...status
    });
  } catch (error) {
    console.error('Check status error:', error);
    res.status(500).json({
      error: error.message || 'Failed to check status'
    });
  }
};

export const downloadVideoController = async (req, res) => {
  try {
    const { videoUrl } = req.body;
    const userRole = req.user.role;

    // Check if user has access to CapCut
    if (!roleConfig[userRole]?.canUseCapCut) {
      return res.status(403).json({
        error: 'CapCut API is only available for Premium and Admin users'
      });
    }

    if (!videoUrl) {
      return res.status(400).json({
        error: 'Video URL is required'
      });
    }

    // Download video
    const videoBuffer = await capcutService.downloadVideo(videoUrl);

    // Set headers for video download
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Disposition', `attachment; filename="video_${Date.now()}.mp4"`);
    res.setHeader('Content-Length', videoBuffer.length);

    res.send(videoBuffer);
  } catch (error) {
    console.error('Download video error:', error);
    res.status(500).json({
      error: error.message || 'Failed to download video'
    });
  }
};

export const healthCheckController = async (req, res) => {
  try {
    const userRole = req.user.role;

    // Check if user has access to CapCut
    if (!roleConfig[userRole]?.canUseCapCut) {
      return res.status(403).json({
        error: 'CapCut API is only available for Premium and Admin users'
      });
    }

    const health = await capcutService.healthCheck();

    res.json({
      success: true,
      ...health
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      error: error.message || 'Failed to check health'
    });
  }
};
