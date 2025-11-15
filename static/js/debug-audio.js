// Add this to browser console to debug audio issues

console.log('🔍 AUDIO DEBUG HELPER LOADED');

window.debugAudio = function() {
    console.log('\n=== AUDIO DEBUG INFO ===\n');
    
    // Check audio element
    const audio = document.getElementById('audioPlayer');
    if (audio) {
        console.log('📻 Audio Element:');
        console.log('  - src:', audio.src ? 'SET' : 'NOT SET');
        console.log('  - paused:', audio.paused);
        console.log('  - currentTime:', audio.currentTime);
        console.log('  - volume:', audio.volume);
        console.log('  - muted:', audio.muted);
        console.log('  - readyState:', audio.readyState);
    } else {
        console.log('❌ Audio element not found');
    }
    
    // Check RoomManager
    if (window.Melodexa && window.Melodexa.RoomManager) {
        const rm = window.Melodexa.RoomManager;
        console.log('\n🏠 Room Manager:');
        console.log('  - In room:', window.Melodexa.AppState.inRoom);
        console.log('  - Is host:', window.Melodexa.AppState.isHost);
        console.log('  - Room ID:', window.Melodexa.AppState.currentRoom);
        
        if (rm.peerManager) {
            const pm = rm.peerManager;
            console.log('\n🔗 Peer Manager:');
            console.log('  - Is host:', pm.isHost);
            console.log('  - Audio source connected:', pm.audioSourceConnected);
            console.log('  - Has audio context:', !!pm.audioContext);
            console.log('  - Has audio source:', !!pm.audioSource);
            
            if (pm.audioContext) {
                console.log('  - AudioContext state:', pm.audioContext.state);
                console.log('  - AudioContext sampleRate:', pm.audioContext.sampleRate);
                console.log('  - AudioContext baseLatency:', pm.audioContext.baseLatency);
            }
            
            if (pm.destination) {
                console.log('  - Destination stream tracks:', pm.destination.stream.getTracks().length);
            }
        }
    }
    
    console.log('\n======================\n');
};

window.testAudioConnection = async function() {
    console.log('🧪 Testing audio connection...');
    
    const audio = document.getElementById('audioPlayer');
    if (!audio || !audio.src) {
        console.error('❌ No audio playing. Play a song first!');
        return;
    }
    
    const rm = window.Melodexa.RoomManager;
    if (!rm || !rm.peerManager) {
        console.error('❌ RoomManager not initialized');
        return;
    }
    
    const pm = rm.peerManager;
    
    console.log('Current state:');
    console.log('  - Audio source connected:', pm.audioSourceConnected);
    console.log('  - AudioContext state:', pm.audioContext?.state);
    
    if (!pm.audioSourceConnected) {
        console.log('Attempting to connect audio source...');
        const result = await pm.ensureAudioSourceConnected(audio);
        console.log('Result:', result ? '✅ SUCCESS' : '❌ FAILED');
    } else {
        console.log('✅ Already connected');
        
        // Check if audio is actually flowing
        if (pm.audioContext) {
            console.log('AudioContext state:', pm.audioContext.state);
            
            if (pm.audioContext.state === 'suspended') {
                console.log('⚠️ AudioContext is suspended, resuming...');
                await pm.audioContext.resume();
                console.log('AudioContext state after resume:', pm.audioContext.state);
            }
        }
    }
};

window.forceReconnectAudio = function() {
    console.log('🔄 Force reconnecting audio...');
    
    const rm = window.Melodexa.RoomManager;
    if (rm && rm.peerManager) {
        rm.peerManager.audioSourceConnected = false;
        rm.peerManager.audioSource = null;
        console.log('✅ Reset audio connection flags');
        console.log('Now play a song to reconnect');
    }
};

console.log('\n🎮 Audio Debug Commands:');
console.log('  debugAudio()           - Show current audio state');
console.log('  testAudioConnection()  - Test audio connection');
console.log('  forceReconnectAudio()  - Reset and reconnect audio');
console.log('\n');
