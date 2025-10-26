# Windows Installation Fix

## Issue
The original `better-sqlite3` package requires Visual Studio Build Tools on Windows, which causes installation errors.

## Solution
The project has been updated to use `sql.js`, a pure JavaScript SQLite implementation that works without native compilation.

## What Changed

### 1. Package Dependencies
- ❌ Removed: `better-sqlite3` (requires C++ compilation)
- ✅ Added: `sql.js` (pure JavaScript, no compilation needed)
- ⬆️ Updated: `multer` to v2.0.0 (fixes security warnings)

### 2. Database Configuration
- Updated `backend/src/config/database.js` to use sql.js
- Updated `backend/scripts/seed.js` to use sql.js
- **No changes needed** to the rest of the codebase - API remains identical

## Installation Now Works!

Simply run:

```bash
cd backend
npm install
npm run seed
npm run dev
```

No Visual Studio or build tools required!

## Performance Notes

`sql.js` is:
- ✅ **Easier to install** - No native dependencies
- ✅ **Cross-platform** - Works on Windows, Mac, Linux
- ✅ **Fully compatible** - Same SQLite features
- ⚠️ **Slightly slower** - Pure JS vs native code (negligible for this app)
- ⚠️ **Manual saves** - Auto-saves every 5 seconds + on shutdown

For production with PostgreSQL, this doesn't matter as you'll switch databases anyway.

## Alternative: Install Visual Studio Build Tools

If you prefer the original `better-sqlite3`:

1. Install Visual Studio Build Tools:
   https://visualstudio.microsoft.com/downloads/
   - Select "Desktop development with C++"

2. Revert package.json:
   ```json
   "sql.js": "^1.10.3"  →  "better-sqlite3": "^9.2.2"
   ```

3. Revert database.js and seed.js to use `better-sqlite3`

But this is **not recommended** - sql.js works great for this application!

## Verification

After installation, verify it works:

```bash
# Backend
cd backend
npm run seed

# You should see:
# ✅ FREE user created
# ✅ PREMIUM user created
# ✅ Initialized 3 workers for FREE user
# ✅ Initialized 10 workers for PREMIUM user
# 🎉 Seed completed successfully!
```

All done! Continue with the normal setup from README.md or QUICKSTART.md.
