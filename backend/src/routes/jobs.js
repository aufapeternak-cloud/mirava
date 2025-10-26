import express from 'express';
import { jobController } from '../controllers/jobController.js';
import { authenticateToken } from '../middleware/auth.js';
import { validateRequest, validateJobLimits, schemas } from '../middleware/validation.js';
import { jobCreationRateLimit, generalRateLimit } from '../middleware/rateLimit.js';

const router = express.Router();

// Obfuscated job routes: /api/vdo/fabric/* dengan rate limiting
router.post('/create', 
  jobCreationRateLimit,
  authenticateToken, 
  validateRequest(schemas.createJob), 
  validateJobLimits, 
  jobController.createJob
);
router.get('/status/:jobId', generalRateLimit, authenticateToken, jobController.getJob);
router.get('/list', generalRateLimit, authenticateToken, jobController.getUserJobs);

// Callback endpoint for BytePlus service (no auth required for internal service)
router.post('/byteplus-callback', jobController.handleByteplusCallback);

export default router;
