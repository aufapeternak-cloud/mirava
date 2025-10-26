import { workerService } from '../services/workerService.js';
import { logService } from '../services/logService.js';

export const workerController = {
  async getWorkerStatus(req, res) {
    try {
      const workers = await workerService.getWorkerStatus(req.user.id);
      res.json({ workers });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  async streamWorkerStatus(req, res) {
    try {
      await workerService.addClient(res, req.user.id);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  streamLogs(req, res) {
    try {
      const { jobId } = req.query;
      logService.addClient(res, jobId || null);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
};
