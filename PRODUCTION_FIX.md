# Production Socket.IO Connection Fix

## Problem
Your Vercel frontend is trying to connect to `https://melodexa.vercel.app/socket.io/` instead of your Render backend. This causes all Socket.IO requests to fail with 400 errors.

## Root Cause
The `BACKEND_URL` environment variable is not set on Render, so Flask defaults to `http://localhost:10000`, which doesn't work in production.

## Solution: Set BACKEND_URL on Render

### Step 1: Find Your Render Backend URL
1. Go to https://dashboard.render.com
2. Click on your backend service (probably named `syncano` or `syncano-backend`)
3. Copy the URL at the top - it should look like: `https://syncano.onrender.com` or `https://syncano-XXXX.onrender.com`

### Step 2: Add BACKEND_URL Environment Variable
1. In your Render service dashboard, go to **Environment** tab
2. Click **Add Environment Variable**
3. Set:
   - **Key**: `BACKEND_URL`
   - **Value**: Your Render URL (example: `https://syncano.onrender.com`)
4. Click **Save Changes**

### Step 3: Redeploy
Render will automatically redeploy your service after you save the environment variable.

### Step 4: Verify

#### Test Backend Health
```bash
curl https://your-render-url.onrender.com/health
```

You should see JSON with `"status": "healthy"` and `"components": {"redis": {"status": "connected"}}`

#### Test Frontend Connection
1. Open https://melodexa.vercel.app in your browser
2. Open browser console (F12)
3. Look for the log: `Backend URL configured: https://your-render-url.onrender.com`
4. You should see: `Socket.IO connected: [socket-id]` (no errors)

#### Test Room Creation
1. Click "Create Blend"
2. Enter a username and click Create
3. Check browser console - should see: `Room created successfully`
4. Go to Upstash Dashboard → Data Browser
5. You should see a new `room:XXXXX` key

## Expected Console Output (Success)

```
Backend URL configured: https://syncano.onrender.com
Current hostname: melodexa.vercel.app
Socket.IO connected: abc123xyz
Create room button clicked
Creating room for user: YourUsername
Room created successfully: 12345
```

## If Still Not Working

### Check Render Logs
1. Go to Render Dashboard → Your Service → Logs
2. Look for:
   - `Rendering index with backend_url: https://...onrender.com`
   - `Creating room for X, Redis enabled: True`
   - `Saved room X to Redis successfully`

### Check CORS Settings
Your `CORS_ORIGINS` environment variable on Render should include:
```
https://melodexa.vercel.app,https://melodexa.vercel.app/,https://*.vercel.app
```

### Verify Redis Connection
In Render logs, you should see:
```
Connected to Upstash Redis successfully (attempt 1, ping: True)
Initialized services: MusicService, RoomService (Redis: True)
```

## Quick Verification Commands

```bash
# Check if backend is accessible
curl https://your-render-url.onrender.com/health

# Check if Socket.IO endpoint exists
curl https://your-render-url.onrender.com/socket.io/

# Should return: {"code":0,"message":"Transport unknown"}
```

## Environment Variables Summary (Render)

Make sure these are all set on Render:

```
REDIS_URL=rediss://default:...@new-heron-28759.upstash.io:6379
REDIS_SSL=true
FRONTEND_URL=https://melodexa.vercel.app/
BACKEND_URL=https://your-actual-service.onrender.com
CORS_ORIGINS=https://melodexa.vercel.app/,https://*.vercel.app
SECRET_KEY=your-secret-key
FLASK_ENV=production
HOST=0.0.0.0
PORT=10000
```

**The key fix is setting `BACKEND_URL` to your actual Render service URL!**
