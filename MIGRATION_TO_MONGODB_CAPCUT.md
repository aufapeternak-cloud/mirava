# Migration Guide: SQLite to MongoDB + CapCut Integration

Panduan lengkap untuk migrasi database dari SQLite ke MongoDB Atlas dan integrasi CapCut API.

---

## 📋 Overview Perubahan

### 1. Database Migration
- ❌ **Remove**: SQLite (sql.js)
- ✅ **Add**: MongoDB Atlas

### 2. Role System Update
| Role | Max Workers | TTL | CapCut Access |
|------|-------------|-----|---------------|
| FREE | 2 | 30 min | ❌ No |
| PREMIUM | 5 | 2 hours | ✅ Yes |
| ADMIN | 200 | 24 hours | ✅ Yes |

### 3. New Features
- ✅ CapCut API Integration (Premium & Admin only)
- ✅ MongoDB Atlas cloud database
- ✅ Admin role dengan 200 workers

---

## 🔧 Step 1: Install Dependencies

```bash
cd backend
npm install mongodb axios
npm uninstall sql.js
```

**Updated package.json dependencies:**
```json
{
  "mongodb": "^6.3.0",
  "axios": "^1.6.2"
}
```

---

## 🗄️ Step 2: MongoDB Configuration

### File: `backend/src/config/database.js`

**Ganti seluruh isi dengan:**

```javascript
import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://naddrzz10_db_user:memekhitamlegam@cluster0-mirava.k2l2kzo.mongodb.net/?appName=Cluster0-mirava';
const DB_NAME = process.env.DB_NAME || 'video-gen-platform';

let client;
let db;

async function connectDB() {
  try {
    if (!client) {
      client = new MongoClient(MONGODB_URI);
      await client.connect();
      db = client.db(DB_NAME);

      // Create indexes
      await db.collection('users').createIndex({ email: 1 }, { unique: true });
      await db.collection('jobs').createIndex({ user_id: 1 });
      await db.collection('jobs').createIndex({ created_at: -1 });
      await db.collection('workers').createIndex({ user_id: 1 });
      await db.collection('logs').createIndex({ job_id: 1 });
      await db.collection('logs').createIndex({ created_at: -1 });

      console.log('✅ MongoDB connected successfully');
    }
    return db;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    throw error;
  }
}

export function getDB() {
  if (!db) {
    throw new Error('Database not initialized. Call connectDB() first.');
  }
  return db;
}

export async function closeDB() {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log('MongoDB connection closed');
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  await closeDB();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await closeDB();
  process.exit(0);
});

export default connectDB;
```

---

## 👥 Step 3: Update Role Configuration

### File: `backend/src/config/auth.js`

**Update roleConfig:**

```javascript
export const roleConfig = {
  FREE: {
    maxWorkers: 2,
    ttlSeconds: 30 * 60, // 30 minutes
    features: ['basic_generation'],
    canUseCapCut: false
  },
  PREMIUM: {
    maxWorkers: 5,
    ttlSeconds: 2 * 60 * 60, // 2 hours
    features: ['basic_generation', 'model_selection', 'priority_queue', 'capcut_api'],
    canUseCapCut: true
  },
  ADMIN: {
    maxWorkers: 200,
    ttlSeconds: 24 * 60 * 60, // 24 hours
    features: ['basic_generation', 'model_selection', 'priority_queue', 'capcut_api', 'admin_panel'],
    canUseCapCut: true
  }
};
```

---

## 📊 Step 4: MongoDB Models

### File: `backend/src/models/db.js`

**Lihat file lengkap di: `MONGODB_MODELS_COMPLETE.md`**

**Key changes:**
- Menggunakan MongoDB ObjectId
- Async/await untuk semua operations
- Support untuk CapCut job tracking

---

## 🎬 Step 5: CapCut Service Integration

### File: `backend/src/services/capcutService.js` (NEW)

```javascript
import axios from 'axios';

const CAPCUT_API_URL = process.env.CAPCUT_API_URL || 'http://localhost:8085';

class CapCutService {
  async generateVideo(prompt, ratio = '16:9', mode = 'browser') {
    try {
      const response = await axios.post(`${CAPCUT_API_URL}/generate`, {
        prompts: [prompt],
        aspect: ratio,
        mode,
        debug: process.env.NODE_ENV === 'development'
      });

      return {
        jobId: response.data.job_id,
        status: response.data.status
      };
    } catch (error) {
      throw new Error(`CapCut API error: ${error.message}`);
    }
  }

  async checkJobStatus(jobId) {
    try {
      const response = await axios.get(`${CAPCUT_API_URL}/jobs/${jobId}`);
      return response.data;
    } catch (error) {
      throw new Error(`CapCut status check error: ${error.message}`);
    }
  }

  async getVideoDownloadUrl(filename) {
    return `${CAPCUT_API_URL}/video/${filename}`;
  }
}

export const capcutService = new CapCutService();
```

---

## 🛣️ Step 6: New CapCut Routes

### File: `backend/src/routes/capcut.js` (NEW)

```javascript
import express from 'express';
import { capcutController } from '../controllers/capcutController.js';
import { authenticateToken } from '../middleware/auth.js';
import { validateRequest, schemas } from '../middleware/validation.js';

const router = express.Router();

// Obfuscated CapCut routes: /api/cap/vgen/*
router.post('/submit', authenticateToken, validateRequest(schemas.capcutJob), capcutController.submitJob);
router.get('/status/:jobId', authenticateToken, capcutController.getJobStatus);

export default router;
```

---

## 🎮 Step 7: CapCut Controller

### File: `backend/src/controllers/capcutController.js` (NEW)

```javascript
import { capcutService } from '../services/capcutService.js';
import { jobModel } from '../models/db.js';
import crypto from 'crypto';

export const capcutController = {
  async submitJob(req, res) {
    try {
      const { prompt, ratio, mode } = req.validatedBody;

      // Check if user can use CapCut
      if (!req.user.canUseCapCut) {
        return res.status(403).json({
          error: 'CapCut API access is only available for PREMIUM and ADMIN users'
        });
      }

      // Submit to CapCut API
      const capcutJob = await capcutService.generateVideo(prompt, ratio, mode);

      // Create job in our database
      const jobId = `capcut_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

      await jobModel.create(
        jobId,
        req.user.id,
        [prompt],
        ratio,
        mode,
        1, // max workers for CapCut jobs
        null, // model
        true // is_capcut
      );

      // Update with CapCut job ID
      await jobModel.updateCapCutStatus(jobId, capcutJob.jobId, capcutJob.status);

      res.status(201).json({
        message: 'CapCut job submitted successfully',
        jobId,
        capcutJobId: capcutJob.jobId,
        status: capcutJob.status
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  async getJobStatus(req, res) {
    try {
      const { jobId } = req.params;

      // Get our job
      const job = await jobModel.findById(jobId);
      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }

      // Check ownership
      if (job.user_id.toString() !== req.user.id.toString()) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      // Get CapCut status
      if (job.capcut_job_id) {
        const capcutStatus = await capcutService.checkJobStatus(job.capcut_job_id);

        // Update our database
        await jobModel.updateCapCutStatus(jobId, job.capcut_job_id, capcutStatus.status);

        return res.json({
          jobId,
          status: capcutStatus.status,
          capcut: capcutStatus,
          downloadUrl: capcutStatus.download_url
            ? capcutService.getVideoDownloadUrl(capcutStatus.filename)
            : null
        });
      }

      res.json({ job });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
};
```

---

## ✅ Step 8: Validation Schema

### File: `backend/src/middleware/validation.js`

**Add new schema:**

```javascript
export const schemas = {
  // ... existing schemas ...

  capcutJob: Joi.object({
    prompt: Joi.string().min(1).max(1000).required(),
    ratio: Joi.string().valid('16:9', '9:16', '1:1', '4:5').default('16:9'),
    mode: Joi.string().valid('browser', 'local', 'gdrive').default('browser')
  })
};
```

---

## 🚀 Step 9: Update Server.js

### File: `backend/src/server.js`

**Add:**

```javascript
import connectDB from './config/database.js';
import capcutRoutes from './routes/capcut.js';

// ... existing code ...

// Connect to MongoDB before starting server
connectDB().then(() => {
  // Register CapCut routes
  app.use('/api/cap/vgen', capcutRoutes);

  // Start server
  app.listen(PORT, () => {
    console.log(`\n🚀 Video Generation API Server`);
    console.log(`📡 Running on: http://localhost:${PORT}`);
    console.log(`🗄️  Database: MongoDB Atlas`);
    console.log(`🎬 CapCut API: Enabled`);
    // ... rest of logs
  });
}).catch((error) => {
  console.error('Failed to connect to database:', error);
  process.exit(1);
});
```

---

## 🌱 Step 10: Seed Script MongoDB

### File: `backend/scripts/seed.js`

```javascript
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import connectDB, { closeDB } from '../src/config/database.js';
import { ObjectId } from 'mongodb';

dotenv.config();

async function seed() {
  console.log('🌱 Seeding MongoDB database...\n');

  try {
    const db = await connectDB();

    // Clear existing data
    await db.collection('logs').deleteMany({});
    await db.collection('workers').deleteMany({});
    await db.collection('jobs').deleteMany({});
    await db.collection('users').deleteMany({});

    // Create FREE user
    const freePassword = await bcrypt.hash('password123', 10);
    const freeUser = await db.collection('users').insertOne({
      email: 'free@test.com',
      password: freePassword,
      role: 'FREE',
      max_workers: 2,
      ttl_seconds: 1800,
      created_at: new Date(),
      session_started_at: new Date()
    });

    console.log('✅ FREE user created:');
    console.log('   Email: free@test.com');
    console.log('   Password: password123');
    console.log('   Max Workers: 2\n');

    // Create PREMIUM user
    const premiumPassword = await bcrypt.hash('password123', 10);
    const premiumUser = await db.collection('users').insertOne({
      email: 'premium@test.com',
      password: premiumPassword,
      role: 'PREMIUM',
      max_workers: 5,
      ttl_seconds: 7200,
      created_at: new Date(),
      session_started_at: new Date()
    });

    console.log('✅ PREMIUM user created:');
    console.log('   Email: premium@test.com');
    console.log('   Password: password123');
    console.log('   Max Workers: 5\n');

    // Create ADMIN user
    const adminPassword = await bcrypt.hash('admin123', 10);
    const adminUser = await db.collection('users').insertOne({
      email: 'admin@test.com',
      password: adminPassword,
      role: 'ADMIN',
      max_workers: 200,
      ttl_seconds: 86400,
      created_at: new Date(),
      session_started_at: new Date()
    });

    console.log('✅ ADMIN user created:');
    console.log('   Email: admin@test.com');
    console.log('   Password: admin123');
    console.log('   Max Workers: 200\n');

    // Initialize workers for each user
    const servers = [
      'us-east-1.compute.cloud',
      'us-west-2.compute.cloud',
      'eu-west-1.compute.cloud',
      'ap-southeast-1.compute.cloud',
      'us-central-1.compute.cloud'
    ];

    // FREE workers (2)
    for (let i = 1; i <= 2; i++) {
      await db.collection('workers').insertOne({
        worker_id: i,
        user_id: freeUser.insertedId,
        server_name: servers[i - 1],
        status: 'idle',
        last_heartbeat: new Date()
      });
    }
    console.log('✅ Initialized 2 workers for FREE user\n');

    // PREMIUM workers (5)
    for (let i = 1; i <= 5; i++) {
      await db.collection('workers').insertOne({
        worker_id: i,
        user_id: premiumUser.insertedId,
        server_name: servers[i % servers.length],
        status: 'idle',
        last_heartbeat: new Date()
      });
    }
    console.log('✅ Initialized 5 workers for PREMIUM user\n');

    // ADMIN workers (just initialize 10 for demo, can scale to 200)
    for (let i = 1; i <= 10; i++) {
      await db.collection('workers').insertOne({
        worker_id: i,
        user_id: adminUser.insertedId,
        server_name: servers[i % servers.length],
        status: 'idle',
        last_heartbeat: new Date()
      });
    }
    console.log('✅ Initialized 10 workers for ADMIN user (scalable to 200)\n');

    console.log('🎉 Seed completed successfully!\n');
    console.log('You can now login with:');
    console.log('  - free@test.com / password123 (FREE tier)');
    console.log('  - premium@test.com / password123 (PREMIUM tier)');
    console.log('  - admin@test.com / admin123 (ADMIN tier)\n');

    await closeDB();
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    await closeDB();
    process.exit(1);
  }
}

seed();
```

---

## 🔐 Step 11: Environment Variables

### File: `backend/.env`

**Update:**

```env
PORT=5000
JWT_SECRET=your-super-secret-jwt-key-change-in-production-min-32-chars-required
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000

# MongoDB Atlas
MONGODB_URI=mongodb+srv://naddrzz10_db_user:memekhitamlegam@cluster0-mirava.k2l2kzo.mongodb.net/?appName=Cluster0-mirava
DB_NAME=video-gen-platform

# CapCut API
CAPCUT_API_URL=http://localhost:8085

# File upload limits
MAX_FILE_SIZE=5242880
MAX_PROMPT_LINES=1000
```

---

## 📱 Step 12: Frontend Updates

### Update API Client: `frontend/lib/api.js`

**Add:**

```javascript
export const api = {
  // ... existing endpoints ...

  capcut: {
    async submit(prompt, ratio = '16:9', mode = 'browser') {
      return request('/api/cap/vgen/submit', {
        method: 'POST',
        body: JSON.stringify({ prompt, ratio, mode })
      });
    },

    async getStatus(jobId) {
      return request(`/api/cap/vgen/status/${jobId}`);
    }
  }
};
```

---

## 🧪 Testing

### 1. Test MongoDB Connection

```bash
cd backend
npm install
npm run seed
```

**Expected:**
```
✅ MongoDB connected successfully
✅ FREE user created
✅ PREMIUM user created
✅ ADMIN user created
```

### 2. Test Backend API

```bash
npm run dev
```

**Expected:**
```
🚀 Video Generation API Server
📡 Running on: http://localhost:5000
🗄️  Database: MongoDB Atlas
🎬 CapCut API: Enabled
✅ Server ready!
```

### 3. Test CapCut Integration

```bash
# Login as PREMIUM user
curl -X POST http://localhost:5000/api/x7auth/session/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email":"premium@test.com","password":"password123"}'

# Submit CapCut job (PREMIUM only)
curl -X POST http://localhost:5000/api/cap/vgen/submit \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"prompt":"Create a cinematic travel montage","ratio":"16:9"}'
```

---

## 📊 Migration Checklist

- [ ] Install MongoDB driver & axios
- [ ] Update database.js to MongoDB
- [ ] Update auth.js with new roles
- [ ] Create MongoDB models (db.js)
- [ ] Create CapCut service
- [ ] Create CapCut routes
- [ ] Create CapCut controller
- [ ] Update validation schemas
- [ ] Update server.js
- [ ] Create MongoDB seed script
- [ ] Update .env with MongoDB URI
- [ ] Update frontend API client
- [ ] Test MongoDB connection
- [ ] Test user authentication
- [ ] Test CapCut API integration
- [ ] Update documentation

---

## 🔄 Rollback Plan

If migration fails:

1. Keep old SQLite code as backup
2. Git branch for MongoDB changes
3. Can revert to SQLite anytime

```bash
git checkout -b mongodb-migration
# Make changes
# Test

# If successful
git merge mongodb-migration

# If failed
git checkout main
```

---

## 📚 Next Steps

1. ✅ Complete migration steps 1-12
2. Test all endpoints
3. Update frontend UI for CapCut
4. Add admin panel features
5. Deploy to production

---

**Created:** 2025-10-26
**Version:** 1.0.0
**Status:** Ready for implementation
