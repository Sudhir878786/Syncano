/**
 * Search Module
 * Handles song search functionality
 */

import { API } from './api.js';
import { DOM } from './dom.js';
import { AppState } from './state.js';
import { Player } from './player.js';
import { escapeHtml } from './utils.js';

export const Search = {
    /**
     * Perform search
     */
    async performSearch() {
        const query = DOM.searchInput?.value.trim();
        
        console.log('🔍 Search triggered with query:', query);
        
        if (!query) {
            console.log('⚠️ Empty query, skipping search');
            return;
        }
        
        DOM.loadingSpinner?.classList.remove('hidden');
        console.log('⏳ Loading spinner shown');
        
        try {
            const data = await API.search(query);
            this.displayResults(data);
        } catch (error) {
            console.error('Search error:', error);
            this.showError('Search failed: ' + error.message);
        } finally {
            DOM.loadingSpinner?.classList.add('hidden');
        }
    },
    
    /**
     * Display search results
     * @param {Object} data - Search results data
     */
    displayResults(data) {
        if (!DOM.resultsContainer) return;
        
        this.showSearchResults();
        
        if (!data.results || data.results.length === 0) {
            DOM.resultsContainer.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-search"></i>
                    <p>No results found for "${escapeHtml(data.query)}"</p>
                </div>
            `;
            return;
        }
        
        AppState.currentPlaylist = data.results;
        
        DOM.resultsContainer.innerHTML = '';
        
        data.results.forEach((song, index) => {
            const songCard = this.createSongCard(song, index);
            DOM.resultsContainer.appendChild(songCard);
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
            imageUrl = 'https://via.placeholder.com/56x56/1DB954/FFFFFF?text=♪';
        }
        
        const title = escapeHtml(song.title || song.song || 'Unknown Title');
        const artist = escapeHtml(song.singers || song.artist || song.primary_artists || 'Unknown Artist');
        
        const liked = Player.isSongLiked(song);
        const likeIcon = liked ? 'fas' : 'far';
        
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
        const songImage = card.querySelector('.song-image');
        
        const playHandler = (e) => {
            e.stopPropagation();
            Player.playSong(index);
        };
        
        playBtn?.addEventListener('click', playHandler);
        songImage?.addEventListener('click', playHandler);
        card.addEventListener('click', playHandler);
        
        return card;
    },
    
    /**
     * Show search results section
     */
    showSearchResults() {
        DOM.searchResults?.classList.remove('hidden');
        DOM.welcomeSection?.classList.add('hidden');
        DOM.likedSongsSection?.classList.add('hidden');
    },
    
    /**
     * Show home section
     */
    showHome() {
        DOM.searchResults?.classList.add('hidden');
        DOM.welcomeSection?.classList.remove('hidden');
        DOM.likedSongsSection?.classList.add('hidden');
    },
    
    /**
     * Show liked songs section
     */
    showLikedSongs() {
        DOM.searchResults?.classList.add('hidden');
        DOM.welcomeSection?.classList.add('hidden');
        DOM.likedSongsSection?.classList.remove('hidden');
        this.displayLikedSongs();
    },
    
    /**
     * Display liked songs
     */
    displayLikedSongs() {
        if (!DOM.likedContainer) return;
        
        if (AppState.likedSongs.length === 0) {
            DOM.likedContainer.innerHTML = `
                <div class="col-span-full text-center py-16">
                    <i class="fas fa-heart text-6xl text-spotify-light-gray mb-4"></i>
                    <p class="text-xl font-semibold mb-2">No liked songs yet</p>
                    <p class="text-spotify-light-gray">Songs you like will appear here</p>
                </div>
            `;
            return;
        }
        
        DOM.likedContainer.innerHTML = '';
        
        AppState.likedSongs.forEach((song, index) => {
            const songCard = this.createSongCard(song, index);
            DOM.likedContainer.appendChild(songCard);
        });
        
        // Update current playlist to liked songs for playback
        AppState.currentPlaylist = [...AppState.likedSongs];
    },
    
    /**
     * Show error message
     * @param {string} message - Error message
     */
    showError(message) {
        const toast = document.createElement('div');
        toast.className = 'sync-indicator error';
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 4000);
    }
};
