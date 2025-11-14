/**
 * Playlist Module
 * Handles playlist functionality
 */

import { API } from './api.js';
import { DOM } from './dom.js';
import { AppState } from './state.js';
import { Player } from './player.js';
import { showSyncIndicator } from './utils.js';

export const PlaylistManager = {
    currentPlaylistId: null,
    
    /**
     * Initialize playlists in sidebar
     */
    renderPlaylistsSidebar() {
        if (!DOM.playlistsContainer) return;
        
        DOM.playlistsContainer.innerHTML = '';
        
        AppState.playlists.forEach(playlist => {
            const item = document.createElement('a');
            item.href = '#';
            item.className = 'playlist-item flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-spotify-gray transition-all text-sm group';
            item.dataset.playlistId = playlist.id;
            
            item.innerHTML = `
                <i class="fas fa-music text-spotify-light-gray group-hover:text-spotify-green transition-colors text-xs"></i>
                <span class="truncate">${playlist.name}</span>
            `;
            
            item.addEventListener('click', (e) => {
                e.preventDefault();
                this.showPlaylist(playlist.id);
            });
            
            DOM.playlistsContainer.appendChild(item);
        });
    },
    
    /**
     * Show a specific playlist
     * @param {string} playlistId - Playlist ID
     */
    async showPlaylist(playlistId) {
        const playlist = AppState.playlists.find(p => p.id === playlistId);
        if (!playlist) return;
        
        this.currentPlaylistId = playlistId;
        
        // Hide other sections
        DOM.searchResults?.classList.add('hidden');
        DOM.welcomeSection?.classList.add('hidden');
        DOM.likedSongsSection?.classList.add('hidden');
        DOM.playlistView?.classList.remove('hidden');
        
        // Update playlist info
        DOM.playlistImage.src = playlist.image;
        DOM.playlistTitle.textContent = playlist.name;
        DOM.playlistDescription.textContent = playlist.description;
        
        // If playlist has no songs, fetch them
        if (playlist.songs.length === 0 && playlist.query) {
            await this.loadPlaylistSongs(playlistId);
        } else {
            this.displayPlaylistSongs(playlist);
        }
    },
    
    /**
     * Load songs for a playlist
     * @param {string} playlistId - Playlist ID
     */
    async loadPlaylistSongs(playlistId) {
        const playlist = AppState.playlists.find(p => p.id === playlistId);
        if (!playlist) return;
        
        DOM.loadingSpinner?.classList.remove('hidden');
        showSyncIndicator(`Loading ${playlist.name}...`, 'info');
        
        try {
            const data = await API.search(playlist.query);
            
            if (data.results && data.results.length > 0) {
                // Store first 20 songs
                playlist.songs = data.results.slice(0, 20);
                AppState.savePlaylists();
                
                this.displayPlaylistSongs(playlist);
                showSyncIndicator('Playlist loaded!', 'success');
            } else {
                DOM.playlistContainer.innerHTML = `
                    <div class="col-span-full text-center py-16">
                        <i class="fas fa-music text-6xl text-spotify-light-gray mb-4"></i>
                        <p class="text-xl font-semibold mb-2">No songs found</p>
                        <p class="text-spotify-light-gray">Try refreshing the playlist</p>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Failed to load playlist:', error);
            showSyncIndicator('Failed to load playlist', 'error');
        } finally {
            DOM.loadingSpinner?.classList.add('hidden');
        }
    },
    
    /**
     * Display playlist songs
     * @param {Object} playlist - Playlist object
     */
    displayPlaylistSongs(playlist) {
        if (!DOM.playlistContainer) return;
        
        if (playlist.songs.length === 0) {
            DOM.playlistContainer.innerHTML = `
                <div class="col-span-full text-center py-16">
                    <i class="fas fa-music text-6xl text-spotify-light-gray mb-4"></i>
                    <p class="text-xl font-semibold mb-2">No songs in this playlist</p>
                    <button class="mt-4 px-4 py-2 bg-spotify-green text-black font-semibold rounded-full hover:bg-green-500 transition-all" onclick="PlaylistManager.loadPlaylistSongs('${playlist.id}')">
                        Load Songs
                    </button>
                </div>
            `;
            return;
        }
        
        DOM.playlistContainer.innerHTML = '';
        
        // Update current playlist for playback
        AppState.currentPlaylist = [...playlist.songs];
        
        playlist.songs.forEach((song, index) => {
            const songCard = this.createSongCard(song, index);
            DOM.playlistContainer.appendChild(songCard);
        });
    },
    
    /**
     * Create song card element
     * @param {Object} song - Song object
     * @param {number} index - Song index
     * @returns {HTMLElement}
     */
    createSongCard(song, index) {
        const card = document.createElement('div');
        card.className = 'group relative bg-spotify-darker hover:bg-spotify-gray p-4 rounded-lg cursor-pointer transition-all transform hover:scale-105';
        card.dataset.songId = Player.getSongId(song);
        
        let imageUrl = song.image_url || song.image || song.thumbnail;
        if (Array.isArray(imageUrl)) {
            imageUrl = imageUrl[imageUrl.length - 1];
        }
        if (!imageUrl) {
            imageUrl = 'https://via.placeholder.com/200x200/1DB954/FFFFFF?text=♪';
        }
        
        const title = this.escapeHtml(song.title || song.song || 'Unknown Title');
        const artist = this.escapeHtml(song.singers || song.artist || song.primary_artists || 'Unknown Artist');
        
        card.innerHTML = `
            <img src="${imageUrl}" alt="${title}" class="w-full aspect-square object-cover rounded-lg mb-3 shadow-lg">
            <div class="space-y-1">
                <div class="font-semibold truncate text-sm">${title}</div>
                <div class="text-xs text-spotify-light-gray truncate">${artist}</div>
            </div>
            <button class="play-btn absolute bottom-3 right-3 w-12 h-12 bg-spotify-green hover:bg-green-500 rounded-full flex items-center justify-center shadow-lg transform transition-all hover:scale-110 opacity-0 group-hover:opacity-100">
                <i class="fas fa-play text-black ml-0.5"></i>
            </button>
        `;
        
        // Add click handlers
        const playBtn = card.querySelector('.play-btn');
        
        const playHandler = (e) => {
            e.stopPropagation();
            Player.playSong(index);
        };
        
        playBtn?.addEventListener('click', playHandler);
        card.addEventListener('click', playHandler);
        
        return card;
    },
    
    /**
     * Escape HTML to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string}
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    
    /**
     * Refresh playlist (reload songs)
     * @param {string} playlistId - Playlist ID
     */
    async refreshPlaylist(playlistId) {
        const playlist = AppState.playlists.find(p => p.id === playlistId);
        if (playlist) {
            playlist.songs = [];
            await this.loadPlaylistSongs(playlistId);
        }
    }
};
