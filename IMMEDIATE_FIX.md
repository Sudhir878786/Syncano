# IMMEDIATE FIX - Run This in Browser Console

## The Problem

Your Socket.IO is connecting to:
```
https://melodexa.vercel.app/socket.io/  ❌ WRONG (Vercel frontend)
```

It should connect to:
```
https://syncano.onrender.com/socket.io/  ✅ CORRECT (Render backend)
```

## Step 1: Check Current Backend URL

**Open https://melodexa.vercel.app**

Press **F12** (open browser console), paste this:

```javascript
console.log('Backend URL:', window.BACKEND_URL);
console.log('Expected:', 'https://syncano.onrender.com');
```

### If it shows `http://localhost:10000` or empty:
**Problem:** `BACKEND_URL` not set on Render
**Fix:** Go to Render Dashboard → Environment → Add `BACKEND_URL`

### If it shows the correct URL but still connecting to Vercel:
**Problem:** Vercel serving old cached files
**Fix:** Hard refresh (Ctrl+Shift+R) or clear cache

## Step 2: TEMPORARY FIX (Works Immediately)

**While your changes deploy, use this quick fix in browser console:**

```javascript
// Force correct backend URL
window.BACKEND_URL = 'https://syncano.onrender.com';  // REPLACE WITH YOUR ACTUAL RENDER URL

// Disconnect old socket
if (AppState.socket) {
    AppState.socket.disconnect();
}

// Reconnect with correct URL
RoomManager.initializeSocket();

console.log('✅ Now connecting to:', window.BACKEND_URL);
```

After running this, try creating a room again. It should work!

## Step 3: Permanent Fix - Deploy Changes

### A. Commit Local Changes
```powershell
git add -A
git commit -m "Fix: backend URL configuration and Redis persistence"
git push origin dev
```

### B. Set Environment Variable on Render

1. Go to **https://dashboard.render.com**
2. Click your backend service
3. Copy the service URL (top of page)
4. Go to **Environment** tab
5. Add variable:
   - **Key**: `BACKEND_URL`
   - **Value**: `https://syncano.onrender.com` (your actual URL)
6. **Save Changes** (waits for redeploy ~3 minutes)

### C. Force Vercel to Rebuild (if using Git deployment)

If Vercel is connected to your GitHub:
```powershell
# Make a small change to trigger Vercel rebuild
echo "# Updated $(date)" >> README.md
git add README.md
git commit -m "trigger vercel rebuild"
git push origin dev
```

OR manually in Vercel Dashboard:
1. Go to https://vercel.com/dashboard
2. Click your project
3. Go to **Deployments** tab
4. Click **Redeploy** on latest deployment

## Step 4: Verify After Deploy

### Check Browser Console (should show):
```
Backend URL configured: https://syncano.onrender.com
Current hostname: melodexa.vercel.app
🔌 Connecting to Socket.IO backend: https://syncano.onrender.com
Socket.IO connected: [socket-id]
```

### Check Render Logs (should show):
```
Rendering index with backend_url: https://syncano.onrender.com
Connected to Upstash Redis successfully
Creating room for ss, Redis enabled: True
Saved room 12345 to Redis (attempt 1, result: True)
```

### Check Upstash Dashboard:
- Go to Data Browser
- Should see `room:12345` keys appearing

## Still Not Working? Run Full Diagnostic

Paste this in browser console:

```javascript
console.log('=== FULL DIAGNOSTIC ===');
console.log('1. Backend URL:', window.BACKEND_URL);
console.log('2. Socket exists:', !!AppState.socket);
console.log('3. Socket connected:', AppState.socket?.connected);
console.log('4. Socket URL:', AppState.socket?.io?.uri);
console.log('5. Current room:', AppState.currentRoom);
console.log('6. Username:', AppState.username);
console.log('7. In room:', AppState.inRoom);
console.log('8. Hostname:', window.location.hostname);

// Try to fetch from backend
fetch('https://syncano.onrender.com/health')  // REPLACE WITH YOUR URL
    .then(r => r.json())
    .then(data => {
        console.log('9. Backend health:', data);
        console.log('   - Redis status:', data.components?.redis?.status);
    })
    .catch(e => console.error('9. Backend unreachable:', e));
```

Expected output:
```
1. Backend URL: https://syncano.onrender.com
2. Socket exists: true
3. Socket connected: true
4. Socket URL: https://syncano.onrender.com
5. Current room: null (or room ID if in room)
6. Username: null (or username if in room)
7. In room: false
8. Hostname: melodexa.vercel.app
9. Backend health: {status: "healthy", ...}
   - Redis status: connected
```

## Quick Test After Fix

1. Create room with username "test"
2. Note the room ID
3. Open Upstash Dashboard → Data Browser
4. Search for `room:` - your room should appear
5. Click the key - should show JSON with your username

## What Each URL Does

| URL | Purpose | Protocol |
|-----|---------|----------|
| `https://melodexa.vercel.app` | Frontend static files (HTML/CSS/JS) | HTTP/HTTPS |
| `https://syncano.onrender.com` | Backend API + Socket.IO server | HTTP/HTTPS/WSS |
| `rediss://...upstash.io:6379` | Redis data storage | Redis protocol |

**Flow:** Vercel HTML → Loads JS → JS connects to Render → Render saves to Redis

## Why This Happens

1. **Vercel serves static files** - no Python/Flask execution
2. **Flask template variables don't work on Vercel** - HTML is pre-rendered
3. **Need to set BACKEND_URL env var on Render** - so Flask knows its own URL
4. **Flask passes URL to template** - gets baked into HTML
5. **HTML served from Render** - has correct backend URL
6. **But Vercel serves different HTML** - needs to be rebuilt with correct URL

## The Core Issue

Your Vercel deployment is serving HTML that doesn't have `window.BACKEND_URL` set, so Socket.IO defaults to the current page's host (`melodexa.vercel.app`) instead of your backend (`syncano.onrender.com`).

**Fix: Run the temporary fix in console NOW, then deploy properly.**
