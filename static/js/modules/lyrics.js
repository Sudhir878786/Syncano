/**
 * Lyrics Manager Module
 * Handles lyrics fetching and display
 */

import { DOM } from './dom.js';
import { AppState } from './state.js';
import { escapeHtml } from './utils.js';
import { API } from './api.js';

export const LyricsManager = {
    /**
     * Fetch and display lyrics
     * @param {string} songId - Song ID
     */
    async fetchLyrics(songId) {
        if (!songId) return;
        
        try {
            // Show loading state
            if (DOM.lyricsContent) {
                DOM.lyricsContent.innerHTML = `
                    <div class="lyrics-loading">
                        <span class="terminal-comment"># Fetching lyrics...</span>
                    </div>
                `;
            }
            
            this.showLyricsTerminal();
            
            const data = await API.getLyrics(songId);
            
            if (data.lyrics) {
                this.displayLyrics(data.lyrics);
            } else {
                this.displayNoLyrics();
            }
        } catch (error) {
            console.error('Error fetching lyrics:', error);
            this.displayLyricsError();
        }
    },
    
    /**
     * Display lyrics in terminal
     * @param {string} lyrics - Lyrics text
     */
    displayLyrics(lyrics) {
        if (!DOM.lyricsContent) return;
        
        // Parse HTML <br> tags to convert to actual line breaks
        const cleanedLyrics = lyrics
            .replace(/<br\s*\/?>/gi, '\n')  // Replace <br> with newline
            .replace(/<[^>]+>/g, '')         // Remove any other HTML tags
            .replace(/&nbsp;/g, ' ')         // Replace &nbsp; with space
            .replace(/&amp;/g, '&')          // Replace &amp; with &
            .replace(/&lt;/g, '<')           // Replace &lt; with <
            .replace(/&gt;/g, '>')           // Replace &gt; with >
            .replace(/&quot;/g, '"');        // Replace &quot; with "
        
        const lines = cleanedLyrics.split('\n').filter(line => line.trim());
        
        DOM.lyricsContent.innerHTML = '';
        
        // Clear any existing interval
        if (AppState.lyricsInterval) {
            clearInterval(AppState.lyricsInterval);
            AppState.lyricsInterval = null;
        }
        
        // Display all lines at once
        lines.forEach((line) => {
            const lineElement = document.createElement('div');
            lineElement.classList.add('lyrics-line');
            lineElement.innerHTML = `<span class="terminal-string">${escapeHtml(line)}</span>`;
            DOM.lyricsContent.appendChild(lineElement);
        });
        
        this.addTerminalCursor();
    },
    
    /**
     * Display no lyrics available message
     */
    displayNoLyrics() {
        if (!DOM.lyricsContent) return;
        
        DOM.lyricsContent.innerHTML = `
            <div class="lyrics-error">
                <span class="terminal-comment"># No lyrics available for this song</span>
            </div>
        `;
    },
    
    /**
     * Display lyrics error message
     */
    displayLyricsError() {
        if (!DOM.lyricsContent) return;
        
        DOM.lyricsContent.innerHTML = `
            <div class="lyrics-error">
                <span class="terminal-error"># Error loading lyrics</span>
            </div>
        `;
    },
    
    /**
     * Add blinking cursor to terminal
     */
    addTerminalCursor() {
        if (!DOM.lyricsContent) return;
        
        const cursor = document.createElement('span');
        cursor.className = 'terminal-cursor';
        cursor.textContent = '█';
        DOM.lyricsContent.appendChild(cursor);
    },
    
    /**
     * Show lyrics terminal
     */
    showLyricsTerminal() {
        if (DOM.lyricsTerminal) {
            DOM.lyricsTerminal.classList.remove('hidden');
        }
    },
    
    /**
     * Hide lyrics terminal
     */
    hideLyricsTerminal() {
        if (DOM.lyricsTerminal) {
            DOM.lyricsTerminal.classList.add('hidden');
        }
    },
    
    /**
     * Toggle lyrics terminal visibility
     */
    toggleLyricsTerminal() {
        if (!DOM.lyricsTerminal) return;
        
        if (DOM.lyricsTerminal.classList.contains('hidden')) {
            this.showLyricsTerminal();
        } else {
            this.hideLyricsTerminal();
        }
    }
};
