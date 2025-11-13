/**
 * Application State Management
 * Centralized state for player, room, and user data
 */

export const AppState = {
    // Player state
    currentSong: null,
    isPlaying: false,
    currentPlaylist: [],
    currentIndex: 0,
    isSyncing: false,
    likedSongs: [],
    previousVolume: 50,
    
    // Room state
    socket: null,
    currentRoom: null,
    username: null,
    isHost: false,
    inRoom: false,
    
    // Lyrics state
    currentLyrics: [],
    lyricsInterval: null,
    currentLyricsIndex: 0,
    lyricsStartTime: 0,
    lyricsDisplayMode: 'instant',
    
    // Initialize state from storage
    init() {
        this.loadLikedSongs();
    },
    
    // Load liked songs from localStorage
    loadLikedSongs() {
        const saved = localStorage.getItem('syncano_liked_songs');
        if (saved) {
            try {
                this.likedSongs = JSON.parse(saved);
            } catch (e) {
                console.error('Failed to load liked songs:', e);
                this.likedSongs = [];
            }
        }
    },
    
    // Save liked songs to localStorage
    saveLikedSongs() {
        localStorage.setItem('syncano_liked_songs', JSON.stringify(this.likedSongs));
    },
    
    // Reset room state
    resetRoomState() {
        this.currentRoom = null;
        this.username = null;
        this.isHost = false;
        this.inRoom = false;
    }
};
