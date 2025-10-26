# Frontend Documentation - Video Generation Platform

Dokumentasi lengkap arsitektur, komponen, dan alur kerja frontend Next.js.

---

## 📋 Table of Contents

1. [Arsitektur Frontend](#arsitektur-frontend)
2. [Struktur Folder](#struktur-folder)
3. [Routing & Navigation](#routing--navigation)
4. [Komponen React](#komponen-react)
5. [State Management](#state-management)
6. [API Integration](#api-integration)
7. [Real-time Updates (SSE)](#real-time-updates-sse)
8. [Styling & Theming](#styling--theming)
9. [Authentication Flow](#authentication-flow)
10. [Deployment](#deployment)

---

## Arsitektur Frontend

### Tech Stack

```
┌─────────────────────────────────────┐
│         Next.js 14 (App Router)     │
├─────────────────────────────────────┤
│   React 18 Components               │
├─────────────────────────────────────┤
│   Bootstrap 5 Dark Theme            │
├─────────────────────────────────────┤
│   Custom CSS (Dark Mode)            │
├─────────────────────────────────────┤
│   Server-Sent Events (SSE)          │
├─────────────────────────────────────┤
│   Fetch API (HTTP Client)           │
└─────────────────────────────────────┘
```

### Architecture Pattern

```
┌──────────────────────────────────────────────┐
│                  Browser                      │
│  ┌────────────────────────────────────────┐  │
│  │          Next.js Pages                 │  │
│  │  ┌──────────────┐  ┌──────────────┐  │  │
│  │  │  /login      │  │  / (home)    │  │  │
│  │  └──────────────┘  └──────────────┘  │  │
│  └────────────────────────────────────────┘  │
│                      │                        │
│  ┌────────────────────────────────────────┐  │
│  │       React Components                 │  │
│  │  • Navbar  • GeneratorForm             │  │
│  │  • WorkerStatus  • LogsPanel           │  │
│  └────────────────────────────────────────┘  │
│                      │                        │
│  ┌────────────────────────────────────────┐  │
│  │          API Client (lib/api.js)       │  │
│  │  • HTTP Requests  • SSE Connections    │  │
│  └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
                       │
                       ▼
              Backend API (Express)
```

---

## Struktur Folder

```
frontend/
├── app/                          # Next.js App Router
│   ├── layout.js                # Root layout (Bootstrap + CSS)
│   ├── page.js                  # Home/Dashboard (/)
│   ├── login/
│   │   └── page.js              # Login page
│   └── register/
│       └── page.js              # Register page
│
├── components/                   # React Components
│   ├── Navbar.js                # Top navigation
│   ├── GeneratorForm.js         # Main generation form
│   ├── PromptInput.js           # Textarea + file upload
│   ├── WorkerStatus.js          # Live worker status table
│   └── LogsPanel.js             # Live console logs
│
├── lib/
│   └── api.js                   # API client wrapper
│
├── middleware.js                 # Next.js middleware (auth)
│
├── public/
│   └── custom.css               # Dark theme styles
│
├── package.json                  # Dependencies
├── next.config.js               # Next.js config
└── .env.local                   # Environment variables
```

---

## Routing & Navigation

### Next.js App Router

Aplikasi menggunakan **App Router** (Next.js 14+), bukan Pages Router.

### Routes

| Route | File | Description | Auth Required |
|-------|------|-------------|---------------|
| `/` | `app/page.js` | Dashboard utama | ✅ Yes |
| `/login` | `app/login/page.js` | Login page | ❌ No |
| `/register` | `app/register/page.js` | Register page | ❌ No |

### Middleware Protection

File: `frontend/middleware.js`

```javascript
import { NextResponse } from 'next/server';

export function middleware(request) {
  const authToken = request.cookies.get('auth_token');
  const { pathname } = request.nextUrl;

  const publicRoutes = ['/login', '/register'];
  const isPublicRoute = publicRoutes.includes(pathname);

  // Redirect authenticated users away from login/register
  if (authToken && isPublicRoute) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Redirect unauthenticated users to login
  if (!authToken && !isPublicRoute && pathname === '/') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/login', '/register']
};
```

**Cara Kerja:**
1. Cek cookie `auth_token`
2. Jika tidak ada token DAN user di `/` → redirect ke `/login`
3. Jika ada token DAN user di `/login` → redirect ke `/`

---

## Komponen React

### 1. Layout Component

**File:** `app/layout.js`

```javascript
import 'bootstrap/dist/css/bootstrap.min.css';
import '../public/custom.css';

export const metadata = {
  title: 'Video Generator Pro',
  description: 'Professional video generation platform with AI',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-bs-theme="dark">
      <body>
        {children}
      </body>
    </html>
  );
}
```

**Fungsi:**
- Root layout untuk semua pages
- Import Bootstrap 5 CSS
- Import custom dark theme CSS
- Set `data-bs-theme="dark"` untuk Bootstrap dark mode

---

### 2. Dashboard Page

**File:** `app/page.js`

```javascript
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../lib/api';
import Navbar from '../components/Navbar';
import GeneratorForm from '../components/GeneratorForm';
import WorkerStatus from '../components/WorkerStatus';
import LogsPanel from '../components/LogsPanel';

export default function Home() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Check authentication on mount
  useEffect(() => {
    async function checkAuth() {
      try {
        const response = await api.auth.me();
        setUser(response.user);
      } catch (error) {
        router.push('/login');
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, [router]);

  // Show loading spinner
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center"
           style={{ minHeight: '100vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  // Don't render if no user
  if (!user) return null;

  // Render dashboard
  return (
    <>
      <Navbar user={user} />
      <main className="container-fluid py-4">
        <div className="row g-4">
          {/* Left Column: Generator Form */}
          <div className="col-lg-6">
            <GeneratorForm user={user} />
          </div>

          {/* Right Column: Worker Status + Logs */}
          <div className="col-lg-6">
            <div className="mb-4">
              <WorkerStatus user={user} />
            </div>
            <LogsPanel />
          </div>
        </div>
      </main>
    </>
  );
}
```

**Lifecycle:**
1. Component mount → check authentication
2. Call `api.auth.me()` untuk validasi token
3. Jika valid → set user, render dashboard
4. Jika invalid → redirect ke `/login`

---

### 3. Navbar Component

**File:** `components/Navbar.js`

**Props:**
```javascript
{
  user: {
    id: 1,
    email: "user@example.com",
    role: "FREE",
    maxWorkers: 3,
    ttlSeconds: 1800
  }
}
```

**State:**
```javascript
const [remainingTTL, setRemainingTTL] = useState(0);
```

**Hooks:**

```javascript
// Fetch TTL every 5 seconds
useEffect(() => {
  async function fetchTTL() {
    const response = await api.user.getRemainingTTL();
    setRemainingTTL(response.remainingSeconds);
  }

  fetchTTL();
  const interval = setInterval(fetchTTL, 5000);
  return () => clearInterval(interval);
}, []);

// Countdown timer every second
useEffect(() => {
  const timer = setInterval(() => {
    setRemainingTTL(prev => Math.max(0, prev - 1));
  }, 1000);
  return () => clearInterval(timer);
}, []);
```

**Features:**
- Live TTL countdown (HH:MM:SS)
- Role badge (FREE/PREMIUM)
- User email display
- Logout button

**TTL Display Logic:**
```javascript
const formatTime = (seconds) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const getTTLClass = () => {
  if (remainingTTL < 300) return 'ttl-countdown danger';  // < 5 min
  if (remainingTTL < 900) return 'ttl-countdown warning'; // < 15 min
  return 'ttl-countdown';
};
```

---

### 4. Generator Form Component

**File:** `components/GeneratorForm.js`

**Props:**
```javascript
{
  user: {
    role: "FREE" | "PREMIUM",
    maxWorkers: 3 | 10
  }
}
```

**State:**
```javascript
const [manualPrompts, setManualPrompts] = useState('');
const [filePrompts, setFilePrompts] = useState([]);
const [fileName, setFileName] = useState('');
const [ratio, setRatio] = useState('16:9');
const [customWidth, setCustomWidth] = useState('1920');
const [customHeight, setCustomHeight] = useState('1080');
const [saveTarget, setSaveTarget] = useState('browser');
const [maxWorkers, setMaxWorkers] = useState(user.maxWorkers);
const [model, setModel] = useState('fast');
const [loading, setLoading] = useState(false);
const [error, setError] = useState('');
const [success, setSuccess] = useState('');
```

**File Upload Handler:**
```javascript
const handleFileUpload = async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  try {
    const response = await api.prompts.upload(file);
    setFilePrompts(response.prompts);
    setFileName(`${response.filename} (${response.count} lines detected)`);
    setError('');
  } catch (err) {
    setError(err.message);
    setFilePrompts([]);
    setFileName('');
  }
};
```

**Form Submit Handler:**
```javascript
const handleSubmit = async (e) => {
  e.preventDefault();
  setError('');
  setSuccess('');

  // Combine manual and file prompts
  const manual = manualPrompts
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  const allPrompts = [...manual, ...filePrompts];

  if (allPrompts.length === 0) {
    setError('Please enter at least one prompt');
    return;
  }

  setLoading(true);

  try {
    const jobData = {
      prompts: allPrompts,
      ratio: ratio === 'custom' ? 'custom' : ratio,
      customWidth: ratio === 'custom' ? parseInt(customWidth) : undefined,
      customHeight: ratio === 'custom' ? parseInt(customHeight) : undefined,
      saveTarget,
      maxWorkers: Math.min(maxWorkers, user.maxWorkers),
      ...(user.role === 'PREMIUM' && { model })
    };

    const response = await api.jobs.create(jobData);
    setSuccess(`Job created successfully! ID: ${response.jobId}`);

    // Clear form
    setManualPrompts('');
    setFilePrompts([]);
    setFileName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};
```

**Role-Based Features:**
```javascript
const isPremium = user.role === 'PREMIUM';

// Model picker (Premium only)
<select
  className={`form-select ${!isPremium ? 'premium-locked' : ''}`}
  disabled={!isPremium}
  title={!isPremium ? 'Premium only' : ''}
>
  <option value="mini">Mini</option>
  <option value="fast">Fast</option>
  <option value="lite">Lite</option>
  <option value="pro">Pro</option>
</select>
```

---

### 5. Worker Status Component

**File:** `components/WorkerStatus.js`

**Props:**
```javascript
{
  user: {
    maxWorkers: 3 | 10
  }
}
```

**State:**
```javascript
const [workers, setWorkers] = useState([]);
const [eventSource, setEventSource] = useState(null);
```

**SSE Connection:**
```javascript
useEffect(() => {
  // Initial fetch
  async function fetchWorkers() {
    try {
      const response = await api.workers.getStatus();
      setWorkers(response.workers);
    } catch (error) {
      console.error('Failed to fetch workers:', error);
    }
  }

  fetchWorkers();

  // Setup SSE stream
  const es = api.workers.streamStatus();

  es.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'init' || data.type === 'update') {
        setWorkers(data.workers);
      }
    } catch (error) {
      console.error('Error parsing worker update:', error);
    }
  };

  es.onerror = (error) => {
    console.error('SSE error:', error);
    es.close();
    // Retry after 5 seconds
    setTimeout(() => {
      fetchWorkers();
    }, 5000);
  };

  setEventSource(es);

  // Cleanup
  return () => {
    if (es) {
      es.close();
    }
  };
}, []);
```

**Render Logic:**
```javascript
const formatHeartbeat = (timestamp) => {
  if (!timestamp) return 'Never';
  const date = new Date(timestamp);
  const now = new Date();
  const diffSeconds = Math.floor((now - date) / 1000);

  if (diffSeconds < 60) return `${diffSeconds}s ago`;
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
  return `${Math.floor(diffSeconds / 3600)}h ago`;
};

const getStatusClass = (status) => {
  switch (status?.toLowerCase()) {
    case 'busy': return 'worker-status busy';
    case 'idle': return 'worker-status idle';
    default: return 'worker-status offline';
  }
};
```

---

### 6. Logs Panel Component

**File:** `components/LogsPanel.js`

**State:**
```javascript
const [logs, setLogs] = useState([]);
const [jobFilter, setJobFilter] = useState('');
const [eventSource, setEventSource] = useState(null);
const logsEndRef = useRef(null);
```

**SSE Connection:**
```javascript
useEffect(() => {
  const es = api.workers.streamLogs();

  es.onmessage = (event) => {
    try {
      const logEntry = JSON.parse(event.data);
      setLogs(prev => [...prev, logEntry]);
    } catch (error) {
      console.error('Error parsing log:', error);
    }
  };

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

**Auto-scroll:**
```javascript
// Debounced auto-scroll
useEffect(() => {
  const timer = setTimeout(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, 100);

  return () => clearTimeout(timer);
}, [logs]);
```

**Filtering:**
```javascript
const filteredLogs = jobFilter
  ? logs.filter(log => log.jobId === jobFilter)
  : logs;
```

**Clear Logs:**
```javascript
const handleClear = () => {
  setLogs([]);
};
```

---

## State Management

### Pendekatan

Aplikasi ini menggunakan **React Hooks** untuk state management, bukan Redux atau Context API.

### State per Component

#### Global State (Shared)
- `user` → Disimpan di `app/page.js`, dipass sebagai props

#### Local Component State
- `Navbar`: `remainingTTL`
- `GeneratorForm`: form inputs, loading, error
- `WorkerStatus`: `workers`, `eventSource`
- `LogsPanel`: `logs`, `jobFilter`, `eventSource`

### State Update Patterns

**Immediate Update (SSE):**
```javascript
es.onmessage = (event) => {
  const data = JSON.parse(event.data);
  setLogs(prev => [...prev, data]); // Immediate append
};
```

**Polling Update:**
```javascript
useEffect(() => {
  const interval = setInterval(async () => {
    const data = await api.user.getRemainingTTL();
    setRemainingTTL(data.remainingSeconds);
  }, 5000);

  return () => clearInterval(interval);
}, []);
```

**Derived State:**
```javascript
// Don't store filteredLogs in state
const filteredLogs = jobFilter
  ? logs.filter(log => log.jobId === jobFilter)
  : logs;
```

---

## API Integration

### API Client Structure

**File:** `lib/api.js`

```javascript
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

async function request(endpoint, options = {}) {
  const config = {
    credentials: 'include', // Send cookies
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
    async login(email, password) {
      return request('/api/x7auth/session/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
    },
    // ... other methods
  },
  // ... other namespaces
};
```

### Usage Examples

**Login:**
```javascript
try {
  const result = await api.auth.login(email, password);
  console.log('User:', result.user);
  router.push('/');
} catch (error) {
  setError(error.message);
}
```

**Create Job:**
```javascript
const jobData = {
  prompts: ['Prompt 1', 'Prompt 2'],
  ratio: '16:9',
  saveTarget: 'browser',
  maxWorkers: 3
};

const response = await api.jobs.create(jobData);
console.log('Job ID:', response.jobId);
```

**File Upload:**
```javascript
const file = event.target.files[0];
const response = await api.prompts.upload(file);
console.log('Prompts:', response.prompts);
console.log('Count:', response.count);
```

---

## Real-time Updates (SSE)

### EventSource Setup

**Worker Status Stream:**
```javascript
const eventSource = new EventSource(
  `${API_URL}/api/wrk/grid29/stream`,
  { withCredentials: true }
);

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'update') {
    setWorkers(data.workers);
  }
};

eventSource.onerror = (error) => {
  console.error('Connection lost');
  eventSource.close();
};
```

**Logs Stream:**
```javascript
const eventSource = new EventSource(
  `${API_URL}/api/sts/k7q/logs/stream`,
  { withCredentials: true }
);

eventSource.onmessage = (event) => {
  const log = JSON.parse(event.data);
  setLogs(prev => [...prev, log]);
};
```

### Auto-Reconnect Pattern

```javascript
const connectSSE = () => {
  const es = new EventSource(url, { withCredentials: true });

  es.onmessage = handleMessage;

  es.onerror = () => {
    es.close();
    setTimeout(connectSSE, 5000); // Reconnect after 5s
  };

  return es;
};

useEffect(() => {
  const es = connectSSE();
  return () => es.close();
}, []);
```

### Memory Leak Prevention

```javascript
useEffect(() => {
  const es = api.workers.streamStatus();

  // Cleanup on unmount
  return () => {
    if (es) {
      es.close();
    }
  };
}, []);
```

---

## Styling & Theming

### Bootstrap 5 Dark Mode

**Enable globally:**
```html
<html lang="en" data-bs-theme="dark">
```

**Import:**
```javascript
import 'bootstrap/dist/css/bootstrap.min.css';
```

### Custom CSS

**File:** `public/custom.css`

**CSS Variables:**
```css
:root {
  --bs-body-bg: #0d1117;
  --bs-body-color: #c9d1d9;
  --card-bg: #161b22;
  --card-border: #30363d;
  --console-bg: #010409;
  --accent-blue: #58a6ff;
}
```

**Component Styles:**
```css
/* Cards */
.card {
  background-color: var(--card-bg);
  border-color: var(--card-border);
  border-radius: 8px;
}

/* Console Panel */
.console-panel {
  background-color: var(--console-bg);
  height: 400px;
  overflow-y: auto;
  font-family: 'Courier New', monospace;
}

/* Worker Status */
.worker-status.idle {
  background-color: rgba(139, 148, 158, 0.2);
  color: #8b949e;
}

.worker-status.busy {
  background-color: rgba(242, 160, 55, 0.2);
  color: #f2a037;
}
```

### Responsive Design

```css
@media (max-width: 768px) {
  .console-panel {
    height: 300px;
  }

  .worker-table {
    font-size: 0.875rem;
  }
}
```

---

## Authentication Flow

### Login Flow Diagram

```
User → /login
  │
  ├─ Enter email/password
  │
  ├─ Submit form
  │
  ├─ api.auth.login(email, password)
  │    │
  │    ├─ POST /api/x7auth/session/login
  │    │
  │    ├─ Backend validates credentials
  │    │
  │    ├─ Backend generates JWT
  │    │
  │    └─ Backend sets httpOnly cookie
  │
  ├─ Receive response
  │
  ├─ router.push('/')
  │
  └─ Dashboard loads
       │
       ├─ Middleware checks cookie
       │
       ├─ api.auth.me() validates token
       │
       └─ Render dashboard
```

### Protected Route Access

```
User → /
  │
  ├─ Middleware checks cookie
  │    │
  │    ├─ Cookie exists? YES
  │    │    └─ Allow access
  │    │
  │    └─ Cookie exists? NO
  │         └─ Redirect to /login
  │
  ├─ Page.js mounts
  │
  ├─ useEffect → api.auth.me()
  │    │
  │    ├─ Valid token? YES
  │    │    └─ Render dashboard
  │    │
  │    └─ Valid token? NO
  │         └─ router.push('/login')
```

### Logout Flow

```
User → Click Logout
  │
  ├─ api.auth.logout()
  │    │
  │    └─ POST /api/x7auth/session/logout
  │         │
  │         └─ Backend clears cookie
  │
  ├─ router.push('/login')
  │
  └─ User at /login
```

---

## Deployment

### Build untuk Production

```bash
cd frontend
npm run build
```

**Output:**
```
.next/               # Build output
.next/static/        # Static assets
.next/server/        # Server bundles
```

### Environment Variables

**Development:** `.env.local`
```
NEXT_PUBLIC_API_URL=http://localhost:5000
```

**Production:** `.env.production`
```
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

### Start Production Server

```bash
npm start
```

### Deploy ke Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Deploy to production
vercel --prod
```

**Vercel Configuration:**
```json
{
  "env": {
    "NEXT_PUBLIC_API_URL": "https://api.yourdomain.com"
  }
}
```

### Deploy ke Netlify

```bash
# Build
npm run build

# Deploy build folder
netlify deploy --prod --dir=.next
```

---

## Performance Optimization

### Code Splitting

Next.js otomatis melakukan code splitting per page.

### Image Optimization

```javascript
import Image from 'next/image';

<Image
  src="/logo.png"
  width={200}
  height={50}
  alt="Logo"
/>
```

### Lazy Loading Components

```javascript
import dynamic from 'next/dynamic';

const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <p>Loading...</p>,
  ssr: false
});
```

### Debounce Updates

```javascript
useEffect(() => {
  const timer = setTimeout(() => {
    // Expensive operation
    updateUI();
  }, 100);

  return () => clearTimeout(timer);
}, [dependency]);
```

---

## Troubleshooting

### SSE Not Connecting

**Problem:** EventSource gagal connect

**Solution:**
```javascript
// Pastikan withCredentials: true
const es = new EventSource(url, { withCredentials: true });

// Check CORS di backend
// backend/.env
CORS_ORIGIN=http://localhost:3000
```

### Cookie Not Sent

**Problem:** JWT cookie tidak dikirim ke backend

**Solution:**
```javascript
// Pastikan credentials: 'include'
fetch(url, {
  credentials: 'include'
});
```

### Infinite Redirect Loop

**Problem:** Redirect loop antara `/` dan `/login`

**Solution:**
- Clear cookies
- Check middleware logic
- Verify JWT_SECRET sama antara sessions

### Build Errors

**Problem:** Build gagal saat `npm run build`

**Solution:**
```bash
# Clean cache
rm -rf .next node_modules
npm install
npm run build
```

---

## Best Practices

### 1. Use Client Components Wisely

```javascript
// Only mark as 'use client' when needed
'use client';

import { useState } from 'react';
```

### 2. Cleanup Side Effects

```javascript
useEffect(() => {
  const es = connectSSE();
  const timer = setInterval(fn, 1000);

  return () => {
    es.close();
    clearInterval(timer);
  };
}, []);
```

### 3. Error Boundaries

```javascript
'use client';

import { Component } from 'react';

class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return <h1>Something went wrong.</h1>;
    }
    return this.props.children;
  }
}
```

### 4. Loading States

```javascript
if (loading) {
  return <Spinner />;
}

if (error) {
  return <Error message={error} />;
}

return <Content data={data} />;
```

---

**Last Updated:** 2025-10-25
**Next.js Version:** 14.1.0
**React Version:** 18.2.0
