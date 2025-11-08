# 🎧 Syncano - Listen together, anywhere

A production-ready collaborative music streaming application built with Flask and Socket.IO, featuring real-time synchronized playback and built-in JioSaavn API integration.

## ✨ Features

- 🎵 **Music Search** - Search for songs, artists, and albums
- 🎧 **High-Quality Streaming** - Stream music directly in your browser
- 🎮 **Full Player Controls** - Play, pause, next, previous, seek, volume
- 💚 **Liked Songs** - Save your favorite songs with persistent storage
- 👥 **Collaborative Rooms** - Listen to music together in real-time
- 🔄 **Real-time Sync** - All users in a room hear the same song simultaneously
- ✨ **Vibe Check** - Manual sync button to instantly match room playback position
- 🚪 **Leave Room** - Clean room exit with automatic host reassignment
- 👑 **Host Controls** - Room creator controls playback for everyone
- 📱 **Responsive Design** - Works seamlessly on mobile and desktop
- ⌨️ **Keyboard Shortcuts** - Quick controls for power users
- 🎨 **Spotify-Inspired UI** - Modern, dark theme interface
- 🚀 **Built-in API** - No external server dependencies


## 🚀 Quick Start

1. **Clone or download this project**

2. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Run the application:**
   ```bash
   python run.py
   ```
   The server will start on http://localhost:3001

4. **Open your browser and go to:**
   ```
   http://localhost:3001
   ```

### Development vs Production

**Development Mode** (default):
```bash
python run.py
```

**Production Mode**:
```bash
FLASK_ENV=production python run.py
```

**Production with Gunicorn**:
```bash
gunicorn --worker-class eventlet -w 1 --bind 0.0.0.0:3001 "app:create_app('production')"
```

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
Music/
├── run.py                      # Application entry point
├── config.py                   # Configuration management (dev/prod/test)
├── requirements.txt            # Python dependencies
├── ARCHITECTURE.md             # Detailed architecture documentation
├── .env.example               # Environment variables template
├── .gitignore                 # Git ignore patterns
├── app/
│   ├── __init__.py            # Application factory
│   ├── routes/
│   │   ├── main.py            # Main routes (index, health)
│   │   └── api.py             # API endpoints (/api/search, /api/song, etc.)
│   ├── services/
│   │   ├── jiosaavn_service.py  # JioSaavn API integration
│   │   └── room_service.py      # Room management logic
│   ├── socketio_handlers/
│   │   └── room_events.py       # Socket.IO event handlers
│   └── utils/
│       ├── helpers.py           # Utility functions (encryption, formatting)
│       └── logger.py            # Logging configuration
├── templates/
│   └── index.html              # Main HTML template with Spotify-inspired UI
├── static/
│   ├── css/
│   │   └── style.css           # Modern dark theme styling
│   ├── js/
│   │   └── script.js           # Frontend logic, Socket.IO, Vibe Check
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
- `user_left` - User left notification
- `song_changed` - Song update in room
- `playback_changed` - Playback state change
- `seek_changed` - Seek position update
- `sync_state` - Current room state (response to Vibe Check)
- `room_left` - Room exit confirmation
- `new_host` - New host assignment notification
- `error` - Error messages

## 🛠️ Technology Stack

- **Backend**: Python Flask with Application Factory Pattern
- **Architecture**: Modular structure (Services, Routes, Handlers)
- **Real-time**: Flask-SocketIO for WebSocket communication
- **API**: Built-in JioSaavn API integration with encryption
- **Configuration**: Environment-based configs (Development/Production/Testing)
- **Logging**: Rotating file handler with configurable levels
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Audio**: HTML5 Audio API
- **Storage**: LocalStorage for liked songs
- **Styling**: Custom CSS with Spotify-inspired design
- **Security**: HTTP security headers, CORS configuration

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

3. **Room sync issues**: 
   - Click the "Vibe Check" button to manually resync
   - Ensure all users are on the same network or have proper connectivity
   - Refresh all tabs and rejoin the room
   - Check browser console for Socket.IO errors
   - Check logs in `logs/app.log` for server-side issues

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
- [ ] Queue management
- [ ] Persistent room storage (database)
- [ ] Room history and analytics
- [ ] Mobile app (React Native)
- [ ] Lyrics display while playing
- [ ] Audio visualizer
- [ ] Cross-device synchronization
- [ ] Advanced room permissions

## 📜 License

This project is for educational purposes only. JioSaavn and its API are property of their respective owners.

---

**Made with ❤️ for music lovers everywhere**

🎧 **Syncano** - *One track, one tempo — infinite listeners.*