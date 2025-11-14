# 🚀 Deployment Guide: Vercel + Render + Upstash Redis

This guide walks you through deploying Syncano with a split architecture:
- **Frontend (Vercel)**: Static files served from Vercel's edge network
- **Backend (Render)**: Socket.IO server with persistent WebSocket connections
- **Database (Upstash Redis)**: Serverless Redis for room state and sync data

## Architecture Overview

```
┌─────────────────┐
│  Vercel (Free)  │
│   Frontend      │
│  Static Files   │
└────────┬────────┘
         │
         │ HTTPS/WSS
         ▼
┌─────────────────┐      ┌──────────────────┐
│ Render (Free)   │◄────►│ Upstash Redis    │
│ Socket.IO       │      │ (Free Tier)      │
│ Backend API     │      │ Room State       │
└─────────────────┘      └──────────────────┘
```

## Prerequisites

1. GitHub account (for code hosting)
2. Vercel account ([vercel.com](https://vercel.com))
3. Render account ([render.com](https://render.com))
4. Upstash account ([upstash.com](https://upstash.com))

---

## Part 1: Setup Upstash Redis (5 minutes)

### Step 1: Create Redis Database

1. Go to [console.upstash.com](https://console.upstash.com/)
2. Click **"Create Database"**
3. Configure:
   - **Name**: `syncano-rooms`
   - **Type**: Regional
   - **Region**: Choose closest to your users (e.g., `us-east-1`)
   - **TLS**: Enabled (default)
4. Click **"Create"**

### Step 2: Get Redis URL

1. After creation, click on your database
2. Copy the **Redis URL** (starts with `rediss://`)
3. Save it for later - format: `rediss://default:PASSWORD@ENDPOINT.upstash.io:6379`

**Important**: Keep this URL secret! It contains your password.

---

## Part 2: Deploy Backend to Render (10 minutes)

### Step 1: Push Code to GitHub

```bash
# If not already a git repository
git init
git add .
git commit -m "Prepare for Render deployment"

# Create a new repository on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/syncano.git
git branch -M main
git push -u origin main
```

### Step 2: Create Render Web Service

1. Go to [dashboard.render.com](https://dashboard.render.com/)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Configure the service:
   - **Name**: `syncano-backend`
   - **Region**: Same as your Upstash Redis (e.g., `Oregon`)
   - **Branch**: `main`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn --worker-class eventlet -w 1 --bind 0.0.0.0:10000 --timeout 120 "run:app"`
   - **Plan**: `Free`

### Step 3: Add Environment Variables

In Render dashboard, add these environment variables:

| Key | Value |
|-----|-------|
| `FLASK_ENV` | `production` |
| `SECRET_KEY` | (Generate random string: `python -c "import secrets; print(secrets.token_hex(32))"`) |
| `PORT` | `10000` |
| `HOST` | `0.0.0.0` |
| `REDIS_URL` | (Paste your Upstash Redis URL from Part 1) |
| `REDIS_SSL` | `true` |
| `CORS_ORIGINS` | `https://*.vercel.app` (update after Vercel deployment) |
| `FRONTEND_URL` | (Leave empty for now, update after Vercel deployment) |
| `LOG_LEVEL` | `INFO` |

### Step 4: Deploy

1. Click **"Create Web Service"**
2. Wait for deployment (5-10 minutes)
3. Once deployed, copy your backend URL: `https://your-app-name.onrender.com`
4. Test health endpoint: `https://your-app-name.onrender.com/health`

---

## Part 3: Deploy Frontend to Vercel (5 minutes)

### Step 1: Update vercel.json

The `vercel.json` is already configured to serve static files. Verify it looks like this:

```json
{
  "version": 2,
  "buildCommand": "python build_frontend.py",
  "outputDirectory": "public",
  "env": {
    "BACKEND_URL": "@backend_url"
  }
}
```

### Step 2: Deploy to Vercel

**Option A: Using Vercel CLI**

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

**Option B: Using Vercel Dashboard**

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. Configure:
   - **Framework Preset**: Other
   - **Build Command**: `python build_frontend.py`
   - **Output Directory**: `public`
   - **Root Directory**: `./`
4. Add Environment Variable:
   - **Name**: `BACKEND_URL`
   - **Value**: Your Render backend URL (e.g., `https://syncano-backend.onrender.com`)
5. Click **"Deploy"**

### Step 3: Get Frontend URL

After deployment:
1. Copy your Vercel URL: `https://your-app.vercel.app`
2. Go back to **Render Dashboard** → **syncano-backend** → **Environment**
3. Update these variables:
   - `FRONTEND_URL`: `https://your-app.vercel.app`
   - `CORS_ORIGINS`: `https://your-app.vercel.app,https://*.vercel.app`
4. Save and redeploy backend

---

## Part 4: Verify Deployment (5 minutes)

### Backend Health Check

```bash
curl https://your-backend.onrender.com/health
# Should return: {"status": "healthy", ...}
```

### Test API Endpoints

```bash
# Test search API
curl https://your-backend.onrender.com/api/test
# Should return: {"status": "ok", ...}
```

### Frontend Testing

1. Open your Vercel URL: `https://your-app.vercel.app`
2. Open browser console (F12)
3. Check for: `"🔧 Backend URL configured: https://your-backend.onrender.com"`
4. Test creating a room:
   - Click "Create Blend"
   - Enter a username
   - Check console for WebSocket connection: `"✅ Socket.IO connected"`

### Full Integration Test

1. Open your app in two browser windows/tabs
2. **Window 1**: Create a blend
3. Copy the blend ID
4. **Window 2**: Join the blend using the ID
5. **Window 1**: Search and play a song
6. **Window 2**: Verify the song syncs automatically

---

## Troubleshooting

### Issue: Backend not connecting

**Check:**
- Render logs: Dashboard → Your Service → Logs
- Environment variables are set correctly
- Redis URL is valid (test with `redis-cli --tls -u YOUR_REDIS_URL ping`)

**Fix:**
```bash
# Test Redis connection locally
python -c "import redis; r = redis.from_url('YOUR_REDIS_URL', ssl_cert_reqs=None); print(r.ping())"
```

### Issue: CORS errors in browser

**Symptoms:** Console shows: `Access-Control-Allow-Origin error`

**Fix:**
1. Go to Render dashboard → Environment Variables
2. Update `CORS_ORIGINS` to include your exact Vercel URL:
   ```
   https://your-app.vercel.app,https://*.vercel.app
   ```
3. Redeploy backend

### Issue: WebSocket disconnects immediately

**Check:**
- Render free tier spins down after 15 minutes of inactivity
- First request after spin-down takes 30-60 seconds

**Fix:**
- Implement keep-alive ping from frontend:
  ```javascript
  setInterval(() => {
    fetch(`${BACKEND_URL}/health`).catch(() => {});
  }, 5 * 60 * 1000); // Every 5 minutes
  ```

### Issue: Frontend shows old backend URL

**Fix:**
1. Vercel Dashboard → Your Project → Settings → Environment Variables
2. Update `BACKEND_URL`
3. Redeploy: Deployments → ⋮ → Redeploy

---

## Cost Breakdown (All Free!)

| Service | Tier | Limits | Cost |
|---------|------|--------|------|
| **Vercel** | Hobby | 100GB bandwidth/month | **$0** |
| **Render** | Free | 750 hours/month, sleeps after 15min | **$0** |
| **Upstash Redis** | Free | 10,000 commands/day, 256MB | **$0** |

**Total Monthly Cost**: **$0**

---

## Monitoring & Maintenance

### Render Logs

```bash
# View live logs
render logs --service syncano-backend --follow
```

Or via dashboard: Your Service → Logs

### Upstash Monitoring

1. Go to Upstash Console
2. Click your database
3. View:
   - Total commands/day
   - Memory usage
   - Active connections

### Vercel Analytics

1. Vercel Dashboard → Your Project → Analytics
2. Monitor:
   - Page views
   - Response times
   - Geographic distribution

---

## Updating Your App

### Deploy New Backend Version

```bash
git add .
git commit -m "Update backend"
git push origin main
# Render auto-deploys on push
```

### Deploy New Frontend Version

```bash
git add .
git commit -m "Update frontend"
git push origin main
# Vercel auto-deploys on push
```

### Manual Redeploy

**Render**: Dashboard → Your Service → Manual Deploy → Deploy latest commit

**Vercel**: Dashboard → Your Project → Deployments → Redeploy

---

## Environment-Specific URLs

### Production

- **Frontend**: `https://your-app.vercel.app`
- **Backend**: `https://syncano-backend.onrender.com`
- **Redis**: `rediss://...upstash.io:6379`

### Development

Create a `.env` file (copy from `.env.example`):

```bash
FLASK_ENV=development
PORT=10000
BACKEND_URL=http://localhost:10000
FRONTEND_URL=http://localhost:5173
REDIS_URL=redis://localhost:6379  # or use Upstash
CORS_ORIGINS=*
LOG_LEVEL=DEBUG
```

Run locally:

```bash
# Terminal 1: Start backend
python run.py

# Terminal 2: Serve frontend
python -m http.server 5173
```

---

## Security Checklist

- ✅ HTTPS enabled on all services
- ✅ CORS configured to allow only your domains
- ✅ Redis uses TLS (rediss://)
- ✅ Environment variables stored securely
- ✅ SECRET_KEY is random and not in git
- ✅ API rate limiting (consider adding)

---

## Next Steps

1. **Custom Domain**: Add your own domain to Vercel
2. **Analytics**: Enable Vercel Analytics
3. **Monitoring**: Add Uptime monitoring (UptimeRobot)
4. **CDN**: Vercel provides edge caching automatically
5. **Backup**: Upstash has automated backups

---

## Support

- **Issues**: [GitHub Issues](https://github.com/YOUR_USERNAME/syncano/issues)
- **Render Docs**: [render.com/docs](https://render.com/docs)
- **Vercel Docs**: [vercel.com/docs](https://vercel.com/docs)
- **Upstash Docs**: [upstash.com/docs](https://upstash.com/docs)

---

## Architecture Benefits

✅ **Zero Cost**: All services have generous free tiers  
✅ **Persistent WebSockets**: Render supports long-lived connections  
✅ **Global CDN**: Vercel serves static files from edge locations  
✅ **Room Persistence**: Upstash Redis keeps rooms alive across restarts  
✅ **Auto-Scaling**: All services scale automatically  
✅ **99.9% Uptime**: Production-grade infrastructure  
✅ **Easy Updates**: Git push to deploy  

---

**🎉 Congratulations!** Your Syncano app is now live with a professional, scalable architecture!
