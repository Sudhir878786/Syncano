# Vercel Deployment Notes

## Important: WebSocket Limitations

Vercel's serverless functions have a **10-second timeout** and don't support long-lived WebSocket connections. For real-time features (Socket.IO), you'll need to:

1. **Use Vercel for static pages only** and host the Socket.IO backend elsewhere (e.g., Railway, Render, Fly.io)
2. **OR** Switch to HTTP polling instead of WebSockets
3. **OR** Use a dedicated WebSocket service

## Current Configuration

The app is configured to work on Vercel with these limitations:
- Socket.IO uses `threading` async mode (limited functionality)
- File logging is disabled on serverless
- Logs go to stdout only (viewable in Vercel logs)

## Testing Locally

```bash
# Install dependencies
pip install -r requirements.txt

# Run locally
python run.py
```

## Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

## Environment Variables

Set these in Vercel dashboard:
- `SECRET_KEY`: Your secret key for sessions
- `FLASK_ENV`: production
- `CORS_ORIGINS`: Your allowed origins

## Alternative: Deploy to Railway/Render

For full Socket.IO support, consider Railway or Render instead:

**Railway:**
```bash
# Install Railway CLI
npm i -g @railway/cli

# Deploy
railway up
```

**Render:**
- Connect your GitHub repo
- Set build command: `pip install -r requirements.txt`
- Set start command: `python run.py`
