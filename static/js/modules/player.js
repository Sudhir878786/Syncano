/**
 * Player Module
 * Handles all music player functionality
 */

import { AppState } from './state.js';
import { DOM } from './dom.js';
import { API } from './api.js';
import { LyricsManager } from './lyrics.js';
import { ColorExtractor } from './color-extractor.js';
import { showSyncIndicator, formatTime, showError } from './utils.js';

export const Player = {
    // Logo path for default display
    LOGO_URL: '/static/images/logo.png',

    /**
     * Initialize default player display with logo
     */
    initializeDefaultDisplay() {
        if (DOM.playerImage) {
            DOM.playerImage.src = this.LOGO_URL;
            DOM.playerImage.alt = 'Melodexa Logo';
        }
        if (DOM.playerTitle) {
            DOM.playerTitle.textContent = 'No song selected';
        }
        if (DOM.playerArtist) {
            DOM.playerArtist.textContent = 'Select a song to play';
        }
    },
    /**
     * Play a song at the given index
     * @param {number} index - Index in current playlist
     */
    async playSong(index) {
        if (index < 0 || index >= AppState.currentPlaylist.length) return;
        
        const song = AppState.currentPlaylist[index];
        AppState.currentIndex = index;
        
        DOM.loadingSpinner?.classList.remove('hidden');
        
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
                        const songData = await API.getSong(songId);
                        console.log('Song details response:', songData);
                        
                        audioUrl = songData.url || songData.download_url || songData.media_url ||
                                  (songData.more_info && songData.more_info.download_url) ||
                                  (songData[0] && songData[0].url);
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
            this.updatePlayerUI(song);
            
            // Load and play audio
            DOM.audioPlayer.src = audioUrl;
            DOM.audioPlayer.load();
            
            const songWithUrl = { ...song, url: audioUrl };
            
            // Store song ID for lyrics (fetch only when user clicks lyrics button)
            AppState.currentSongId = song.id;
            
            // If in a room and is host, emit song change
            if (AppState.inRoom && AppState.isHost && AppState.socket) {
                console.log('Host emitting song change:', songWithUrl);
                AppState.socket.emit('play_song', {
                    room_id: AppState.currentRoom,
                    song: songWithUrl
                });
            }
            
            try {
                await DOM.audioPlayer.play();
                AppState.isPlaying = true;
                this.updatePlayPauseButton();
            } catch (playError) {
                console.error('Audio play error:', playError);
                throw new Error('Failed to play audio. The file might be corrupted or not accessible.');
            }
            
        } catch (error) {
            console.error('Play error:', error);
            showError('Failed to play song: ' + error.message);
        } finally {
            DOM.loadingSpinner?.classList.add('hidden');
        }
    },
    
    /**
     * Update player UI with song information
     * @param {Object} song - Song object
     */
    updatePlayerUI(song) {
        let imageUrl = song.image_url || song.image || song.thumbnail;
        
        if (Array.isArray(imageUrl)) {
            imageUrl = imageUrl[imageUrl.length - 1];
        }
        
        if (!imageUrl) {
            imageUrl = 'https://via.placeholder.com/56x56/1DB954/FFFFFF?text=♪';
        }
        
        DOM.playerImage.src = imageUrl;
        DOM.playerTitle.textContent = song.title || song.song || 'Unknown Title';
        DOM.playerArtist.textContent = song.singers || song.artist || song.primary_artists || 'Unknown Artist';
        
        document.title = `${song.title || song.song || 'Unknown Title'} • Melodexa`;
        
        AppState.currentSong = song;
        this.updateLikeButtons();
        
        // Extract colors from album art for AI mood colors
        ColorExtractor.updateColorsFromAlbum(imageUrl);
    },
    
    /**
     * Toggle play/pause
     */
    togglePlayPause() {
        if (!DOM.audioPlayer.src) return;
        
        if (AppState.isPlaying) {
            DOM.audioPlayer.pause();
            AppState.isPlaying = false;
        } else {
            DOM.audioPlayer.play();
            AppState.isPlaying = true;
        }
        
        this.updatePlayPauseButton();
        
        // If in a room and is host, emit playback change
        if (AppState.inRoom && AppState.isHost && AppState.socket && !AppState.isSyncing) {
            console.log('Host emitting play_pause:', AppState.isPlaying);
            AppState.socket.emit('play_pause', {
                room_id: AppState.currentRoom,
                is_playing: AppState.isPlaying,
                current_time: DOM.audioPlayer.currentTime
            });
        }
    },
    
    /**
     * Update play/pause button icon
     */
    updatePlayPauseButton() {
        const icon = DOM.playPauseBtn?.querySelector('i');
        if (icon) {
            icon.className = AppState.isPlaying ? 'fas fa-pause' : 'fas fa-play';
        }
    },
    
    /**
     * Play previous song
     */
    playPrevious() {
        if (AppState.currentIndex > 0) {
            this.playSong(AppState.currentIndex - 1);
        }
    },
    
    /**
     * Play next song
     */
    playNext() {
        if (AppState.currentIndex < AppState.currentPlaylist.length - 1) {
            this.playSong(AppState.currentIndex + 1);
        } else {
            // Loop back to first song
            this.playSong(0);
        }
    },
    
    /**
     * Update duration display
     */
    updateDuration() {
        const duration = DOM.audioPlayer.duration;
        if (!isNaN(duration)) {
            DOM.totalTime.textContent = formatTime(duration);
            DOM.progressSlider.max = duration;
        }
    },
    
    /**
     * Update progress bar and time
     */
    updateProgress() {
        if (!DOM.audioPlayer || !DOM.currentTime || !DOM.progressSlider || !DOM.progressFill) {
            console.warn('⚠️ Missing DOM elements for progress update');
            return;
        }
        
        const current = DOM.audioPlayer.currentTime;
        const duration = DOM.audioPlayer.duration;
        
        if (!isNaN(current) && !isNaN(duration) && duration > 0) {
            DOM.currentTime.textContent = formatTime(current);
            DOM.progressSlider.value = current;
            
            const percentage = (current / duration) * 100;
            DOM.progressFill.style.width = percentage + '%';
        }
    },
    
    /**
     * Seek to position
     */
    seekToPosition() {
        const seekTime = DOM.progressSlider.value;
        DOM.audioPlayer.currentTime = seekTime;
        
        // If in a room and is host, emit seek change
        if (AppState.inRoom && AppState.isHost && AppState.socket) {
            AppState.socket.emit('seek', {
                room_id: AppState.currentRoom,
                current_time: seekTime
            });
        }
    },
    
    /**
     * Update volume
     */
    updateVolume() {
        const volume = DOM.volumeSlider.value / 100;
        DOM.audioPlayer.volume = volume;
        
        // Update visual fill bar
        if (DOM.volumeFill) {
            DOM.volumeFill.style.width = DOM.volumeSlider.value + '%';
        }
        
        this.updateVolumeSliderBackground();
        this.updateVolumeIcon(volume);
    },
    
    /**
     * Update volume slider background
     */
    updateVolumeSliderBackground() {
        const percent = DOM.volumeSlider.value;
        DOM.volumeSlider.style.setProperty('--volume-percent', percent + '%');
    },
    
    /**
     * Update volume icon based on level
     * @param {number} volume - Volume level (0-1)
     */
    updateVolumeIcon(volume) {
        const icon = DOM.volumeBtn?.querySelector('i');
        if (!icon) return;
        
        if (volume === 0) {
            icon.className = 'fas fa-volume-mute';
        } else if (volume < 0.5) {
            icon.className = 'fas fa-volume-down';
        } else {
            icon.className = 'fas fa-volume-up';
        }
    },
    
    /**
     * Toggle mute
     */
    toggleMute() {
        if (DOM.audioPlayer.volume > 0) {
            AppState.previousVolume = DOM.volumeSlider.value;
            DOM.volumeSlider.value = 0;
        } else {
            DOM.volumeSlider.value = AppState.previousVolume || 50;
        }
        this.updateVolume();
    },
    
    /**
     * Update like buttons state
     */
    updateLikeButtons() {
        if (!AppState.currentSong) return;
        
        const liked = this.isSongLiked(AppState.currentSong);
        
        // Update main like button
        if (DOM.likeCurrentSongBtn) {
            const icon = DOM.likeCurrentSongBtn.querySelector('i');
            if (liked) {
                icon.classList.remove('far');
                icon.classList.add('fas');
                DOM.likeCurrentSongBtn.classList.add('liked');
            } else {
                icon.classList.remove('fas');
                icon.classList.add('far');
                DOM.likeCurrentSongBtn.classList.remove('liked');
            }
        }
        
        // Update song cards
        const songCards = document.querySelectorAll('.song-card');
        songCards.forEach(card => {
            const songId = card.dataset.songId;
            const likeBtn = card.querySelector('.like-btn');
            if (likeBtn && songId) {
                const song = AppState.currentPlaylist.find(s => 
                    this.getSongId(s) === songId
                );
                if (song && this.isSongLiked(song)) {
                    const icon = likeBtn.querySelector('i');
                    icon.classList.remove('far');
                    icon.classList.add('fas');
                } else {
                    const icon = likeBtn.querySelector('i');
                    icon.classList.remove('fas');
                    icon.classList.add('far');
                }
            }
        });
    },
    
    /**
     * Check if song is liked
     * @param {Object} song - Song object
     * @returns {boolean}
     */
    isSongLiked(song) {
        const songId = this.getSongId(song);
        return AppState.likedSongs.some(s => this.getSongId(s) === songId);
    },
    
    /**
     * Get unique song ID
     * @param {Object} song - Song object
     * @returns {string}
     */
    getSongId(song) {
        return song.id || song.songid || song.perma_url || song.title + '-' + song.artist;
    },
    
    /**
     * Toggle like for current song
     */
    toggleLikeCurrentSong() {
        if (!AppState.currentSong) return;
        
        const songId = this.getSongId(AppState.currentSong);
        const index = AppState.likedSongs.findIndex(s => this.getSongId(s) === songId);
        
        if (index > -1) {
            AppState.likedSongs.splice(index, 1);
            showSyncIndicator('Removed from Liked Songs', 'info');
        } else {
            AppState.likedSongs.push(AppState.currentSong);
            showSyncIndicator('Added to Liked Songs', 'success');
        }
        
        AppState.saveLikedSongs();
        this.updateLikeButtons();
    },
    
    /**
     * Toggle like for any song
     * @param {Object} song - Song object
     */
    toggleLikeSong(song) {
        const songId = this.getSongId(song);
        const index = AppState.likedSongs.findIndex(s => this.getSongId(s) === songId);
        
        if (index > -1) {
            AppState.likedSongs.splice(index, 1);
            showSyncIndicator('Removed from Liked Songs', 'info');
        } else {
            AppState.likedSongs.push(song);
            showSyncIndicator('Added to Liked Songs', 'success');
        }
        
        AppState.saveLikedSongs();
        this.updateLikeButtons();
    }
};
