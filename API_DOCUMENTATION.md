# API Documentation - Video Generation Platform

Dokumentasi lengkap untuk semua endpoint API backend.

---

## 📋 Table of Contents

1. [Base URL & Configuration](#base-url--configuration)
2. [Authentication Endpoints](#authentication-endpoints)
3. [User Management Endpoints](#user-management-endpoints)
4. [Prompt Processing Endpoints](#prompt-processing-endpoints)
5. [Job Management Endpoints](#job-management-endpoints)
6. [Worker Status Endpoints](#worker-status-endpoints)
7. [Real-time Streaming (SSE)](#real-time-streaming-sse)
8. [Error Handling](#error-handling)
9. [Rate Limiting & Security](#rate-limiting--security)

---

## Base URL & Configuration

### Development
```
Base URL: http://localhost:5000
```

### Production
```
Base URL: https://your-domain.com
```

### Headers (Global)
```http
Content-Type: application/json
Cookie: auth_token=<JWT_TOKEN>
```

### Authentication
Semua endpoint yang memerlukan autentikasi menggunakan **JWT token** yang disimpan dalam **httpOnly cookie** bernama `auth_token`.

---

## Authentication Endpoints

Base Path: `/api/x7auth/session`

### 1. Register User

**Endpoint:** `POST /api/x7auth/session/register`

**Deskripsi:** Mendaftarkan user baru dengan role FREE atau PREMIUM.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "role": "FREE"  // Optional: "FREE" | "PREMIUM", default: "FREE"
}
```

**Validation Rules:**
- `email`: Valid email format, unique
- `password`: Minimum 6 characters
- `role`: Must be "FREE" or "PREMIUM"

**Response (201 Created):**
```json
{
  "message": "User registered successfully",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "role": "FREE"
  }
}
```

**Errors:**
```json
// 400 Bad Request - Email already exists
{
  "error": "Email already registered"
}

// 400 Bad Request - Validation failed
{
  "error": "Validation failed",
  "details": [
    {
      "field": "password",
      "message": "\"password\" length must be at least 6 characters long"
    }
  ]
}
```

---

### 2. Login User

**Endpoint:** `POST /api/x7auth/session/login`

**Deskripsi:** Login user dan mendapatkan JWT token dalam httpOnly cookie.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200 OK):**
```json
{
  "message": "Login successful",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "role": "FREE",
    "maxWorkers": 3,
    "ttlSeconds": 1800
  }
}
```

**Set-Cookie Header:**
```
auth_token=<JWT_TOKEN>; HttpOnly; SameSite=Lax; Path=/; Max-Age=86400
```

**Errors:**
```json
// 401 Unauthorized
{
  "error": "Invalid credentials"
}
```

**Side Effects:**
- JWT token disimpan dalam httpOnly cookie
- Session start time di-update
- Workers diinisialisasi/refresh untuk user

---

### 3. Logout User

**Endpoint:** `POST /api/x7auth/session/logout`

**Deskripsi:** Logout user dan menghapus JWT token.

**Authentication:** Required

**Request Body:** None

**Response (200 OK):**
```json
{
  "message": "Logout successful"
}
```

**Side Effects:**
- Cookie `auth_token` dihapus

---

### 4. Get Current User

**Endpoint:** `GET /api/x7auth/session/me`

**Deskripsi:** Mendapatkan informasi user yang sedang login.

**Authentication:** Required

**Request Body:** None

**Response (200 OK):**
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "role": "FREE",
    "maxWorkers": 3,
    "ttlSeconds": 1800,
    "remainingTTL": 1650
  }
}
```

**Errors:**
```json
// 401 Unauthorized
{
  "error": "Authentication required"
}

// 403 Forbidden
{
  "error": "Invalid or expired token"
}
```

---

## User Management Endpoints

Base Path: `/api/usr/caps`

### 1. Get User Capabilities

**Endpoint:** `GET /api/usr/caps/limits`

**Deskripsi:** Mendapatkan batasan dan fitur user berdasarkan role.

**Authentication:** Required

**Request Body:** None

**Response (200 OK):**
```json
{
  "maxWorkers": 3,
  "role": "FREE",
  "features": ["basic_generation"]
}

// PREMIUM user:
{
  "maxWorkers": 10,
  "role": "PREMIUM",
  "features": ["basic_generation", "model_selection", "priority_queue"]
}
```

---

### 2. Get Remaining TTL

**Endpoint:** `GET /api/usr/caps/ttl-q9a`

**Deskripsi:** Mendapatkan sisa waktu session dalam detik.

**Authentication:** Required

**Request Body:** None

**Response (200 OK):**
```json
{
  "remainingSeconds": 1650,
  "totalSeconds": 1800,
  "percentRemaining": 91.67
}
```

**Calculation:**
```javascript
remainingSeconds = ttlSeconds - (currentTime - sessionStartTime)
percentRemaining = (remainingSeconds / totalSeconds) * 100
```

---

## Prompt Processing Endpoints

Base Path: `/api/pmt/ingest`

### 1. Parse Manual Prompts

**Endpoint:** `POST /api/pmt/ingest/parse`

**Deskripsi:** Parse text prompts (satu prompt per baris).

**Authentication:** Required

**Request Body:**
```json
{
  "text": "A serene mountain landscape\nFuturistic city with flying cars\nAstronaut in space"
}
```

**Response (200 OK):**
```json
{
  "prompts": [
    "A serene mountain landscape",
    "Futuristic city with flying cars",
    "Astronaut in space"
  ],
  "count": 3
}
```

**Processing Rules:**
- Split by newline (`\n`)
- Trim whitespace
- Remove empty lines

**Errors:**
```json
// 400 Bad Request
{
  "error": "Invalid prompt text"
}
```

---

### 2. Upload Prompts File

**Endpoint:** `POST /api/pmt/ingest/upload`

**Deskripsi:** Upload file .txt berisi prompts (satu per baris).

**Authentication:** Required

**Request Type:** `multipart/form-data`

**Request Body:**
```
Content-Type: multipart/form-data
file: <file.txt>
```

**File Constraints:**
- Max size: 5MB (5,242,880 bytes)
- Format: .txt only
- Max lines: 1,000 lines

**Response (200 OK):**
```json
{
  "prompts": [
    "Prompt line 1",
    "Prompt line 2",
    "Prompt line 3"
  ],
  "count": 3,
  "filename": "my-prompts.txt"
}
```

**Errors:**
```json
// 400 Bad Request - No file
{
  "error": "No file uploaded"
}

// 400 Bad Request - Wrong format
{
  "error": "File upload error: Only .txt files are allowed"
}

// 400 Bad Request - Too many lines
{
  "error": "File exceeds maximum line limit of 1000"
}
```

---

## Job Management Endpoints

Base Path: `/api/vdo/fabric`

### 1. Create Job

**Endpoint:** `POST /api/vdo/fabric/create`

**Deskripsi:** Membuat job video generation baru.

**Authentication:** Required

**Request Body:**
```json
{
  "prompts": [
    "Mountain landscape at sunset",
    "Futuristic city"
  ],
  "ratio": "16:9",           // "16:9" | "9:16" | "1:1" | "4:5" | "custom"
  "customWidth": 1920,        // Required if ratio="custom"
  "customHeight": 1080,       // Required if ratio="custom"
  "saveTarget": "browser",    // "browser" | "google_drive"
  "maxWorkers": 3,            // Will be clamped to user's max
  "model": "fast"             // Optional, PREMIUM only: "mini" | "fast" | "lite" | "pro"
}
```

**Validation Rules:**
- `prompts`: Array of strings, min 1 item
- `ratio`: One of allowed values
- `customWidth`: 1-7680 if ratio is "custom"
- `customHeight`: 1-4320 if ratio is "custom"
- `saveTarget`: "browser" or "google_drive"
- `maxWorkers`: 1-10 (clamped to user's limit)
- `model`: PREMIUM role only

**Response (201 Created):**
```json
{
  "message": "Job created successfully",
  "jobId": "job_1698765432000_a3f9c2e1",
  "status": "queued"
}
```

**Errors:**
```json
// 403 Forbidden - Model selection for FREE user
{
  "error": "Model selection is a premium feature"
}

// 400 Bad Request - Validation
{
  "error": "Validation failed",
  "details": [
    {
      "field": "prompts",
      "message": "\"prompts\" must contain at least 1 items"
    }
  ]
}
```

**Side Effects:**
- Job dibuat dalam database
- Workers assigned
- Processing dimulai
- Logs mulai streaming via SSE

---

### 2. Get Job Status

**Endpoint:** `GET /api/vdo/fabric/status/:jobId`

**Deskripsi:** Mendapatkan status job tertentu.

**Authentication:** Required

**Path Parameters:**
- `jobId`: Job ID (string)

**Response (200 OK):**
```json
{
  "job": {
    "id": "job_1698765432000_a3f9c2e1",
    "prompts": [
      "Mountain landscape",
      "Futuristic city"
    ],
    "ratio": "16:9",
    "saveTarget": "browser",
    "model": "fast",
    "status": "processing",
    "createdAt": "2025-10-25T10:30:00.000Z",
    "completedAt": null
  }
}
```

**Job Status Values:**
- `queued`: Job created, waiting to process
- `processing`: Currently being processed
- `completed`: Successfully completed
- `failed`: Failed with error

**Errors:**
```json
// 404 Not Found
{
  "error": "Job not found"
}
```

---

### 3. List User Jobs

**Endpoint:** `GET /api/vdo/fabric/list`

**Deskripsi:** Mendapatkan daftar semua job milik user.

**Authentication:** Required

**Response (200 OK):**
```json
{
  "jobs": [
    {
      "id": "job_1698765432000_a3f9c2e1",
      "promptCount": 5,
      "ratio": "16:9",
      "status": "completed",
      "createdAt": "2025-10-25T10:30:00.000Z"
    },
    {
      "id": "job_1698765431000_b2e8d1c0",
      "promptCount": 3,
      "ratio": "9:16",
      "status": "processing",
      "createdAt": "2025-10-25T10:25:00.000Z"
    }
  ]
}
```

**Sorting:** Descending by `createdAt` (newest first)

---

## Worker Status Endpoints

Base Path: `/api/wrk/grid29`

### 1. Get Worker Status

**Endpoint:** `GET /api/wrk/grid29/status`

**Deskripsi:** Mendapatkan status semua workers user (snapshot).

**Authentication:** Required

**Response (200 OK):**
```json
{
  "workers": [
    {
      "id": 1,
      "server": "us-east-1.compute.cloud",
      "status": "busy",
      "currentJobId": "job_1698765432000_a3f9c2e1",
      "lastHeartbeat": "2025-10-25T10:35:15.000Z"
    },
    {
      "id": 2,
      "server": "us-west-2.compute.cloud",
      "status": "idle",
      "currentJobId": null,
      "lastHeartbeat": "2025-10-25T10:35:12.000Z"
    },
    {
      "id": 3,
      "server": "eu-west-1.compute.cloud",
      "status": "idle",
      "currentJobId": null,
      "lastHeartbeat": "2025-10-25T10:35:10.000Z"
    }
  ]
}
```

**Worker Status Values:**
- `idle`: Worker siap menerima job
- `busy`: Worker sedang memproses job
- `offline`: Worker tidak merespons (heartbeat > 1 menit)

---

## Real-time Streaming (SSE)

Base Path: `/api/sts/k7q` dan `/api/wrk/grid29`

### 1. Worker Status Stream

**Endpoint:** `GET /api/wrk/grid29/stream`

**Deskripsi:** Real-time updates untuk status workers via Server-Sent Events.

**Authentication:** Required

**Protocol:** Server-Sent Events (EventSource)

**Response Headers:**
```http
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
X-Accel-Buffering: no
```

**Event Format:**
```javascript
// Initial connection
: connected

// Data events
data: {"type":"init","workers":[...]}

data: {"type":"update","workers":[...]}

data: {"type":"update","workers":[...]}
```

**Event Data Structure:**
```json
{
  "type": "update",
  "workers": [
    {
      "id": 1,
      "server": "us-east-1.compute.cloud",
      "status": "busy",
      "currentJobId": "job_1698765432000_a3f9c2e1",
      "lastHeartbeat": "2025-10-25T10:35:15.000Z"
    }
  ]
}
```

**Update Frequency:** Real-time (saat ada perubahan) + heartbeat setiap 5 detik

**Frontend Usage:**
```javascript
const eventSource = new EventSource(
  'http://localhost:5000/api/wrk/grid29/stream',
  { withCredentials: true }
);

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'init' || data.type === 'update') {
    console.log('Workers:', data.workers);
  }
};

eventSource.onerror = (error) => {
  console.error('SSE error:', error);
  eventSource.close();
};
```

---

### 2. Logs Stream

**Endpoint:** `GET /api/sts/k7q/logs/stream`

**Deskripsi:** Real-time streaming logs untuk job lifecycle.

**Authentication:** Required

**Query Parameters:**
- `jobId` (optional): Filter logs untuk job tertentu

**Examples:**
```
GET /api/sts/k7q/logs/stream           // All logs
GET /api/sts/k7q/logs/stream?jobId=job_123  // Filtered by job
```

**Event Format:**
```javascript
// Connection established
: connected

// Log entries
data: {"jobId":"job_123","workerId":1,"phase":"created","message":"Job created with 3 prompts","timestamp":"2025-10-25T10:30:00.000Z"}

data: {"jobId":"job_123","workerId":null,"phase":"started","message":"Processing 3 prompts with 2 workers","timestamp":"2025-10-25T10:30:01.000Z"}

data: {"jobId":"job_123","workerId":1,"phase":"processing","message":"Worker 1: Processing prompt 1/3","timestamp":"2025-10-25T10:30:02.000Z"}

data: {"jobId":"job_123","workerId":1,"phase":"rendering","message":"Worker 1: Rendering video for \"Mountain...\"","timestamp":"2025-10-25T10:30:05.000Z"}

data: {"jobId":"job_123","workerId":1,"phase":"completed","message":"Worker 1: Completed prompt 1/3","timestamp":"2025-10-25T10:30:08.000Z"}

data: {"jobId":"job_123","workerId":null,"phase":"finished","message":"All prompts completed successfully","timestamp":"2025-10-25T10:30:15.000Z"}
```

**Log Phases:**
- `created`: Job dibuat
- `started`: Processing dimulai
- `processing`: Worker memproses prompt
- `rendering`: Worker rendering video
- `completed`: Prompt selesai
- `finished`: Semua prompts selesai
- `error`: Error terjadi

**Frontend Usage:**
```javascript
const eventSource = new EventSource(
  'http://localhost:5000/api/sts/k7q/logs/stream?jobId=job_123',
  { withCredentials: true }
);

eventSource.onmessage = (event) => {
  const log = JSON.parse(event.data);
  console.log(`[${log.phase}] ${log.message}`);
};

// Auto-reconnect on error
eventSource.onerror = (error) => {
  console.error('Connection lost, reconnecting...');
  eventSource.close();
  setTimeout(() => {
    // Recreate connection
  }, 5000);
};
```

---

## Error Handling

### Standard Error Response Format

```json
{
  "error": "Error message here"
}

// With validation details
{
  "error": "Validation failed",
  "details": [
    {
      "field": "email",
      "message": "\"email\" must be a valid email"
    }
  ]
}
```

### HTTP Status Codes

| Code | Meaning | When Used |
|------|---------|-----------|
| 200 | OK | Request successful |
| 201 | Created | Resource created (register, create job) |
| 400 | Bad Request | Validation failed, invalid input |
| 401 | Unauthorized | Not authenticated |
| 403 | Forbidden | Authenticated but not authorized |
| 404 | Not Found | Resource not found |
| 500 | Internal Server Error | Server error |

### Common Errors

**Authentication Errors:**
```json
// 401 - No token
{
  "error": "Authentication required"
}

// 403 - Invalid token
{
  "error": "Invalid or expired token"
}

// 401 - User not found
{
  "error": "User not found"
}
```

**Validation Errors:**
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "password",
      "message": "\"password\" length must be at least 6 characters long"
    },
    {
      "field": "email",
      "message": "\"email\" must be a valid email"
    }
  ]
}
```

**File Upload Errors:**
```json
{
  "error": "File upload error: File too large"
}
```

---

## Rate Limiting & Security

### CORS Configuration

**Allowed Origins:**
```
Development: http://localhost:3000
Production: Your domain
```

**Allowed Methods:**
```
GET, POST, PUT, DELETE, OPTIONS
```

**Credentials:**
```
Allowed (required for cookies)
```

### Security Headers (Helmet)

```http
Content-Security-Policy: ...
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: no-referrer
```

### Input Validation

All inputs divalidasi menggunakan **Joi schemas**:
- Email format validation
- Password length (min 6 chars)
- File size limits (5MB)
- Prompt line limits (1000 lines)
- Enum validation (role, ratio, saveTarget, etc.)

### SQL Injection Protection

Menggunakan **parameterized queries** (prepared statements):
```javascript
// SAFE - parameterized
db.prepare('SELECT * FROM users WHERE email = ?').get(email);

// UNSAFE - string concatenation (NEVER DO THIS)
db.exec(`SELECT * FROM users WHERE email = '${email}'`);
```

### XSS Protection

- JWT dalam httpOnly cookies (tidak bisa diakses JavaScript)
- React auto-escaping untuk output
- Content-Security-Policy headers

---

## API Summary Table

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/x7auth/session/register` | POST | No | Register user |
| `/api/x7auth/session/login` | POST | No | Login user |
| `/api/x7auth/session/logout` | POST | Yes | Logout user |
| `/api/x7auth/session/me` | GET | Yes | Get current user |
| `/api/usr/caps/limits` | GET | Yes | Get user capabilities |
| `/api/usr/caps/ttl-q9a` | GET | Yes | Get remaining TTL |
| `/api/pmt/ingest/parse` | POST | Yes | Parse manual prompts |
| `/api/pmt/ingest/upload` | POST | Yes | Upload prompts file |
| `/api/vdo/fabric/create` | POST | Yes | Create video job |
| `/api/vdo/fabric/status/:jobId` | GET | Yes | Get job status |
| `/api/vdo/fabric/list` | GET | Yes | List user jobs |
| `/api/wrk/grid29/status` | GET | Yes | Get worker status |
| `/api/wrk/grid29/stream` | GET (SSE) | Yes | Stream worker updates |
| `/api/sts/k7q/logs/stream` | GET (SSE) | Yes | Stream job logs |

---

## Testing with cURL

### Register
```bash
curl -X POST http://localhost:5000/api/x7auth/session/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","role":"FREE"}'
```

### Login
```bash
curl -X POST http://localhost:5000/api/x7auth/session/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email":"test@example.com","password":"password123"}'
```

### Get Current User
```bash
curl http://localhost:5000/api/x7auth/session/me \
  -b cookies.txt
```

### Create Job
```bash
curl -X POST http://localhost:5000/api/vdo/fabric/create \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "prompts":["Mountain landscape","City at night"],
    "ratio":"16:9",
    "saveTarget":"browser",
    "maxWorkers":2
  }'
```

### Stream Logs (SSE)
```bash
curl -N http://localhost:5000/api/sts/k7q/logs/stream \
  -b cookies.txt
```

---

**Last Updated:** 2025-10-25
**API Version:** 1.0.0
**Base URL:** http://localhost:5000
