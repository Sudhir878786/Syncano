/**
 * Melodexa - Main Application Entry Point
 * A modern music streaming application with collaborative rooms
 */

import { AppState } from './modules/state.js';
import { DOM } from './modules/dom.js';
import { Player } from './modules/player.js';
import { Search } from './modules/search.js';
import { RoomManager } from './modules/webrtc-room.js'; // WebRTC P2P room manager
import { LyricsManager } from './modules/lyrics.js';
import { PlaylistManager } from './modules/playlist.js';
import { ColorExtractor } from './modules/color-extractor.js';
import { updateGreeting, debounce } from './modules/utils.js';
import { API } from './modules/api.js';

/**
 * Keepalive mechanism to prevent Render from sleeping
 * Pings the health endpoint every 5 minutes
 */
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
    
    // Initial ping
    setTimeout(async () => {
        try {
            const backendUrl = window.BACKEND_URL || 'http://localhost:10000';
            await fetch(`${backendUrl}/health`, {
                method: 'GET',
                credentials: 'include'
            });
            console.log('💓 Initial keepalive ping sent');
        } catch (error) {
            console.warn('💔 Initial keepalive ping failed:', error.message);
        }
    }, 10000); // 10 seconds after load
}

/**
 * Initialize the application
 */
async function initializeApp() {
    console.log('🎵 Melodexa - Initializing...');
    
    // Initialize DOM references
    DOM.init();
    console.log('📋 DOM initialized');
    console.log('Search input:', DOM.searchInput);
    console.log('Create room button:', DOM.createRoomBtn);
    console.log('Join room button:', DOM.joinRoomBtn);
    
    // Initialize application state
    AppState.init();
    console.log('💾 State initialized');
    
    // Initialize WebRTC signaling connection
    await RoomManager.initializeSocket();
    console.log('🔌 WebRTC signaling initialized');
    
    // Initialize keepalive for Render (prevents cold starts)
    startKeepalive();
    console.log('💓 Keepalive started');
    
    // Initialize playlists
    PlaylistManager.renderPlaylistsSidebar();
    console.log('🎵 Playlists initialized');
    
    // Update greeting
    updateGreeting();
    
    // Setup event listeners
    setupEventListeners();
    console.log('🎯 Event listeners attached');
    
    // Initialize volume
    if (DOM.audioPlayer && DOM.volumeSlider) {
        DOM.audioPlayer.volume = DOM.volumeSlider.value / 100;
        Player.updateVolumeSliderBackground();
    }
    
    console.log('✅ Melodexa - Ready!');
    console.log('📊 Available functions:', Object.keys(window.Melodexa));
}

/**
 * Setup all event listeners
 */
function setupEventListeners() {
    // Search functionality
    if (DOM.searchInput) {
        console.log('✅ Attaching search input listeners');
        
        // Enter key performs full search
        DOM.searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                console.log('⏎ Enter pressed in search');
                Search.performSearch();
            }
        });
        
        // Live suggestions as user types (instant for cached, debounced for API)
        let suggestionTimeout;
        DOM.searchInput.addEventListener('input', () => {
            const query = DOM.searchInput.value.trim();
            Search._lastQuery = query;
            
            if (query.length < 1) {
                Search.hideSuggestions();
                clearTimeout(suggestionTimeout);
                return;
            }
            
            // Check cache immediately for instant response
            const cacheKey = query.toLowerCase().trim();
            const cached = Search._cache.get(cacheKey);
            if (cached && Date.now() - cached.timestamp < Search._cacheTimeout) {
                Search.displaySuggestions(cached.results.slice(0, 5));
                clearTimeout(suggestionTimeout);
                return;
            }
            
            // Debounce API calls for new queries
            clearTimeout(suggestionTimeout);
            suggestionTimeout = setTimeout(() => {
                Search.showLiveSuggestions(query);
            }, 100); // Reduced to 100ms
        });
        
        // Focus shows suggestions if there's a query
        DOM.searchInput.addEventListener('focus', () => {
            const query = DOM.searchInput.value.trim();
            if (query.length >= 1) {
                Search.showLiveSuggestions(query);
            }
        });
        
        // Click outside to hide suggestions
        document.addEventListener('click', (e) => {
            if (!DOM.searchInput.contains(e.target) && !DOM.searchSuggestions?.contains(e.target)) {
                Search.hideSuggestions();
            }
        });
    }
    
    // Test API button
    const testApiBtn = document.getElementById('testApiBtn');
    if (testApiBtn) {
        testApiBtn.addEventListener('click', async () => {
            try {
                const result = await API.test();
                console.log('API test result:', result);
                alert(`API Status: ${result.status}\n${result.message}`);
            } catch (error) {
                console.error('API test failed:', error);
                alert('API test failed: ' + error.message);
            }
        });
    }
    
    // Room functionality
    if (DOM.createRoomBtn) {
        console.log('✅ Attaching create room listener');
        DOM.createRoomBtn.addEventListener('click', () => {
            console.log('🎪 Create room button clicked');
            RoomManager.showCreateRoomModal();
        });
    } else {
        console.warn('⚠️ Create room button not found!');
    }
    
    if (DOM.joinRoomBtn) {
        console.log('✅ Attaching join room listener');
        DOM.joinRoomBtn.addEventListener('click', () => {
            console.log('🚪 Join room button clicked');
            RoomManager.showJoinRoomModal();
        });
    } else {
        console.warn('⚠️ Join room button not found!');
    }
    
    DOM.closeModal?.addEventListener('click', () => RoomManager.hideModal());
    DOM.modalActionBtn?.addEventListener('click', () => RoomManager.handleModalAction());
    
    // Close modal on overlay click
    if (DOM.roomModal) {
        DOM.roomModal.addEventListener('click', (e) => {
            if (e.target === DOM.roomModal || e.target.classList.contains('modal-overlay')) {
                RoomManager.hideModal();
            }
        });
    }
    
    // Room action buttons
    const syncWithRoomBtn = document.getElementById('syncWithRoomBtn');
    const leaveRoomBtn = document.getElementById('leaveRoomBtn');
    syncWithRoomBtn?.addEventListener('click', () => RoomManager.requestRoomSync());
    leaveRoomBtn?.addEventListener('click', () => RoomManager.leaveRoom());
    
    // Player controls
    DOM.playPauseBtn?.addEventListener('click', () => Player.togglePlayPause());
    DOM.prevBtn?.addEventListener('click', () => Player.playPrevious());
    DOM.nextBtn?.addEventListener('click', () => Player.playNext());
    
    // Audio player events
    if (DOM.audioPlayer) {
        DOM.audioPlayer.addEventListener('loadedmetadata', () => Player.updateDuration());
        DOM.audioPlayer.addEventListener('timeupdate', () => Player.updateProgress());
        DOM.audioPlayer.addEventListener('ended', () => Player.playNext());
        
        DOM.audioPlayer.addEventListener('error', (e) => {
            console.error('Audio error:', e);
            alert('Failed to load audio. The song might not be available.');
            AppState.isPlaying = false;
            Player.updatePlayPauseButton();
        });
        
        DOM.audioPlayer.addEventListener('loadstart', () => {
            AppState.isPlaying = false;
            Player.updatePlayPauseButton();
        });
        
        DOM.audioPlayer.addEventListener('play', () => {
            if (!AppState.isSyncing) {
                AppState.isPlaying = true;
                Player.updatePlayPauseButton();
            }
        });
        
        DOM.audioPlayer.addEventListener('pause', () => {
            if (!AppState.isSyncing) {
                AppState.isPlaying = false;
                Player.updatePlayPauseButton();
            }
        });
    }
    
    // Progress slider
    DOM.progressSlider?.addEventListener('input', () => Player.seekToPosition());
    
    // Volume controls
    DOM.volumeSlider?.addEventListener('input', () => Player.updateVolume());
    DOM.volumeBtn?.addEventListener('click', () => Player.toggleMute());
    
    // Like current song
    DOM.likeCurrentSongBtn?.addEventListener('click', () => Player.toggleLikeCurrentSong());
    
    // Lyrics button - fetch and show lyrics when clicked
    DOM.lyricsBtn?.addEventListener('click', () => {
        const isVisible = !DOM.lyricsTerminal?.classList.contains('hidden');
        if (!isVisible && AppState.currentSongId) {
            // Fetch lyrics when opening
            LyricsManager.fetchLyrics(AppState.currentSongId);
        } else {
            LyricsManager.toggleLyricsTerminal();
        }
    });
    DOM.closeLyricsBtn?.addEventListener('click', () => LyricsManager.hideLyricsTerminal());
    
    // Navigation items
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            navItems.forEach(i => {
                i.classList.remove('active', 'bg-spotify-gray');
            });
            this.classList.add('active', 'bg-spotify-gray');
            
            const section = this.dataset.section;
            if (section === 'search') {
                DOM.searchInput?.focus();
            } else if (section === 'liked') {
                Search.showLikedSongs();
            } else if (section === 'home') {
                Search.showHome();
            }
        });
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && e.target.tagName !== 'INPUT') {
            e.preventDefault();
            Player.togglePlayPause();
        } else if (e.code === 'ArrowLeft' && e.ctrlKey) {
            e.preventDefault();
            Player.playPrevious();
        } else if (e.code === 'ArrowRight' && e.ctrlKey) {
            e.preventDefault();
            Player.playNext();
        }
    });
    
    // Mobile menu toggle
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    
    if (mobileMenuBtn && sidebar && sidebarOverlay) {
        const toggleSidebar = () => {
            sidebar.classList.toggle('-translate-x-full');
            sidebarOverlay.classList.toggle('hidden');
        };
        
        mobileMenuBtn.addEventListener('click', toggleSidebar);
        sidebarOverlay.addEventListener('click', toggleSidebar);
    }
}
// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', initializeApp);

// Export for debugging purposes
window.Melodexa = {
    AppState,
    Player,
    Search,
    RoomManager,
    LyricsManager,
    PlaylistManager,
    ColorExtractor,
    API
};
