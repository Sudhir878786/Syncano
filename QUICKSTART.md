# 🚀 Quick Start Guide for Modified Architecture

## Architecture Overview

Your Syncano app is now split into three parts for production deployment:

1. **Frontend (Vercel)** - Static files, HTML, CSS, JS
2. **Backend (Render)** - Socket.IO server + API endpoints
3. **Database (Upstash Redis)** - Room state and sync data

## Local Development Setup

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Create Environment File

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Edit `.env` for local development:

```env
FLASK_ENV=development
SECRET_KEY=dev-secret-key
HOST=0.0.0.0
PORT=10000
BACKEND_URL=http://localhost:10000
FRONTEND_URL=http://localhost:5173
CORS_ORIGINS=*
REDIS_URL=redis://localhost:6379  # or use Upstash Redis URL
LOG_LEVEL=DEBUG
```

### 3. Run Backend Server

```bash
python run.py
```

Server starts at: `http://localhost:10000`

### 4. Serve Frontend (Simple Method)

```bash
# Option 1: Python HTTP server
python -m http.server 5173

# Option 2: Use any static file server
npx serve -p 5173
```

Frontend available at: `http://localhost:5173`

### 5. Open Browser

Navigate to: `http://localhost:5173/templates/index.html`

---

## Production Deployment

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for complete step-by-step instructions.

Quick overview:

1. **Setup Upstash Redis**: Create free Redis database at [upstash.com](https://upstash.com)
2. **Deploy to Render**: Push to GitHub, connect to Render, add env vars
3. **Deploy to Vercel**: Connect GitHub repo, add `BACKEND_URL` env var
4. **Test**: Open Vercel URL and test room creation/joining

---

## Project Structure

```
Syncano/
├── app/                      # Backend application
│   ├── __init__.py          # App factory with Socket.IO + CORS
│   ├── routes/              # API endpoints
│   ├── services/            # Business logic (MusicService, RoomService)
│   ├── socketio_handlers/   # WebSocket event handlers
│   └── utils/               # Helpers and logging
├── static/                  # Frontend assets
│   ├── css/
│   ├── js/
│   │   └── modules/
│   │       ├── api.js       # API client (→ Render backend)
│   │       └── room.js      # Socket.IO client (→ Render backend)
│   └── images/
├── templates/
│   └── index.html           # Main HTML (served by Vercel)
├── config.py                # Configuration (CORS, Redis, etc.)
├── run.py                   # Server entry point
├── requirements.txt         # Python dependencies
├── render.yaml              # Render deployment config
├── vercel.json              # Vercel deployment config
├── .env.example             # Environment variables template
└── DEPLOYMENT.md            # Full deployment guide
```

---

## Key Changes from Original Architecture

### ✅ What Changed

1. **Split Frontend/Backend**
   - Frontend: Static files on Vercel
   - Backend: Socket.IO + API on Render
   
2. **Added Upstash Redis**
   - Room state persisted across server restarts
   - Works with serverless/distributed environments
   
3. **Updated CORS**
   - Backend allows requests from Vercel frontend
   - Configured in `config.py`
   
4. **Updated Socket.IO Client**
   - Connects to Render backend URL
   - Configurable via `window.BACKEND_URL`
   
5. **Added Gunicorn + Eventlet**
   - Production WSGI server
   - Supports persistent WebSocket connections

### ⚠️ What Stayed the Same

- All music API functionality
- Room creation/joining logic
- Playback synchronization
- Lyrics support
- User interface

---

## Environment Variables

### Backend (Render)

| Variable | Description | Example |
|----------|-------------|---------|
| `FLASK_ENV` | Environment mode | `production` |
| `SECRET_KEY` | Flask secret key | Random 32-char string |
| `PORT` | Server port | `10000` |
| `REDIS_URL` | Upstash Redis URL | `rediss://...upstash.io:6379` |
| `CORS_ORIGINS` | Allowed frontend origins | `https://*.vercel.app` |
| `FRONTEND_URL` | Frontend URL | `https://your-app.vercel.app` |

### Frontend (Vercel)

| Variable | Description | Example |
|----------|-------------|---------|
| `BACKEND_URL` | Backend API URL | `https://your-backend.onrender.com` |

---

## Testing

### Local Testing

1. Start backend: `python run.py`
2. Serve frontend: `python -m http.server 5173`
3. Open: `http://localhost:5173/templates/index.html`
4. Test room creation and music sync

### Production Testing

1. Open Vercel URL
2. Check browser console for backend connection
3. Create a room
4. Open in another browser/tab and join room
5. Test music playback sync

---

## Troubleshooting

### Backend won't start

```bash
# Check Python version (requires 3.8+)
python --version

# Reinstall dependencies
pip install -r requirements.txt --force-reinstall

# Check for port conflicts
netstat -ano | findstr :10000
```

### Redis connection fails

```bash
# Test Redis connection
python -c "import redis; r = redis.from_url('YOUR_REDIS_URL', ssl_cert_reqs=None); print(r.ping())"
```

### Frontend can't connect to backend

1. Check `window.BACKEND_URL` in browser console
2. Verify CORS settings in `config.py`
3. Check backend is running and accessible

### WebSocket disconnects

- Render free tier spins down after 15 minutes inactivity
- First request after spin-down takes 30-60 seconds to wake up

---

## Support

- 📖 **Full Deployment Guide**: [DEPLOYMENT.md](./DEPLOYMENT.md)
- 🏗️ **Architecture Details**: [ARCHITECTURE.md](./ARCHITECTURE.md)
- 🐛 **Issues**: [GitHub Issues](https://github.com/YOUR_USERNAME/syncano/issues)

---

## Next Steps

1. ✅ Test locally
2. ✅ Create Upstash Redis database
3. ✅ Deploy backend to Render
4. ✅ Deploy frontend to Vercel
5. ✅ Test production deployment
6. 🎉 Share your blend with friends!

---

**Made with ❤️ for listening together, anywhere**
