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
     * Initialize Socket.IO connection to Render backend
     */
    initializeSocket() {
        // Get backend URL from environment or use default
        const backendUrl = window.BACKEND_URL || 'http://localhost:10000';
        
        console.log('🔌 Connecting to Socket.IO backend:', backendUrl);
        
        // Configure Socket.IO for Render Web Service with persistent connections
        AppState.socket = io(backendUrl, {
            transports: ['websocket', 'polling'],  // Try websocket first
            upgrade: true,
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: 10,  // Limit reconnection attempts
            timeout: 20000,
            forceNew: false,
            withCredentials: true,  // Important for CORS
            autoConnect: true,
            // Heartbeat settings to match backend
            pingTimeout: 60000,  // 60 seconds to match backend
            pingInterval: 25000   // 25 seconds to match backend
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
            console.log('Transport:', socket.io.engine.transport.name);
            
            // Only show notification on FIRST connect or after failed reconnection
            if (!AppState.socketConnected) {
                showSyncIndicator('Connected to server', 'success');
                AppState.socketConnected = true;
            }
            
            // If we were in a room before disconnect, rejoin
            if (AppState.currentRoom && AppState.username) {
                console.log('🔄 Auto-rejoining room after connect:', AppState.currentRoom);
                socket.emit('join_room', { 
                    room_id: AppState.currentRoom, 
                    username: AppState.username 
                });
            }
        });
        
        socket.on('connect_error', (error) => {
            console.error('❌ Socket.IO connection error:', error.message);
            console.error('Error details:', error);
            // Only show error notification after multiple failed attempts
            if (!AppState.connectionErrorShown) {
                showSyncIndicator('Connection error. Retrying...', 'error');
                AppState.connectionErrorShown = true;
                setTimeout(() => { AppState.connectionErrorShown = false; }, 10000);
            }
        });
        
        socket.on('disconnect', (reason) => {
            console.log('🔌 Socket.IO disconnected:', reason);
            
            // Only show notification for permanent disconnects - not automatic reconnections
            if (reason === 'io server disconnect') {
                console.log('Server disconnected us, reconnecting...');
                AppState.socketConnected = false;
                socket.connect();
            } else if (reason === 'transport close' || reason === 'transport error') {
                // Normal reconnection - don't show notification
                console.log('Transport issue, Socket.IO will auto-reconnect');
                AppState.socketConnected = false;
            }
            // Don't show any notifications for disconnect - only show if reconnection fails
        });
        
        socket.on('reconnect', (attemptNumber) => {
            console.log('🔄 Socket.IO reconnected after', attemptNumber, 'attempts');
            console.log('Transport:', socket.io.engine.transport.name);
            // Don't show notification for automatic reconnects - too noisy
            AppState.socketConnected = true;
        });
        
        socket.on('reconnect_attempt', (attemptNumber) => {
            console.log(`🔄 Reconnection attempt ${attemptNumber}...`);
        });
        
        socket.on('reconnect_error', (error) => {
            console.error('❌ Reconnection error:', error.message);
        });
        
        socket.on('reconnect_failed', () => {
            console.error('❌ Reconnection failed after all attempts');
            showSyncIndicator('Connection lost. Please refresh.', 'error');
            AppState.socketConnected = false;
        });
        
        socket.on('room_created', (data) => {
            AppState.currentRoom = data.room_id;
            AppState.username = data.username;
            AppState.isHost = data.is_host;
            AppState.inRoom = true;
            
            this.hideModal();
            this.updateRoomUI();
            showSyncIndicator('🎵 Blend created! Share ID: ' + AppState.currentRoom, 'success');
            
            // Copy blend ID to clipboard
            navigator.clipboard.writeText(AppState.currentRoom).then(() => {
                showSyncIndicator('Blend ID copied to clipboard!', 'success');
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
            
            showSyncIndicator('🎵 Joined blend successfully!', 'success');
        });
        
        socket.on('user_joined', (data) => {
            this.updateUsersList(data.users);
            showSyncIndicator(data.username + ' joined the blend', 'success');
        });
        
        socket.on('user_left', (data) => {
            this.updateUsersList(data.users);
            showSyncIndicator(data.username + ' left the blend', 'info');
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
                showSyncIndicator('👑 You are now the blend host!', 'success');
                this.updateRoomUI();
            }
        });
        
        socket.on('room_closed', (data) => {
            console.log('📡 Room closed by host:', data);
            showSyncIndicator('Blend closed - host disconnected', 'error');
            AppState.resetRoomState();
            this.updateRoomUI();
        });
        
        socket.on('error', (data) => {
            console.error('Socket error:', data);
            showSyncIndicator(data.message || 'An error occurred', 'error');
        });
    },
    
    /**
     * Show create blend modal
     */
    showCreateRoomModal() {
        console.log('🎵 Opening create blend modal');
        DOM.modalTitle.textContent = 'Create Blend';
        DOM.roomIdGroup.classList.add('hidden');
        DOM.usernameInput.value = '';
        DOM.roomIdInput.value = '';
        DOM.modalActionBtn.textContent = 'Create Blend';
        DOM.modalActionBtn.dataset.action = 'create';
        DOM.roomModal.classList.remove('hidden');
        console.log('✅ Modal should be visible now');
    },
    
    /**
     * Show join blend modal
     */
    showJoinRoomModal() {
        DOM.modalTitle.textContent = 'Join Blend';
        DOM.roomIdGroup.classList.remove('hidden');
        DOM.usernameInput.value = '';
        DOM.roomIdInput.value = '';
        DOM.modalActionBtn.textContent = 'Join Blend';
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
        if (!AppState.inRoom || !AppState.currentRoom) {
            showSyncIndicator('You are not in a room', 'error');
            return;
        }
        
        console.log('🔄 Requesting room sync (Vibe Check) for room:', AppState.currentRoom);
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
