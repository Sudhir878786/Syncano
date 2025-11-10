# Deployment Guide - Syncano Music Streaming

## 🎯 **CRITICAL: Redis Required for Vercel**

Your app **MUST** use Redis for room state synchronization when deployed to Vercel (or any serverless platform). Without Redis, rooms won't work properly because each serverless function instance has isolated memory.

---

## ✅ **Recommended: Deploy to Vercel + Upstash Redis**

This is the **easiest and FREE** solution for your app:

### Step 1: Create Free Redis Database (Upstash)

1. Go to [upstash.com](https://upstash.com) and sign up (free)
2. Click **Create Database**
3. Choose **Global** for best performance
4. Copy your **UPSTASH_REDIS_REST_URL** (looks like: `redis://...upstash.io:6379`)

### Step 2: Deploy to Vercel

1. **Set Environment Variable in Vercel:**
   - Go to your project settings on Vercel
   - Navigate to **Environment Variables**
   - Add variable:
     - **Name:** `REDIS_URL`
     - **Value:** Your Upstash Redis URL
     - Click **Save**

2. **Redeploy:**
   ```bash
   git add .
   git commit -m "Add Redis support for room synchronization"
   git push
   ```

   Vercel will auto-deploy with the Redis URL.

### Step 3: Verify It's Working

Check Vercel logs for: `✓ Connected to Redis for distributed room state`

---

## 🚀 **Alternative: Deploy to Railway (Full Featured)**

Railway supports long-lived WebSocket connections and includes Redis:

### Quick Deploy to Railway

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Add Redis
railway add redis

# Deploy
railway up
```

Railway will automatically set the `REDIS_URL` environment variable.

---

## 🔧 **Testing Locally**

### Without Redis (Single Instance Only)
```bash
# Activate virtual environment
.\.venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Run
python run.py
```

⚠️ Local testing without Redis is fine but won't simulate production behavior.

### With Redis (Production-Like)
```bash
# Install Redis locally or use Docker
docker run -d -p 6379:6379 redis

# Set environment variable
$env:REDIS_URL = "redis://localhost:6379"

# Run app
python run.py
```

---

## 📋 **Environment Variables Reference**

### Required for Vercel
- `REDIS_URL`: Redis connection URL (from Upstash or other provider)

### Optional
- `SECRET_KEY`: Flask secret key (auto-generated if not set)
- `FLASK_ENV`: `production` or `development`
- `CORS_ORIGINS`: Allowed CORS origins (default: `*`)
- `LOG_LEVEL`: `DEBUG`, `INFO`, `WARNING`, `ERROR`

---

## 🎵 **How It Works Now**

✅ **With Redis:**
- Room state stored in shared Redis database
- All serverless instances see the same rooms
- Users can join from any instance
- Perfect synchronization across all connections

❌ **Without Redis:**
- Each serverless instance has isolated memory
- Rooms randomly disappear (user hits different instance)
- Synchronization fails
- **NOT RECOMMENDED FOR PRODUCTION**

---

## 🆓 **Free Tier Options**

| Platform | Redis | WebSockets | Notes |
|----------|-------|------------|-------|
| **Vercel + Upstash** | ✅ Free | Limited | Best for most users |
| **Railway** | ✅ Free | ✅ Full | $5 credit/month |
| **Render + Upstash** | ✅ Free | ✅ Full | Free tier available |

---

## 🐛 **Troubleshooting**

### "Room does not exist" errors
- ✅ Check `REDIS_URL` is set in Vercel environment variables
- ✅ Verify Redis connection in logs: Look for "Connected to Redis"
- ✅ Make sure you redeployed after adding `REDIS_URL`

### Users keep disconnecting
- ✅ This is fixed with Redis - ensure it's properly configured
- ✅ Check Upstash dashboard shows active connections

### Still having issues?
- Check Vercel function logs for errors
- Verify Redis URL format: `redis://username:password@host:port`
- Test Redis connection: Use Upstash's Redis CLI in their dashboard

---

## 📦 **What Changed**

The `RoomService` now:
1. Automatically connects to Redis if `REDIS_URL` is provided
2. Falls back to in-memory storage for local development
3. Stores all room data in Redis with 24-hour auto-expiry
4. Logs connection status on startup

No changes needed to your frontend code! 🎉
