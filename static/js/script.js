// Global variables
let currentSong = null;
let isPlaying = false;
let currentPlaylist = [];
let currentIndex = 0;
let isSyncing = false;
let likedSongs = [];

// Room variables
let socket = null;
let currentRoom = null;
let username = null;
let isHost = false;
let inRoom = false;

// DOM elements
const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');
const resultsContainer = document.getElementById('resultsContainer');
const welcomeSection = document.getElementById('welcomeSection');
const loadingSpinner = document.getElementById('loadingSpinner');
const likedSongsSection = document.getElementById('likedSongs');
const likedContainer = document.getElementById('likedContainer');
const likeCurrentSongBtn = document.getElementById('likeCurrentSongBtn');

// Room elements
const createRoomBtn = document.getElementById('createRoomBtn');
const joinRoomBtn = document.getElementById('joinRoomBtn');
const roomModal = document.getElementById('roomModal');
const closeModal = document.getElementById('closeModal');
const modalTitle = document.getElementById('modalTitle');
const usernameInput = document.getElementById('usernameInput');
const roomIdInput = document.getElementById('roomIdInput');
const roomIdGroup = document.getElementById('roomIdGroup');
const modalActionBtn = document.getElementById('modalActionBtn');
const roomInfo = document.getElementById('roomInfo');
const roomStatus = document.getElementById('roomStatus');
const roomUsers = document.getElementById('roomUsers');

// Player elements
const audioPlayer = document.getElementById('audioPlayer');
const playPauseBtn = document.getElementById('playPauseBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const playerImage = document.getElementById('playerImage');
const playerTitle = document.getElementById('playerTitle');
const playerArtist = document.getElementById('playerArtist');
const currentTime = document.getElementById('currentTime');
const totalTime = document.getElementById('totalTime');
const progressSlider = document.getElementById('progressSlider');
const progressFill = document.getElementById('progressFill');
const volumeSlider = document.getElementById('volumeSlider');
const volumeBtn = document.getElementById('volumeBtn');

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Load liked songs from localStorage
    loadLikedSongs();
    
    // Initialize Socket.IO
    initializeSocket();
    
    // Update greeting based on time
    updateGreeting();
    
    // Search functionality - trigger on input enter or click search icon
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            performSearch();
        }
    });
    
    // Add search on input for real-time results (optional)
    let searchTimeout;
    searchInput.addEventListener('input', function() {
        clearTimeout(searchTimeout);
        const query = searchInput.value.trim();
        if (query.length >= 3) {
            searchTimeout = setTimeout(performSearch, 500);
        }
    });
    
    // Test API functionality
    const testApiBtn = document.getElementById('testApiBtn');
    if (testApiBtn) {
        testApiBtn.addEventListener('click', testApiConnection);
    }
    
    // Room functionality
    createRoomBtn.addEventListener('click', showCreateRoomModal);
    joinRoomBtn.addEventListener('click', showJoinRoomModal);
    closeModal.addEventListener('click', hideModal);
    modalActionBtn.addEventListener('click', handleModalAction);
    
    // Close modal when clicking overlay
    roomModal.addEventListener('click', function(e) {
        if (e.target === roomModal || e.target.classList.contains('modal-overlay')) {
            hideModal();
        }
    });

    // Player controls
    playPauseBtn.addEventListener('click', togglePlayPause);
    prevBtn.addEventListener('click', playPrevious);
    nextBtn.addEventListener('click', playNext);
    
    // Audio player events
    audioPlayer.addEventListener('loadedmetadata', updateDuration);
    audioPlayer.addEventListener('timeupdate', updateProgress);
    audioPlayer.addEventListener('ended', playNext);
    
    // Progress slider
    progressSlider.addEventListener('input', seekToPosition);
    
    // Volume control
    volumeSlider.addEventListener('input', updateVolume);
    volumeBtn.addEventListener('click', toggleMute);
    
    // Like current song button
    likeCurrentSongBtn.addEventListener('click', toggleLikeCurrentSong);
    
    // Initialize volume
    audioPlayer.volume = volumeSlider.value / 100;
    updateVolumeSliderBackground();
    
    // Navigation items
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            navItems.forEach(i => i.classList.remove('active'));
            this.classList.add('active');
            
            const section = this.dataset.section;
            if (section === 'search') {
                searchInput.focus();
            } else if (section === 'liked') {
                showLikedSongs();
            } else if (section === 'home') {
                showHome();
            }
        });
    });
}

// Liked Songs Functions
function loadLikedSongs() {
    const saved = localStorage.getItem('syncano_liked_songs');
    if (saved) {
        try {
            likedSongs = JSON.parse(saved);
        } catch (e) {
            console.error('Failed to load liked songs:', e);
            likedSongs = [];
        }
    }
}

function saveLikedSongs() {
    localStorage.setItem('syncano_liked_songs', JSON.stringify(likedSongs));
}

function isSongLiked(song) {
    const songId = getSongId(song);
    return likedSongs.some(s => getSongId(s) === songId);
}

function getSongId(song) {
    return song.id || song.songid || song.perma_url || song.title + '-' + song.artist;
}

function toggleLikeSong(song) {
    const songId = getSongId(song);
    const index = likedSongs.findIndex(s => getSongId(s) === songId);
    
    if (index > -1) {
        likedSongs.splice(index, 1);
        showSyncIndicator('Removed from Liked Songs', 'info');
    } else {
        likedSongs.push(song);
        showSyncIndicator('Added to Liked Songs', 'success');
    }
    
    saveLikedSongs();
    updateLikeButtons();
    
    // Refresh liked songs view if currently showing
    if (!likedSongsSection.classList.contains('hidden')) {
        displayLikedSongs();
    }
}

function toggleLikeCurrentSong() {
    if (!currentSong) {
        showSyncIndicator('No song is currently playing', 'error');
        return;
    }
    
    toggleLikeSong(currentSong);
}

function updateLikeButtons() {
    // Update player like button
    if (currentSong && isSongLiked(currentSong)) {
        likeCurrentSongBtn.classList.add('liked');
        likeCurrentSongBtn.querySelector('i').className = 'fas fa-heart';
    } else {
        likeCurrentSongBtn.classList.remove('liked');
        likeCurrentSongBtn.querySelector('i').className = 'far fa-heart';
    }
    
    // Update like buttons on song cards
    document.querySelectorAll('.song-card').forEach((card, index) => {
        const song = currentPlaylist[index];
        if (song) {
            const likeBtn = card.querySelector('.liked-indicator');
            if (likeBtn) {
                if (isSongLiked(song)) {
                    likeBtn.classList.add('active');
                    likeBtn.querySelector('i').className = 'fas fa-heart';
                } else {
                    likeBtn.classList.remove('active');
                    likeBtn.querySelector('i').className = 'far fa-heart';
                }
            }
        }
    });
}

function showLikedSongs() {
    welcomeSection.classList.add('hidden');
    searchResults.classList.add('hidden');
    likedSongsSection.classList.remove('hidden');
    displayLikedSongs();
}

function showHome() {
    welcomeSection.classList.remove('hidden');
    searchResults.classList.add('hidden');
    likedSongsSection.classList.add('hidden');
}

function displayLikedSongs() {
    likedContainer.innerHTML = '';
    
    if (likedSongs.length === 0) {
        likedContainer.innerHTML = '<p style="color: #B3B3B3; text-align: center; padding: 40px; grid-column: 1 / -1;">No liked songs yet. Like some songs to see them here!</p>';
        return;
    }
    
    currentPlaylist = likedSongs;
    
    likedSongs.forEach((song, index) => {
        const songCard = createSongCard(song, index);
        likedContainer.appendChild(songCard);
    });
    
    updateLikeButtons();
}

function updateGreeting() {
    const hour = new Date().getHours();
    const greetingElement = document.querySelector('.greeting h1');
    if (greetingElement) {
        if (hour < 12) {
            greetingElement.textContent = 'Good morning';
        } else if (hour < 18) {
            greetingElement.textContent = 'Good afternoon';
        } else {
            greetingElement.textContent = 'Good evening';
        }
    }
}

async function performSearch() {
    const query = searchInput.value.trim();
    
    if (!query) {
        return;
    }
    
    showLoading(true);
    
    try {
        const response = await fetch(`/search?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        
        if (response.ok) {
            console.log('Search response:', data);
            displaySearchResults(data);
        } else {
            showError(data.error || 'Search failed');
        }
    } catch (error) {
        console.error('Search error:', error);
        showError('Network error occurred. Check console for details.');
    } finally {
        showLoading(false);
    }
}

function displaySearchResults(data) {
    resultsContainer.innerHTML = '';
    
    console.log('Displaying results:', data);
    
    // Handle different response formats
    let results = [];
    if (data.results && Array.isArray(data.results)) {
        results = data.results;
    } else if (Array.isArray(data)) {
        results = data;
    } else if (data.data && Array.isArray(data.data)) {
        results = data.data;
    }
    
    if (results.length === 0) {
        resultsContainer.innerHTML = '<p style="color: #B3B3B3; text-align: center; padding: 40px;">No results found. Try a different search term.</p>';
        showSearchResults();
        return;
    }
    
    // Show note if it's mock data
    if (data.note) {
        const noteDiv = document.createElement('div');
        noteDiv.style.cssText = 'background: #2a2a2a; color: #1DB954; padding: 12px 16px; border-radius: 4px; margin-bottom: 20px; border-left: 3px solid #1DB954; grid-column: 1 / -1;';
        noteDiv.innerHTML = `<i class="fas fa-info-circle"></i> ${data.note}`;
        resultsContainer.appendChild(noteDiv);
    }
    
    currentPlaylist = results;
    
    results.forEach((song, index) => {
        const songCard = createSongCard(song, index);
        resultsContainer.appendChild(songCard);
    });
    
    showSearchResults();
    updateLikeButtons();
}

function createSongCard(song, index) {
    const card = document.createElement('div');
    card.className = 'song-card';
    
    console.log('Creating card for song:', song);
    
    // Handle JioSaavnAPI response format
    const imageUrl = song.image_url || song.image || 
                     (song.image && Array.isArray(song.image) ? song.image[song.image.length - 1] : song.image) ||
                     'https://via.placeholder.com/300x300/1DB954/FFFFFF?text=♪';
    
    const title = song.title || song.song || song.name || 'Unknown Title';
    const artist = song.singers || song.artist || song.primary_artists || 'Unknown Artist';
    const album = song.album || song.album_name || '';
    
    const isLiked = isSongLiked(song);
    
    card.innerHTML = `
        <img src="${imageUrl}" alt="${escapeHtml(title)}" class="song-image" onerror="this.src='https://via.placeholder.com/300x300/1DB954/FFFFFF?text=♪'">
        <button class="liked-indicator ${isLiked ? 'active' : ''}" onclick="event.stopPropagation(); toggleLikeSong(currentPlaylist[${index}])" aria-label="Like song">
            <i class="${isLiked ? 'fas' : 'far'} fa-heart"></i>
        </button>
        <div class="song-info">
            <div class="song-title">${escapeHtml(title)}</div>
            <div class="song-artist">${escapeHtml(artist)}</div>
            ${album ? `<div class="song-album">${escapeHtml(album)}</div>` : ''}
        </div>
        <button class="play-btn" onclick="playSong(${index})" aria-label="Play ${escapeHtml(title)}">
            <i class="fas fa-play"></i>
        </button>
    `;
    
    return card;
}

// Helper function to escape HTML
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, function(m) { return map[m]; });
}

async function playSong(index) {
    if (index < 0 || index >= currentPlaylist.length) return;
    
    const song = currentPlaylist[index];
    currentIndex = index;
    
    showLoading(true);
    
    try {
        console.log('Attempting to play song:', song);
        
        // Get the direct streaming URL
        let audioUrl = song.url || song.download_url || song.media_url;
        
        if (!audioUrl && song.more_info && song.more_info.download_url) {
            audioUrl = song.more_info.download_url;
        }
        
        if (!audioUrl) {
            const songId = song.id || song.songid || song.perma_url || song.token || 
                          (song.more_info && song.more_info.encrypted_media_url);
            
            if (songId) {
                try {
                    console.log('Fetching song details for ID:', songId);
                    const response = await fetch(`/song/${encodeURIComponent(songId)}`);
                    if (response.ok) {
                        const songData = await response.json();
                        console.log('Song details response:', songData);
                        
                        audioUrl = songData.url || songData.download_url || songData.media_url ||
                                  (songData.more_info && songData.more_info.download_url) ||
                                  (songData[0] && songData[0].url);
                    }
                } catch (e) {
                    console.log('Failed to get detailed song info:', e);
                }
            }
        }
        
        if (!audioUrl) {
            throw new Error('No audio URL found for this song. The song might not be available for streaming.');
        }
        
        console.log('Playing audio from:', audioUrl);
        
        // Update player UI
        updatePlayerUI(song);
        
        // Load and play audio
        audioPlayer.src = audioUrl;
        audioPlayer.load();
        
        const songWithUrl = { ...song, url: audioUrl };
        
        // If in a room and is host, emit song change
        if (inRoom && isHost && socket) {
            console.log('Host emitting song change:', songWithUrl);
            socket.emit('play_song', {
                room_id: currentRoom,
                song: songWithUrl
            });
        }
        
        try {
            await audioPlayer.play();
            isPlaying = true;
            updatePlayPauseButton();
        } catch (playError) {
            console.error('Audio play error:', playError);
            throw new Error('Failed to play audio. The file might be corrupted or not accessible.');
        }
        
    } catch (error) {
        console.error('Play error:', error);
        showError('Failed to play song: ' + error.message);
    } finally {
        showLoading(false);
    }
}

function updatePlayerUI(song) {
    let imageUrl = song.image_url || song.image || song.thumbnail;
    
    if (Array.isArray(imageUrl)) {
        imageUrl = imageUrl[imageUrl.length - 1];
    }
    
    if (!imageUrl) {
        imageUrl = 'https://via.placeholder.com/56x56/1DB954/FFFFFF?text=♪';
    }
    
    playerImage.src = imageUrl;
    playerTitle.textContent = song.title || song.song || 'Unknown Title';
    playerArtist.textContent = song.singers || song.artist || song.primary_artists || 'Unknown Artist';
    
    document.title = `${song.title || song.song || 'Unknown Title'} • Syncano`;
    
    // Update current song and like button
    currentSong = song;
    updateLikeButtons();
}

function togglePlayPause() {
    if (!audioPlayer.src) return;
    
    if (isPlaying) {
        audioPlayer.pause();
        isPlaying = false;
    } else {
        audioPlayer.play();
        isPlaying = true;
    }
    
    updatePlayPauseButton();
    
    // If in a room and is host, emit playback change
    if (inRoom && isHost && socket && !isSyncing) {
        console.log('Host emitting play_pause:', isPlaying);
        socket.emit('play_pause', {
            room_id: currentRoom,
            is_playing: isPlaying,
            current_time: audioPlayer.currentTime
        });
    }
}

function updatePlayPauseButton() {
    const icon = playPauseBtn.querySelector('i');
    if (isPlaying) {
        icon.className = 'fas fa-pause';
    } else {
        icon.className = 'fas fa-play';
    }
}

function playPrevious() {
    if (currentIndex > 0) {
        playSong(currentIndex - 1);
    }
}

function playNext() {
    if (currentIndex < currentPlaylist.length - 1) {
        playSong(currentIndex + 1);
    } else {
        // Loop back to first song
        playSong(0);
    }
}

function updateDuration() {
    const duration = audioPlayer.duration;
    if (!isNaN(duration)) {
        totalTime.textContent = formatTime(duration);
        progressSlider.max = duration;
    }
}

function updateProgress() {
    const current = audioPlayer.currentTime;
    const duration = audioPlayer.duration;
    
    if (!isNaN(current) && !isNaN(duration)) {
        currentTime.textContent = formatTime(current);
        progressSlider.value = current;
        
        const percentage = (current / duration) * 100;
        progressFill.style.width = percentage + '%';
    }
}

function seekToPosition() {
    const seekTime = progressSlider.value;
    audioPlayer.currentTime = seekTime;
    
    // If in a room and is host, emit seek change
    if (inRoom && isHost && socket) {
        socket.emit('seek', {
            room_id: currentRoom,
            current_time: seekTime
        });
    }
}

let previousVolume = 50;

function updateVolume() {
    const volume = volumeSlider.value / 100;
    audioPlayer.volume = volume;
    updateVolumeSliderBackground();
    updateVolumeIcon(volume);
}

function updateVolumeSliderBackground() {
    const percent = volumeSlider.value;
    volumeSlider.style.setProperty('--volume-percent', percent + '%');
}

function updateVolumeIcon(volume) {
    const icon = volumeBtn.querySelector('i');
    if (volume === 0) {
        icon.className = 'fas fa-volume-mute';
    } else if (volume < 0.5) {
        icon.className = 'fas fa-volume-down';
    } else {
        icon.className = 'fas fa-volume-up';
    }
}

function toggleMute() {
    if (audioPlayer.volume > 0) {
        previousVolume = volumeSlider.value;
        volumeSlider.value = 0;
    } else {
        volumeSlider.value = previousVolume || 50;
    }
    updateVolume();
}

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function showLoading(show) {
    if (show) {
        loadingSpinner.classList.remove('hidden');
    } else {
        loadingSpinner.classList.add('hidden');
    }
}

function showSearchResults() {
    searchResults.classList.remove('hidden');
    welcomeSection.classList.add('hidden');
    likedSongsSection.classList.add('hidden');
}

function showError(message) {
    // Create toast notification
    const toast = document.createElement('div');
    toast.className = 'sync-indicator error';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 4000);
}

// Handle audio player errors
audioPlayer.addEventListener('error', function(e) {
    console.error('Audio error:', e);
    showError('Failed to load audio. The song might not be available.');
    isPlaying = false;
    updatePlayPauseButton();
});

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    if (e.code === 'Space' && e.target.tagName !== 'INPUT') {
        e.preventDefault();
        togglePlayPause();
    } else if (e.code === 'ArrowLeft' && e.ctrlKey) {
        e.preventDefault();
        playPrevious();
    } else if (e.code === 'ArrowRight' && e.ctrlKey) {
        e.preventDefault();
        playNext();
    }
});

// Update play button state
audioPlayer.addEventListener('loadstart', function() {
    isPlaying = false;
    updatePlayPauseButton();
});

audioPlayer.addEventListener('play', function() {
    if (!isSyncing) {
        isPlaying = true;
        updatePlayPauseButton();
    }
});

audioPlayer.addEventListener('pause', function() {
    if (!isSyncing) {
        isPlaying = false;
        updatePlayPauseButton();
    }
});

// Socket.IO functionality
function initializeSocket() {
    socket = io();
    
    socket.on('room_created', function(data) {
        currentRoom = data.room_id;
        username = data.username;
        isHost = data.is_host;
        inRoom = true;
        
        hideModal();
        updateRoomUI();
        showSyncIndicator('🎧 Room created! Share ID: ' + currentRoom, 'success');
        
        // Copy room ID to clipboard
        navigator.clipboard.writeText(currentRoom).then(() => {
            showSyncIndicator('Room ID copied to clipboard!', 'success');
        });
    });
    
    socket.on('room_joined', function(data) {
        currentRoom = data.room_id;
        username = data.username;
        isHost = data.is_host;
        inRoom = true;
        
        hideModal();
        updateRoomUI();
        updateUsersList(data.users);
        
        // Sync with current room state
        if (data.current_song) {
            syncWithRoom(data.current_song, data.is_playing, data.current_time);
        }
        
        showSyncIndicator('Joined room successfully!', 'success');
    });
    
    socket.on('user_joined', function(data) {
        updateUsersList(data.users);
        showSyncIndicator(data.username + ' joined the room', 'success');
    });
    
    socket.on('user_left', function(data) {
        updateUsersList(data.users);
        showSyncIndicator(data.username + ' left the room', 'info');
    });
    
    socket.on('song_changed', function(data) {
        console.log('📡 Received song_changed event:', data);
        // All users should sync (including host for multi-tab scenarios)
        syncWithRoom(data.song, data.is_playing, data.current_time);
        if (!isHost) {
            showSyncIndicator('Song changed by host', 'syncing');
        }
    });
    
    socket.on('playback_changed', function(data) {
        console.log('📡 Received playback_changed:', data);
        syncPlayback(data.is_playing, data.current_time);
        if (!isHost) {
            showSyncIndicator(data.is_playing ? 'Playing' : 'Paused', 'syncing');
        }
    });
    
    socket.on('seek_changed', function(data) {
        console.log('📡 Received seek_changed:', data);
        syncSeek(data.current_time);
        showSyncIndicator('Playback synced', 'syncing');
    });
    
    socket.on('new_host', function(data) {
        showSyncIndicator(data.new_host + ' is now the host', 'info');
    });
    
    socket.on('error', function(data) {
        alert('Error: ' + data.message);
        showSyncIndicator('Error: ' + data.message, 'error');
    });
}

// Room modal functions
function showCreateRoomModal() {
    modalTitle.textContent = 'Create Room';
    roomIdGroup.classList.add('hidden');
    modalActionBtn.textContent = 'Create Room';
    modalActionBtn.onclick = createRoom;
    usernameInput.value = '';
    roomModal.classList.remove('hidden');
    usernameInput.focus();
}

function showJoinRoomModal() {
    modalTitle.textContent = 'Join Room';
    roomIdGroup.classList.remove('hidden');
    modalActionBtn.textContent = 'Join Room';
    modalActionBtn.onclick = joinRoom;
    usernameInput.value = '';
    roomIdInput.value = '';
    roomModal.classList.remove('hidden');
    usernameInput.focus();
}

function hideModal() {
    roomModal.classList.add('hidden');
}

function handleModalAction() {
    if (modalActionBtn.textContent === 'Create Room') {
        createRoom();
    } else {
        joinRoom();
    }
}

function createRoom() {
    const name = usernameInput.value.trim();
    if (!name) {
        alert('Please enter your name');
        return;
    }
    
    socket.emit('create_room', { username: name });
}

function joinRoom() {
    const name = usernameInput.value.trim();
    const roomId = roomIdInput.value.trim();
    
    if (!name) {
        alert('Please enter your name');
        return;
    }
    
    if (!roomId) {
        alert('Please enter room ID');
        return;
    }
    
    socket.emit('join_room', { username: name, room_id: roomId });
}

function updateRoomUI() {
    if (inRoom) {
        roomInfo.classList.remove('hidden');
        roomStatus.innerHTML = `
            <div class="room-status">
                <i class="fas fa-users"></i>
                Room: <span class="room-id">${currentRoom}</span>
                ${isHost ? '<span style="color: #ffd700;">(Host)</span>' : ''}
            </div>
        `;
    } else {
        roomInfo.classList.add('hidden');
    }
}

function updateUsersList(users) {
    roomUsers.innerHTML = '';
    users.forEach(user => {
        const badge = document.createElement('span');
        badge.className = `user-badge ${user.is_host ? 'host' : ''}`;
        badge.textContent = user.username + (user.is_host ? ' 👑' : '');
        roomUsers.appendChild(badge);
    });
}

function syncWithRoom(song, playing, currentTime) {
    console.log('🔄 Syncing with room - song:', song?.title || song?.song, 'playing:', playing, 'currentTime:', currentTime);
    
    // Update current song
    currentSong = song;
    updatePlayerUI(song);
    
    // Load and sync audio
    if (song.url) {
        console.log('📻 Loading audio URL for sync:', song.url);
        
        // Set syncing flag
        isSyncing = true;
        
        // Check if we need to load new audio source
        const needsNewSource = audioPlayer.src !== song.url;
        
        if (needsNewSource) {
            audioPlayer.src = song.url;
            audioPlayer.load();
            
            audioPlayer.addEventListener('canplay', function syncOnLoad() {
                console.log('✅ Audio loaded and ready');
                audioPlayer.currentTime = currentTime || 0;
                
                if (playing) {
                    audioPlayer.play().then(() => {
                        console.log('▶️ Started playing');
                        isPlaying = true;
                        updatePlayPauseButton();
                    }).catch(error => {
                        console.error('❌ Failed to play:', error);
                    });
                } else {
                    isPlaying = false;
                    updatePlayPauseButton();
                }
                
                // Remove this listener and clear sync flag
                audioPlayer.removeEventListener('canplay', syncOnLoad);
                setTimeout(() => { isSyncing = false; }, 500);
            }, { once: true });
        } else {
            // Same source, just sync playback state
            audioPlayer.currentTime = currentTime || 0;
            
            if (playing && !isPlaying) {
                audioPlayer.play().then(() => {
                    isPlaying = true;
                    updatePlayPauseButton();
                }).catch(err => console.log('Play error:', err));
            } else if (!playing && isPlaying) {
                audioPlayer.pause();
                isPlaying = false;
                updatePlayPauseButton();
            }
            
            setTimeout(() => { isSyncing = false; }, 500);
        }
    } else {
        console.warn('⚠️ No audio URL found in song data');
        isSyncing = false;
    }
}

function syncPlayback(playing, currentTime) {
    console.log('🎵 Sync playback - playing:', playing, 'time:', currentTime);
    
    if (!audioPlayer.src) {
        console.warn('⚠️ No audio source loaded');
        return;
    }
    
    isSyncing = true;
    
    // Sync time
    if (Math.abs(audioPlayer.currentTime - currentTime) > 1) {
        audioPlayer.currentTime = currentTime || 0;
    }
    
    // Sync play/pause state
    if (playing && !isPlaying) {
        audioPlayer.play().then(() => {
            console.log('▶️ Synced to playing');
            isPlaying = true;
            updatePlayPauseButton();
        }).catch(err => console.log('Play failed:', err));
    } else if (!playing && isPlaying) {
        audioPlayer.pause();
        console.log('⏸️ Synced to paused');
        isPlaying = false;
        updatePlayPauseButton();
    }
    
    setTimeout(() => {
        isSyncing = false;
    }, 500);
}

function syncSeek(currentTime) {
    if (audioPlayer.src) {
        audioPlayer.currentTime = currentTime || 0;
    }
}

function showSyncIndicator(message, type = 'success') {
    let indicator = document.getElementById('syncIndicator');
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'syncIndicator';
        indicator.className = 'sync-indicator';
        document.body.appendChild(indicator);
    }
    
    indicator.textContent = message;
    indicator.className = `sync-indicator ${type}`;
    
    // Auto hide after 3 seconds
    setTimeout(() => {
        if (indicator.parentNode) {
            indicator.remove();
        }
    }, 3000);
}

// Test API connection function
async function testApiConnection() {
    showLoading(true);
    
    try {
        const response = await fetch('/test-api');
        const data = await response.json();
        
        console.log('API Test Results:', data);
        
        let message = 'API Test Results:\n\n';
        if (data.api_test) {
            const test = data.api_test;
            message += `${test.api_server}: ${test.working ? '✅ Working' : '❌ Failed'}\n`;
            if (test.sample_results) {
                message += `Sample results: ${test.sample_results}\n`;
            }
            if (test.error) {
                message += `Error: ${test.error}\n`;
            }
        }
        
        alert(message);
        
    } catch (error) {
        console.error('API test error:', error);
        alert('Failed to test API connection: ' + error.message);
    } finally {
        showLoading(false);
    }
}
