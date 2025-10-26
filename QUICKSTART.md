# Quick Start Guide

Get the Video Generation Platform running in 5 minutes!

## Prerequisites

- Node.js 18+ installed
- npm installed
- Two terminal windows

## Installation Steps

### 1. Setup Backend

```bash
# Navigate to backend
cd backend

# Install dependencies
npm install

# Create .env file from example
copy .env.example .env

# Seed demo users
npm run seed
```

### 2. Setup Frontend

```bash
# Navigate to frontend (in new terminal)
cd frontend

# Install dependencies
npm install

# Create .env.local file from example
copy .env.local.example .env.local
```

### 3. Start Servers

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### 4. Access Application

Open browser and navigate to: **http://localhost:3000**

## Demo Credentials

### FREE Account
- Email: `free@test.com`
- Password: `password123`
- Features: 3 workers, 30 min session

### PREMIUM Account
- Email: `premium@test.com`
- Password: `password123`
- Features: 10 workers, 2 hour session, model selection

## What to Test

1. Login with FREE account
2. See role badge and TTL countdown
3. Enter prompts manually or upload .txt file
4. Select ratio and options
5. Note: Model picker is disabled (Premium only)
6. Submit job and watch:
   - Worker status updates (live)
   - Console logs stream (live)
7. Login with PREMIUM account
8. See extended features (model selection enabled)

## Architecture

- **Frontend**: Next.js 14 on port 3000
- **Backend**: Express 5 on port 5000
- **Database**: SQLite (auto-created)
- **Real-time**: Server-Sent Events (SSE)

## Troubleshooting

### Port Already in Use

```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3000 | xargs kill -9
```

### Database Issues

```bash
cd backend
del dev.db
npm run seed
```

### SSE Not Working

- Check browser console for errors
- Verify CORS settings in backend/.env
- Ensure both servers are running
- Try hard refresh (Ctrl+Shift+R)

## Next Steps

- Read full README.md for detailed documentation
- Explore obfuscated API routes
- Test all acceptance criteria
- Customize theme in frontend/public/custom.css
- Add your own features!

## Support

For issues, check:
1. Console logs (both frontend and backend)
2. Network tab in browser DevTools
3. Verify .env files are created correctly
4. Ensure dependencies installed properly

Happy generating!
