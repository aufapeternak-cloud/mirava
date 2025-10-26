import { authService } from '../services/authService.js';
import { authConfig } from '../config/auth.js';
import { workerService } from '../services/workerService.js';

export const authController = {
  async register(req, res) {
    try {
      const { email, password, role } = req.validatedBody;
      const user = await authService.register(email, password, role);

      // Initialize workers for new user
      await workerService.initializeWorkers(user.id, user.maxWorkers);

      res.status(201).json({
        message: 'User registered successfully',
        user: {
          id: user.id,
          email: user.email,
          role: user.role
        }
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  async login(req, res) {
    try {
      const { email, password } = req.validatedBody;
      console.log('Login controller - validated body:', { email, hasPassword: !!password });

      const { token, user } = await authService.login(email, password);

      // Initialize/refresh workers
      await workerService.initializeWorkers(user.id, user.maxWorkers);

      // Set httpOnly cookie
      res.cookie(authConfig.cookieName, token, authConfig.cookieOptions);

      res.json({
        message: 'Login successful',
        user
      });
    } catch (error) {
      console.error('Login controller error:', error.message);
      res.status(401).json({ error: error.message });
    }
  },

  async logout(req, res) {
    res.clearCookie(authConfig.cookieName);
    res.json({ message: 'Logout successful' });
  },

  async me(req, res) {
    const remainingTTL = authService.getRemainingTTL(req.user);

    res.json({
      user: {
        id: req.user.id,
        email: req.user.email,
        role: req.user.role,
        maxWorkers: req.user.maxWorkers,
        ttlSeconds: req.user.ttlSeconds,
        remainingTTL
      }
    });
  }
};
