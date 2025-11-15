/**
 * WebRTC Room Manager
 * Handles signaling, room management, and peer coordination
 * Replaces Socket.IO functionality with WebRTC P2P
 */

import { WebRTCPeerManager } from './webrtc-peer.js';
import { AppState } from './state.js';
import { DOM } from './dom.js';
import { Player } from './player.js';
import { LyricsManager } from './lyrics.js';
import { showSyncIndicator } from './utils.js';

export const RoomManager = {
    peerManager: null,
    signalingSocket: null,
    clientId: null,
    reconnectAttempts: 0,
    maxReconnectAttempts: 10,
    reconnectDelay: 3000,
    
    /**
     * Initialize WebRTC and connect to signaling server
     */
    async initializeSocket() {
        // Get signaling server URL from environment or use default
        const signalingUrl = window.SIGNALING_URL || 'ws://localhost:3001';
        
        console.log('🔌 Connecting to signaling server:', signalingUrl);
        
        // Initialize peer manager
        this.peerManager = new WebRTCPeerManager();
        
        // Connect to signaling server
        this.connectToSignalingServer(signalingUrl);
    },
    
    /**
     * Connect to WebSocket signaling server
     */
    connectToSignalingServer(url) {
        try {
            this.signalingSocket = new WebSocket(url);
            
            this.signalingSocket.onopen = () => {
                console.log('✅ Connected to signaling server');
                AppState.socketConnected = true;
                this.reconnectAttempts = 0;
            };
            
            this.signalingSocket.onmessage = async (event) => {
                try {
                    const message = JSON.parse(event.data);
                    await this.handleSignalingMessage(message);
                } catch (error) {
                    console.error('❌ Error handling signaling message:', error);
                }
            };
            
            this.signalingSocket.onclose = () => {
                console.log('🔌 Disconnected from signaling server');
                AppState.socketConnected = false;
                this.attemptReconnect(url);
            };
            
            this.signalingSocket.onerror = (error) => {
                console.error('❌ Signaling server error:', error);
            };
            
        } catch (error) {
            console.error('❌ Failed to connect to signaling server:', error);
            this.attemptReconnect(url);
        }
    },
    
    /**
     * Attempt to reconnect to signaling server
     */
    attemptReconnect(url) {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = this.reconnectDelay * this.reconnectAttempts;
            
            console.log(`🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            
            setTimeout(() => {
                this.connectToSignalingServer(url);
            }, delay);
        } else {
            console.error('❌ Max reconnection attempts reached');
            showSyncIndicator('Connection lost. Please refresh.', 'error');
        }
    },
    
    /**
     * Send message to signaling server
     */
    sendSignalingMessage(message) {
        if (this.signalingSocket && this.signalingSocket.readyState === WebSocket.OPEN) {
            this.signalingSocket.send(JSON.stringify(message));
        } else {
            console.error('❌ Signaling socket not connected');
        }
    },
    
    /**
     * Handle incoming signaling messages
     */
    async handleSignalingMessage(message) {
        console.log('📨 Received signaling message:', message.type);
        
        switch (message.type) {
            case 'connected':
                this.clientId = message.clientId;
                console.log('✅ Assigned client ID:', this.clientId);
                break;
                
            case 'room-created':
                await this.handleRoomCreated(message);
                break;
                
            case 'room-joined':
                await this.handleRoomJoined(message);
                break;
                
            case 'peer-joined':
                await this.handlePeerJoined(message);
                break;
                
            case 'peer-left':
                this.handlePeerLeft(message);
                break;
                
            case 'offer':
                await this.handleOffer(message);
                break;
                
            case 'answer':
                await this.handleAnswer(message);
                break;
                
            case 'ice-candidate':
                await this.handleIceCandidate(message);
                break;
                
            case 'room-state-changed':
                this.handleRoomStateChanged(message);
                break;
                
            case 'room-closed':
                this.handleRoomClosed(message);
                break;
                
            case 'error':
                console.error('❌ Signaling error:', message.message);
                showSyncIndicator(message.message, 'error');
                break;
        }
    },
    
    /**
     * Create a new room as host
     */
    async createRoom() {
        const name = DOM.usernameInput.value.trim();
        if (!name) {
            alert('Please enter your name');
            return;
        }
        
        if (!this.signalingSocket || this.signalingSocket.readyState !== WebSocket.OPEN) {
            alert('Not connected to signaling server');
            return;
        }
        
        console.log('📤 Creating room as host:', name);
        showSyncIndicator('Creating room...', 'syncing');
        
        // Initialize as host (will capture audio from player)
        try {
            await this.peerManager.initializeAsHost(DOM.audioPlayer);
            
            // Send create room request
            this.sendSignalingMessage({
                type: 'create-room',
                username: name
            });
        } catch (error) {
            console.error('❌ Failed to initialize as host:', error);
            showSyncIndicator('Failed to initialize audio', 'error');
        }
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
        
        if (!this.signalingSocket || this.signalingSocket.readyState !== WebSocket.OPEN) {
            alert('Not connected to signaling server');
            return;
        }
        
        console.log('📤 Joining room:', roomId, 'as:', name);
        showSyncIndicator('Joining room...', 'syncing');
        
        this.sendSignalingMessage({
            type: 'join-room',
            roomId,
            username: name
        });
    },
    
    /**
     * Leave current room
     */
    leaveRoom() {
        if (AppState.currentRoom) {
            this.sendSignalingMessage({
                type: 'leave-room',
                roomId: AppState.currentRoom
            });
            
            // Close all peer connections
            this.peerManager.closeAllConnections();
        }
        
        AppState.resetRoomState();
        this.updateRoomUI();
        showSyncIndicator('Left the room', 'info');
    },
    
    /**
     * Handle room created confirmation
     */
    async handleRoomCreated(message) {
        AppState.currentRoom = message.roomId;
        AppState.username = message.username;
        AppState.isHost = true;
        AppState.inRoom = true;
        
        this.hideModal();
        this.updateRoomUI();
        showSyncIndicator('🎵 Blend created! Share ID: ' + AppState.currentRoom, 'success');
        
        // Copy blend ID to clipboard
        navigator.clipboard.writeText(AppState.currentRoom).then(() => {
            showSyncIndicator('Blend ID copied to clipboard!', 'success');
        });
        
        console.log('✅ Room created as host:', AppState.currentRoom);
        console.log('🎧 WebRTC audio streaming ready - play a song to stream!');
        
        // Resume AudioContext if needed (requires user gesture)
        if (this.peerManager?.audioContext) {
            const ctx = this.peerManager.audioContext;
            console.log('🔊 AudioContext state:', ctx.state);
            
            if (ctx.state === 'suspended') {
                console.log('⚠️ AudioContext is suspended - will resume on user interaction');
                // Try to resume on next user interaction
                const resumeAudio = async () => {
                    if (ctx.state === 'suspended') {
                        await ctx.resume();
                        console.log('✅ AudioContext resumed:', ctx.state);
                        document.removeEventListener('click', resumeAudio);
                    }
                };
                document.addEventListener('click', resumeAudio, { once: true });
            }
        }
        
        // Show notification to play music
        setTimeout(() => {
            showSyncIndicator('🎵 Now play a song to stream to listeners!', 'info');
        }, 2000);
    },
    
    /**
     * Handle room joined confirmation
     */
    async handleRoomJoined(message) {
        AppState.currentRoom = message.roomId;
        AppState.username = message.username;
        AppState.isHost = false;
        AppState.inRoom = true;
        
        this.hideModal();
        this.updateRoomUI();
        this.updateUsersList(Object.values(message.peers));
        
        // Sync with current room state
        if (message.currentSong) {
            this.syncWithRoom(message.currentSong, message.isPlaying, message.currentTime);
        }
        
        showSyncIndicator('🎵 Joined blend successfully!', 'success');
        
        console.log('✅ Room joined:', AppState.currentRoom);
    },
    
    /**
     * Handle new peer joining
     */
    async handlePeerJoined(message) {
        console.log('👤 Peer joined:', message.peerId, message.username);
        
        this.updateUsersList(Object.values(message.peers));
        
        // If we're the host, create offer for new peer
        if (AppState.isHost) {
            try {
                const offer = await this.peerManager.createOffer(
                    message.peerId,
                    (peerId, candidate) => this.sendIceCandidate(peerId, candidate),
                    (peerId, stream) => this.handleRemoteTrack(peerId, stream)
                );
                
                // Send offer to new peer
                this.sendSignalingMessage({
                    type: 'offer',
                    targetId: message.peerId,
                    offer,
                    roomId: AppState.currentRoom
                });
                
                console.log('📞 Sent offer to new peer:', message.peerId);
            } catch (error) {
                console.error('❌ Failed to create offer for new peer:', error);
            }
        }
    },
    
    /**
     * Handle peer leaving
     */
    handlePeerLeft(message) {
        console.log('👤 Peer left:', message.peerId);
        
        // Close peer connection
        this.peerManager.closePeerConnection(message.peerId);
        
        // Update users list if available
        if (message.remainingPeers) {
            // You may need to fetch full user info from server
            showSyncIndicator('A user left the room', 'info');
        }
    },
    
    /**
     * Handle incoming WebRTC offer
     */
    async handleOffer(message) {
        console.log('📞 Received offer from:', message.senderId);
        
        try {
            const answer = await this.peerManager.handleOffer(
                message.senderId,
                message.offer,
                (peerId, candidate) => this.sendIceCandidate(peerId, candidate),
                (peerId, stream) => this.handleRemoteTrack(peerId, stream)
            );
            
            // Send answer back
            this.sendSignalingMessage({
                type: 'answer',
                targetId: message.senderId,
                answer,
                roomId: message.roomId
            });
            
            console.log('📞 Sent answer to:', message.senderId);
        } catch (error) {
            console.error('❌ Failed to handle offer:', error);
        }
    },
    
    /**
     * Handle incoming WebRTC answer
     */
    async handleAnswer(message) {
        console.log('📞 Received answer from:', message.senderId);
        
        try {
            await this.peerManager.handleAnswer(message.senderId, message.answer);
        } catch (error) {
            console.error('❌ Failed to handle answer:', error);
        }
    },
    
    /**
     * Handle incoming ICE candidate
     */
    async handleIceCandidate(message) {
        console.log('🧊 Received ICE candidate from:', message.senderId);
        
        try {
            await this.peerManager.addIceCandidate(message.senderId, message.candidate);
        } catch (error) {
            console.error('❌ Failed to add ICE candidate:', error);
        }
    },
    
    /**
     * Send ICE candidate to peer
     */
    sendIceCandidate(peerId, candidate) {
        this.sendSignalingMessage({
            type: 'ice-candidate',
            targetId: peerId,
            candidate,
            roomId: AppState.currentRoom
        });
    },
    
    /**
     * Handle remote track from peer (for listeners)
     */
    handleRemoteTrack(peerId, stream) {
        console.log('📻 Received remote track from:', peerId);
        
        // Play remote stream in audio element
        if (!AppState.isHost) {
            DOM.audioPlayer.srcObject = stream;
            DOM.audioPlayer.play().catch(err => {
                console.error('Failed to play remote stream:', err);
            });
            
            showSyncIndicator('🎧 Connected to host audio!', 'success');
        }
    },
    
    /**
     * Broadcast room state update (host only)
     */
    broadcastRoomState(stateUpdate) {
        if (!AppState.isHost) return;
        
        this.sendSignalingMessage({
            type: 'room-state-update',
            roomId: AppState.currentRoom,
            stateUpdate
        });
    },
    
    /**
     * Handle room state changes (listeners receive)
     */
    handleRoomStateChanged(message) {
        const { currentSong, isPlaying, currentTime } = message.stateUpdate;
        
        console.log('🔄 Room state changed:', message.stateUpdate);
        
        // Note: Audio comes via WebRTC P2P, but metadata comes via signaling
        if (currentSong) {
            this.updateSongMetadata(currentSong);
        }
        
        // These are just for UI sync - actual audio is P2P
        if (!AppState.isHost) {
            showSyncIndicator(isPlaying ? 'Playing' : 'Paused', 'info');
        }
    },
    
    /**
     * Update song metadata (not audio)
     */
    updateSongMetadata(song) {
        AppState.currentSong = song;
        Player.updatePlayerUI(song);
        
        if (song.id) {
            LyricsManager.fetchLyrics(song.id);
        }
    },
    
    /**
     * Handle room closed
     */
    handleRoomClosed(message) {
        console.log('❌ Room closed:', message.message);
        showSyncIndicator(message.message, 'error');
        
        this.peerManager.closeAllConnections();
        AppState.resetRoomState();
        this.updateRoomUI();
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
                        <span style="color: #00ff00; font-size: 0.9em;">• WebRTC P2P</span>
                    </div>
                `;
            }
            
            syncWithRoomBtn?.classList.add('hidden'); // No manual sync needed with WebRTC
            leaveRoomBtn?.classList.remove('hidden');
        } else {
            DOM.roomInfo?.classList.add('hidden');
            syncWithRoomBtn?.classList.add('hidden');
            leaveRoomBtn?.classList.add('hidden');
        }
    },
    
    /**
     * Update users list
     */
    updateUsersList(users) {
        if (!DOM.roomUsers) return;
        
        DOM.roomUsers.innerHTML = '';
        users.forEach(user => {
            const badge = document.createElement('span');
            badge.className = user.isHost 
                ? 'inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-yellow-500 to-orange-500 text-black'
                : 'inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-spotify-green text-black';
            badge.textContent = user.username + (user.isHost ? ' 👑' : '');
            DOM.roomUsers.appendChild(badge);
        });
    },
    
    /**
     * Sync with room (not needed with P2P audio, kept for compatibility)
     */
    syncWithRoom(song, playing, currentTime) {
        console.log('ℹ️ Note: Audio is streamed via WebRTC P2P, metadata only');
        this.updateSongMetadata(song);
    },
    
    /**
     * Request room sync (not needed with P2P)
     */
    requestRoomSync() {
        showSyncIndicator('Audio is synced via WebRTC P2P!', 'success');
    }
};
