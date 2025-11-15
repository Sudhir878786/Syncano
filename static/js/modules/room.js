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
     * Handles cold starts by waking up the server first
     */
    async initializeSocket() {
        // Get backend URL from environment or use default
        const backendUrl = window.BACKEND_URL || 'http://localhost:10000';
        
        console.log('🔌 Waking up server (cold start handling)...');
        
        // Wake up Render server with health check (handles cold starts)
        try {
            const wakeUpResponse = await fetch(`${backendUrl}/health`, {
                method: 'GET',
                signal: AbortSignal.timeout(90000)  // 90 second timeout for cold starts
            });
            console.log('✅ Server is awake:', wakeUpResponse.status);
        } catch (error) {
            console.warn('⚠️ Wake-up request failed, continuing anyway:', error.message);
        }
        
        console.log('🔌 Connecting to Socket.IO backend:', backendUrl);
        
        // Configure Socket.IO for production serverless (Vercel + Render)
        AppState.socket = io(backendUrl, {
            transports: ['polling', 'websocket'],  // Start with polling for cold starts
            upgrade: true,
            reconnection: true,
            reconnectionDelay: 3000,
            reconnectionDelayMax: 15000,
            reconnectionAttempts: Infinity,  // Never stop trying
            timeout: 90000,  // 90 seconds for cold starts
            forceNew: false,
            withCredentials: true,
            autoConnect: true,
            // Heartbeat settings - aggressive for serverless
            pingTimeout: 180000,  // 3 minutes
            pingInterval: 45000   // 45 seconds
        });
        
        this.setupSocketHandlers();
    },
    
    /**
     * Setup Socket.IO event handlers
     */
    setupSocketHandlers() {
        const socket = AppState.socket;
        
        socket.on('connect', () => {
            console.log('Socket.IO connected:', socket.id);
            AppState.socketConnected = true;
            AppState.connectionErrorShown = false;
            
            // Auto-rejoin room after reconnect
            if (AppState.currentRoom && AppState.username) {
                setTimeout(() => {
                    socket.emit('join_room', { 
                        room_id: AppState.currentRoom, 
                        username: AppState.username 
                    });
                }, 500); // Increased delay for server stability
            }
        });
        
        socket.on('connect_error', (error) => {
            console.error('Connection error:', error.message);
            // Show error ONLY after 30 seconds of continuous failure
            if (!AppState.connectionErrorShown) {
                AppState.connectionErrorShown = true;
                setTimeout(() => {
                    if (!AppState.socketConnected) {
                        showSyncIndicator('Connection issue detected', 'error');
                    }
                }, 30000);
            }
        });
        
        socket.on('disconnect', (reason) => {
            console.log('Disconnected:', reason);
            AppState.socketConnected = false;
            // COMPLETELY SILENT - no notifications at all
            // Socket.IO auto-reconnects, room persists for 5 minutes
        });
        
        socket.on('reconnect', (attemptNumber) => {
            console.log('Reconnected after', attemptNumber, 'attempts');
            AppState.socketConnected = true;
            AppState.connectionErrorShown = false;
            
            // Rejoin room silently
            if (AppState.currentRoom && AppState.username) {
                setTimeout(() => {
                    socket.emit('join_room', { 
                        room_id: AppState.currentRoom, 
                        username: AppState.username 
                    });
                }, 500);
            }
        });
        
        // No logging for reconnect_attempt and reconnect_error
        socket.on('reconnect_failed', () => {
            console.error('All reconnection attempts failed');
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
            // Silent - no notification spam
        });
        
        socket.on('user_left', (data) => {
            this.updateUsersList(data.users);
            // Silent - no notification spam
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
            // Show loading and retry connection
            showSyncIndicator('Waking up server (may take 30-60s on first use)...', 'syncing');
            console.warn('Socket not connected, attempting to connect...');
            
            // Try to connect if not already trying
            if (!AppState.socket) {
                await this.initializeSocket();
            } else if (!AppState.socket.connected) {
                AppState.socket.connect();
            }
            
            // Wait up to 90 seconds for connection
            const connected = await this.waitForConnection(90000);
            if (!connected) {
                alert('Server is taking longer than expected to start. Please try again in 30 seconds.');
                showSyncIndicator('Connection timeout', 'error');
                return;
            }
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
            // Show loading and retry connection
            showSyncIndicator('Waking up server (may take 30-60s on first use)...', 'syncing');
            console.warn('Socket not connected, attempting to connect...');
            
            // Try to connect if not already trying
            if (!AppState.socket) {
                await this.initializeSocket();
            } else if (!AppState.socket.connected) {
                AppState.socket.connect();
            }
            
            // Wait up to 90 seconds for connection
            const connected = await this.waitForConnection(90000);
            if (!connected) {
                alert('Server is taking longer than expected to start. Please try again in 30 seconds.');
                showSyncIndicator('Connection timeout', 'error');
                return;
            }
        }
        
        console.log('📤 Joining room:', roomId, 'as user:', name);
        showSyncIndicator('Joining room...', 'syncing');
        AppState.socket.emit('join_room', { room_id: roomId, username: name });
    },
    
    /**
     * Wait for Socket.IO connection with timeout
     */
    waitForConnection(timeoutMs = 90000) {
        return new Promise((resolve) => {
            if (AppState.socket?.connected) {
                resolve(true);
                return;
            }
            
            const startTime = Date.now();
            const checkInterval = setInterval(() => {
                if (AppState.socket?.connected) {
                    clearInterval(checkInterval);
                    resolve(true);
                } else if (Date.now() - startTime > timeoutMs) {
                    clearInterval(checkInterval);
                    resolve(false);
                }
            }, 500);
        });
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
