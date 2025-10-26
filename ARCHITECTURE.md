# Architecture Documentation

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     VIDEO GENERATION PLATFORM                 │
└─────────────────────────────────────────────────────────────┘

┌──────────────────┐         ┌──────────────────┐
│                  │         │                  │
│  Next.js 14      │ ◄─────► │  Express 5       │
│  Frontend        │  HTTP   │  Backend API     │
│  (Port 3000)     │  + SSE  │  (Port 5000)     │
│                  │         │                  │
└──────────────────┘         └──────────────────┘
         │                            │
         │                            │
         ▼                            ▼
┌──────────────────┐         ┌──────────────────┐
│  Browser         │         │  SQLite          │
│  - Cookies       │         │  Database        │
│  - EventSource   │         │  (dev.db)        │
└──────────────────┘         └──────────────────┘
```

## Technology Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **UI Library**: Bootstrap 5 (Dark Mode)
- **Styling**: Custom CSS (dark theme)
- **State Management**: React Hooks (useState, useEffect)
- **Real-time**: EventSource (SSE)
- **HTTP Client**: Fetch API

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express 5
- **Database**: SQLite 3 (better-sqlite3)
- **Authentication**: JWT + httpOnly cookies
- **Security**: Helmet, CORS, bcryptjs
- **Validation**: Joi
- **File Upload**: Multer
- **Streaming**: Server-Sent Events (SSE)

## Directory Structure

```
video-gen-app/
│
├── backend/                    # Express API Server
│   ├── src/
│   │   ├── config/            # Configuration (DB, Auth)
│   │   ├── controllers/       # Request handlers
│   │   ├── middleware/        # Auth, validation
│   │   ├── models/           # Database models
│   │   ├── routes/           # API routes (obfuscated)
│   │   ├── services/         # Business logic
│   │   └── server.js         # Entry point
│   ├── scripts/
│   │   └── seed.js           # Database seeding
│   └── package.json
│
├── frontend/                  # Next.js Application
│   ├── app/
│   │   ├── layout.js         # Root layout
│   │   ├── page.js           # Home (dashboard)
│   │   ├── login/            # Auth pages
│   │   └── register/
│   ├── components/           # React components
│   ├── lib/
│   │   └── api.js           # API client
│   ├── middleware.js        # Next.js middleware (auth)
│   ├── public/
│   │   └── custom.css       # Dark theme styles
│   └── package.json
│
└── README.md                 # Main documentation
```

## Data Flow

### 1. Authentication Flow

```
User Input (Login)
    │
    ▼
Frontend (app/login/page.js)
    │
    │ POST /api/x7auth/session/login
    ▼
Backend (authController.login)
    │
    ├─► Validate credentials
    ├─► Generate JWT token
    ├─► Set httpOnly cookie
    └─► Return user data
    │
    ▼
Frontend stores in state
    │
    ▼
Redirect to dashboard (/)
```

### 2. Job Submission Flow

```
User submits prompts
    │
    ▼
Frontend (GeneratorForm)
    │
    ├─► Parse manual prompts
    ├─► Upload file (if any)
    └─► Combine prompts
    │
    │ POST /api/vdo/fabric/create
    ▼
Backend (jobController.createJob)
    │
    ├─► Validate job data
    ├─► Check user permissions
    ├─► Create job in DB
    └─► Start job processing
    │
    ▼
jobService.processJob()
    │
    ├─► Assign workers
    ├─► Update worker status
    ├─► Emit logs (SSE)
    └─► Broadcast worker updates (SSE)
```

### 3. Real-time Updates (SSE)

```
Frontend subscribes to SSE streams
    │
    ├─► EventSource(/api/sts/k7q/logs/stream)
    └─► EventSource(/api/wrk/grid29/stream)
    │
    ▼
Backend maintains client connections
    │
    ├─► logService (broadcast logs)
    └─► workerService (broadcast status)
    │
    ▼
Events pushed to all connected clients
    │
    ▼
Frontend updates UI in real-time
```

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('FREE', 'PREMIUM')),
  max_workers INTEGER NOT NULL,
  ttl_seconds INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  session_started_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Jobs Table
```sql
CREATE TABLE jobs (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  prompts TEXT NOT NULL,           -- JSON array
  ratio TEXT NOT NULL,
  save_target TEXT NOT NULL,
  model TEXT,
  max_workers INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### Workers Table
```sql
CREATE TABLE workers (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL,
  server_name TEXT,
  status TEXT NOT NULL DEFAULT 'idle',
  current_job_id TEXT,
  last_heartbeat DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### Logs Table
```sql
CREATE TABLE logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id TEXT NOT NULL,
  worker_id INTEGER,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  phase TEXT NOT NULL,
  message TEXT NOT NULL
);
```

## API Routes (Obfuscated)

### Authentication: `/api/x7auth/session/*`
- `POST /register` - User registration
- `POST /login` - User login
- `POST /logout` - User logout
- `GET /me` - Get current user

### Prompts: `/api/pmt/ingest/*`
- `POST /parse` - Parse manual prompts
- `POST /upload` - Upload .txt file

### Jobs: `/api/vdo/fabric/*`
- `POST /create` - Create generation job
- `GET /status/:jobId` - Get job status
- `GET /list` - List user's jobs

### Users: `/api/usr/caps/*`
- `GET /limits` - Get user capabilities
- `GET /ttl-q9a` - Get remaining TTL

### Workers: `/api/wrk/grid29/*` and `/api/sts/k7q/*`
- `GET /status` - Get worker status (REST)
- `GET /stream` - Worker updates (SSE)
- `GET /logs/stream` - Log stream (SSE)

## Security Architecture

### Authentication
- **Method**: JWT stored in httpOnly cookies
- **Expiry**: 24 hours
- **Refresh**: Manual re-login required
- **Middleware**: Validates token on every protected request

### Authorization
- **Role-based**: FREE vs PREMIUM
- **Feature gating**: Model selection restricted to PREMIUM
- **Worker limits**: Enforced at backend

### Input Validation
- **Schema validation**: Joi schemas for all inputs
- **File upload limits**: 5MB max, .txt only, 1000 lines max
- **SQL injection**: Parameterized queries (better-sqlite3)
- **XSS protection**: React auto-escaping

### CORS
- **Allowed origin**: http://localhost:3000 (dev)
- **Credentials**: true (for cookies)
- **Methods**: GET, POST, PUT, DELETE

### Headers (Helmet)
- Content Security Policy
- X-Frame-Options
- X-Content-Type-Options
- Referrer-Policy

## Real-time Communication (SSE)

### Why SSE over WebSocket?
- **Simpler**: HTTP-based, no protocol upgrade
- **One-way**: Perfect for server → client updates
- **Auto-reconnect**: Built-in browser support
- **Lightweight**: Lower overhead than WebSocket

### SSE Streams

#### 1. Logs Stream
```javascript
GET /api/sts/k7q/logs/stream?jobId=xxx

// Response
data: {"jobId":"job_123","phase":"processing","message":"..."}

data: {"jobId":"job_123","phase":"completed","message":"..."}
```

#### 2. Worker Status Stream
```javascript
GET /api/wrk/grid29/stream

// Response
data: {"type":"update","workers":[{...}]}
```

### SSE Implementation

**Backend (logService.js)**
```javascript
addClient(res, jobIdFilter) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  res.write(': connected\n\n');

  this.clients.add(client);
}

broadcast(jobId, workerId, phase, message) {
  this.clients.forEach(client => {
    client.res.write(`data: ${JSON.stringify(...)}\n\n`);
  });
}
```

**Frontend (LogsPanel.js)**
```javascript
const es = new EventSource(url, { withCredentials: true });

es.onmessage = (event) => {
  const data = JSON.parse(event.data);
  setLogs(prev => [...prev, data]);
};
```

## Performance Optimizations

### Frontend
- **Debounced updates**: Logs auto-scroll debounced to 100ms
- **Fixed heights**: Prevents layout shifts
- **Efficient rendering**: React key-based updates
- **SSE reconnection**: Auto-retry on connection loss

### Backend
- **In-memory clients**: Fast SSE broadcast
- **Prepared statements**: SQLite query optimization
- **Compression**: gzip for HTTP responses
- **Heartbeat batching**: 5-second intervals

## Scalability Considerations

### Current (Single Server)
- SQLite database
- In-memory SSE clients
- Suitable for: 100-1000 concurrent users

### Future (Multi-Server)
1. **Database**: Migrate to PostgreSQL
2. **SSE**: Replace with Redis Pub/Sub + WebSocket
3. **Sessions**: Redis for distributed sessions
4. **Workers**: Separate worker pool service
5. **Load balancer**: Nginx/HAProxy

### Migration Path

```javascript
// backend/src/config/database.js
// Replace SQLite with PostgreSQL

import pg from 'pg';
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
});

// backend/src/services/logService.js
// Replace in-memory with Redis Pub/Sub

import Redis from 'ioredis';
const redis = new Redis(process.env.REDIS_URL);

redis.subscribe('job-logs');
redis.on('message', (channel, message) => {
  // Broadcast via WebSocket
});
```

## Monitoring & Debugging

### Logging
- **Backend**: Console logs (development)
- **Production**: Use Winston/Pino → file/service
- **Errors**: Stack traces in dev, sanitized in prod

### Debugging
- **Frontend**: React DevTools, Network tab
- **Backend**: Node.js debugger, logs
- **SSE**: Network → EventStream filter

### Health Checks
- `GET /health` - Server status
- Monitor: CPU, memory, database connections

## Testing Strategy

### Unit Tests (Future)
- Controllers: Mock services
- Services: Mock database
- Models: SQLite in-memory

### Integration Tests (Future)
- API endpoints: Supertest
- Database: Test fixtures
- SSE: Mock EventSource

### E2E Tests (Current)
- Manual testing via TESTING.md
- Browser testing: Chrome, Firefox, Safari
- 80+ test cases

## Deployment

### Development
```bash
# Backend
cd backend && npm run dev

# Frontend
cd frontend && npm run dev
```

### Production (Example)
```bash
# Backend
cd backend && npm start

# Frontend
cd frontend && npm run build && npm start
```

### Environment Variables
- **Backend**: See `backend/.env.example`
- **Frontend**: See `frontend/.env.local.example`

### Docker (Future)
```dockerfile
# Dockerfile.backend
FROM node:18-alpine
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --production
COPY backend/src ./src
CMD ["node", "src/server.js"]

# Dockerfile.frontend
FROM node:18-alpine
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend ./
RUN npm run build
CMD ["npm", "start"]
```

## Future Enhancements

### Phase 2
- [ ] Google Drive integration (OAuth flow)
- [ ] Real video generation (FFmpeg integration)
- [ ] Job queue (Bull + Redis)
- [ ] Progress tracking (percentage complete)

### Phase 3
- [ ] User dashboard with analytics
- [ ] Job history with pagination
- [ ] Download manager
- [ ] Batch export

### Phase 4
- [ ] WebSocket upgrade for bidirectional
- [ ] Multi-server deployment
- [ ] CDN for video delivery
- [ ] Admin panel

## Support & Maintenance

### Known Limitations
- SQLite: Single-server only
- SSE: Requires persistent connections
- File uploads: Limited to 5MB
- TTL: No auto-logout (client-side only)

### Common Issues
1. **SSE disconnects**: Auto-reconnect implemented
2. **Cookie issues**: Check CORS, httpOnly settings
3. **Port conflicts**: Change PORT in .env

### Contributing
1. Fork repository
2. Create feature branch
3. Follow code style (Prettier/ESLint)
4. Write tests
5. Submit PR

---

**Last Updated**: 2025-10-25
**Version**: 1.0.0
**Maintainer**: Development Team
