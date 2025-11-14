# 🎧 Syncano - Listen together, anywhere

A production-ready collaborative music streaming application with real-time synchronized playback. Built with a modern split architecture: **Vercel (frontend) + Render (backend) + Upstash Redis (database)**.

## ✨ Features

- 🎵 **Music Search & Streaming** - Search and stream high-quality music
- 🎮 **Full Player Controls** - Play, pause, skip, seek, volume control
- 💚 **Liked Songs** - Persistent favorites with localStorage
- 📄 **Lyrics Display** - Terminal-style lyrics with synchronized scrolling
- 👥 **Collaborative Rooms** - Listen together in real-time with friends
- 🔄 **Perfect Sync** - All users hear the same song at the same time
- ✨ **Vibe Check** - One-click sync to match room playback
- 👑 **Host Controls** - Room creator controls playback for everyone
- 📱 **Responsive Design** - Works on mobile, tablet, and desktop
- 🎨 **Spotify-Inspired UI** - Modern dark theme with smooth animations
- 🚀 **Production-Ready** - Split architecture for scalability
- 💰 **Zero Cost** - Deploy for free on Vercel, Render, and Upstash

## 🏗️ Architecture

```
┌──────────────┐     ┌──────────────┐     ┌─────────────┐
│   Vercel     │────→│    Render    │────→│   Upstash   │
│  (Frontend)  │ API │  (Backend)   │ DB  │   (Redis)   │
│Static Files  │ WSS │  Socket.IO   │     │ Room State  │
└──────────────┘     └──────────────┘     └─────────────┘
```

- **Frontend (Vercel)**: Static HTML/CSS/JS served from edge network
- **Backend (Render)**: Flask + Socket.IO with persistent WebSocket support
- **Database (Upstash Redis)**: Serverless Redis for room state persistence

## 🚀 Quick Start

### Local Development

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Set up environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

3. **Run the backend:**
   ```bash
   python run.py
   ```
   Server starts at `http://localhost:10000`

4. **Open in browser:**
   ```
   http://localhost:10000/templates/index.html
   ```

📖 **See [QUICKSTART.md](QUICKSTART.md) for detailed local setup**

### Production Deployment

Deploy to production in 3 steps:

1. **Setup Upstash Redis** (2 minutes)
2. **Deploy Backend to Render** (5 minutes)
3. **Deploy Frontend to Vercel** (3 minutes)

📖 **See [DEPLOYMENT.md](DEPLOYMENT.md) for complete deployment guide**
## 🧪 Testing

Test your deployment locally before going to production:

```bash
# Start the backend
python run.py

# In another terminal, run tests
python test_deployment.py
```

This will test:
- ✓ Health check endpoint
- ✓ API functionality
- ✓ Search endpoint
- ✓ CORS configuration
- ✓ Redis connection (if configured)

## 📖 How to Use

### 🎵 Single User Mode:
1. **Search for Music**: Enter a song name, artist, or album in the search box (press Enter)
2. **Play Songs**: Click the play button on any song card to start playing
3. **Like Songs**: Click the heart icon ❤️ on songs to save them to your Liked Songs
4. **View Liked Songs**: Click "Liked Songs" in the sidebar to see all your favorites
5. **Player Controls**: Use the bottom player bar to control playback
6. **Keyboard Shortcuts**:
   - `Spacebar`: Play/Pause
   - `Ctrl + Left Arrow`: Previous song
   - `Ctrl + Right Arrow`: Next song

### 👥 Collaborative Listening Rooms:
1. **Create a Room**: 
   - Click "Create Room" button in the sidebar
   - Enter your name
   - Share the generated Room ID with friends
   
2. **Join a Room**:
   - Click "Join Room" button
   - Enter your name and the Room ID
   - You'll sync with the current playback automatically
   
3. **Room Features**:
   - 👑 **Host Controls**: Room creator controls play/pause/seek for everyone
   - 👥 **User List**: See who's currently in the room with live badges
   - 🔄 **Auto-Sync**: New users automatically sync to current song and position
   - ✨ **Vibe Check**: Click the "Vibe Check" button to manually sync to current playback
   - 🚪 **Leave Room**: Cleanly exit a room with the "Leave Room" button
   - 📱 **Multi-Device**: Works across multiple devices and browsers
   - 🎯 **Perfect Sync**: Everyone hears the exact same moment of the song

### 🧪 Testing Room Functionality:
- Open multiple browser tabs/windows to `http://localhost:3001`
- Create a room in one tab, join with the same Room ID in other tabs
- Play music in the host tab and watch other tabs sync automatically in real-time

## 📁 Project Structure

```
Syncano/
├── run.py                      # Application entry point (development)
├── wsgi.py                     # WSGI entry point (production)
├── config.py                   # Configuration (CORS, Redis, etc.)
├── requirements.txt            # Python dependencies
├── render.yaml                 # Render deployment config
├── vercel.json                 # Vercel deployment config
├── Procfile                    # Gunicorn configuration
├── .env.example                # Environment variables template
├── DEPLOYMENT.md               # 📖 Complete deployment guide
├── QUICKSTART.md               # 📖 Local development guide
├── MIGRATION_SUMMARY.md        # 📖 Architecture changes
├── test_deployment.py          # Deployment testing script
├── app/
│   ├── __init__.py             # App factory + CORS + Socket.IO
│   ├── routes/
│   │   ├── main.py             # Main routes (index, health)
│   │   └── api.py              # API endpoints (/api/search, etc.)
│   ├── services/
│   │   ├── music_service.py    # Music API integration
│   │   └── room_service.py     # Room management logic
│   ├── socketio_handlers/
│   │   └── room_events.py      # Socket.IO event handlers
│   └── utils/
│       ├── helpers.py          # Utility functions (encryption, formatting)
│       └── logger.py           # Logging configuration
├── templates/
│   └── index.html              # Main HTML template with Spotify-inspired UI
├── static/
│   ├── css/
│   │   └── style.css           # Fully responsive Spotify-like styling (2660+ lines)
│   ├── js/
│   │   ├── app.js              # Main application entry point
│   │   └── modules/            # Modular JavaScript architecture
│   │       ├── api.js          # API client
│   │       ├── dom.js          # DOM element management
│   │       ├── lyrics.js       # Lyrics functionality
│   │       ├── player.js       # Music player controls
│   │       ├── room.js         # Room/Socket.IO logic
│   │       ├── search.js       # Search functionality
│   │       ├── state.js        # Application state
│   │       └── utils.js        # Utility functions
│   └── images/                 # Image assets
└── logs/                       # Application logs (rotating)
```

## 🔌 API Endpoints

### Main Routes:
- `GET /` - Main application page
- `GET /health` - Health check endpoint
- `GET /room/<id>` - Room information

### API Routes:
- `GET /api/search?q=<query>` - Search for music
- `GET /api/song/<song_id>` - Get detailed song information
- `GET /api/lyrics/<song_id>` - Get song lyrics
- `GET /api/album/<album_id>` - Get album details
- `GET /api/playlist/<playlist_id>` - Get playlist details
- `GET /api/test` - Test built-in API functionality

### Socket.IO Events:
**Client → Server:**
- `create_room` - Create a new listening room
- `join_room` - Join an existing room
- `play_song` - Sync song across room
- `play_pause` - Sync playback state
- `seek` - Sync seek position
- `request_sync` - Request current room state (Vibe Check)
- `leave_room_request` - Manually leave a room
- `disconnect` - User disconnection

**Server → Client:**
- `room_created` - Room creation confirmation
- `joined_room` - Room join confirmation
- `user_joined` - New user joined notification
## 🛠️ Technology Stack

### Backend
- **Framework**: Python Flask with Application Factory Pattern
- **Architecture**: Modular structure (Services, Routes, Handlers)
- **Real-time**: Flask-SocketIO for WebSocket communication
- **API**: Music API integration with encryption
- **Configuration**: Environment-based configs (Development/Production/Testing)
- **Logging**: Rotating file handler with configurable levels

### Frontend
- **Structure**: ES6 Modules with clean separation of concerns
- **Modules**: API, DOM, Player, Search, Room, Lyrics, State, Utils
- **Audio**: HTML5 Audio API
- **Storage**: LocalStorage for liked songs
- **Styling**: Custom CSS with Spotify-inspired design + Full responsive layout
- **Responsive**: 8 breakpoints (320px to 4K+) with progressive enhancement
- **Touch**: Touch-optimized with 44px minimum tap targets (WCAG AA)
- **Real-time**: Socket.IO client for collaborative features

### Infrastructure
- **Deployment**: Vercel serverless functions
- **State**: Redis (Upstash) for distributed room state
- **Security**: HTTP security headers, CORS configurationHandlers)
- **Real-time**: Flask-SocketIO for WebSocket communication
## 📝 Notes

- This application uses a music streaming API for educational purposes
- Audio quality: 320kbps (when available), fallback to 160kbps
- Some songs might not be available due to regional restrictions
- Liked songs are stored in browser's LocalStorage (persistent)
- Room sessions are temporary and cleared when all users leave
- Modular architecture for easy maintenance and scalability

## 📝 Notes

- This application uses the unofficial JioSaavn API for educational purposes
- Built-in API integration means no external server dependencies
- Audio quality: 320kbps (when available), fallback to 160kbps
- Some songs might not be available due to regional restrictions
- Liked songs are stored in browser's LocalStorage (persistent)
- Room sessions are temporary and cleared when all users leave

## 🐛 Troubleshooting

1. **Songs not playing**: 
   - Check your internet connection
   - Try a different song (some may have regional restrictions)
   - Check browser console for errors

2. **Search not working**: 
   - Ensure you press Enter after typing
   - Check if the server is running
   - Try different search terms

3. **Room sync issues / "Room does not exist" error**: 
   - **On Vercel**: You MUST configure Redis (see [QUICK_FIX.md](QUICK_FIX.md))
   - **Locally**: Click the "Vibe Check" button to manually resync
   - Ensure all users are on the same network or have proper connectivity
   - Refresh all tabs and rejoin the room
   - Check browser console for Socket.IO errors
   - Check Vercel function logs or `logs/app.log` for server-side issues

4. **Player not responding**: 
   - Refresh the page (Ctrl+R or Cmd+R)
   - Clear browser cache
   - Try a different browser

5. **Dependencies issues**:
   ```bash
   pip install --upgrade -r requirements.txt
   ```

## 🎯 Future Enhancements

- [ ] Playlist creation and management
- [ ] User authentication and profiles
- [ ] Chat in rooms
- [ ] Gesture controls for mobile (swipe to skip)
- [ ] PWA support for offline mode
- [ ] Dark/light theme toggle
- [ ] Virtual scrolling for large lists
## 📜 License

This project is for educational purposes only.

---

**Made with ❤️ for music lovers everywhere**

🎧 **Syncano** - *One track, one tempo — infinite listeners.*
## 📜 License

This project is for educational purposes only. JioSaavn and its API are property of their respective owners.

---

**Made with ❤️ for music lovers everywhere**

🎧 **Syncano** - *One track, one tempo — infinite listeners.*