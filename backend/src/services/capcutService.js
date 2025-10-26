import axios from 'axios';

const CAPCUT_API_URL = process.env.CAPCUT_API_URL || 'https://editryx-videogen-capcut.hf.space';

class CapCutService {
  constructor() {
    this.baseURL = CAPCUT_API_URL;
  }

  /**
   * Generate video using CapCut API
   * @param {string} prompt - The video generation prompt
   * @param {string} ratio - Aspect ratio (16:9, 9:16, 1:1)
   * @param {string} mode - Generation mode (browser or api)
   * @returns {Promise<{jobId: string, status: string}>}
   */
  async generateVideo(prompt, ratio = '16:9', mode = 'browser') {
    try {
      const response = await axios.post(`${this.baseURL}/generate`, {
        prompts: [prompt],
        aspect: ratio,
        mode,
        debug: process.env.NODE_ENV === 'development'
      }, {
        timeout: 30000, // 30 seconds timeout
        headers: {
          'Content-Type': 'application/json'
        }
      });

      return {
        jobId: response.data.job_id,
        status: response.data.status || 'pending',
        message: response.data.message || 'Video generation started'
      };
    } catch (error) {
      console.error('CapCut API Error:', error.message);
      throw new Error(`CapCut API failed: ${error.response?.data?.error || error.message}`);
    }
  }

  /**
   * Check the status of a CapCut video generation job
   * @param {string} jobId - The job ID from CapCut
   * @returns {Promise<{status: string, videoUrl?: string, progress?: number}>}
   */
  async checkStatus(jobId) {
    try {
      const response = await axios.get(`${this.baseURL}/status/${jobId}`, {
        timeout: 10000
      });

      return {
        status: response.data.status,
        videoUrl: response.data.video_url || null,
        progress: response.data.progress || 0,
        error: response.data.error || null
      };
    } catch (error) {
      console.error('CapCut Status Check Error:', error.message);
      throw new Error(`Failed to check status: ${error.response?.data?.error || error.message}`);
    }
  }

  /**
   * Download video from CapCut result URL
   * @param {string} videoUrl - The video URL from CapCut
   * @returns {Promise<Buffer>}
   */
  async downloadVideo(videoUrl) {
    try {
      const response = await axios.get(videoUrl, {
        responseType: 'arraybuffer',
        timeout: 60000 // 60 seconds for video download
      });

      return Buffer.from(response.data);
    } catch (error) {
      console.error('Video Download Error:', error.message);
      throw new Error(`Failed to download video: ${error.message}`);
    }
  }

  /**
   * Validate aspect ratio
   * @param {string} ratio - Aspect ratio to validate
   * @returns {boolean}
   */
  isValidRatio(ratio) {
    const validRatios = ['16:9', '9:16', '1:1'];
    return validRatios.includes(ratio);
  }

  /**
   * Validate generation mode
   * @param {string} mode - Mode to validate
   * @returns {boolean}
   */
  isValidMode(mode) {
    const validModes = ['browser', 'api'];
    return validModes.includes(mode);
  }

  /**
   * Get health status of CapCut API
   * @returns {Promise<{healthy: boolean, message: string}>}
   */
  async healthCheck() {
    try {
      const response = await axios.get(`${this.baseURL}/health`, {
        timeout: 5000
      });

      return {
        healthy: true,
        message: 'CapCut API is operational',
        version: response.data.version || 'unknown'
      };
    } catch (error) {
      return {
        healthy: false,
        message: `CapCut API is unavailable: ${error.message}`,
        version: 'unknown'
      };
    }
  }
}

export default new CapCutService();
