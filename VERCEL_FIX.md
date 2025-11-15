# How to Fix Vercel → Render Connection

## Problem
Your Vercel frontend can't connect to your Render backend because the backend URL is not configured.

## Solution Steps

### 1. Find Your Render Backend URL
1. Go to https://dashboard.render.com
2. Click on your backend service (probably named "syncano-backend" or similar)
3. Copy the URL at the top - it looks like: `https://your-service-name.onrender.com`

### 2. Update the Frontend Code
In `templates/index.html` around line 11, update this line:

```javascript
const PRODUCTION_BACKEND = 'https://YOUR-ACTUAL-SERVICE-NAME.onrender.com';
```

Replace `YOUR-ACTUAL-SERVICE-NAME` with your actual Render service name.

### 3. Commit and Push
```bash
git add templates/index.html
git commit -m "Fix Vercel backend URL connection"
git push origin dev
```

### 4. Verify Vercel Deployment
1. Go to https://vercel.com/dashboard
2. Check that your latest deployment succeeded
3. Open browser console on https://melodexa.vercel.app
4. Look for: `🔧 Backend URL configured: https://...onrender.com`

### 5. Test the Connection
1. Open https://melodexa.vercel.app
2. Open browser console (F12)
3. You should see:
   - `🔌 Connecting to Socket.IO backend: https://...onrender.com`
   - `✅ Socket.IO connected: ...`
4. Click "Create Blend"
5. Check console for room creation logs
6. Verify in Upstash Dashboard that room appears

## Common Issues

### Issue: "Connection error"
- **Check**: Is your Render backend running?
- **Solution**: Go to Render dashboard, check service logs

### Issue: "CORS error"
- **Check**: Is CORS_ORIGINS set correctly in Render?
- **Should be**: `CORS_ORIGINS=https://melodexa.vercel.app,https://*.vercel.app`

### Issue: "Room not found" after refresh
- **Check**: Is REDIS_URL set in Render?
- **Solution**: Add the Redis URL to Render environment variables

## Environment Variables Checklist

### Render (Backend)
```
REDIS_URL=rediss://default:AXB...@new-heron-28759.upstash.io:6379
FLASK_ENV=production
FRONTEND_URL=https://melodexa.vercel.app
CORS_ORIGINS=https://melodexa.vercel.app,https://*.vercel.app
SECRET_KEY=Ss@sudhir87
HOST=0.0.0.0
PORT=10000
```

### Vercel (Frontend)
No environment variables needed! The backend URL is hardcoded in the HTML.

## Quick Test Script

Open browser console on https://melodexa.vercel.app and run:

```javascript
// Check backend connection
console.log('Backend URL:', window.BACKEND_URL);
console.log('Socket connected:', AppState?.socket?.connected);

// Test room creation
fetch(window.BACKEND_URL + '/health')
  .then(r => r.json())
  .then(d => console.log('Backend health:', d))
  .catch(e => console.error('Backend unreachable:', e));
```

## Success Indicators

✅ Console shows: "Socket.IO connected"
✅ No CORS errors
✅ Creating blend works without errors  
✅ Rooms persist in Upstash Redis
✅ No disconnect/reconnect spam
✅ Room survives page refresh

## Still Not Working?

1. Check Render logs: Is the service running?
2. Check browser console: Any JavaScript errors?
3. Check network tab: Is the Socket.IO connection succeeding?
4. Run `python test_production_redis.py` on Render shell
5. Check Upstash dashboard: Any connection attempts?
