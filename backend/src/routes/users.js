import express from 'express';
import { userController } from '../controllers/userController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Obfuscated user routes: /api/usr/caps/*
router.get('/limits', authenticateToken, userController.getUserCaps);
router.get('/ttl-q9a', authenticateToken, userController.getRemainingTTL);

export default router;
