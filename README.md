# Video Generation Platform

Production-grade full-stack video generation web application with role-based access control, real-time updates, and SSE streaming.

## Features

- **Authentication**: JWT-based auth with httpOnly cookies
- **Role-Based Access**: FREE (3 workers, 30min TTL) and PREMIUM (10 workers, 2hr TTL)
- **Real-time Updates**: SSE streams for logs and worker status
- **Dark Theme**: Bootstrap 5 dark mode with custom styling
- **Obfuscated API Routes**: Security-first approach with non-obvious endpoints
- **File Upload**: Support for .txt batch prompts
- **Google Drive Integration**: Placeholder for cloud storage
- **Live Worker Monitoring**: Real-time worker status grid with heartbeat tracking

## Tech Stack

**Frontend:**
- Next.js 14+ (App Router)
- Bootstrap 5 (Dark Theme)
- React 18
- Server-Sent Events (SSE)

**Backend:**
- Node.js + Express 5
- SQLite (easily swappable to PostgreSQL)
- JWT Authentication
- SSE for real-time streaming

## Prerequisites

- Node.js 18+ and npm
- Git

## Installation

### 1. Clone and Setup

```bash
# Navigate to project root
cd video-gen-app

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Environment Configuration

**Backend** (`backend/.env`):
```env
PORT=5000
JWT_SECRET=your-super-secret-jwt-key-change-in-production
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000

# Google Drive (optional - placeholder)
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/google/callback
```

**Frontend** (`frontend/.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

### 3. Seed Demo Data

```bash
cd backend
npm run seed
```

This creates:
- **FREE User**: `free@test.com` / `password123` (3 workers, 30min TTL)
- **PREMIUM User**: `premium@test.com` / `password123` (10 workers, 2hr TTL)

### 4. Run the Application

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```
Backend runs on `http://localhost:5000`

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```
Frontend runs on `http://localhost:3000`

## Usage

1. Visit `http://localhost:3000`
2. You'll be redirected to `/login` if not authenticated
3. Login with demo credentials
4. Start generating videos from the dashboard

## API Routes (Obfuscated)

The backend uses non-obvious routes for security:

- **Auth**: `/api/x7auth/session/*`
- **Prompts**: `/api/pmt/ingest/*`
- **Jobs**: `/api/vdo/fabric/*`
- **Workers**: `/api/wrk/grid29/*`
- **Users**: `/api/usr/caps/*`
- **Streams**: `/api/sts/k7q/*`

## SSE Endpoints

1. **Logs Stream**: `GET /api/sts/k7q/logs`
   - Real-time job logs
   - Query params: `?jobId=xxx` (optional filter)

2. **Worker Status Stream**: `GET /api/sts/k7q/workers`
   - Live worker grid updates
   - Heartbeat tracking
   - Server assignment visibility

## Acceptance Tests

Run through these scenarios:

### 1. Auth Redirect
- Visit `/` without login → redirects to `/login`
- Login → redirects to `/` (dashboard)

### 2. FREE User Features
- Login as `free@test.com`
- See "FREE" badge in navbar
- Live TTL countdown visible
- Model picker disabled with "Premium only" tooltip
- Max workers clamped to 3
- Worker grid shows 3 workers max

### 3. PREMIUM User Features
- Login as `premium@test.com`
- See "PREMIUM" badge
- Model picker enabled (-Mini, -Fast, -Lite, -Pro)
- Max workers up to 10
- Extended TTL (2 hours)

### 4. Prompt Entry
- Manual textarea: fixed height, scrolls on overflow
- Upload .txt: shows "N lines detected"
- Both combined when submitted

### 5. Ratio Selection
- Dropdown: 16:9, 9:16, 1:1, 4:5
- Custom: manual width/height inputs

### 6. Save Target
- "Browser (Local)": simulates downloadable results
- "Google Drive": shows connect placeholder

### 7. Worker Status
- All workers visible (idle/busy/offline)
- Columns: ID, Server, Status, Current Jobs, Heartbeat
- Live updates via SSE

### 8. Logs Panel
- Fixed height with scroll
- Live SSE entries
- Filter by job ID
- Clear button

### 9. Obfuscated Routes
- Check network tab: all APIs use 3+ segment paths

### 10. UI/UX
- Dark theme throughout
- High contrast
- No layout shifts (fixed heights)
- Smooth scrolling

## Architecture Notes

### Database
Currently uses SQLite with in-memory option. To switch to PostgreSQL:

1. Install `pg` package
2. Update `backend/src/config/database.js`
3. Update connection string in `.env`

### SSE vs WebSocket
Current implementation uses SSE for simplicity. To switch to WebSocket:

1. Install `ws` package
2. Replace SSE streams in `logService.js` and `workerService.js`
3. Update frontend to use WebSocket client

### Google Drive Integration
Placeholder endpoints exist. To enable:

1. Create OAuth 2.0 credentials in Google Cloud Console
2. Add credentials to `.env`
3. Implement OAuth flow in `backend/src/services/googleDriveService.js`
4. Update frontend connect button handler

## Security Considerations

- JWT tokens in httpOnly cookies (XSS protection)
- CSRF tokens for state-changing operations
- Input validation and sanitization
- File upload size limits (5MB, 1000 lines)
- Rate limiting ready (add middleware)
- Obfuscated routes reduce trivial probing

## Development Scripts

**Backend:**
- `npm run dev` - Start with nodemon
- `npm start` - Production start
- `npm run seed` - Seed demo users

**Frontend:**
- `npm run dev` - Next.js dev server
- `npm run build` - Production build
- `npm start` - Production server

## Troubleshooting

### Port Already in Use
```bash
# Kill process on port 5000 (backend)
npx kill-port 5000

# Kill process on port 3000 (frontend)
npx kill-port 3000
```

### SSE Connection Issues
- Check CORS configuration in backend
- Ensure cookies are being sent (credentials: 'include')
- Verify JWT token is valid

### Database Lock Errors
- Restart backend server
- Delete `backend/dev.db` and re-seed

## License

MIT

## Support

For issues or questions, contact the development team.
