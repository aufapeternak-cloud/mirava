import express from 'express';
import multer from 'multer';
import { promptController } from '../controllers/promptController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB default
    files: 1
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/plain' || file.originalname.endsWith('.txt')) {
      cb(null, true);
    } else {
      cb(new Error('Only .txt files are allowed'));
    }
  }
});

// Obfuscated prompt routes: /api/pmt/ingest/*
router.post('/parse', authenticateToken, promptController.parseManualPrompts);
router.post('/upload', authenticateToken, upload.single('file'), promptController.parseFilePrompts);

export default router;
