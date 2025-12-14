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
                        <div class="flex items-center justify-center p-2 text-red-400">
                            <i class="fas fa-exclamation-triangle mr-2 text-xs"></i>
                            <span class="text-xs">Error. Press Enter for full search.</span>
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
            <div class="flex items-center justify-center p-2 text-spotify-light-gray">
                <i class="fas fa-circle-notch fa-spin mr-2 text-xs"></i>
                <span class="text-xs">Searching...</span>
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
            <div class="flex items-center justify-center p-2 text-spotify-light-gray">
                <i class="fas fa-search mr-2 text-xs"></i>
                <span class="text-xs">No results found</span>
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
        item.className = 'suggestion-item';

        let imageUrl = song.image_url || song.image || song.thumbnail;
        if (Array.isArray(imageUrl)) {
            imageUrl = imageUrl[imageUrl.length - 1];
        }
        if (!imageUrl) {
            imageUrl = 'https://via.placeholder.com/40x40/1DB954/FFFFFF?text=♪';
        }

        const title = escapeHtml(song.title || song.song || 'Unknown Title');
        const artist = escapeHtml(song.singers || song.artist || song.primary_artists || 'Unknown Artist');

        item.innerHTML = `
            <img src="${imageUrl}" alt="${title}" style="flex-shrink: 0;">
            <div style="flex: 1; min-width: 0; overflow: hidden; display: flex; flex-direction: column; gap: 2px;">
                <div style="font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: white; line-height: 1.2;">${title}</div>
                <div style="color: #b3b3b3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.2;">${artist}</div>
            </div>
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
     * Create song row element
     * @param {Object} song - Song object
     * @param {number} index - Song index
     * @returns {HTMLElement}
     */
    createSongCard(song, index) {
        const row = document.createElement('div');
        row.className = 'song-row cursor-pointer transition-colors hover:bg-white/10 rounded-md group';
        row.dataset.songId = Player.getSongId(song);

        let imageUrl = song.image_url || song.image || song.thumbnail;
        if (Array.isArray(imageUrl)) {
            imageUrl = imageUrl[imageUrl.length - 1];
        }
        if (!imageUrl) {
            imageUrl = 'https://via.placeholder.com/40x40/1DB954/FFFFFF?text=♪';
        }

        const title = escapeHtml(song.title || song.song || 'Unknown Title');
        const artist = escapeHtml(song.singers || song.artist || song.primary_artists || 'Unknown Artist');
        const album = escapeHtml(song.album || song.album_name || '');
        const duration = song.duration ? this.formatTime(song.duration) : '--:--';

        const liked = Player.isSongLiked(song);
        const likeIconClass = liked ? 'fas' : 'far';
        const likeBtnClass = liked ? 'text-spotify-green' : 'text-gray-400 group-hover:text-white';

        row.innerHTML = `
            <div class="index text-gray-400 w-4 text-right text-sm group-hover:hidden">${index + 1}</div>
            <div class="index text-spotify-green w-4 text-right text-sm hidden group-hover:block"><i class="fas fa-play"></i></div>
            
            <div class="title-col flex items-center gap-3 overflow-hidden">
                <img src="${imageUrl}" alt="${title}" class="w-10 h-10 rounded object-cover flex-shrink-0">
                <div class="song-info-text flex flex-col overflow-hidden">
                    <span class="song-title text-white text-sm font-medium truncate">${title}</span>
                    <span class="sub-text text-gray-400 text-xs truncate">${artist}</span>
                </div>
            </div>
            
            <div class="album-col sub-text text-gray-400 text-sm truncate hidden md:block">${album}</div>
            <div class="duration-col sub-text text-gray-400 text-sm text-right font-mono hidden sm:block">${duration}</div>
            
            <div class="actions-col flex justify-end">
                <button class="like-btn ${likeBtnClass} transition-colors p-2">
                    <i class="${likeIconClass} fa-heart"></i>
                </button>
            </div>
        `;

        // Add click handlers
        const likeBtn = row.querySelector('.like-btn');

        const playHandler = (e) => {
            if (e.target.closest('.like-btn')) return;
            Player.playSong(index);
        };

        const likeHandler = (e) => {
            e.stopPropagation();
            Player.toggleLikeSong(song);
            // Update icon state immediately for better UX
            const newLiked = Player.isSongLiked(song);
            const icon = likeBtn.querySelector('i');
            icon.classList.toggle('fas', newLiked);
            icon.classList.toggle('far', !newLiked);
            likeBtn.classList.toggle('text-spotify-green', newLiked);
            likeBtn.classList.toggle('text-gray-400', !newLiked);
        };

        row.addEventListener('click', playHandler);
        likeBtn?.addEventListener('click', likeHandler);

        return row;
    },

    formatTime(seconds) {
        if (!seconds) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
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
