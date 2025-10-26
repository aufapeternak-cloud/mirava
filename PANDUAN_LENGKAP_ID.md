# Panduan Lengkap - Video Generation Platform (Bahasa Indonesia)

Dokumentasi lengkap dalam Bahasa Indonesia untuk developer.

---

## 📚 Daftar Isi

1. [Pengenalan Sistem](#pengenalan-sistem)
2. [Cara Kerja Aplikasi](#cara-kerja-aplikasi)
3. [Struktur Backend](#struktur-backend)
4. [Struktur Frontend](#struktur-frontend)
5. [Alur Autentikasi](#alur-autentikasi)
6. [Alur Pembuatan Job](#alur-pembuatan-job)
7. [Real-time Updates (SSE)](#real-time-updates-sse)
8. [Keamanan](#keamanan)
9. [Tips Development](#tips-development)
10. [Troubleshooting](#troubleshooting)

---

## Pengenalan Sistem

### Apa itu Video Generation Platform?

Aplikasi web full-stack untuk generate video dengan fitur:
- **Autentikasi** dengan JWT di httpOnly cookies
- **Role-based access** (FREE dan PREMIUM)
- **Real-time updates** menggunakan Server-Sent Events (SSE)
- **Dark theme** dengan Bootstrap 5
- **Obfuscated API routes** untuk keamanan

### Teknologi yang Digunakan

**Frontend:**
- Next.js 14 (App Router)
- React 18
- Bootstrap 5 (Dark Mode)
- Server-Sent Events (SSE)

**Backend:**
- Node.js + Express 5
- SQLite (via sql.js, pure JavaScript)
- JWT untuk autentikasi
- SSE untuk streaming

---

## Cara Kerja Aplikasi

### Arsitektur Sederhana

```
User Browser
    │
    ├─ Next.js Frontend (Port 3000)
    │   ├─ Pages: /login, /register, / (dashboard)
    │   ├─ Components: Navbar, Form, Workers, Logs
    │   └─ API Client: Koneksi ke backend
    │
    ▼
Express Backend (Port 5000)
    ├─ Routes: Obfuscated URLs (/api/x7auth/*, dll)
    ├─ Controllers: Handle requests
    ├─ Services: Business logic
    └─ Database: SQLite (sql.js)
```

### Flow Utama

1. **User login** → Backend validasi → JWT disimpan di cookie
2. **User submit job** → Backend buat job → Workers diassign
3. **Backend proses** → Broadcast logs via SSE → Frontend update real-time
4. **Workers update** → Broadcast via SSE → Frontend update status table

---

## Struktur Backend

### Folder Organization

```
backend/src/
├── config/          # Konfigurasi (database, auth)
├── controllers/     # Handle HTTP requests
├── middleware/      # Auth, validation
├── models/          # Database models (CRUD)
├── routes/          # Route definitions
├── services/        # Business logic + SSE
└── server.js        # Entry point
```

### Penjelasan Per Layer

#### 1. Routes Layer (Routing)

**File:** `backend/src/routes/*.js`

**Fungsi:** Definisi endpoint API

**Contoh:**
```javascript
// routes/auth.js
import express from 'express';
import { authController } from '../controllers/authController.js';

const router = express.Router();

router.post('/register', validateRequest(schemas.register), authController.register);
router.post('/login', validateRequest(schemas.login), authController.login);
router.post('/logout', authController.logout);
router.get('/me', authenticateToken, authController.me);

export default router;
```

**Obfuscated URLs:**
- Auth: `/api/x7auth/session/*`
- Prompts: `/api/pmt/ingest/*`
- Jobs: `/api/vdo/fabric/*`
- Users: `/api/usr/caps/*`
- Workers: `/api/wrk/grid29/*`
- Streams: `/api/sts/k7q/*`

#### 2. Middleware Layer

**File:** `backend/src/middleware/auth.js`

**Fungsi:** Validasi JWT token dari cookie

**Cara Kerja:**
```javascript
export const authenticateToken = (req, res, next) => {
  // 1. Ambil token dari cookie
  const token = req.cookies['auth_token'];

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    // 2. Verify token
    const decoded = jwt.verify(token, jwtSecret);

    // 3. Get user dari database
    const user = userModel.findById(decoded.userId);

    // 4. Simpan di req.user
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      maxWorkers: user.max_workers
    };

    next(); // Lanjut ke controller
  } catch (error) {
    return res.status(403).json({ error: 'Invalid token' });
  }
};
```

**Validation Middleware:**
```javascript
// middleware/validation.js
import Joi from 'joi';

export const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body);

    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details
      });
    }

    req.validatedBody = value;
    next();
  };
};
```

#### 3. Controllers Layer

**File:** `backend/src/controllers/*.js`

**Fungsi:** Handle HTTP request/response

**Contoh:**
```javascript
// controllers/authController.js
export const authController = {
  async login(req, res) {
    try {
      const { email, password } = req.validatedBody;

      // Call service
      const { token, user } = await authService.login(email, password);

      // Set cookie
      res.cookie('auth_token', token, {
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000
      });

      // Response
      res.json({
        message: 'Login successful',
        user
      });
    } catch (error) {
      res.status(401).json({ error: error.message });
    }
  }
};
```

#### 4. Services Layer

**File:** `backend/src/services/*.js`

**Fungsi:** Business logic

**Contoh:**
```javascript
// services/authService.js
export const authService = {
  async login(email, password) {
    // 1. Cari user di database
    const user = userModel.findByEmail(email);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    // 2. Validasi password (bcrypt)
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    // 3. Update session start time
    userModel.updateSessionStart(user.id);

    // 4. Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      jwtSecret,
      { expiresIn: '24h' }
    );

    return { token, user };
  }
};
```

#### 5. Models Layer

**File:** `backend/src/models/db.js`

**Fungsi:** Database operations (CRUD)

**Contoh:**
```javascript
export const userModel = {
  findByEmail: (email) => {
    const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
    return stmt.get(email);
  },

  create: (email, password, role, maxWorkers, ttlSeconds) => {
    const stmt = db.prepare(`
      INSERT INTO users (email, password, role, max_workers, ttl_seconds)
      VALUES (?, ?, ?, ?, ?)
    `);
    return stmt.run(email, password, role, maxWorkers, ttlSeconds);
  }
};
```

### SSE Services

#### Log Service

**File:** `backend/src/services/logService.js`

**Fungsi:** Broadcast logs ke semua client yang connect

```javascript
class LogService {
  constructor() {
    this.clients = new Set(); // Pool SSE clients
  }

  addClient(res, jobIdFilter = null) {
    const client = { res, jobIdFilter };
    this.clients.add(client);

    // Setup SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });

    res.write(': connected\n\n');

    // Remove on disconnect
    res.on('close', () => {
      this.clients.delete(client);
    });
  }

  broadcast(jobId, workerId, phase, message) {
    // Simpan ke database
    logModel.create(jobId, workerId, phase, message);

    const logEntry = {
      jobId,
      workerId,
      phase,
      message,
      timestamp: new Date().toISOString()
    };

    // Kirim ke semua client
    this.clients.forEach(client => {
      if (!client.jobIdFilter || client.jobIdFilter === jobId) {
        client.res.write(`data: ${JSON.stringify(logEntry)}\n\n`);
      }
    });
  }
}
```

---

## Struktur Frontend

### Folder Organization

```
frontend/
├── app/              # Next.js App Router
│   ├── layout.js    # Root layout
│   ├── page.js      # Dashboard (/)
│   ├── login/       # Login page
│   └── register/    # Register page
├── components/       # React components
├── lib/
│   └── api.js       # API client
├── middleware.js     # Auth redirect
└── public/
    └── custom.css   # Dark theme
```

### Penjelasan Per Component

#### 1. Middleware (Auth Guard)

**File:** `frontend/middleware.js`

**Fungsi:** Protect routes, redirect jika tidak login

```javascript
import { NextResponse } from 'next/server';

export function middleware(request) {
  const authToken = request.cookies.get('auth_token');
  const { pathname } = request.nextUrl;

  // Public routes
  const publicRoutes = ['/login', '/register'];
  const isPublicRoute = publicRoutes.includes(pathname);

  // Jika sudah login, redirect dari /login ke /
  if (authToken && isPublicRoute) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Jika belum login, redirect dari / ke /login
  if (!authToken && !isPublicRoute && pathname === '/') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}
```

**Kapan Dijalankan:**
- Setiap kali user akses `/`, `/login`, atau `/register`
- SEBELUM page di-render

#### 2. API Client

**File:** `frontend/lib/api.js`

**Fungsi:** Wrapper untuk HTTP requests

```javascript
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

async function request(endpoint, options = {}) {
  const config = {
    credentials: 'include', // PENTING: kirim cookies
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  const response = await fetch(`${API_URL}${endpoint}`, config);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
}

export const api = {
  auth: {
    login: (email, password) => request('/api/x7auth/session/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    }),
    me: () => request('/api/x7auth/session/me'),
    logout: () => request('/api/x7auth/session/logout', { method: 'POST' })
  },
  jobs: {
    create: (jobData) => request('/api/vdo/fabric/create', {
      method: 'POST',
      body: JSON.stringify(jobData)
    })
  },
  workers: {
    streamStatus: () => new EventSource(
      `${API_URL}/api/wrk/grid29/stream`,
      { withCredentials: true }
    ),
    streamLogs: (jobId) => new EventSource(
      `${API_URL}/api/sts/k7q/logs/stream${jobId ? '?jobId=' + jobId : ''}`,
      { withCredentials: true }
    )
  }
};
```

#### 3. Dashboard Page

**File:** `frontend/app/page.js`

**Fungsi:** Halaman utama setelah login

```javascript
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../lib/api';

export default function Home() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function checkAuth() {
      try {
        // Validasi token
        const response = await api.auth.me();
        setUser(response.user);
      } catch (error) {
        // Token invalid, redirect ke login
        router.push('/login');
      } finally {
        setLoading(false);
      }
    }

    checkAuth();
  }, [router]);

  if (loading) return <Spinner />;
  if (!user) return null;

  return (
    <>
      <Navbar user={user} />
      <main>
        <GeneratorForm user={user} />
        <WorkerStatus user={user} />
        <LogsPanel />
      </main>
    </>
  );
}
```

#### 4. Generator Form Component

**File:** `frontend/components/GeneratorForm.js`

**State Management:**
```javascript
const [manualPrompts, setManualPrompts] = useState('');
const [filePrompts, setFilePrompts] = useState([]);
const [ratio, setRatio] = useState('16:9');
const [maxWorkers, setMaxWorkers] = useState(user.maxWorkers);
const [model, setModel] = useState('fast');
const [loading, setLoading] = useState(false);
```

**Submit Handler:**
```javascript
const handleSubmit = async (e) => {
  e.preventDefault();

  // 1. Combine prompts
  const manual = manualPrompts.split('\n').filter(line => line.trim());
  const allPrompts = [...manual, ...filePrompts];

  if (allPrompts.length === 0) {
    setError('Enter at least one prompt');
    return;
  }

  setLoading(true);

  try {
    // 2. Build job data
    const jobData = {
      prompts: allPrompts,
      ratio,
      saveTarget: 'browser',
      maxWorkers: Math.min(maxWorkers, user.maxWorkers),
      ...(user.role === 'PREMIUM' && { model })
    };

    // 3. Call API
    const response = await api.jobs.create(jobData);

    // 4. Success
    setSuccess(`Job created! ID: ${response.jobId}`);

    // 5. Clear form
    setManualPrompts('');
    setFilePrompts([]);
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};
```

#### 5. Worker Status Component (SSE)

**File:** `frontend/components/WorkerStatus.js`

**SSE Connection:**
```javascript
useEffect(() => {
  // Initial fetch
  async function fetchWorkers() {
    const response = await api.workers.getStatus();
    setWorkers(response.workers);
  }
  fetchWorkers();

  // SSE stream
  const es = api.workers.streamStatus();

  es.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'update') {
      setWorkers(data.workers); // Update UI real-time
    }
  };

  es.onerror = (error) => {
    console.error('SSE error:', error);
    es.close();
    setTimeout(fetchWorkers, 5000); // Reconnect
  };

  // Cleanup
  return () => {
    if (es) es.close();
  };
}, []);
```

#### 6. Logs Panel Component (SSE)

**File:** `frontend/components/LogsPanel.js`

**SSE Connection:**
```javascript
useEffect(() => {
  const es = api.workers.streamLogs();

  es.onmessage = (event) => {
    const log = JSON.parse(event.data);
    setLogs(prev => [...prev, log]); // Append log
  };

  es.onerror = (error) => {
    es.close();
    setTimeout(() => {
      // Reconnect
      const newEs = api.workers.streamLogs();
      setEventSource(newEs);
    }, 5000);
  };

  return () => {
    if (es) es.close();
  };
}, []);
```

**Auto-scroll:**
```javascript
useEffect(() => {
  const timer = setTimeout(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, 100);

  return () => clearTimeout(timer);
}, [logs]);
```

---

## Alur Autentikasi

### 1. Login Flow (Step-by-Step)

```
Step 1: User masuk ke /login
   ↓
Step 2: Middleware cek cookie 'auth_token'
   ├─ Ada? → Redirect ke /
   └─ Tidak ada? → Tampilkan login page
   ↓
Step 3: User input email & password
   ↓
Step 4: Klik tombol "Login"
   ↓
Step 5: Frontend call api.auth.login(email, password)
   ↓
Step 6: Request ke backend:
        POST /api/x7auth/session/login
        Body: {email, password}
   ↓
Step 7: Backend validasi credentials
   ├─ Cari user di database
   ├─ Compare password (bcrypt)
   └─ Valid? Lanjut
   ↓
Step 8: Backend generate JWT token
        jwt.sign({userId, email}, secret, {expiresIn: '24h'})
   ↓
Step 9: Backend set cookie
        Set-Cookie: auth_token=<JWT>; HttpOnly
   ↓
Step 10: Backend response
         {message: "Login successful", user: {...}}
   ↓
Step 11: Frontend terima response
   ↓
Step 12: Frontend redirect ke /
         router.push('/')
   ↓
Step 13: Middleware cek cookie lagi
         Ada! → Allow access
   ↓
Step 14: Dashboard page load
   ↓
Step 15: useEffect call api.auth.me()
         Verify token still valid
   ↓
Step 16: Backend verify JWT
   ├─ Valid? → Return user data
   └─ Invalid? → 403 error
   ↓
Step 17: Frontend render dashboard
         <Navbar user={user} />
         <GeneratorForm user={user} />
```

### 2. Protected Route Access

```
User akses /
   ↓
Middleware check:
   auth_token cookie exists? NO
   ↓
Redirect to /login
   ↓
User login
   ↓
Cookie set
   ↓
User akses /
   ↓
Middleware check:
   auth_token cookie exists? YES
   ↓
Allow access
   ↓
Page.js mount
   ↓
useEffect → api.auth.me()
   ↓
Backend verify JWT
   ↓
Valid? YES
   ↓
Render dashboard
```

---

## Alur Pembuatan Job

### Complete Flow

```
┌─────────────────────────────────────────┐
│  1. USER INPUT                           │
│  - Manual prompts: "Prompt 1\nPrompt 2" │
│  - Upload file: prompts.txt (optional)  │
│  - Ratio: 16:9                          │
│  - Max workers: 3                       │
│  - Model: fast (PREMIUM only)           │
└─────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  2. FRONTEND PROCESSING                 │
│  - Split manual prompts by \n          │
│  - Combine: manual + file prompts      │
│  - Build jobData object                 │
└─────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  3. API CALL                            │
│  api.jobs.create(jobData)               │
│  POST /api/vdo/fabric/create            │
│  Cookie: auth_token=<JWT>               │
└─────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  4. BACKEND VALIDATION                  │
│  Middleware:                            │
│  - Authenticate JWT                     │
│  - Validate input (Joi)                 │
│  - Check role permissions               │
└─────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  5. JOB CREATION                        │
│  Service:                               │
│  - Generate job ID                      │
│  - Insert to database                   │
│  - Broadcast "created" log (SSE)        │
└─────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  6. WORKER ASSIGNMENT                   │
│  - Get user's workers from DB           │
│  - Assign server to each worker         │
│  - Update status to "busy"              │
│  - Broadcast worker update (SSE)        │
└─────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  7. PROMPT DISTRIBUTION                 │
│  Calculate: promptsPerWorker            │
│  Worker 1 → Prompts 1,2                 │
│  Worker 2 → Prompts 3,4                 │
│  Worker 3 → Prompts 5                   │
└─────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  8. PROCESSING SIMULATION               │
│  For each worker:                       │
│    For each prompt:                     │
│      1. Log "processing" (SSE)          │
│      2. Wait 1s                         │
│      3. Log "rendering" (SSE)           │
│      4. Wait 2s                         │
│      5. Log "completed" (SSE)           │
└─────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  9. WORKER COMPLETION                   │
│  - Update worker status to "idle"       │
│  - Broadcast worker update (SSE)        │
│  - Check if all workers done            │
└─────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  10. JOB COMPLETION                     │
│  All workers idle?                      │
│  - Update job status to "completed"     │
│  - Broadcast "finished" log (SSE)       │
└─────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  11. FRONTEND UPDATES (Real-time)       │
│  SSE Logs → LogsPanel → UI update       │
│  SSE Workers → WorkerStatus → UI update │
└─────────────────────────────────────────┘
```

---

## Real-time Updates (SSE)

### Apa itu Server-Sent Events (SSE)?

SSE adalah teknologi untuk streaming data dari server ke client secara **one-way** (server → client only).

**Keuntungan:**
- ✅ Lebih simple dari WebSocket
- ✅ HTTP-based (tidak perlu protocol upgrade)
- ✅ Auto-reconnect built-in
- ✅ Cocok untuk streaming logs, notifications, live updates

**Kapan Digunakan:**
- Real-time logs
- Live worker status
- Notifications
- Progress updates

### Cara Kerja SSE

**Backend:**
```javascript
// 1. Setup SSE response
res.writeHead(200, {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  'Connection': 'keep-alive'
});

// 2. Send initial comment
res.write(': connected\n\n');

// 3. Send data events
const sendUpdate = (data) => {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
};

// 4. Keep connection alive
// Client tetap terhubung sampai:
// - Client close connection
// - Server close connection
// - Network error
```

**Frontend:**
```javascript
// 1. Create EventSource
const es = new EventSource(url, { withCredentials: true });

// 2. Listen for messages
es.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
  // Update UI
  setData(data);
};

// 3. Handle errors
es.onerror = (error) => {
  console.error('SSE error:', error);
  es.close();
  // Reconnect after delay
  setTimeout(() => reconnect(), 5000);
};

// 4. Cleanup
useEffect(() => {
  const es = connectSSE();
  return () => es.close(); // Cleanup on unmount
}, []);
```

### SSE untuk Logs

**Backend Broadcast:**
```javascript
// services/logService.js
broadcast(jobId, workerId, phase, message) {
  const logEntry = {
    jobId,
    workerId,
    phase,
    message,
    timestamp: new Date().toISOString()
  };

  // Send ke semua connected clients
  this.clients.forEach(client => {
    if (!client.jobIdFilter || client.jobIdFilter === jobId) {
      client.res.write(`data: ${JSON.stringify(logEntry)}\n\n`);
    }
  });
}
```

**Frontend Consume:**
```javascript
// components/LogsPanel.js
const es = api.workers.streamLogs();

es.onmessage = (event) => {
  const log = JSON.parse(event.data);
  // Append ke state
  setLogs(prev => [...prev, log]);
};
```

### SSE untuk Worker Status

**Backend Broadcast:**
```javascript
// services/workerService.js
broadcastWorkerUpdate(userId) {
  const workers = this.getWorkerStatus(userId);

  this.clients.forEach(client => {
    if (client.userId === userId) {
      client.res.write(`data: ${JSON.stringify({
        type: 'update',
        workers
      })}\n\n`);
    }
  });
}
```

**Frontend Consume:**
```javascript
// components/WorkerStatus.js
const es = api.workers.streamStatus();

es.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'update') {
    setWorkers(data.workers); // Update UI
  }
};
```

---

## Keamanan

### 1. JWT di httpOnly Cookies

**Mengapa httpOnly?**
- Cookie tidak bisa diakses oleh JavaScript
- Mencegah XSS (Cross-Site Scripting) attack
- Token tidak bisa dicuri via `document.cookie`

**Setting Cookie:**
```javascript
// Backend
res.cookie('auth_token', token, {
  httpOnly: true,      // Tidak bisa diakses JS
  secure: true,        // Only HTTPS (production)
  sameSite: 'strict',  // CSRF protection
  maxAge: 86400000     // 24 hours
});
```

### 2. Password Hashing (bcrypt)

**Hash saat register:**
```javascript
const hashedPassword = await bcrypt.hash(password, 10);
userModel.create(email, hashedPassword, role);
```

**Verify saat login:**
```javascript
const user = userModel.findByEmail(email);
const isValid = await bcrypt.compare(password, user.password);
```

### 3. SQL Injection Protection

**Gunakan Parameterized Queries:**
```javascript
// ✅ AMAN - Parameterized
db.prepare('SELECT * FROM users WHERE email = ?').get(email);

// ❌ BAHAYA - String concatenation
db.exec(`SELECT * FROM users WHERE email = '${email}'`);
// Bisa diexploit: email = "' OR 1=1 --"
```

### 4. Input Validation (Joi)

**Validasi semua input:**
```javascript
const schema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  prompts: Joi.array().items(Joi.string()).min(1).required()
});

const { error, value } = schema.validate(req.body);
if (error) {
  return res.status(400).json({ error: 'Validation failed' });
}
```

### 5. CORS Configuration

**Backend:**
```javascript
app.use(cors({
  origin: 'http://localhost:3000',  // Hanya allow origin ini
  credentials: true,                 // Allow cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE']
}));
```

**Frontend:**
```javascript
fetch(url, {
  credentials: 'include'  // Kirim cookies
});
```

---

## Tips Development

### 1. Debugging SSE

**Check di Browser DevTools:**
1. Buka Network tab
2. Filter: `EventStream`
3. Lihat connection status
4. Click untuk lihat data yang diterima

**Console Logging:**
```javascript
es.onmessage = (event) => {
  console.log('SSE Data:', event.data);
  const data = JSON.parse(event.data);
  console.log('Parsed:', data);
};
```

### 2. Debugging API Calls

**Add console.log di API client:**
```javascript
async function request(endpoint, options) {
  console.log('API Call:', endpoint, options);
  const response = await fetch(`${API_URL}${endpoint}`, config);
  console.log('API Response:', response.status);
  const data = await response.json();
  console.log('API Data:', data);
  return data;
}
```

### 3. Hot Reload Issues

**Jika changes tidak muncul:**
```bash
# Frontend - Hard refresh
Ctrl + Shift + R

# Backend - Restart
Ctrl + C
npm run dev

# Clear Next.js cache
rm -rf .next
npm run dev
```

### 4. Database Reset

**Jika data rusak:**
```bash
cd backend
rm dev.db
npm run seed
```

### 5. Port Conflicts

**Jika port sudah digunakan:**
```bash
# Check port 5000
netstat -ano | findstr :5000

# Kill process
taskkill /PID <PID> /F
```

---

## Troubleshooting

### Problem: "Authentication required"

**Penyebab:**
- Cookie tidak terkirim
- JWT expired
- Token invalid

**Solusi:**
```javascript
// 1. Check cookie di DevTools
// Application → Cookies → localhost

// 2. Pastikan credentials: 'include'
fetch(url, { credentials: 'include' });

// 3. Clear cookies dan login ulang
```

### Problem: SSE tidak connect

**Penyebab:**
- CORS issue
- Backend tidak running
- URL salah

**Solusi:**
```javascript
// 1. Check CORS di backend .env
CORS_ORIGIN=http://localhost:3000

// 2. Check backend running
curl http://localhost:5000/health

// 3. Check SSE URL
console.log('SSE URL:', eventSource.url);

// 4. Check withCredentials
new EventSource(url, { withCredentials: true });
```

### Problem: Form submit tidak jalan

**Penyebab:**
- Validation error
- Network error
- Backend error

**Solusi:**
```javascript
// 1. Check error state
{error && <div>{error}</div>}

// 2. Check console
console.log('Submitting:', jobData);

// 3. Check Network tab
// Lihat request/response

// 4. Check backend logs
// Terminal backend untuk error messages
```

### Problem: Workers tidak update

**Penyebab:**
- SSE connection lost
- Database issue
- Worker service error

**Solusi:**
```javascript
// 1. Check SSE connection
es.onerror = (error) => {
  console.error('SSE Error:', error);
};

// 2. Check backend workers
curl http://localhost:5000/api/wrk/grid29/status -b cookies.txt

// 3. Re-seed database
cd backend && rm dev.db && npm run seed
```

---

## Dokumentasi Lengkap

Untuk detail lebih lanjut, baca:

1. **[API_DOCUMENTATION.md](API_DOCUMENTATION.md)** - Semua endpoint API
2. **[FRONTEND_DOCUMENTATION.md](FRONTEND_DOCUMENTATION.md)** - Detail frontend
3. **[INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md)** - Frontend ↔ Backend
4. **[ARCHITECTURE.md](ARCHITECTURE.md)** - Arsitektur teknis
5. **[TESTING.md](TESTING.md)** - Testing checklist

---

## Quick Commands

```bash
# Start backend
cd backend
npm run dev

# Start frontend
cd frontend
npm run dev

# Seed database
cd backend
npm run seed

# Reset database
cd backend
rm dev.db
npm run seed

# Build frontend
cd frontend
npm run build
npm start
```

---

**Dibuat:** 2025-10-25
**Versi:** 1.0.0
**Bahasa:** Indonesia 🇮🇩
