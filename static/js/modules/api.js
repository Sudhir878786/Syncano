/**
 * API Client
 * Handles all HTTP requests to the backend
 */

export const API = {
    /**
     * Search for songs
     * @param {string} query - Search query
     * @param {boolean} includeLyrics - Include lyrics in response
     * @returns {Promise<Object>} Search results
     */
    async search(query, includeLyrics = false) {
        const params = new URLSearchParams({
            q: query,
            lyrics: includeLyrics.toString()
        });
        
        const response = await fetch(`/api/search?${params}`);
        if (!response.ok) {
            throw new Error(`Search failed: ${response.statusText}`);
        }
        return response.json();
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
        
        const response = await fetch(`/api/song/${songId}?${params}`);
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
        const response = await fetch(`/api/lyrics/${songId}`);
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
        const response = await fetch(`/api/album/${albumId}`);
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
        const response = await fetch(`/api/playlist/${playlistId}`);
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
        const response = await fetch('/api/test');
        if (!response.ok) {
            throw new Error(`API test failed: ${response.statusText}`);
        }
        return response.json();
    }
};
