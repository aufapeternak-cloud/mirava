import express from 'express';
import { workerController } from '../controllers/workerController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Obfuscated worker routes: /api/wrk/grid29/* and /api/sts/k7q/*
router.get('/status', authenticateToken, workerController.getWorkerStatus);
router.get('/stream', authenticateToken, workerController.streamWorkerStatus);
router.get('/logs/stream', authenticateToken, workerController.streamLogs);

export default router;
