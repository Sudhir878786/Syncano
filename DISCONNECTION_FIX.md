# Socket.IO Disconnection Fix

## Problem
Users were experiencing automatic disconnections from collaborative listening rooms after deployment to Render.

## Root Causes Identified

1. **Aggressive Socket.IO Timeouts**: 60-second ping timeout was too short for Render's network latency
2. **Render Free Tier Cold Starts**: Backend spins down after 15 minutes of inactivity
3. **Missing Reconnection Logic**: No automatic room rejoin after reconnections
4. **Short Keepalive**: Connections were timing out prematurely

## Solutions Implemented

### 1. Backend Configuration Changes (`config.py`)

**Increased Socket.IO Timeouts:**
```python
# Base Config
SOCKETIO_PING_TIMEOUT = 120  # Increased from 60 to 120 seconds
SOCKETIO_PING_INTERVAL = 25  # Keep pings frequent
SOCKETIO_MAX_HTTP_BUFFER_SIZE = 100000000  # 100MB for large payloads
SOCKETIO_ALWAYS_CONNECT = True

# Production Config
SOCKETIO_PING_TIMEOUT = 180  # 3 minutes for production
SOCKETIO_PING_INTERVAL = 30  # Ping every 30 seconds
```

**Why This Helps:**
- Longer timeout gives more buffer for network latency
- More frequent pings (every 25-30s) detect disconnections faster
- Prevents premature disconnections due to temporary network issues

### 2. Backend Socket.IO Initialization (`app/__init__.py`)

**Updated Parameters:**
```python
socketio.init_app(
    app, 
    cors_allowed_origins=app.config['SOCKETIO_CORS_ALLOWED_ORIGINS'],
    async_mode=async_mode,
    logger=True,
    engineio_logger=True,
    ping_timeout=app.config['SOCKETIO_PING_TIMEOUT'],  # Now 120/180 seconds
    ping_interval=app.config['SOCKETIO_PING_INTERVAL'],  # 25/30 seconds
    max_http_buffer_size=app.config.get('SOCKETIO_MAX_HTTP_BUFFER_SIZE', 100000000),
    allow_upgrades=True,
    always_connect=app.config.get('SOCKETIO_ALWAYS_CONNECT', True),
    transports=['polling', 'websocket']
)
```

### 3. Frontend Socket.IO Client (`static/js/modules/room.js`)

**Improved Connection Settings:**
```javascript
AppState.socket = io(backendUrl, {
    transports: ['polling', 'websocket'],
    upgrade: true,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,  // Increased from 5000
    reconnectionAttempts: Infinity,
    timeout: 30000,  // Increased from 20000 to match backend
    forceNew: false,
    withCredentials: true,
    autoConnect: true,
    // Heartbeat settings to match backend
    pingTimeout: 120000,  // 2 minutes
    pingInterval: 25000   // 25 seconds
});
```

**Added Auto-Rejoin Logic:**
```javascript
socket.on('reconnect', (attemptNumber) => {
    console.log('🔄 Socket.IO reconnected after', attemptNumber, 'attempts');
    showSyncIndicator('Reconnected to server', 'success');
    
    // If we were in a room, try to rejoin
    if (AppState.currentRoom && AppState.username) {
        console.log('🔄 Rejoining room after reconnect:', AppState.currentRoom);
        socket.emit('join_room', { 
            room_id: AppState.currentRoom, 
            username: AppState.username 
        });
    }
});
```

### 4. Keepalive Mechanism (`static/js/app.js`)

**Prevents Render Cold Starts:**
```javascript
function startKeepalive() {
    // Ping every 5 minutes to keep backend alive
    setInterval(async () => {
        try {
            const backendUrl = window.BACKEND_URL || 'http://localhost:10000';
            const response = await fetch(`${backendUrl}/health`, {
                method: 'GET',
                credentials: 'include'
            });
            if (response.ok) {
                console.log('💓 Keepalive ping successful');
            }
        } catch (error) {
            console.warn('💔 Keepalive ping failed:', error.message);
        }
    }, 5 * 60 * 1000); // 5 minutes
}
```

**Why This Helps:**
- Keeps Render backend warm (prevents 15-minute timeout)
- Maintains TCP connection pool
- Ensures backend is responsive when users need it

### 5. Gunicorn Configuration (`Procfile`)

**Optimized Worker Settings:**
```yaml
web: gunicorn -w 1 --bind 0.0.0.0:$PORT --timeout 180 --keepalive 75 --log-level info "run:app"
```

**Changes:**
- `--timeout 180`: Increased from 120 to match Socket.IO timeout
- `--keepalive 75`: Added TCP keepalive (2.5 minutes)
- Single worker (`-w 1`) ensures Socket.IO state consistency

## Testing Checklist

After deploying these changes:

- [ ] Verify users can create and join rooms
- [ ] Test connection stability for 5+ minutes
- [ ] Verify automatic rejoin after temporary disconnection
- [ ] Check that keepalive pings appear in console (every 5 minutes)
- [ ] Confirm users stay connected during music playback
- [ ] Test with multiple users in same room

## Deployment Steps

1. **Update Render Dashboard:**
   - Go to Render Dashboard → Your Service → Settings
   - Build & Deploy → Start Command
   - Update to: `gunicorn -w 1 --bind 0.0.0.0:$PORT --timeout 180 --keepalive 75 --log-level info "run:app"`

2. **Push Code to Render:**
   ```bash
   git add .
   git commit -m "Fix Socket.IO disconnection issues"
   git push
   ```

3. **Monitor Logs:**
   ```bash
   # Check for successful connections
   # Look for: "✅ Socket.IO connected"
   # Look for: "💓 Keepalive ping successful"
   ```

## Configuration Summary

| Setting | Before | After | Purpose |
|---------|--------|-------|---------|
| Backend Ping Timeout | 60s | 120s (dev), 180s (prod) | Prevent premature disconnects |
| Frontend Ping Timeout | Not set | 120s | Match backend settings |
| Reconnection Max Delay | 5s | 10s | Allow longer backoff |
| Connection Timeout | 20s | 30s | Match backend timeout |
| Keepalive Interval | None | 5 minutes | Prevent Render cold starts |
| Gunicorn Timeout | 120s | 180s | Match Socket.IO timeout |
| Gunicorn Keepalive | None | 75s | Maintain TCP connections |

## Expected Behavior

✅ **Before Fix:**
- Users disconnected after 60 seconds of inactivity
- No automatic rejoin after reconnection
- Backend went cold after 15 minutes

✅ **After Fix:**
- Connections stable for 2+ minutes (dev) / 3+ minutes (prod)
- Automatic rejoin after temporary disconnections
- Backend stays warm with keepalive pings
- Better handling of network latency and temporary issues

## Monitoring

Check browser console for these messages:
- `💓 Keepalive ping successful` - Every 5 minutes
- `✅ Socket.IO connected` - On initial connection
- `🔄 Socket.IO reconnected` - After reconnection
- `🔄 Rejoining room after reconnect` - Auto-rejoin working

## Troubleshooting

### If disconnections still occur:

1. **Check Render Logs:**
   ```
   Look for: "Socket.IO connection timeout"
   Look for: Gunicorn worker timeouts
   ```

2. **Increase Timeouts Further:**
   - In `config.py`: Set `SOCKETIO_PING_TIMEOUT = 240` (4 minutes)
   - In `room.js`: Set `pingTimeout: 180000` (3 minutes)

3. **Verify CORS Settings:**
   - Ensure Vercel domain is in `CORS_ORIGINS` environment variable
   - Check that `withCredentials: true` is working

4. **Check Redis Connection:**
   - Verify Upstash Redis is accessible
   - Check Redis connection pool settings in `room_service.py`

## Additional Resources

- [Socket.IO Connection Issues](https://socket.io/docs/v4/troubleshooting-connection-issues/)
- [Render Health Checks](https://render.com/docs/health-checks)
- [Gunicorn Keepalive](https://docs.gunicorn.org/en/stable/settings.html#keepalive)
