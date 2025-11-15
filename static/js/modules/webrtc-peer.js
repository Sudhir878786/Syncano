/**
 * WebRTC Peer Connection Manager
 * Handles P2P audio streaming using RTCPeerConnection
 */

export class WebRTCPeerManager {
    constructor() {
        this.peerConnections = new Map(); // peerId -> RTCPeerConnection
        this.localStream = null;
        this.remoteStreams = new Map(); // peerId -> MediaStream
        this.isHost = false;
        
        // ICE configuration with Google STUN servers
        this.iceConfig = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' }
                // Add TURN servers here for better reliability (optional)
                // { 
                //     urls: 'turn:your-turn-server.com:3478',
                //     username: 'user',
                //     credential: 'pass'
                // }
            ]
        };
        
        // Audio constraints for high-quality music streaming
        this.audioConstraints = {
            audio: {
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false,
                sampleRate: 48000,
                channelCount: 2,
                latency: 0,
                sampleSize: 16
            },
            video: false
        };
    }
    
    /**
     * Initialize as host - capture audio from HTMLAudioElement
     */
    async initializeAsHost(audioElement) {
        try {
            this.isHost = true;
            console.log('🎤 Initializing as host - capturing audio from player');
            
            // Check if we already have an audio context (avoid recreating)
            if (this.audioContext && this.localStream) {
                console.log('✅ Audio context already initialized');
                return true;
            }
            
            // Store reference to audio element
            this.audioElement = audioElement;
            
            // Create AudioContext - keep it in suspended state initially
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Create MediaStreamDestination for WebRTC
            const destination = audioContext.createMediaStreamDestination();
            
            // Store for later connection
            this.localStream = destination.stream;
            this.audioContext = audioContext;
            this.destination = destination;
            this.audioSourceConnected = false;
            
            console.log('✅ Host audio context initialized (will connect on play)');
            console.log('✅ Stream ready with', this.localStream.getTracks().length, 'tracks');
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize host stream:', error);
            throw error;
        }
    }
    
    /**
     * Ensure audio source is connected (call when audio starts playing)
     * This must be called ONCE when audio first plays after room creation
     */
    async ensureAudioSourceConnected(audioElement) {
        if (!this.isHost || !this.audioContext) {
            console.log('⚠️ Not host or no audio context');
            return false;
        }
        
        // If source already connected, skip
        if (this.audioSourceConnected) {
            console.log('✅ Audio source already connected');
            return true;
        }
        
        try {
            console.log('🔌 Connecting audio element to WebRTC stream...');
            console.log('🔊 AudioContext state BEFORE:', this.audioContext.state);
            console.log('🎵 Audio element paused:', audioElement.paused);
            console.log('🎵 Audio element src:', audioElement.src ? 'set' : 'not set');
            
            // Store current time if playing
            const wasPlaying = !audioElement.paused;
            const currentTime = audioElement.currentTime;
            
            // Resume AudioContext if suspended (required for audio output)
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
                console.log('▶️ AudioContext resumed');
            }
            
            // Create source from audio element (can only do this ONCE)
            console.log('📡 Creating MediaElementSource...');
            const source = this.audioContext.createMediaElementSource(audioElement);
            console.log('✅ MediaElementSource created');
            
            // Connect to WebRTC destination (for streaming to peers)
            source.connect(this.destination);
            console.log('✅ Connected to WebRTC destination');
            
            // CRITICAL: Also connect to speakers so host can hear their own audio
            source.connect(this.audioContext.destination);
            console.log('✅ Connected to speakers (audioContext.destination)');
            
            this.audioSource = source;
            this.audioSourceConnected = true;
            
            // Resume playback if it was playing
            if (wasPlaying) {
                console.log('▶️ Resuming playback from', currentTime);
                audioElement.currentTime = currentTime;
                await audioElement.play();
            }
            
            console.log('🎉 Audio source fully connected!');
            console.log('   → WebRTC stream (for peers)');
            console.log('   → Speakers (for host to hear)');
            console.log('🔊 AudioContext state AFTER:', this.audioContext.state);
            console.log('🔊 AudioContext destination:', this.audioContext.destination);
            
            // Verify audio is flowing
            setTimeout(() => {
                console.log('🔍 Audio check after 1 second:');
                console.log('   - AudioContext state:', this.audioContext.state);
                console.log('   - Audio paused:', audioElement.paused);
                console.log('   - Audio current time:', audioElement.currentTime);
            }, 1000);
            
            return true;
        } catch (error) {
            if (error.message && error.message.includes('already connected')) {
                console.warn('⚠️ Audio element already connected to AudioContext');
                this.audioSourceConnected = true;
                return true;
            }
            console.error('❌ Failed to connect audio source:', error);
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
            return false;
        }
    }
    
    /**
     * Create peer connection for a specific peer
     */
    async createPeerConnection(peerId, onIceCandidate, onTrack) {
        console.log(`🔗 Creating peer connection for: ${peerId}`);
        
        const pc = new RTCPeerConnection(this.iceConfig);
        
        // Handle ICE candidates
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                console.log(`🧊 New ICE candidate for ${peerId}`);
                onIceCandidate(peerId, event.candidate);
            }
        };
        
        // Handle incoming tracks (for listeners)
        pc.ontrack = (event) => {
            console.log(`📻 Received track from ${peerId}:`, event.track.kind);
            
            if (event.streams && event.streams[0]) {
                this.remoteStreams.set(peerId, event.streams[0]);
                onTrack(peerId, event.streams[0]);
            }
        };
        
        // Handle connection state changes
        pc.onconnectionstatechange = () => {
            console.log(`🔌 Connection state for ${peerId}:`, pc.connectionState);
            
            if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
                console.warn(`⚠️ Connection ${pc.connectionState} for ${peerId}`);
            }
        };
        
        pc.oniceconnectionstatechange = () => {
            console.log(`🧊 ICE connection state for ${peerId}:`, pc.iceConnectionState);
        };
        
        // If host, add local audio tracks
        if (this.isHost && this.localStream) {
            console.log(`📤 Adding local audio tracks to peer connection for ${peerId}`);
            this.localStream.getTracks().forEach(track => {
                pc.addTrack(track, this.localStream);
                console.log(`✅ Added track: ${track.kind}`);
            });
        }
        
        this.peerConnections.set(peerId, pc);
        return pc;
    }
    
    /**
     * Create and send offer to peer (host initiates)
     */
    async createOffer(peerId, onIceCandidate, onTrack) {
        const pc = await this.createPeerConnection(peerId, onIceCandidate, onTrack);
        
        try {
            console.log(`📞 Creating offer for ${peerId}`);
            const offer = await pc.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: false
            });
            
            await pc.setLocalDescription(offer);
            console.log(`✅ Offer created and set as local description for ${peerId}`);
            
            return offer;
        } catch (error) {
            console.error(`❌ Failed to create offer for ${peerId}:`, error);
            throw error;
        }
    }
    
    /**
     * Handle incoming offer and create answer (listener responds)
     */
    async handleOffer(peerId, offer, onIceCandidate, onTrack) {
        const pc = await this.createPeerConnection(peerId, onIceCandidate, onTrack);
        
        try {
            console.log(`📞 Handling offer from ${peerId}`);
            await pc.setRemoteDescription(new RTCSessionDescription(offer));
            
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            
            console.log(`✅ Answer created and set as local description for ${peerId}`);
            return answer;
        } catch (error) {
            console.error(`❌ Failed to handle offer from ${peerId}:`, error);
            throw error;
        }
    }
    
    /**
     * Handle incoming answer (host receives)
     */
    async handleAnswer(peerId, answer) {
        const pc = this.peerConnections.get(peerId);
        if (!pc) {
            console.error(`❌ No peer connection found for ${peerId}`);
            return;
        }
        
        try {
            console.log(`📞 Handling answer from ${peerId}`);
            await pc.setRemoteDescription(new RTCSessionDescription(answer));
            console.log(`✅ Remote description set for ${peerId}`);
        } catch (error) {
            console.error(`❌ Failed to handle answer from ${peerId}:`, error);
            throw error;
        }
    }
    
    /**
     * Add ICE candidate from remote peer
     */
    async addIceCandidate(peerId, candidate) {
        const pc = this.peerConnections.get(peerId);
        if (!pc) {
            console.error(`❌ No peer connection found for ${peerId}`);
            return;
        }
        
        try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
            console.log(`✅ ICE candidate added for ${peerId}`);
        } catch (error) {
            console.error(`❌ Failed to add ICE candidate for ${peerId}:`, error);
        }
    }
    
    /**
     * Close connection with specific peer
     */
    closePeerConnection(peerId) {
        const pc = this.peerConnections.get(peerId);
        if (pc) {
            console.log(`🔌 Closing peer connection for ${peerId}`);
            pc.close();
            this.peerConnections.delete(peerId);
        }
        
        this.remoteStreams.delete(peerId);
    }
    
    /**
     * Close all peer connections
     */
    closeAllConnections() {
        console.log('🔌 Closing all peer connections');
        
        for (const [peerId, pc] of this.peerConnections.entries()) {
            pc.close();
        }
        
        this.peerConnections.clear();
        this.remoteStreams.clear();
        
        // Stop local stream
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }
        
        // Close audio context
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        
        this.isHost = false;
    }
    
    /**
     * Get remote stream for a peer
     */
    getRemoteStream(peerId) {
        return this.remoteStreams.get(peerId);
    }
    
    /**
     * Get all remote streams
     */
    getAllRemoteStreams() {
        return Array.from(this.remoteStreams.values());
    }
    
    /**
     * Play remote stream in an audio element
     */
    playRemoteStream(audioElement, peerId) {
        const stream = this.remoteStreams.get(peerId);
        if (stream) {
            audioElement.srcObject = stream;
            audioElement.play().catch(err => {
                console.error('Failed to play remote stream:', err);
            });
            console.log(`🔊 Playing remote stream from ${peerId}`);
        }
    }
    
    /**
     * Get connection statistics
     */
    async getStats(peerId) {
        const pc = this.peerConnections.get(peerId);
        if (!pc) return null;
        
        try {
            const stats = await pc.getStats();
            return stats;
        } catch (error) {
            console.error(`Failed to get stats for ${peerId}:`, error);
            return null;
        }
    }
}
