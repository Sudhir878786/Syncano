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
    // Cache for faster subsequent searches
    _cache: new Map(),
    _cacheTimeout: 5 * 60 * 1000, // 5 minutes
    _lastQuery: '',
    _currentRequest: null,
    
    /**
     * Show live suggestions as user types
     */
    async showLiveSuggestions(query) {
        if (!query || query.length < 1) {
            this.hideSuggestions();
            return;
        }
        
        // Cancel previous request if still pending
        if (this._currentRequest) {
            this._currentRequest.cancelled = true;
        }
        
        // Check cache first for instant response
        const cacheKey = query.toLowerCase().trim();
        const cached = this._cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this._cacheTimeout) {
            this.displaySuggestions(cached.results.slice(0, 5));
            return;
        }
        
        // Show loading state only if not cached
        if (!cached) {
            this.showSuggestionsLoading();
        }
        
        try {
            const request = { cancelled: false };
            this._currentRequest = request;
            
            // Limit to 5 results for faster API response
            const data = await API.search(query, false, 5);
            
            // Ignore if this request was cancelled or superseded
            if (request.cancelled || this._lastQuery !== query) {
                return;
            }
            
            // Cache the results
            this._cache.set(cacheKey, {
                results: data.results || [],
                timestamp: Date.now()
            });
            
            // Limit cache size to 50 entries
            if (this._cache.size > 50) {
                const firstKey = this._cache.keys().next().value;
                this._cache.delete(firstKey);
            }
            
            if (!data.results || data.results.length === 0) {
                this.showNoSuggestions();
                return;
            }
            
            this.displaySuggestions(data.results.slice(0, 5));
        } catch (error) {
            console.error('Suggestions error:', error);
            if (!this._currentRequest?.cancelled) {
                // Show error message instead of hiding
                if (DOM.suggestionsContent && DOM.searchSuggestions) {
                    DOM.suggestionsContent.innerHTML = `
                        <div class="flex items-center justify-center p-4 text-red-400">
                            <i class="fas fa-exclamation-triangle mr-2"></i>
                            <span class="text-sm">Search error. Press Enter to try full search.</span>
                        </div>
                    `;
                    DOM.searchSuggestions.classList.remove('hidden');
                }
            }
        } finally {
            if (this._currentRequest === request) {
                this._currentRequest = null;
            }
        }
    },
    
    /**
     * Show loading state in suggestions
     */
    showSuggestionsLoading() {
        if (!DOM.suggestionsContent || !DOM.searchSuggestions) return;
        
        DOM.suggestionsContent.innerHTML = `
            <div class="flex items-center justify-center p-4 text-spotify-light-gray">
                <i class="fas fa-circle-notch fa-spin mr-2"></i>
                <span class="text-sm">Searching...</span>
            </div>
        `;
        DOM.searchSuggestions.classList.remove('hidden');
    },
    
    /**
     * Show no suggestions message
     */
    showNoSuggestions() {
        if (!DOM.suggestionsContent || !DOM.searchSuggestions) return;
        
        DOM.suggestionsContent.innerHTML = `
            <div class="flex items-center justify-center p-4 text-spotify-light-gray">
                <i class="fas fa-search mr-2"></i>
                <span class="text-sm">No results found</span>
            </div>
        `;
        DOM.searchSuggestions.classList.remove('hidden');
    },
    
    /**
     * Display suggestions dropdown
     */
    displaySuggestions(songs) {
        if (!DOM.suggestionsContent || !DOM.searchSuggestions) return;
        
        // Use DocumentFragment for faster DOM updates
        const fragment = document.createDocumentFragment();
        
        songs.forEach((song, index) => {
            const suggestion = this.createSuggestionItem(song, index);
            fragment.appendChild(suggestion);
        });
        
        // Single DOM update for better performance
        DOM.suggestionsContent.innerHTML = '';
        DOM.suggestionsContent.appendChild(fragment);
        DOM.searchSuggestions.classList.remove('hidden');
    },
    
    /**
     * Create suggestion item
     */
    createSuggestionItem(song, index) {
        const item = document.createElement('div');
        item.className = 'flex items-center gap-3 p-3 hover:bg-spotify-gray cursor-pointer transition-colors';
        
        let imageUrl = song.image_url || song.image || song.thumbnail;
        if (Array.isArray(imageUrl)) {
            imageUrl = imageUrl[imageUrl.length - 1];
        }
        if (!imageUrl) {
            imageUrl = 'https://via.placeholder.com/48x48/1DB954/FFFFFF?text=♪';
        }
        
        const title = escapeHtml(song.title || song.song || 'Unknown Title');
        const artist = escapeHtml(song.singers || song.artist || song.primary_artists || 'Unknown Artist');
        
        item.innerHTML = `
            <img src="${imageUrl}" alt="${title}" class="w-12 h-12 rounded object-cover">
            <div class="flex-1 min-w-0">
                <div class="font-semibold text-sm truncate">${title}</div>
                <div class="text-xs text-spotify-light-gray truncate">${artist}</div>
            </div>
            <i class="fas fa-play text-spotify-green opacity-0 group-hover:opacity-100"></i>
        `;
        
        item.addEventListener('click', () => {
            // Add to playlist and play
            AppState.currentPlaylist = [song];
            Player.playSong(0);
            this.hideSuggestions();
            DOM.searchInput.value = title;
        });
        
        return item;
    },
    
    /**
     * Hide suggestions dropdown
     */
    hideSuggestions() {
        DOM.searchSuggestions?.classList.add('hidden');
    },
    
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
        
        // Hide suggestions when performing full search
        this.hideSuggestions();
        
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
        console.log('📊 displayResults called with:', data);
        console.log('📦 resultsContainer:', DOM.resultsContainer);
        console.log('🔍 searchResults section:', DOM.searchResults);
        
        if (!DOM.resultsContainer) {
            console.error('❌ resultsContainer not found!');
            return;
        }
        
        this.showSearchResults();
        
        if (!data.results || data.results.length === 0) {
            console.log('⚠️ No results in data');
            DOM.resultsContainer.innerHTML = `
                <div class="col-span-full text-center py-16">
                    <i class="fas fa-search text-6xl text-spotify-light-gray mb-4"></i>
                    <p class="text-xl font-semibold mb-2">No results found</p>
                    <p class="text-spotify-light-gray">Try searching for something else</p>
                </div>
            `;
            return;
        }
        
        console.log(`✅ Displaying ${data.results.length} results`);
        
        AppState.currentPlaylist = data.results;
        
        DOM.resultsContainer.innerHTML = '';
        
        data.results.forEach((song, index) => {
            const songCard = this.createSongCard(song, index);
            DOM.resultsContainer.appendChild(songCard);
        });
        
        console.log('✅ Results displayed successfully');
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
        console.log('👁️ Showing search results section');
        console.log('Before - searchResults hidden?', DOM.searchResults?.classList.contains('hidden'));
        console.log('Before - welcomeSection hidden?', DOM.welcomeSection?.classList.contains('hidden'));
        
        DOM.searchResults?.classList.remove('hidden');
        DOM.welcomeSection?.classList.add('hidden');
        DOM.likedSongsSection?.classList.add('hidden');
        
        console.log('After - searchResults hidden?', DOM.searchResults?.classList.contains('hidden'));
        console.log('After - welcomeSection hidden?', DOM.welcomeSection?.classList.contains('hidden'));
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
