/**
 * Room Module
 * Handles multiplayer room functionality with Socket.IO
 */

import { AppState } from './state.js';
import { DOM } from './dom.js';
import { Player } from './player.js';
import { LyricsManager } from './lyrics.js';
import { showSyncIndicator } from './utils.js';

export const RoomManager = {
    /**
     * Initialize Socket.IO
     */
    initializeSocket() {
        // Configure Socket.IO for Vercel serverless environment
        AppState.socket = io({
            transports: ['polling', 'websocket'],
            upgrade: true,
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 5,
            timeout: 20000,
            forceNew: true
        });
        
        this.setupSocketHandlers();
    },
    
    /**
     * Setup Socket.IO event handlers
     */
    setupSocketHandlers() {
        const socket = AppState.socket;
        
        socket.on('connect', () => {
            console.log('✅ Socket.IO connected:', socket.id);
            showSyncIndicator('Connected to server', 'success');
        });
        
        socket.on('connect_error', (error) => {
            console.error('❌ Socket.IO connection error:', error);
            showSyncIndicator('Connection error. Retrying...', 'error');
        });
        
        socket.on('disconnect', (reason) => {
            console.log('🔌 Socket.IO disconnected:', reason);
            showSyncIndicator('Disconnected from server', 'error');
        });
        
        socket.on('reconnect', (attemptNumber) => {
            console.log('🔄 Socket.IO reconnected after', attemptNumber, 'attempts');
            showSyncIndicator('Reconnected to server', 'success');
        });
        
        socket.on('room_created', (data) => {
            AppState.currentRoom = data.room_id;
            AppState.username = data.username;
            AppState.isHost = data.is_host;
            AppState.inRoom = true;
            
            this.hideModal();
            this.updateRoomUI();
            showSyncIndicator('🎧 Room created! Share ID: ' + AppState.currentRoom, 'success');
            
            // Copy room ID to clipboard
            navigator.clipboard.writeText(AppState.currentRoom).then(() => {
                showSyncIndicator('Room ID copied to clipboard!', 'success');
            });
        });
        
        socket.on('room_joined', (data) => {
            AppState.currentRoom = data.room_id;
            AppState.username = data.username;
            AppState.isHost = data.is_host;
            AppState.inRoom = true;
            
            this.hideModal();
            this.updateRoomUI();
            this.updateUsersList(data.users);
            
            // Sync with current room state
            if (data.current_song) {
                this.syncWithRoom(data.current_song, data.is_playing, data.current_time);
            }
            
            showSyncIndicator('Joined room successfully!', 'success');
        });
        
        socket.on('user_joined', (data) => {
            this.updateUsersList(data.users);
            showSyncIndicator(data.username + ' joined the room', 'success');
        });
        
        socket.on('user_left', (data) => {
            this.updateUsersList(data.users);
            showSyncIndicator(data.username + ' left the room', 'info');
        });
        
        socket.on('song_changed', (data) => {
            console.log('📡 Received song_changed event:', data);
            this.syncWithRoom(data.song, data.is_playing, data.current_time);
            if (!AppState.isHost) {
                showSyncIndicator('Song changed by host', 'syncing');
            }
        });
        
        socket.on('playback_changed', (data) => {
            console.log('📡 Received playback_changed:', data);
            this.syncPlayback(data.is_playing, data.current_time);
            if (!AppState.isHost) {
                showSyncIndicator(data.is_playing ? 'Playing' : 'Paused', 'syncing');
            }
        });
        
        socket.on('seek_changed', (data) => {
            console.log('📡 Received seek_changed:', data);
            this.syncSeek(data.current_time);
        });
        
        socket.on('sync_state', (data) => {
            console.log('📡 Received sync_state (Vibe Check response):', data);
            if (data.current_song) {
                this.syncWithRoom(data.current_song, data.is_playing, data.current_time);
                showSyncIndicator('🎧 Vibes are in sync!', 'success');
            } else {
                showSyncIndicator('No song playing in room yet', 'info');
            }
        });
        
        socket.on('room_left', (data) => {
            console.log('📡 Received room_left confirmation:', data);
            AppState.resetRoomState();
            this.updateRoomUI();
        });
        
        socket.on('new_host', (data) => {
            console.log('📡 New host assigned:', data);
            if (data.new_host === socket.id) {
                AppState.isHost = true;
                showSyncIndicator('You are now the host!', 'success');
                this.updateRoomUI();
            }
        });
        
        socket.on('error', (data) => {
            console.error('Socket error:', data);
            showSyncIndicator(data.message || 'An error occurred', 'error');
        });
    },
    
    /**
     * Show create room modal
     */
    showCreateRoomModal() {
        console.log('🎪 Opening create room modal');
        DOM.modalTitle.textContent = 'Create Room';
        DOM.roomIdGroup.classList.add('hidden');
        DOM.usernameInput.value = '';
        DOM.roomIdInput.value = '';
        DOM.modalActionBtn.textContent = 'Create Room';
        DOM.modalActionBtn.dataset.action = 'create';
        DOM.roomModal.classList.remove('hidden');
        console.log('✅ Modal should be visible now');
    },
    
    /**
     * Show join room modal
     */
    showJoinRoomModal() {
        DOM.modalTitle.textContent = 'Join Room';
        DOM.roomIdGroup.classList.remove('hidden');
        DOM.usernameInput.value = '';
        DOM.roomIdInput.value = '';
        DOM.modalActionBtn.textContent = 'Join Room';
        DOM.modalActionBtn.dataset.action = 'join';
        DOM.roomModal.classList.remove('hidden');
    },
    
    /**
     * Hide room modal
     */
    hideModal() {
        DOM.roomModal?.classList.add('hidden');
    },
    
    /**
     * Handle modal action button click
     */
    handleModalAction() {
        const action = DOM.modalActionBtn.dataset.action;
        if (action === 'create') {
            this.createRoom();
        } else if (action === 'join') {
            this.joinRoom();
        }
    },
    
    /**
     * Create a new room
     */
    createRoom() {
        const name = DOM.usernameInput.value.trim();
        if (!name) {
            alert('Please enter your name');
            return;
        }
        
        if (!AppState.socket || !AppState.socket.connected) {
            alert('Not connected to server. Please refresh and try again.');
            console.error('Socket not connected:', AppState.socket);
            return;
        }
        
        console.log('📤 Creating room for user:', name);
        showSyncIndicator('Creating room...', 'syncing');
        AppState.socket.emit('create_room', { username: name });
    },
    
    /**
     * Join an existing room
     */
    joinRoom() {
        const name = DOM.usernameInput.value.trim();
        const roomId = DOM.roomIdInput.value.trim();
        
        if (!name) {
            alert('Please enter your name');
            return;
        }
        
        if (!roomId) {
            alert('Please enter Room ID');
            return;
        }
        
        if (!AppState.socket || !AppState.socket.connected) {
            alert('Not connected to server. Please refresh and try again.');
            console.error('Socket not connected:', AppState.socket);
            return;
        }
        
        console.log('📤 Joining room:', roomId, 'as user:', name);
        showSyncIndicator('Joining room...', 'syncing');
        AppState.socket.emit('join_room', { room_id: roomId, username: name });
    },
    
    /**
     * Leave current room
     */
    leaveRoom() {
        if (AppState.socket && AppState.currentRoom) {
            AppState.socket.emit('leave_room_request', { room_id: AppState.currentRoom });
        }
        
        AppState.resetRoomState();
        this.updateRoomUI();
        showSyncIndicator('Left the room', 'info');
    },
    
    /**
     * Request sync with room
     */
    requestRoomSync() {
        if (!AppState.inRoom) {
            showSyncIndicator('You are not in a room', 'error');
            return;
        }
        
        console.log('🔄 Requesting room sync (Vibe Check)');
        AppState.socket.emit('request_sync', { room_id: AppState.currentRoom });
        showSyncIndicator('Checking the vibe...', 'info');
    },
    
    /**
     * Update room UI
     */
    updateRoomUI() {
        const syncWithRoomBtn = document.getElementById('syncWithRoomBtn');
        const leaveRoomBtn = document.getElementById('leaveRoomBtn');
        
        if (AppState.inRoom) {
            DOM.roomInfo?.classList.remove('hidden');
            if (DOM.roomStatus) {
                DOM.roomStatus.innerHTML = `
                    <div class="room-status">
                        <i class="fas fa-users"></i>
                        Room: <span class="room-id">${AppState.currentRoom}</span>
                        ${AppState.isHost ? '<span style="color: #ffd700;">(Host)</span>' : ''}
                    </div>
                `;
            }
            
            syncWithRoomBtn?.classList.remove('hidden');
            leaveRoomBtn?.classList.remove('hidden');
        } else {
            DOM.roomInfo?.classList.add('hidden');
            syncWithRoomBtn?.classList.add('hidden');
            leaveRoomBtn?.classList.add('hidden');
        }
    },
    
    /**
     * Update users list
     * @param {Array} users - Array of user objects
     */
    updateUsersList(users) {
        if (!DOM.roomUsers) return;
        
        DOM.roomUsers.innerHTML = '';
        users.forEach(user => {
            const badge = document.createElement('span');
            badge.className = user.is_host 
                ? 'inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-yellow-500 to-orange-500 text-black'
                : 'inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-spotify-green text-black';
            badge.textContent = user.username + (user.is_host ? ' 👑' : '');
            DOM.roomUsers.appendChild(badge);
        });
    },
    
    /**
     * Sync with room state
     * @param {Object} song - Song object
     * @param {boolean} playing - Is playing
     * @param {number} currentTime - Current playback time
     */
    syncWithRoom(song, playing, currentTime) {
        console.log('🔄 Syncing with room - song:', song?.title || song?.song, 'playing:', playing, 'currentTime:', currentTime);
        
        AppState.currentSong = song;
        Player.updatePlayerUI(song);
        
        if (song.id) {
            LyricsManager.fetchLyrics(song.id);
        }
        
        if (song.url) {
            console.log('📻 Loading audio URL for sync:', song.url);
            
            AppState.isSyncing = true;
            
            const needsNewSource = DOM.audioPlayer.src !== song.url;
            
            if (needsNewSource) {
                DOM.audioPlayer.src = song.url;
                DOM.audioPlayer.load();
                
                DOM.audioPlayer.addEventListener('canplay', function syncOnLoad() {
                    console.log('✅ Audio loaded and ready');
                    DOM.audioPlayer.currentTime = currentTime || 0;
                    
                    if (playing) {
                        DOM.audioPlayer.play().then(() => {
                            console.log('▶️ Started playing');
                            AppState.isPlaying = true;
                            Player.updatePlayPauseButton();
                        }).catch(error => {
                            console.error('❌ Failed to play:', error);
                        });
                    } else {
                        AppState.isPlaying = false;
                        Player.updatePlayPauseButton();
                    }
                    
                    DOM.audioPlayer.removeEventListener('canplay', syncOnLoad);
                    setTimeout(() => { AppState.isSyncing = false; }, 500);
                }, { once: true });
            } else {
                DOM.audioPlayer.currentTime = currentTime || 0;
                
                if (playing && !AppState.isPlaying) {
                    DOM.audioPlayer.play().then(() => {
                        AppState.isPlaying = true;
                        Player.updatePlayPauseButton();
                    }).catch(err => console.log('Play error:', err));
                } else if (!playing && AppState.isPlaying) {
                    DOM.audioPlayer.pause();
                    AppState.isPlaying = false;
                    Player.updatePlayPauseButton();
                }
                
                setTimeout(() => { AppState.isSyncing = false; }, 500);
            }
        } else {
            console.warn('⚠️ No audio URL found in song data');
            AppState.isSyncing = false;
        }
    },
    
    /**
     * Sync playback state
     * @param {boolean} playing - Is playing
     * @param {number} currentTime - Current playback time
     */
    syncPlayback(playing, currentTime) {
        console.log('🎵 Sync playback - playing:', playing, 'time:', currentTime);
        
        if (!DOM.audioPlayer.src) {
            console.warn('⚠️ No audio source loaded');
            return;
        }
        
        AppState.isSyncing = true;
        
        if (Math.abs(DOM.audioPlayer.currentTime - currentTime) > 1) {
            DOM.audioPlayer.currentTime = currentTime || 0;
        }
        
        if (playing && !AppState.isPlaying) {
            DOM.audioPlayer.play().then(() => {
                console.log('▶️ Synced to playing');
                AppState.isPlaying = true;
                Player.updatePlayPauseButton();
            }).catch(err => console.log('Play failed:', err));
        } else if (!playing && AppState.isPlaying) {
            DOM.audioPlayer.pause();
            console.log('⏸️ Synced to paused');
            AppState.isPlaying = false;
            Player.updatePlayPauseButton();
        }
        
        setTimeout(() => {
            AppState.isSyncing = false;
        }, 500);
    },
    
    /**
     * Sync seek position
     * @param {number} currentTime - Current playback time
     */
    syncSeek(currentTime) {
        if (DOM.audioPlayer.src) {
            DOM.audioPlayer.currentTime = currentTime || 0;
        }
    }
};
