# Integration Guide - Frontend ↔ Backend

Panduan lengkap bagaimana frontend dan backend berkomunikasi dalam Video Generation Platform.

---

## 📋 Table of Contents

1. [Overview Arsitektur](#overview-arsitektur)
2. [Authentication Flow](#authentication-flow)
3. [Job Creation Flow](#job-creation-flow)
4. [Real-time Updates Flow](#real-time-updates-flow)
5. [Data Flow Diagrams](#data-flow-diagrams)
6. [Error Handling](#error-handling)
7. [Security Integration](#security-integration)
8. [Testing Integration](#testing-integration)

---

## Overview Arsitektur

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        BROWSER                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │             Next.js Frontend (Port 3000)              │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │  │
│  │  │   Pages     │  │ Components  │  │  API Client │  │  │
│  │  │  /login     │  │  Navbar     │  │  lib/api.js │  │  │
│  │  │  /register  │  │  Generator  │  │             │  │  │
│  │  │  / (home)   │  │  Workers    │  │  HTTP +     │  │  │
│  │  │             │  │  Logs       │  │  SSE        │  │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                             │
                    HTTP + SSE │
                             │
┌─────────────────────────────────────────────────────────────┐
│              Express Backend (Port 5000)                     │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                    Routing Layer                       │  │
│  │  /api/x7auth/*  /api/pmt/*  /api/vdo/*  /api/wrk/*   │  │
│  └───────────────────────────────────────────────────────┘  │
│                             │                                │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                 Middleware Layer                       │  │
│  │  Authentication  │  Validation  │  Error Handling     │  │
│  └───────────────────────────────────────────────────────┘  │
│                             │                                │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                Controller Layer                        │  │
│  │  authController  │  jobController  │  workerController│  │
│  └───────────────────────────────────────────────────────┘  │
│                             │                                │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                  Service Layer                         │  │
│  │  authService  │  jobService  │  logService  │  SSE    │  │
│  └───────────────────────────────────────────────────────┘  │
│                             │                                │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                   Data Layer                           │  │
│  │              SQLite Database (sql.js)                  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Communication Protocols

| Type | Protocol | Use Case | Direction |
|------|----------|----------|-----------|
| Authentication | HTTP POST + Cookie | Login, Register, Logout | Frontend → Backend |
| API Calls | HTTP GET/POST | CRUD operations | Frontend → Backend |
| Real-time Logs | Server-Sent Events (SSE) | Live log streaming | Backend → Frontend |
| Worker Updates | Server-Sent Events (SSE) | Live worker status | Backend → Frontend |

---

## Authentication Flow

### Complete Login Flow

```
┌─────────────┐                                  ┌─────────────┐
│  Frontend   │                                  │   Backend   │
│   Browser   │                                  │   Express   │
└─────────────┘                                  └─────────────┘
       │                                                │
       │  1. User enters email/password                │
       │     at /login page                            │
       │                                                │
       │  2. Click "Login" button                      │
       │                                                │
       │  3. api.auth.login(email, password)           │
       │     ─────────────────────────────────────────>│
       │     POST /api/x7auth/session/login            │
       │     Content-Type: application/json            │
       │     Body: {email, password}                   │
       │                                                │
       │                                4. Validate    │
       │                                   credentials │
       │                                   (bcrypt)    │
       │                                                │
       │                                5. Generate    │
       │                                   JWT token   │
       │                                                │
       │                                6. Initialize  │
       │                                   workers     │
       │                                                │
       │  7. Response with user data                   │
       │     <─────────────────────────────────────────│
       │     Set-Cookie: auth_token=<JWT>; HttpOnly    │
       │     Body: {message, user: {...}}              │
       │                                                │
       │  8. Store user in state                       │
       │     setUser(response.user)                    │
       │                                                │
       │  9. Redirect to dashboard                     │
       │     router.push('/')                          │
       │                                                │
       │  10. Middleware checks cookie                 │
       │      Found ✓ → Allow access                   │
       │                                                │
       │  11. Dashboard page loads                     │
       │      useEffect → api.auth.me()                │
       │      ─────────────────────────────────────────>│
       │      GET /api/x7auth/session/me               │
       │      Cookie: auth_token=<JWT>                 │
       │                                                │
       │                                12. Verify JWT │
       │                                    token      │
       │                                                │
       │  13. Response with user data                  │
       │      <─────────────────────────────────────────│
       │      Body: {user: {..., remainingTTL}}        │
       │                                                │
       │  14. Render dashboard components              │
       │                                                │
```

### Frontend Code (Login)

```javascript
// frontend/app/login/page.js
const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);

  try {
    // Step 3: Call API
    const response = await api.auth.login(email, password);

    // Step 8: Store user (optional, not used in this flow)
    // Cookie is automatically set by backend

    // Step 9: Redirect
    router.push('/');
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};
```

### Backend Code (Login)

```javascript
// backend/src/controllers/authController.js
async login(req, res) {
  try {
    const { email, password } = req.validatedBody;

    // Step 4 & 5: Validate and generate token
    const { token, user } = await authService.login(email, password);

    // Step 6: Initialize workers
    workerService.initializeWorkers(user.id, user.maxWorkers);

    // Step 7: Set cookie and respond
    res.cookie(authConfig.cookieName, token, authConfig.cookieOptions);
    res.json({ message: 'Login successful', user });
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
}
```

### Cookie Details

**Cookie Name:** `auth_token`

**Cookie Attributes:**
```javascript
{
  httpOnly: true,           // Cannot be accessed by JavaScript
  secure: false,            // true in production (HTTPS only)
  sameSite: 'lax',          // CSRF protection
  maxAge: 86400000,         // 24 hours
  path: '/'                 // Available on all routes
}
```

---

## Job Creation Flow

### Complete Job Submission Flow

```
┌─────────────┐                                  ┌─────────────┐
│  Frontend   │                                  │   Backend   │
└─────────────┘                                  └─────────────┘
       │                                                │
       │  1. User fills form:                          │
       │     - Manual prompts in textarea              │
       │     - Upload .txt file (optional)             │
       │     - Select ratio                            │
       │     - Choose save target                      │
       │     - Set max workers                         │
       │                                                │
       │  2. Click "Generate Videos"                   │
       │                                                │
       │  3. Combine prompts                           │
       │     manual + file prompts                     │
       │                                                │
       │  4. api.jobs.create(jobData)                  │
       │     ─────────────────────────────────────────>│
       │     POST /api/vdo/fabric/create               │
       │     Cookie: auth_token=<JWT>                  │
       │     Body: {prompts[], ratio, ...}             │
       │                                                │
       │                                5. Authenticate│
       │                                   (middleware) │
       │                                                │
       │                                6. Validate    │
       │                                   input (Joi) │
       │                                                │
       │                                7. Check role  │
       │                                   permissions │
       │                                                │
       │                                8. Create job  │
       │                                   in database │
       │                                                │
       │                                9. Assign      │
       │                                   workers     │
       │                                                │
       │                                10. Start      │
       │                                    processing │
       │                                                │
       │                                11. Broadcast  │
       │                                    logs (SSE) │
       │                                                │
       │  12. Response with job ID                     │
       │      <─────────────────────────────────────────│
       │      Body: {jobId, status: "queued"}          │
       │                                                │
       │  13. Show success message                     │
       │      "Job created! ID: job_xxx"               │
       │                                                │
       │  14. Clear form                               │
       │                                                │
       │  15. Logs start appearing (SSE)               │
       │      ◄─────────────────────────────────────────│
       │      data: {jobId, phase: "created", ...}     │
       │      data: {jobId, phase: "started", ...}     │
       │      data: {jobId, phase: "processing", ...}  │
       │                                                │
       │  16. Worker status updates (SSE)              │
       │      ◄─────────────────────────────────────────│
       │      data: {type: "update", workers: [...]}   │
       │                                                │
```

### Frontend Code (Job Creation)

```javascript
// frontend/components/GeneratorForm.js
const handleSubmit = async (e) => {
  e.preventDefault();

  // Step 3: Combine prompts
  const manual = manualPrompts.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  const allPrompts = [...manual, ...filePrompts];

  if (allPrompts.length === 0) {
    setError('Please enter at least one prompt');
    return;
  }

  setLoading(true);

  try {
    // Step 4: Build job data
    const jobData = {
      prompts: allPrompts,
      ratio: ratio === 'custom' ? 'custom' : ratio,
      customWidth: ratio === 'custom' ? parseInt(customWidth) : undefined,
      customHeight: ratio === 'custom' ? parseInt(customHeight) : undefined,
      saveTarget,
      maxWorkers: Math.min(maxWorkers, user.maxWorkers),
      ...(user.role === 'PREMIUM' && { model })
    };

    // Step 4: Call API
    const response = await api.jobs.create(jobData);

    // Step 13: Show success
    setSuccess(`Job created successfully! ID: ${response.jobId}`);

    // Step 14: Clear form
    setManualPrompts('');
    setFilePrompts([]);
    setFileName('');
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};
```

### Backend Code (Job Creation)

```javascript
// backend/src/controllers/jobController.js
createJob(req, res) {
  try {
    // Step 5: Already authenticated by middleware
    const { prompts, ratio, saveTarget, maxWorkers, model } = req.validatedBody;

    // Step 7: Check role permissions
    if (model && req.user.role !== 'PREMIUM') {
      return res.status(403).json({
        error: 'Model selection is a premium feature'
      });
    }

    // Enforce max workers limit
    const effectiveMaxWorkers = Math.min(maxWorkers, req.user.maxWorkers);

    // Build final ratio
    let finalRatio = ratio;
    if (ratio === 'custom') {
      finalRatio = `${customWidth}:${customHeight}`;
    }

    const jobData = {
      prompts,
      ratio: finalRatio,
      saveTarget,
      maxWorkers: effectiveMaxWorkers,
      model
    };

    // Step 8-10: Create and start job
    const result = jobService.createJob(req.user.id, jobData);

    // Step 12: Respond
    res.status(201).json({
      message: 'Job created successfully',
      ...result
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}
```

### Backend Code (Job Processing)

```javascript
// backend/src/services/jobService.js
async processJob(jobId, prompts, maxWorkers) {
  const job = jobModel.findById(jobId);
  const userId = job.user_id;

  // Step 11: Broadcast job started
  logService.broadcast(jobId, null, 'started',
    `Processing ${prompts.length} prompts with ${maxWorkers} workers`);

  // Step 9: Assign workers
  const workers = workerModel.findByUser(userId).slice(0, maxWorkers);

  const promptsPerWorker = Math.ceil(prompts.length / workers.length);

  // Distribute prompts to workers
  for (let i = 0; i < workers.length; i++) {
    const worker = workers[i];
    const workerPrompts = prompts.slice(
      i * promptsPerWorker,
      (i + 1) * promptsPerWorker
    );

    if (workerPrompts.length > 0) {
      // Update worker status
      workerModel.updateStatus(worker.id, 'busy', jobId);
      workerService.broadcastWorkerUpdate(userId);

      // Start processing
      this.simulateWorkerProcessing(jobId, worker.id, workerPrompts, userId);
    }
  }
}
```

---

## Real-time Updates Flow

### SSE Connection Flow

```
┌─────────────┐                                  ┌─────────────┐
│  Frontend   │                                  │   Backend   │
└─────────────┘                                  └─────────────┘
       │                                                │
       │  1. Component mounts                          │
       │     (WorkerStatus or LogsPanel)               │
       │                                                │
       │  2. Create EventSource                        │
       │     const es = new EventSource(url)           │
       │                                                │
       │  3. Connect to SSE endpoint                   │
       │     ─────────────────────────────────────────>│
       │     GET /api/wrk/grid29/stream                │
       │     Cookie: auth_token=<JWT>                  │
       │                                                │
       │                                4. Authenticate│
       │                                   (middleware) │
       │                                                │
       │                                5. Add client  │
       │                                   to pool     │
       │                                                │
       │  6. Send SSE headers                          │
       │     <─────────────────────────────────────────│
       │     Content-Type: text/event-stream           │
       │     Cache-Control: no-cache                   │
       │     Connection: keep-alive                    │
       │                                                │
       │  7. Send initial comment                      │
       │     <─────────────────────────────────────────│
       │     : connected                               │
       │                                                │
       │  8. Send initial data                         │
       │     <─────────────────────────────────────────│
       │     data: {"type":"init","workers":[...]}     │
       │                                                │
       │  9. onmessage handler receives data           │
       │     const data = JSON.parse(event.data)       │
       │     setWorkers(data.workers)                  │
       │                                                │
       │     ═══ Connection Established ═══            │
       │                                                │
       │  10. Backend events occur                     │
       │      (worker status change, new log, etc)     │
       │                                                │
       │  11. Broadcast to all clients                 │
       │      <─────────────────────────────────────────│
       │      data: {"type":"update","workers":[...]}  │
       │                                                │
       │  12. Frontend updates UI                      │
       │      setWorkers(data.workers)                 │
       │                                                │
       │     ═══ Continuous Updates ═══                │
       │                                                │
       │  (if connection drops)                        │
       │                                                │
       │  13. onerror handler triggered                │
       │      es.onerror = (error) => {...}            │
       │                                                │
       │  14. Close connection                         │
       │      es.close()                               │
       │                                                │
       │  15. Retry after 5 seconds                    │
       │      setTimeout(() => reconnect(), 5000)      │
       │                                                │
       │  16. Reconnect (go to step 2)                 │
       │      ─────────────────────────────────────────>│
       │                                                │
```

### Frontend Code (SSE Worker Status)

```javascript
// frontend/components/WorkerStatus.js
useEffect(() => {
  // Step 1: Initial fetch (optional)
  async function fetchWorkers() {
    const response = await api.workers.getStatus();
    setWorkers(response.workers);
  }
  fetchWorkers();

  // Step 2-3: Setup SSE stream
  const es = api.workers.streamStatus();

  // Step 9: Handle messages
  es.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'init' || data.type === 'update') {
        // Step 12: Update UI
        setWorkers(data.workers);
      }
    } catch (error) {
      console.error('Error parsing worker update:', error);
    }
  };

  // Step 13-15: Handle errors and reconnect
  es.onerror = (error) => {
    console.error('SSE error:', error);
    es.close();
    // Retry after 5 seconds
    setTimeout(() => {
      fetchWorkers();
    }, 5000);
  };

  setEventSource(es);

  // Cleanup on unmount
  return () => {
    if (es) {
      es.close();
    }
  };
}, []);
```

### Backend Code (SSE Worker Service)

```javascript
// backend/src/services/workerService.js
addClient(res, userId = null) {
  const client = { res, userId, id: Date.now() + Math.random() };

  this.clients.add(client);

  // Step 6-7: Setup SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  });

  res.write(': connected\n\n');

  // Step 8: Send initial state
  if (userId) {
    const workers = this.getWorkerStatus(userId);
    try {
      res.write(`data: ${JSON.stringify({ type: 'init', workers })}\n\n`);
    } catch (error) {
      this.clients.delete(client);
    }
  }

  // Remove client on disconnect
  res.on('close', () => {
    this.clients.delete(client);
  });

  return client;
}

// Step 11: Broadcast updates
broadcastWorkerUpdate(userId = null) {
  this.clients.forEach(client => {
    if (!client.userId || client.userId === userId) {
      const workers = this.getWorkerStatus(client.userId || userId);
      try {
        client.res.write(`data: ${JSON.stringify({ type: 'update', workers })}\n\n`);
      } catch (error) {
        this.clients.delete(client);
      }
    }
  });
}
```

### Frontend Code (SSE Logs)

```javascript
// frontend/components/LogsPanel.js
useEffect(() => {
  // Step 2-3: Setup SSE stream
  const es = api.workers.streamLogs();

  // Step 9: Handle messages
  es.onmessage = (event) => {
    try {
      const logEntry = JSON.parse(event.data);
      // Step 12: Append to logs
      setLogs(prev => [...prev, logEntry]);
    } catch (error) {
      console.error('Error parsing log:', error);
    }
  };

  // Step 13-15: Handle errors
  es.onerror = (error) => {
    console.error('SSE error:', error);
    es.close();
    setTimeout(() => {
      const newEs = api.workers.streamLogs();
      setEventSource(newEs);
    }, 5000);
  };

  setEventSource(es);

  return () => {
    if (es) es.close();
  };
}, []);
```

### Backend Code (SSE Log Service)

```javascript
// backend/src/services/logService.js
broadcast(jobId, workerId, phase, message) {
  // Persist to database
  logModel.create(jobId, workerId, phase, message);

  const logEntry = {
    jobId,
    workerId,
    phase,
    message,
    timestamp: new Date().toISOString()
  };

  // Step 11: Send to all SSE clients
  this.clients.forEach(client => {
    if (!client.jobIdFilter || client.jobIdFilter === jobId) {
      try {
        client.res.write(`data: ${JSON.stringify(logEntry)}\n\n`);
      } catch (error) {
        this.clients.delete(client);
      }
    }
  });

  return logEntry;
}
```

---

## Data Flow Diagrams

### User Registration Data Flow

```
Frontend Input:
{
  email: "user@example.com",
  password: "password123",
  role: "FREE"
}
      │
      ▼
API Client (lib/api.js):
POST /api/x7auth/session/register
      │
      ▼
Backend Middleware (validation.js):
Joi validation schema
✓ Email format
✓ Password length >= 6
✓ Role in ["FREE", "PREMIUM"]
      │
      ▼
Backend Controller (authController.js):
Call authService.register()
      │
      ▼
Backend Service (authService.js):
1. Check if email exists
2. Hash password (bcrypt)
3. Get role config (maxWorkers, ttlSeconds)
4. Insert to database
      │
      ▼
Database (sql.js):
INSERT INTO users
(email, password, role, max_workers, ttl_seconds)
      │
      ▼
Backend Service:
Initialize workers for user
      │
      ▼
Backend Response:
{
  message: "User registered successfully",
  user: {
    id: 1,
    email: "user@example.com",
    role: "FREE"
  }
}
      │
      ▼
Frontend:
Display success message
→ Redirect to /login
```

### Job Processing Data Flow

```
Frontend Job Data:
{
  prompts: ["Prompt 1", "Prompt 2", "Prompt 3"],
  ratio: "16:9",
  saveTarget: "browser",
  maxWorkers: 3,
  model: "fast" (PREMIUM only)
}
      │
      ▼
Backend Validation:
✓ Prompts array (min 1)
✓ Ratio valid
✓ Max workers <= user limit
✓ Model only if PREMIUM
      │
      ▼
Backend Job Service:
1. Generate job ID
2. Create job in database
3. Broadcast "created" log
      │
      ▼
Worker Assignment:
1. Get user's workers from DB
2. Select up to maxWorkers
3. Assign server to each
4. Update worker status to "busy"
5. Broadcast worker update (SSE)
      │
      ▼
Prompt Distribution:
Calculate promptsPerWorker
Worker 1 → Prompts 1
Worker 2 → Prompts 2
Worker 3 → Prompts 3
      │
      ▼
Processing Simulation:
For each worker:
  For each prompt:
    1. Broadcast "processing" log
    2. Wait 1 second
    3. Broadcast "rendering" log
    4. Wait 2 seconds
    5. Broadcast "completed" log
    6. Wait 1.5 seconds
      │
      ▼
Worker Completion:
1. Update worker status to "idle"
2. Broadcast worker update (SSE)
3. Check if all workers done
      │
      ▼
Job Completion:
If all workers idle:
1. Update job status to "completed"
2. Broadcast "finished" log
      │
      ▼
Frontend Updates (Real-time):
SSE Logs → LogsPanel component → UI update
SSE Workers → WorkerStatus component → UI update
```

---

## Error Handling

### Frontend Error Handling Pattern

```javascript
// Pattern: Try-Catch with State
const [error, setError] = useState('');

const handleAction = async () => {
  setError('');
  setLoading(true);

  try {
    const result = await api.someAction();
    // Handle success
  } catch (err) {
    // Handle error
    setError(err.message);
  } finally {
    setLoading(false);
  }
};

// Display error
{error && (
  <div className="alert alert-danger" role="alert">
    {error}
  </div>
)}
```

### Backend Error Handling Pattern

```javascript
// Pattern: Standard Error Response
try {
  const result = await someOperation();
  res.json({ success: true, data: result });
} catch (error) {
  res.status(400).json({
    error: error.message
  });
}
```

### API Client Error Handling

```javascript
// lib/api.js
async function request(endpoint, options = {}) {
  const response = await fetch(`${API_URL}${endpoint}`, config);
  const data = await response.json();

  // Throw on HTTP error
  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
}
```

### SSE Error Handling

```javascript
// Frontend SSE error handling
es.onerror = (error) => {
  console.error('SSE connection lost:', error);

  // Close connection
  es.close();

  // Auto-reconnect after delay
  setTimeout(() => {
    console.log('Reconnecting...');
    connectSSE();
  }, 5000);
};
```

---

## Security Integration

### CORS Configuration

**Backend:**
```javascript
// backend/src/server.js
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,  // Allow cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

**Frontend:**
```javascript
// lib/api.js
fetch(url, {
  credentials: 'include'  // Send cookies
});

// SSE
new EventSource(url, {
  withCredentials: true  // Send cookies
});
```

### JWT Flow

```
Login:
Frontend → Backend: {email, password}
Backend: Generate JWT
Backend → Frontend: Set-Cookie: auth_token=<JWT>

Subsequent Requests:
Frontend → Backend: Cookie: auth_token=<JWT>
Backend Middleware: Verify JWT
Backend: req.user = decoded user data
Backend Controller: Access req.user
```

### Input Validation

**Backend (Joi):**
```javascript
const schema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required()
});

const { error, value } = schema.validate(req.body);
if (error) {
  return res.status(400).json({ error: 'Validation failed' });
}
```

**Frontend (Form Validation):**
```javascript
if (!email || !password) {
  setError('All fields required');
  return;
}

if (password.length < 6) {
  setError('Password must be at least 6 characters');
  return;
}
```

---

## Testing Integration

### Test Scenario: Complete Job Flow

```bash
# 1. Register user
curl -X POST http://localhost:5000/api/x7auth/session/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","role":"FREE"}'

# 2. Login
curl -X POST http://localhost:5000/api/x7auth/session/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email":"test@example.com","password":"password123"}'

# 3. Create job
curl -X POST http://localhost:5000/api/vdo/fabric/create \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "prompts":["Mountain landscape","City at night"],
    "ratio":"16:9",
    "saveTarget":"browser",
    "maxWorkers":2
  }'

# 4. Stream logs (SSE)
curl -N http://localhost:5000/api/sts/k7q/logs/stream -b cookies.txt

# 5. Get worker status
curl http://localhost:5000/api/wrk/grid29/status -b cookies.txt
```

### Frontend Integration Test

```javascript
// Manual test in browser console
// 1. Login
await api.auth.login('test@example.com', 'password123');

// 2. Check auth
const user = await api.auth.me();
console.log('User:', user);

// 3. Create job
const job = await api.jobs.create({
  prompts: ['Test prompt'],
  ratio: '16:9',
  saveTarget: 'browser',
  maxWorkers: 1
});
console.log('Job:', job);

// 4. Check workers
const workers = await api.workers.getStatus();
console.log('Workers:', workers);
```

---

## Summary Checklist

### Integration Checklist

- ✅ **Authentication**
  - [ ] JWT generated on login
  - [ ] Cookie set with httpOnly
  - [ ] Middleware validates token
  - [ ] Frontend sends credentials

- ✅ **API Communication**
  - [ ] CORS configured correctly
  - [ ] Content-Type headers correct
  - [ ] Error responses standardized
  - [ ] Input validation on both sides

- ✅ **Real-time Updates**
  - [ ] SSE connections established
  - [ ] Events broadcasted correctly
  - [ ] Auto-reconnect on failure
  - [ ] Memory leaks prevented

- ✅ **Security**
  - [ ] Passwords hashed (bcrypt)
  - [ ] SQL injection prevented (parameterized queries)
  - [ ] XSS prevented (React auto-escape)
  - [ ] CSRF mitigated (SameSite cookies)

- ✅ **Data Flow**
  - [ ] User input validated
  - [ ] Database operations successful
  - [ ] State updates trigger re-renders
  - [ ] UI reflects backend changes

---

**Last Updated:** 2025-10-25
**Integration Version:** 1.0.0
