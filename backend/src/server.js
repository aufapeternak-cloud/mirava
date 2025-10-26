import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';

// Import database connection
import connectDB from './config/database.js';

// Import routes
import authRoutes from './routes/auth.js';
import promptRoutes from './routes/prompts.js';
import jobRoutes from './routes/jobs.js';
import userRoutes from './routes/users.js';
import workerRoutes from './routes/workers.js';
import capcutRoutes from './routes/capcutRoutes.js';

// Import rate limiting middleware
import { requestLogger, generalRateLimit } from './middleware/rateLimit.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable for development
  crossOriginEmbedderPolicy: false
}));

// Compression
app.use(compression());

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parsing
app.use(cookieParser());

// Request logging (dengan rate limiting detection)
app.use(requestLogger);

// Global rate limiting untuk semua routes (kecuali yang sudah didefine khusus)
app.use(generalRateLimit);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes (obfuscated paths)
app.use('/api/x7auth/session', authRoutes);           // Auth routes
app.use('/api/pmt/ingest', promptRoutes);             // Prompt ingestion
app.use('/api/vdo/fabric', jobRoutes);                // Job/video generation
app.use('/api/usr/caps', userRoutes);                 // User capabilities
app.use('/api/wrk/grid29', workerRoutes);             // Worker status (REST)
app.use('/api/sts/k7q', workerRoutes);                // Streams (SSE)
app.use('/api/cap', capcutRoutes);                    // CapCut API (Premium/Admin only)

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);

  if (err.name === 'MulterError') {
    return res.status(400).json({ error: `File upload error: ${err.message}` });
  }

  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server with MongoDB connection
async function startServer() {
  try {
    // Connect to MongoDB first
    await connectDB();

    // Start Express server
    app.listen(PORT, () => {
      console.log(`\n🚀 Video Generation API Server`);
      console.log(`📡 Running on: http://localhost:${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔐 CORS Origin: ${process.env.CORS_ORIGIN || 'http://localhost:3000'}`);
      console.log(`\n📚 API Endpoints (obfuscated):`);
      console.log(`   Auth:    /api/x7auth/session/*`);
      console.log(`   Prompts: /api/pmt/ingest/*`);
      console.log(`   Jobs:    /api/vdo/fabric/*`);
      console.log(`   Users:   /api/usr/caps/*`);
      console.log(`   Workers: /api/wrk/grid29/*`);
      console.log(`   Streams: /api/sts/k7q/*`);
      console.log(`   CapCut:  /api/cap/vgen/* (Premium/Admin)`);
      console.log(`\n✅ Server ready!\n`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});
