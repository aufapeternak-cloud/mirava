import express from 'express';
import {
  generateVideoController,
  checkStatusController,
  downloadVideoController,
  healthCheckController
} from '../controllers/capcutController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// All CapCut routes require authentication
router.use(authenticateToken);

// POST /api/cap/vgen/generate - Generate video with CapCut
router.post('/vgen/generate', generateVideoController);

// GET /api/cap/vgen/status/:jobId - Check video generation status
router.get('/vgen/status/:jobId', checkStatusController);

// POST /api/cap/vgen/download - Download generated video
router.post('/vgen/download', downloadVideoController);

// GET /api/cap/vgen/health - Check CapCut API health
router.get('/vgen/health', healthCheckController);

export default router;
