/**
 * API Client
 * Handles all HTTP requests to the backend (Render)
 */

// Get backend URL from environment or use default
const BACKEND_URL = window.BACKEND_URL || 'http://localhost:10000';

export const API = {
    /**
     * Search for songs
     * @param {string} query - Search query
     * @param {boolean} includeLyrics - Include lyrics in response
     * @param {number} limit - Limit results for faster response
     * @returns {Promise<Object>} Search results
     */
    async search(query, includeLyrics = false, limit = null) {
        const params = new URLSearchParams({
            q: query,
            lyrics: includeLyrics.toString()
        });
        
        // Add limit for suggestions (faster response)
        if (limit) {
            params.append('limit', limit.toString());
        }
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
        
        try {
            const response = await fetch(`${BACKEND_URL}/api/search?${params}`, {
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Search failed: ${response.status} - ${errorText}`);
            }
            return response.json();
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error('Search timeout - please try again');
            }
            throw error;
        }
    },
    
    /**
     * Get song details
     * @param {string} songId - Song ID
     * @param {boolean} includeLyrics - Include lyrics
     * @returns {Promise<Object>} Song data
     */
    async getSong(songId, includeLyrics = false) {
        const params = new URLSearchParams({
            lyrics: includeLyrics.toString()
        });
        
        const response = await fetch(`${BACKEND_URL}/api/song/${songId}?${params}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch song: ${response.statusText}`);
        }
        return response.json();
    },
    
    /**
     * Get lyrics for a song
     * @param {string} songId - Song ID
     * @returns {Promise<Object>} Lyrics data
     */
    async getLyrics(songId) {
        const response = await fetch(`${BACKEND_URL}/api/lyrics/${songId}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch lyrics: ${response.statusText}`);
        }
        return response.json();
    },
    
    /**
     * Get album details
     * @param {string} albumId - Album ID
     * @returns {Promise<Object>} Album data
     */
    async getAlbum(albumId) {
        const response = await fetch(`${BACKEND_URL}/api/album/${albumId}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch album: ${response.statusText}`);
        }
        return response.json();
    },
    
    /**
     * Get playlist details
     * @param {string} playlistId - Playlist ID
     * @returns {Promise<Object>} Playlist data
     */
    async getPlaylist(playlistId) {
        const response = await fetch(`${BACKEND_URL}/api/playlist/${playlistId}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch playlist: ${response.statusText}`);
        }
        return response.json();
    },
    
    /**
     * Test API connectivity
     * @returns {Promise<Object>} Test results
     */
    async test() {
        const response = await fetch(`${BACKEND_URL}/api/test`);
        if (!response.ok) {
            throw new Error(`API test failed: ${response.statusText}`);
        }
        return response.json();
    }
};
