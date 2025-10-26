# Testing Checklist

Complete acceptance testing guide for the Video Generation Platform.

## Pre-Testing Setup

1. ✅ Backend running on port 5000
2. ✅ Frontend running on port 3000
3. ✅ Database seeded with demo users
4. ✅ Browser DevTools open (Network + Console tabs)

---

## Test 1: Authentication & Redirect

### Test 1.1: Unauthenticated Access
- [ ] Open http://localhost:3000 in **incognito/private window**
- [ ] **Expected**: Automatic redirect to `/login`
- [ ] Verify URL shows `/login`

### Test 1.2: Login Flow
- [ ] Enter credentials: `free@test.com` / `password123`
- [ ] Click "Sign In"
- [ ] **Expected**: Redirect to `/` (dashboard)
- [ ] Verify navbar appears with user info

### Test 1.3: Authenticated Redirect
- [ ] While logged in, navigate to `/login`
- [ ] **Expected**: Automatic redirect to `/` (dashboard)

---

## Test 2: FREE User Features

### Test 2.1: Role Badge
- [ ] Login as `free@test.com`
- [ ] **Expected**: Badge shows "FREE" (gray background)
- [ ] Badge visible in navbar

### Test 2.2: TTL Countdown
- [ ] Observe countdown timer in navbar
- [ ] **Expected**: Shows `00:30:00` (30 minutes)
- [ ] Countdown decrements every second
- [ ] Format: `HH:MM:SS`

### Test 2.3: Model Picker Disabled
- [ ] Scroll to "Model" dropdown
- [ ] **Expected**: Dropdown is disabled/grayed out
- [ ] "PREMIUM" badge visible next to label
- [ ] Tooltip shows "Upgrade to Premium to access model selection"

### Test 2.4: Max Workers Limit
- [ ] Check "Max Workers" input
- [ ] **Expected**: Label shows "Your limit: 3"
- [ ] Try entering `10`
- [ ] Value automatically clamps to `3`

### Test 2.5: Worker Status Table
- [ ] Observe "Worker Status" card
- [ ] **Expected**: Shows exactly 3 workers
- [ ] Columns: ID, Server, Status, Current Jobs, Last Heartbeat
- [ ] All workers show "IDLE" status initially
- [ ] Each worker assigned to different server

---

## Test 3: PREMIUM User Features

### Test 3.1: Login as Premium
- [ ] Logout
- [ ] Login as `premium@test.com` / `password123`
- [ ] **Expected**: Badge shows "PREMIUM" (gradient orange/red)

### Test 3.2: Extended TTL
- [ ] Check countdown timer
- [ ] **Expected**: Shows `02:00:00` (2 hours)

### Test 3.3: Model Picker Enabled
- [ ] Check "Model" dropdown
- [ ] **Expected**: Dropdown is **enabled**
- [ ] Options visible: Mini, Fast, Lite, Pro
- [ ] Can select different models
- [ ] No "Premium only" lock

### Test 3.4: Extended Worker Limit
- [ ] Check "Max Workers" input
- [ ] **Expected**: Label shows "Your limit: 10"
- [ ] Can enter values up to 10
- [ ] Worker status table shows 10 workers

---

## Test 4: Prompt Entry

### Test 4.1: Manual Textarea
- [ ] Click in the textarea
- [ ] Paste 20 lines of text
- [ ] **Expected**: Textarea has fixed height (200px)
- [ ] Internal scrollbar appears
- [ ] No page layout shift
- [ ] Badge shows "20 total" prompts

### Test 4.2: File Upload
- [ ] Create `test-prompts.txt` with 15 lines
- [ ] Click "Or upload .txt file"
- [ ] Select file
- [ ] **Expected**: Shows "test-prompts.txt (15 lines detected)"
- [ ] Green success message appears
- [ ] Badge updates to show combined count

### Test 4.3: Combined Prompts
- [ ] Enter 5 manual prompts
- [ ] Upload file with 10 prompts
- [ ] **Expected**: Badge shows "15 total"

---

## Test 5: Ratio Selection

### Test 5.1: Preset Ratios
- [ ] Select each preset ratio:
  - [ ] 16:9 (Landscape)
  - [ ] 9:16 (Portrait)
  - [ ] 1:1 (Square)
  - [ ] 4:5 (Social)
- [ ] **Expected**: Dropdown updates correctly

### Test 5.2: Custom Ratio
- [ ] Select "Custom"
- [ ] **Expected**: Two input fields appear (Width × Height)
- [ ] Enter `2560` and `1440`
- [ ] Fields accept numeric input

---

## Test 6: Save Target

### Test 6.1: Browser Target
- [ ] Select "Browser (Local Download)"
- [ ] **Expected**: No additional UI appears

### Test 6.2: Google Drive Target
- [ ] Select "Google Drive"
- [ ] **Expected**: Blue info box appears
- [ ] Shows "Connect Google Drive" button
- [ ] Placeholder message visible

---

## Test 7: Job Submission & Live Updates

### Test 7.1: Submit Job (FREE user)
- [ ] Login as FREE user
- [ ] Enter 3 prompts
- [ ] Set max workers to 3
- [ ] Click "Generate Videos"
- [ ] **Expected**:
  - [ ] Success message with Job ID
  - [ ] Form clears
  - [ ] Console logs start appearing immediately

### Test 7.2: Worker Status Updates
- [ ] Observe Worker Status table during job
- [ ] **Expected**:
  - [ ] Workers change status to "BUSY" (orange)
  - [ ] "Current Jobs" column shows job ID
  - [ ] Updates happen in real-time (SSE)
  - [ ] After completion, workers return to "IDLE"

### Test 7.3: Console Logs Stream
- [ ] Watch Console Logs panel
- [ ] **Expected**:
  - [ ] Logs appear in real-time
  - [ ] Shows phases: CREATED, STARTED, PROCESSING, RENDERING, COMPLETED, FINISHED
  - [ ] Each log has timestamp, phase color, job ID, worker ID
  - [ ] Auto-scrolls to bottom
  - [ ] Fixed height with internal scrollbar

### Test 7.4: Log Filtering
- [ ] Copy a Job ID from logs
- [ ] Paste into "Filter by Job ID" input
- [ ] **Expected**: Only logs for that job visible

### Test 7.5: Clear Logs
- [ ] Click "Clear" button
- [ ] **Expected**: All logs removed
- [ ] Panel shows "No logs yet" message

---

## Test 8: Obfuscated API Routes

### Test 8.1: Network Inspection
- [ ] Open Browser DevTools → Network tab
- [ ] Perform a login
- [ ] **Expected**: Request to `/api/x7auth/session/login`
- [ ] Submit a job
- [ ] **Expected**: Request to `/api/vdo/fabric/create`
- [ ] Verify all API routes use obfuscated paths (3+ segments)

### Test 8.2: SSE Endpoints
- [ ] Filter Network tab by "EventStream"
- [ ] **Expected**:
  - [ ] `/api/wrk/grid29/stream` (worker updates)
  - [ ] `/api/sts/k7q/logs/stream` (console logs)

---

## Test 9: UI/UX Quality

### Test 9.1: Dark Theme
- [ ] Inspect entire application
- [ ] **Expected**:
  - [ ] Dark background (`#0d1117`)
  - [ ] Light text (`#c9d1d9`)
  - [ ] Cards have subtle borders
  - [ ] High contrast throughout

### Test 9.2: Focus States
- [ ] Tab through form inputs
- [ ] **Expected**:
  - [ ] Blue outline on focus
  - [ ] Clearly visible keyboard navigation
  - [ ] Accessible for keyboard users

### Test 9.3: Responsive Design
- [ ] Resize browser window
- [ ] Test mobile view (DevTools)
- [ ] **Expected**:
  - [ ] Layout adapts (stacks columns)
  - [ ] Tables remain scrollable
  - [ ] No horizontal overflow

### Test 9.4: No Layout Shifts
- [ ] Submit job with many prompts
- [ ] Watch logs populate
- [ ] **Expected**:
  - [ ] Page height remains stable
  - [ ] Fixed heights with internal scrollbars
  - [ ] Smooth scrolling

---

## Test 10: Edge Cases

### Test 10.1: Empty Submission
- [ ] Clear all prompts
- [ ] Click "Generate Videos"
- [ ] **Expected**: Error message "Please enter at least one prompt"

### Test 10.2: Large File Upload
- [ ] Create .txt with 1500 lines
- [ ] Try to upload
- [ ] **Expected**: Error (exceeds 1000 line limit)

### Test 10.3: Invalid File Type
- [ ] Try uploading .pdf or .docx
- [ ] **Expected**: Error "Only .txt files are allowed"

### Test 10.4: Session Expiry
- [ ] Login
- [ ] Delete `auth_token` cookie (DevTools)
- [ ] Try to submit job
- [ ] **Expected**: Error or redirect to login

### Test 10.5: TTL Expiration
- [ ] Watch countdown reach `00:00:00`
- [ ] **Expected**:
  - [ ] Countdown shows red (danger state)
  - [ ] Session should expire (bonus: auto-logout)

---

## Test 11: Multiple Concurrent Jobs

### Test 11.1: Parallel Execution
- [ ] Login as PREMIUM user
- [ ] Submit first job (5 prompts, 3 workers)
- [ ] While first job running, submit second job
- [ ] **Expected**:
  - [ ] Both jobs visible in logs (different IDs)
  - [ ] Workers distributed between jobs
  - [ ] No conflicts or errors

---

## Test 12: Cross-Browser Testing

### Test 12.1: Chrome/Edge
- [ ] All tests pass in Chrome
- [ ] All tests pass in Edge

### Test 12.2: Firefox
- [ ] SSE streams work correctly
- [ ] Dark theme renders properly
- [ ] All functionality works

### Test 12.3: Safari (if available)
- [ ] Cookie-based auth works
- [ ] SSE connections stable
- [ ] UI renders correctly

---

## Performance Checks

### Performance 1: SSE Efficiency
- [ ] Monitor CPU usage during job execution
- [ ] **Expected**: Low CPU usage (<10%)
- [ ] No memory leaks over time

### Performance 2: Log Rendering
- [ ] Generate 500+ log entries
- [ ] **Expected**:
  - [ ] Smooth rendering
  - [ ] No lag or freezing
  - [ ] Efficient DOM updates

### Performance 3: Worker Updates
- [ ] Long-running session (10+ minutes)
- [ ] **Expected**:
  - [ ] Heartbeat updates consistent
  - [ ] No connection drops
  - [ ] Reconnection on failure

---

## Security Checks

### Security 1: Cookie Flags
- [ ] Inspect `auth_token` cookie (DevTools)
- [ ] **Expected**:
  - [ ] HttpOnly: true
  - [ ] Secure: true (in production)
  - [ ] SameSite: lax/strict

### Security 2: CORS Configuration
- [ ] Check Network response headers
- [ ] **Expected**:
  - [ ] `Access-Control-Allow-Origin: http://localhost:3000`
  - [ ] `Access-Control-Allow-Credentials: true`

### Security 3: Input Validation
- [ ] Try SQL injection in prompts
- [ ] Try XSS payloads
- [ ] **Expected**: Sanitized/escaped properly

---

## Final Checklist

- [ ] All 12 main tests passed
- [ ] All performance checks passed
- [ ] All security checks passed
- [ ] No console errors
- [ ] No network errors
- [ ] Application feels smooth and responsive
- [ ] Documentation accurate

---

## Test Summary

**Total Tests**: ~80+ individual checks
**Estimated Time**: 30-45 minutes for complete suite
**Pass Criteria**: 95%+ tests passing

**Date Tested**: _______________
**Tested By**: _______________
**Browser/Version**: _______________
**Result**: ⬜ PASS ⬜ FAIL

**Notes**:
_______________________________________________
_______________________________________________
_______________________________________________
