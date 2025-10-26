# Complete File Tree

```
video-gen-app/
│
├── 📄 README.md                      # Main documentation & setup guide
├── 📄 QUICKSTART.md                  # 5-minute setup instructions
├── 📄 TESTING.md                     # 80+ acceptance tests checklist
├── 📄 ARCHITECTURE.md                # Technical architecture & data flow
├── 📄 PROJECT_SUMMARY.md             # Complete project overview
├── 📄 FILE_TREE.md                   # This file
├── 📄 .gitignore                     # Git exclusions
├── 🔧 setup.bat                      # Automated setup script (Windows)
│
├── 📁 backend/                       # Express API Server (Port 5000)
│   ├── 📄 package.json               # Backend dependencies
│   ├── 📄 .env                       # Environment variables (created)
│   ├── 📄 .env.example               # Environment template
│   │
│   ├── 📁 src/
│   │   ├── 📄 server.js              # Main entry point
│   │   │
│   │   ├── 📁 config/
│   │   │   ├── 📄 database.js        # SQLite setup & schema
│   │   │   └── 📄 auth.js            # JWT & role configuration
│   │   │
│   │   ├── 📁 models/
│   │   │   └── 📄 db.js              # Database models (users, jobs, workers, logs)
│   │   │
│   │   ├── 📁 middleware/
│   │   │   ├── 📄 auth.js            # JWT authentication middleware
│   │   │   └── 📄 validation.js      # Joi validation schemas
│   │   │
│   │   ├── 📁 services/
│   │   │   ├── 📄 authService.js     # Auth logic (register, login, TTL)
│   │   │   ├── 📄 jobService.js      # Job processing & orchestration
│   │   │   ├── 📄 workerService.js   # Worker management & SSE
│   │   │   ├── 📄 logService.js      # Log broadcasting & SSE
│   │   │   └── 📄 serverSelection.js # Server assignment (round-robin)
│   │   │
│   │   ├── 📁 controllers/
│   │   │   ├── 📄 authController.js      # /api/x7auth/session/*
│   │   │   ├── 📄 promptController.js    # /api/pmt/ingest/*
│   │   │   ├── 📄 jobController.js       # /api/vdo/fabric/*
│   │   │   ├── 📄 userController.js      # /api/usr/caps/*
│   │   │   └── 📄 workerController.js    # /api/wrk/grid29/* + /api/sts/k7q/*
│   │   │
│   │   └── 📁 routes/
│   │       ├── 📄 auth.js            # Auth routes
│   │       ├── 📄 prompts.js         # Prompt ingestion routes
│   │       ├── 📄 jobs.js            # Job creation & status routes
│   │       ├── 📄 users.js           # User capability routes
│   │       └── 📄 workers.js         # Worker status & SSE routes
│   │
│   └── 📁 scripts/
│       └── 📄 seed.js                # Database seeding (demo users)
│
├── 📁 frontend/                      # Next.js Application (Port 3000)
│   ├── 📄 package.json               # Frontend dependencies
│   ├── 📄 next.config.js             # Next.js configuration
│   ├── 📄 .env.local                 # Environment variables (created)
│   ├── 📄 .env.local.example         # Environment template
│   ├── 📄 middleware.js              # Auth redirect middleware
│   │
│   ├── 📁 app/                       # Next.js App Router
│   │   ├── 📄 layout.js              # Root layout (Bootstrap + custom CSS)
│   │   ├── 📄 page.js                # Home/Dashboard (auth required)
│   │   │
│   │   ├── 📁 login/
│   │   │   └── 📄 page.js            # Login page
│   │   │
│   │   └── 📁 register/
│   │       └── 📄 page.js            # Registration page
│   │
│   ├── 📁 components/
│   │   ├── 📄 Navbar.js              # Top navigation (TTL, role badge, logout)
│   │   ├── 📄 GeneratorForm.js       # Main generation form
│   │   ├── 📄 PromptInput.js         # Textarea + file upload
│   │   ├── 📄 WorkerStatus.js        # Live worker status table (SSE)
│   │   └── 📄 LogsPanel.js           # Live console logs (SSE)
│   │
│   ├── 📁 lib/
│   │   └── 📄 api.js                 # API client (fetch wrapper)
│   │
│   └── 📁 public/
│       └── 📄 custom.css             # Dark theme custom styles
│
└── 💾 [Generated at Runtime]
    └── backend/dev.db                # SQLite database (auto-created)
```

## File Count Summary

| Category | Count |
|----------|-------|
| Documentation | 6 |
| Backend Source | 19 |
| Frontend Source | 13 |
| Config/Scripts | 6 |
| **Total** | **44** |

## Key Files by Function

### 🔐 Authentication
- `backend/src/config/auth.js` - JWT & role config
- `backend/src/middleware/auth.js` - Token validation
- `backend/src/services/authService.js` - Login/register logic
- `frontend/middleware.js` - Route protection

### 📊 Database
- `backend/src/config/database.js` - Schema initialization
- `backend/src/models/db.js` - CRUD operations
- `backend/scripts/seed.js` - Demo data

### 🎬 Video Generation
- `backend/src/services/jobService.js` - Job processing
- `backend/src/services/workerService.js` - Worker orchestration
- `frontend/components/GeneratorForm.js` - User interface

### 📡 Real-time (SSE)
- `backend/src/services/logService.js` - Log streaming
- `backend/src/services/workerService.js` - Worker updates
- `frontend/components/LogsPanel.js` - Log display
- `frontend/components/WorkerStatus.js` - Worker display

### 🎨 UI/UX
- `frontend/public/custom.css` - Dark theme
- `frontend/app/layout.js` - Bootstrap integration
- `frontend/components/Navbar.js` - Navigation + TTL

### 🛠️ Setup & Docs
- `README.md` - Main documentation
- `QUICKSTART.md` - Fast setup
- `TESTING.md` - Test checklist
- `setup.bat` - Automated setup

## Import Paths Reference

### Backend

```javascript
// Server
import express from 'express';  // server.js

// Routes
import authRoutes from './routes/auth.js';

// Controllers
import { authController } from '../controllers/authController.js';

// Services
import { authService } from '../services/authService.js';

// Models
import { userModel } from '../models/db.js';

// Config
import db from '../config/database.js';
import { authConfig } from '../config/auth.js';
```

### Frontend

```javascript
// Next.js
import { useRouter } from 'next/navigation';  // App Router

// Components
import Navbar from '../components/Navbar';

// API
import { api } from '../lib/api';

// Styles
import 'bootstrap/dist/css/bootstrap.min.css';
import '../public/custom.css';
```

## Environment Files

### Backend `.env`
```
PORT=5000
JWT_SECRET=...
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
DB_PATH=./dev.db
```

### Frontend `.env.local`
```
NEXT_PUBLIC_API_URL=http://localhost:5000
```

## Generated Files (Not in Repo)

```
📁 backend/
├── 📁 node_modules/          # npm dependencies
├── 💾 dev.db                 # SQLite database
└── 📄 package-lock.json      # Dependency lock

📁 frontend/
├── 📁 node_modules/          # npm dependencies
├── 📁 .next/                 # Next.js build output
└── 📄 package-lock.json      # Dependency lock
```

## Quick Navigation

**Want to...**

- **Setup the project?** → `QUICKSTART.md`
- **Understand the architecture?** → `ARCHITECTURE.md`
- **Test all features?** → `TESTING.md`
- **See API routes?** → `README.md` or `backend/src/server.js`
- **Modify UI styles?** → `frontend/public/custom.css`
- **Change auth logic?** → `backend/src/services/authService.js`
- **Add SSE stream?** → `backend/src/services/logService.js`
- **Edit dashboard?** → `frontend/app/page.js`
- **Change worker logic?** → `backend/src/services/workerService.js`

---

**Last Updated**: 2025-10-25
