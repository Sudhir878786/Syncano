# 🎧 Syncano - Listen together, anywhere

A collaborative music streaming application built with Flask and Socket.IO, featuring real-time synchronized playback and built-in JioSaavn API integration.

## ✨ Features

- 🎵 **Music Search** - Search for songs, artists, and albums
- 🎧 **High-Quality Streaming** - Stream music directly in your browser
- 🎮 **Full Player Controls** - Play, pause, next, previous, seek, volume
- 💚 **Liked Songs** - Save your favorite songs with persistent storage
- 👥 **Collaborative Rooms** - Listen to music together in real-time
- 🔄 **Real-time Sync** - All users in a room hear the same song simultaneously
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
   python app.py
   ```
   The server will start on http://localhost:3001

4. **Open your browser and go to:**
   ```
   http://localhost:3001
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
   - 📱 **Multi-Device**: Works across multiple devices and browsers
   - 🎯 **Perfect Sync**: Everyone hears the exact same moment of the song

### 🧪 Testing Room Functionality:
- Open multiple browser tabs/windows to `http://localhost:3001`
- Create a room in one tab, join with the same Room ID in other tabs
- Play music in the host tab and watch other tabs sync automatically in real-time

## 📁 Project Structure

```
Music/
├── app.py                 # Flask backend with built-in JioSaavn API
├── requirements.txt       # Python dependencies
├── templates/
│   └── index.html        # Main HTML template with Spotify-inspired UI
├── static/
│   ├── css/
│   │   └── style.css     # Modern dark theme styling
│   ├── js/
│   │   └── script.js     # Frontend logic, Socket.IO, liked songs
│   └── images/           # Image assets
├── JioSaavnAPI/          # Reference implementation (not needed)
└── README.md             # This file
```

## 🔌 API Endpoints

### Main Routes:
- `GET /` - Main application page
- `GET /search?q=<query>` - Search for music
- `GET /song/<song_id>` - Get detailed song information
- `GET /lyrics/<song_id>` - Get song lyrics
- `GET /album/<album_id>` - Get album details
- `GET /playlist/<playlist_id>` - Get playlist details
- `GET /test-api` - Test built-in API functionality

### Socket.IO Events:
- `create_room` - Create a new listening room
- `join_room` - Join an existing room
- `play_song` - Sync song across room
- `play_pause` - Sync playback state
- `seek` - Sync seek position

## 🛠️ Technology Stack

- **Backend**: Python Flask + Flask-SocketIO
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Real-time**: Socket.IO for WebSocket communication
- **API**: Built-in JioSaavn API integration
- **Audio**: HTML5 Audio API
- **Storage**: LocalStorage for liked songs
- **Styling**: Custom CSS with Spotify-inspired design

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
   - Ensure all users are on the same network or have proper connectivity
   - Refresh all tabs and rejoin the room
   - Check browser console for Socket.IO errors

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
- [ ] User authentication
- [ ] Chat in rooms
- [ ] Queue management
- [ ] Mobile app (React Native)
- [ ] Lyrics display while playing
- [ ] Audio visualizer

## 📜 License

This project is for educational purposes only. JioSaavn and its API are property of their respective owners.

---

**Made with ❤️ for music lovers everywhere**

🎧 **Syncano** - *One track, one tempo — infinite listeners.*