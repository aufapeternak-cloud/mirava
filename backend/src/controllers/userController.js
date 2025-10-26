import { authService } from '../services/authService.js';

export const userController = {
  getUserCaps(req, res) {
    try {
      res.json({
        maxWorkers: req.user.maxWorkers,
        role: req.user.role,
        features: req.user.role === 'PREMIUM'
          ? ['basic_generation', 'model_selection', 'priority_queue']
          : ['basic_generation']
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  getRemainingTTL(req, res) {
    try {
      const remainingSeconds = authService.getRemainingTTL(req.user);

      res.json({
        remainingSeconds,
        totalSeconds: req.user.ttlSeconds,
        percentRemaining: (remainingSeconds / req.user.ttlSeconds) * 100
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
};
