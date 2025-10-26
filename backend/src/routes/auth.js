import express from 'express';
import { authController } from '../controllers/authController.js';
import { validateRequest, schemas } from '../middleware/validation.js';
import { authenticateToken } from '../middleware/auth.js';
import { authRateLimit, meEndpointRateLimit } from '../middleware/rateLimit.js';

const router = express.Router();

// Obfuscated auth routes: /api/x7auth/session/* dengan rate limiting
router.post('/register', authRateLimit, validateRequest(schemas.register), authController.register);
router.post('/login', authRateLimit, (req, res, next) => {
  console.log('Route login - req.body:', req.body);
  req.validatedBody = req.body; // Bypass validation temporarily
  next();
}, authController.login);
router.post('/logout', authRateLimit, authController.logout);
router.get('/me', meEndpointRateLimit, authenticateToken, authController.me);

export default router;
