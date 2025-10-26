# Startup Checklist

Use this checklist to ensure everything is configured correctly before running the application.

## Pre-Flight Checks

### System Requirements
- [ ] Node.js 18+ installed (`node --version`)
- [ ] npm installed (`npm --version`)
- [ ] Git installed (optional, `git --version`)
- [ ] Two terminal windows available
- [ ] Modern browser (Chrome, Firefox, Edge)

### Ports Available
- [ ] Port 3000 free (frontend)
- [ ] Port 5000 free (backend)

**Check ports:**
```bash
# Windows
netstat -an | findstr :3000
netstat -an | findstr :5000

# Linux/Mac
lsof -i :3000
lsof -i :5000
```

**Kill if needed:**
```bash
# Windows
taskkill /PID <PID> /F

# Linux/Mac
kill -9 <PID>
```

---

## Backend Setup

### 1. Install Dependencies
```bash
cd backend
npm install
```

**Expected output:**
- [ ] No errors
- [ ] `node_modules/` folder created
- [ ] `package-lock.json` created

### 2. Environment Configuration
- [ ] `.env` file exists (or copy from `.env.example`)
- [ ] `JWT_SECRET` is set (min 32 characters)
- [ ] `PORT=5000`
- [ ] `CORS_ORIGIN=http://localhost:3000`

**Verify:**
```bash
type .env    # Windows
cat .env     # Linux/Mac
```

### 3. Database Seeding
```bash
npm run seed
```

**Expected output:**
- [ ] "FREE user created"
- [ ] "PREMIUM user created"
- [ ] "Initialized 3 workers for FREE user"
- [ ] "Initialized 10 workers for PREMIUM user"
- [ ] `dev.db` file created in `backend/`

### 4. Start Backend Server
```bash
npm run dev
```

**Expected output:**
```
🚀 Video Generation API Server
📡 Running on: http://localhost:5000
🌍 Environment: development
🔐 CORS Origin: http://localhost:3000

📚 API Endpoints (obfuscated):
   Auth:    /api/x7auth/session/*
   Prompts: /api/pmt/ingest/*
   Jobs:    /api/vdo/fabric/*
   Users:   /api/usr/caps/*
   Workers: /api/wrk/grid29/*
   Streams: /api/sts/k7q/*

✅ Server ready!
```

- [ ] Server starts without errors
- [ ] Listening on port 5000
- [ ] No database errors

**Test backend health:**
```bash
curl http://localhost:5000/health

# Or open in browser:
http://localhost:5000/health
```

**Expected response:**
```json
{"status":"ok","timestamp":"2025-10-25T..."}
```

---

## Frontend Setup

### 1. Install Dependencies
```bash
cd frontend
npm install
```

**Expected output:**
- [ ] No errors
- [ ] `node_modules/` folder created
- [ ] `package-lock.json` created

### 2. Environment Configuration
- [ ] `.env.local` file exists (or copy from `.env.local.example`)
- [ ] `NEXT_PUBLIC_API_URL=http://localhost:5000`

**Verify:**
```bash
type .env.local    # Windows
cat .env.local     # Linux/Mac
```

### 3. Start Frontend Server
```bash
npm run dev
```

**Expected output:**
```
  ▲ Next.js 14.x.x
  - Local:        http://localhost:3000
  - Environments: .env.local

 ✓ Ready in Xs
```

- [ ] Server starts without errors
- [ ] Listening on port 3000
- [ ] No compilation errors

**Test frontend:**
```
Open browser: http://localhost:3000
```

---

## Application Verification

### 1. Initial Page Load
- [ ] Browser opens to `http://localhost:3000`
- [ ] Automatically redirects to `/login`
- [ ] Login page displays correctly
- [ ] Dark theme active
- [ ] No console errors

### 2. FREE User Login
- [ ] Enter: `free@test.com` / `password123`
- [ ] Click "Sign In"
- [ ] Redirects to `/` (dashboard)
- [ ] Navbar appears
- [ ] "FREE" badge visible
- [ ] TTL countdown shows ~30:00 (30 minutes)

### 3. Dashboard Components
- [ ] Left column: Generator form visible
- [ ] Right column: Worker Status table visible
- [ ] Right column: Console Logs panel visible
- [ ] All cards render correctly
- [ ] Dark theme throughout

### 4. Generator Form (FREE)
- [ ] Prompt textarea present
- [ ] File upload option present
- [ ] Ratio dropdown works
- [ ] Save target dropdown works
- [ ] Max workers input shows limit: 3
- [ ] Model dropdown **DISABLED** with "PREMIUM" badge
- [ ] Submit button present

### 5. Worker Status Table
- [ ] Shows 3 workers
- [ ] Columns: ID, Server, Status, Current Jobs, Heartbeat
- [ ] All workers show "IDLE"
- [ ] Servers assigned (e.g., us-east-1.compute.cloud)

### 6. Console Logs Panel
- [ ] Panel displays "No logs yet" message
- [ ] Filter input present
- [ ] Clear button present

### 7. Submit Test Job (FREE)
- [ ] Enter 2-3 prompts in textarea
- [ ] Set max workers to 2
- [ ] Click "Generate Videos"
- [ ] Success message appears with Job ID
- [ ] Form clears
- [ ] **Console logs start appearing immediately**
- [ ] **Worker status updates (some become "BUSY")**

### 8. Live Updates
- [ ] Logs stream in real-time
- [ ] Log phases visible: CREATED → STARTED → PROCESSING → RENDERING → COMPLETED → FINISHED
- [ ] Logs auto-scroll to bottom
- [ ] Worker statuses update live
- [ ] Workers return to "IDLE" after completion

### 9. PREMIUM User Test
- [ ] Logout
- [ ] Login as `premium@test.com` / `password123`
- [ ] "PREMIUM" badge visible (gradient orange/red)
- [ ] TTL shows ~02:00:00 (2 hours)
- [ ] Worker table shows **10 workers**
- [ ] Max workers limit: 10
- [ ] Model dropdown **ENABLED**
- [ ] Can select: Mini, Fast, Lite, Pro

### 10. Network Inspection
- [ ] Open DevTools → Network tab
- [ ] Submit a job
- [ ] Verify API calls use obfuscated paths:
  - `/api/vdo/fabric/create`
  - `/api/usr/caps/ttl-q9a`
- [ ] SSE streams visible:
  - `/api/wrk/grid29/stream` (EventStream type)
  - `/api/sts/k7q/logs/stream` (EventStream type)

---

## Troubleshooting

### Backend Won't Start

**Problem**: Port 5000 already in use
```bash
# Find process
netstat -ano | findstr :5000   # Windows
lsof -i :5000                  # Linux/Mac

# Kill process
taskkill /PID <PID> /F         # Windows
kill -9 <PID>                  # Linux/Mac
```

**Problem**: Database errors
```bash
# Delete database and re-seed
cd backend
del dev.db        # Windows
rm dev.db         # Linux/Mac
npm run seed
```

**Problem**: Module not found
```bash
cd backend
del package-lock.json node_modules /S /Q   # Windows
rm -rf package-lock.json node_modules       # Linux/Mac
npm install
```

### Frontend Won't Start

**Problem**: Port 3000 already in use
```bash
# Same as above, but for port 3000
```

**Problem**: Module not found
```bash
cd frontend
del package-lock.json node_modules /S /Q   # Windows
rm -rf package-lock.json node_modules       # Linux/Mac
npm install
```

**Problem**: .env.local not found
```bash
copy .env.local.example .env.local   # Windows
cp .env.local.example .env.local     # Linux/Mac
```

### SSE Not Connecting

**Problem**: Logs not streaming

1. Check backend is running (`http://localhost:5000/health`)
2. Check browser console for errors
3. Verify CORS settings in `backend/.env`
4. Hard refresh browser (Ctrl+Shift+R)
5. Check Network tab for failed SSE connections

**Problem**: CORS errors

Update `backend/.env`:
```
CORS_ORIGIN=http://localhost:3000
```

Restart backend server.

### Authentication Issues

**Problem**: Redirects to login immediately

1. Check cookies in DevTools (Application → Cookies)
2. Look for `auth_token` cookie
3. If missing, login again
4. If persists, check `JWT_SECRET` in backend `.env`

**Problem**: "Invalid token"

1. Clear cookies
2. Login again
3. Verify JWT_SECRET matches between sessions

---

## Performance Checks

### Backend Health
- [ ] CPU usage < 10% when idle
- [ ] Memory usage < 100MB when idle
- [ ] No memory leaks over 10 minutes

### Frontend Performance
- [ ] Initial page load < 2 seconds
- [ ] Dashboard renders smoothly
- [ ] No layout shifts
- [ ] Scrolling is smooth

### SSE Performance
- [ ] Log updates appear instantly
- [ ] Worker updates appear within 5 seconds
- [ ] No disconnections
- [ ] Reconnects automatically on failure

---

## Security Checks

### Cookies
- [ ] Open DevTools → Application → Cookies
- [ ] `auth_token` cookie exists
- [ ] HttpOnly: ✓
- [ ] Secure: ✓ (production) or ✗ (development)
- [ ] SameSite: Lax or Strict

### CORS
- [ ] Network tab → Check response headers
- [ ] `Access-Control-Allow-Origin: http://localhost:3000`
- [ ] `Access-Control-Allow-Credentials: true`

### Input Validation
- [ ] Try submitting empty form → error message
- [ ] Try uploading .pdf → error message
- [ ] Try uploading 2000 line .txt → error message
- [ ] Try setting max workers > limit → auto-clamped

---

## Final Checklist

### System Status
- [ ] Backend running on port 5000
- [ ] Frontend running on port 3000
- [ ] Database seeded with demo users
- [ ] No errors in either terminal
- [ ] No errors in browser console

### Authentication
- [ ] Login works (FREE user)
- [ ] Login works (PREMIUM user)
- [ ] Logout works
- [ ] Redirect to /login when not authenticated
- [ ] Redirect to / when authenticated

### Features (FREE)
- [ ] 3 workers visible
- [ ] TTL countdown working
- [ ] Model picker disabled
- [ ] Prompts can be entered
- [ ] File can be uploaded
- [ ] Job can be submitted
- [ ] Logs stream live
- [ ] Workers update live

### Features (PREMIUM)
- [ ] 10 workers visible
- [ ] Extended TTL (2 hours)
- [ ] Model picker enabled
- [ ] All FREE features work

### UI/UX
- [ ] Dark theme throughout
- [ ] Responsive layout
- [ ] Fixed heights (no layout shifts)
- [ ] Smooth scrolling
- [ ] High contrast
- [ ] Accessible focus states

### Real-time
- [ ] SSE logs stream
- [ ] SSE worker updates
- [ ] Auto-reconnect on failure
- [ ] No connection drops

---

## Ready to Go!

If all checkboxes are checked, your Video Generation Platform is **fully operational**!

**Access the application:**
- Frontend: http://localhost:3000
- Backend: http://localhost:5000/health

**Demo Accounts:**
- FREE: `free@test.com` / `password123`
- PREMIUM: `premium@test.com` / `password123`

**Next Steps:**
1. Read `TESTING.md` for comprehensive test cases
2. Review `ARCHITECTURE.md` for technical details
3. Explore `README.md` for API documentation
4. Start building your features!

---

**Checklist Completed**: ☐ Yes ☐ No
**Date**: _______________
**Time Spent**: _______________
**Issues Encountered**: _______________

---

Happy generating! 🎬
