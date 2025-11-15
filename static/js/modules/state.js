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
    playlists: [],
    previousVolume: 50,
    
    // Room state
    socket: null,
    currentRoom: null,
    username: null,
    isHost: false,
    inRoom: false,
    socketConnected: false,
    connectionErrorShown: false,
    
    // Lyrics state
    currentLyrics: [],
    lyricsInterval: null,
    currentLyricsIndex: 0,
    lyricsStartTime: 0,
    lyricsDisplayMode: 'instant',
    
    // Initialize state from storage
    init() {
        this.loadLikedSongs();
        this.loadPlaylists();
    },
    
    // Load liked songs from localStorage
    loadLikedSongs() {
        const saved = localStorage.getItem('melodexa_liked_songs');
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
        localStorage.setItem('melodexa_liked_songs', JSON.stringify(this.likedSongs));
    },
    
    // Load playlists from localStorage
    loadPlaylists() {
        const saved = localStorage.getItem('melodexa_playlists');
        if (saved) {
            try {
                this.playlists = JSON.parse(saved);
            } catch (e) {
                console.error('Failed to load playlists:', e);
                this.initializeDefaultPlaylists();
            }
        } else {
            this.initializeDefaultPlaylists();
        }
    },
    
    // Initialize default playlists
    initializeDefaultPlaylists() {
        this.playlists = [
            {
                id: 'hindi-trending',
                name: '🔥 Hindi Trending',
                description: 'Top trending Hindi songs',
                image: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23FF6B35" width="200" height="200"/%3E%3Ctext x="50%25" y="50%25" font-size="60" text-anchor="middle" dy=".3em"%3E🔥%3C/text%3E%3C/svg%3E',
                songs: [],
                query: 'arijit singh latest',
                color: 'from-orange-500 to-red-600'
            },
            {
                id: 'english-trending',
                name: '🌟 English Trending',
                description: 'Popular English hits',
                image: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%234A90E2" width="200" height="200"/%3E%3Ctext x="50%25" y="50%25" font-size="60" text-anchor="middle" dy=".3em"%3E🌟%3C/text%3E%3C/svg%3E',
                songs: [],
                query: 'weeknd starboy',
                color: 'from-blue-500 to-purple-600'
            },
            {
                id: 'romantic',
                name: '💕 Romantic',
                description: 'Love songs for every mood',
                image: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23E91E63" width="200" height="200"/%3E%3Ctext x="50%25" y="50%25" font-size="60" text-anchor="middle" dy=".3em"%3E💕%3C/text%3E%3C/svg%3E',
                songs: [],
                query: 'romantic hindi songs',
                color: 'from-pink-500 to-rose-600'
            },
            {
                id: 'bollywood-hits',
                name: '🎬 Bollywood Hits',
                description: 'Best of Bollywood',
                image: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%231DB954" width="200" height="200"/%3E%3Ctext x="50%25" y="50%25" font-size="60" text-anchor="middle" dy=".3em"%3E🎬%3C/text%3E%3C/svg%3E',
                songs: [],
                query: 'bollywood top songs',
                color: 'from-green-500 to-emerald-600'
            },
            {
                id: 'workout',
                name: '💪 Workout Mix',
                description: 'High energy workout tracks',
                image: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23F39C12" width="200" height="200"/%3E%3Ctext x="50%25" y="50%25" font-size="60" text-anchor="middle" dy=".3em"%3E💪%3C/text%3E%3C/svg%3E',
                songs: [],
                query: 'gym workout songs',
                color: 'from-yellow-500 to-orange-600'
            },
            {
                id: 'party',
                name: '🎉 Party Hits',
                description: 'Get the party started',
                image: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%239B59B6" width="200" height="200"/%3E%3Ctext x="50%25" y="50%25" font-size="60" text-anchor="middle" dy=".3em"%3E🎉%3C/text%3E%3C/svg%3E',
                songs: [],
                query: 'party songs',
                color: 'from-purple-500 to-indigo-600'
            }
        ];
        this.savePlaylists();
    },
    
    // Save playlists to localStorage
    savePlaylists() {
        localStorage.setItem('melodexa_playlists', JSON.stringify(this.playlists));
    },
    
    // Add song to playlist
    addToPlaylist(playlistId, song) {
        const playlist = this.playlists.find(p => p.id === playlistId);
        if (playlist) {
            const songId = this.getSongId(song);
            if (!playlist.songs.some(s => this.getSongId(s) === songId)) {
                playlist.songs.push(song);
                this.savePlaylists();
                return true;
            }
        }
        return false;
    },
    
    // Remove song from playlist
    removeFromPlaylist(playlistId, song) {
        const playlist = this.playlists.find(p => p.id === playlistId);
        if (playlist) {
            const songId = this.getSongId(song);
            const index = playlist.songs.findIndex(s => this.getSongId(s) === songId);
            if (index > -1) {
                playlist.songs.splice(index, 1);
                this.savePlaylists();
                return true;
            }
        }
        return false;
    },
    
    // Get unique song ID
    getSongId(song) {
        return song.id || song.songid || song.perma_url || song.title + '-' + song.artist;
    },
    
    // Reset room state
    resetRoomState() {
        this.currentRoom = null;
        this.username = null;
        this.isHost = false;
        this.inRoom = false;
    }
};
