# 🚀 Melodexa Deployment Guide

Complete guide for deploying Melodexa's WebRTC P2P music streaming platform.

## Architecture Overview

```
┌──────────────────┐     ┌──────────────────┐     ┌─────────────┐
│   Flask API      │     │   Node.js        │     │   Upstash   │
│   (Port 3000)    │     │   Signaling      │     │   Redis     │
│   Music Service  │     │   (Port 3001)    │     │   Database  │
│   /api/search    │     │   WebSocket      │     │   Rooms     │
└──────────────────┘     └──────────────────┘     └─────────────┘
         │                        │                        │
         └────────────────────────┴────────────────────────┘
                                  │
                          ┌───────────────┐
                          │   Frontend    │
                          │   Static HTML │
                          │   WebRTC P2P  │
                          └───────────────┘
```

## 🔧 Local Development

### Prerequisites

- Node.js 18+ (for signaling server)
- Python 3.11+ (for Flask API)
- Redis connection (Upstash recommended)

### Setup Steps

1. **Clone and Install Dependencies:**

```bash
# Install Python dependencies
pip install -r requirements.txt

# Install Node.js dependencies
cd signaling-server
npm install
cd ..
```

2. **Configure Environment:**

Create `.env` in project root:
```env
# Flask API Configuration
FLASK_ENV=development
SECRET_KEY=your-secret-key-here
HOST=0.0.0.0
PORT=3000

# Redis Configuration (Upstash)
REDIS_URL=rediss://default:your-password@your-redis.upstash.io:6379
REDIS_SSL=true

# CORS Settings
CORS_ORIGINS=http://localhost:5000,http://localhost:3000
```

Create `.env` in `signaling-server/`:
```env
# Signaling Server Configuration
NODE_ENV=development
PORT=3001

# Redis Configuration (same as above)
REDIS_URL=rediss://default:your-password@your-redis.upstash.io:6379

# CORS Settings
CORS_ORIGIN=http://localhost:5000,http://localhost:3000
```

3. **Start Development Servers:**

**Option A: Windows Batch Script**
```bash
start-melodexa.bat
```

**Option B: PowerShell Script**
```powershell
.\start-melodexa.ps1
```

**Option C: Manual Start**
```bash
# Terminal 1: Start Signaling Server
cd signaling-server
npm run dev

# Terminal 2: Start Flask API
python run.py
```

4. **Access Application:**
- Frontend: http://localhost:5000
- Flask API: http://localhost:3000
- Signaling: ws://localhost:3001

## ☁️ Production Deployment

### Deploy to Render

#### 1. Signaling Server (Node.js)

1. Create new Web Service on Render
2. Connect your Git repository
3. Configure service:
   - **Name:** `melodexa-signaling`
   - **Environment:** Node
   - **Build Command:** `cd signaling-server && npm install`
   - **Start Command:** `cd signaling-server && npm start`
   - **Health Check Path:** `/health`

4. Set environment variables:
   - `NODE_ENV=production`
   - `PORT=10000`
   - `REDIS_URL=rediss://...` (your Upstash URL)
   - `CORS_ORIGIN=https://your-domain.com`

5. Note the service URL: `https://melodexa-signaling.onrender.com`

#### 2. Flask API Server

1. Create another Web Service on Render
2. Configure service:
   - **Name:** `melodexa-api`
   - **Environment:** Python 3
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `gunicorn wsgi:app --bind 0.0.0.0:$PORT --workers 2 --timeout 120`
   - **Health Check Path:** `/health`

3. Set environment variables:
   - `FLASK_ENV=production`
   - `SECRET_KEY=your-production-secret`
   - `REDIS_URL=rediss://...` (your Upstash URL)
   - `CORS_ORIGINS=https://your-domain.com`

4. Note the service URL: `https://melodexa-api.onrender.com`

#### 3. Update Frontend Configuration

Edit `templates/index.html` (around line 12):

```javascript
const PRODUCTION_BACKEND = 'https://melodexa-api.onrender.com';
const PRODUCTION_SIGNALING = 'wss://melodexa-signaling.onrender.com';
```

### Deploy Frontend

**Option A: Deploy with Flask (Single Server)**
- Frontend is automatically served by Flask from `/`
- No additional deployment needed

**Option B: Deploy to Vercel (CDN Edge)**

1. Create `vercel.json` if not exists
2. Deploy: `vercel --prod`
3. Update `PRODUCTION_BACKEND` and `PRODUCTION_SIGNALING` URLs

### Setup Upstash Redis

1. Go to [Upstash Console](https://console.upstash.io)
2. Create new Redis database
3. Copy the connection URL
4. Update environment variables in both services

## 🔒 Security Checklist

- [ ] Change default `SECRET_KEY`
- [ ] Configure proper CORS origins
- [ ] Use environment variables for all secrets
- [ ] Enable HTTPS for all services
- [ ] Set up Redis password authentication
- [ ] Configure rate limiting (already implemented)
- [ ] Review and restrict CORS origins

## 🧪 Testing Deployment

### Health Check Endpoints

```bash
# Test Flask API
curl https://melodexa-api.onrender.com/health

# Test Signaling Server
curl https://melodexa-signaling.onrender.com/health
```

### Frontend Testing

1. Open the application
2. Search for a song
3. Play music (should work without room)
4. Create a room
5. Test audio streaming in room
6. Share room link with another device
7. Verify synchronized playback

### Debug Commands (Browser Console)

```javascript
// Check audio state
debugAudio()

// Test audio connection
testAudioConnection()

// Force reconnect audio
forceReconnectAudio()

// Check global state
console.log(window.Melodexa)
```

## 📊 Monitoring

### Redis Connection

```bash
# Monitor Redis connections
python monitor.py
```

### Application Logs

**Render Dashboard:**
- Navigate to your service
- Click "Logs" tab
- Monitor real-time logs

**Local Development:**
```bash
# Flask API logs
tail -f logs/app.log

# Signaling server logs
cd signaling-server && npm run dev
```

## 🐛 Troubleshooting

### Audio Not Playing in Room

1. Check browser console for errors
2. Verify CORS configuration
3. Ensure audio element has `crossorigin="anonymous"`
4. Run `debugAudio()` in console
5. Check if AudioContext is suspended (requires user interaction)

### Room Connection Issues

1. Verify Redis connection in both services
2. Check WebSocket connection in Network tab
3. Ensure signaling server is accessible via WSS
4. Verify CORS origins match frontend domain

### CORS Errors

1. Check `CORS_ORIGINS` in Flask API
2. Check `CORS_ORIGIN` in Signaling Server
3. Ensure frontend domain is whitelisted
4. Use `*` for development only (not recommended for production)

### Redis Connection Timeout

1. Verify Redis URL is correct
2. Check Upstash database is active
3. Ensure SSL/TLS is enabled for `rediss://`
4. Test connection with Redis CLI

## 🔄 Updates & Maintenance

### Update Dependencies

```bash
# Python packages
pip install --upgrade -r requirements.txt

# Node.js packages
cd signaling-server
npm update
```

### Database Migration

Currently using Redis with 7-day TTL. No migration needed.

### Scaling Considerations

- **Horizontal Scaling:** Deploy multiple instances with load balancer
- **Redis Scaling:** Upgrade Upstash plan or use Redis Cluster
- **CDN:** Use Cloudflare or similar for static assets
- **WebRTC:** P2P architecture scales naturally (zero server bandwidth)

## 📝 Environment Variables Reference

### Flask API

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `FLASK_ENV` | No | `development` | Environment mode |
| `SECRET_KEY` | Yes | - | Flask secret key |
| `HOST` | No | `0.0.0.0` | Server host |
| `PORT` | No | `3000` | Server port |
| `REDIS_URL` | Yes | - | Redis connection URL |
| `REDIS_SSL` | No | `true` | Enable Redis SSL |
| `CORS_ORIGINS` | No | `*` | Allowed CORS origins |

### Signaling Server

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | No | `development` | Environment mode |
| `PORT` | No | `3001` | Server port |
| `REDIS_URL` | Yes | - | Redis connection URL |
| `CORS_ORIGIN` | No | `*` | Allowed CORS origins |

## 🎯 Performance Optimization

1. **Enable Gzip Compression** (configured in Flask)
2. **Use CDN for Static Assets** (optional)
3. **Configure Redis Connection Pool** (already implemented)
4. **Enable Browser Caching** (configured)
5. **Optimize Audio Quality** (320kbps default with 160kbps fallback)

## 📚 Additional Resources

- [Render Documentation](https://render.com/docs)
- [Upstash Redis Documentation](https://docs.upstash.com/redis)
- [WebRTC API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)
- [Flask Documentation](https://flask.palletsprojects.com/)
- [Express.js Documentation](https://expressjs.com/)

---

**Made with ❤️ for music lovers everywhere**

🎧 **Melodexa** - *One track, one tempo — infinite listeners.*
