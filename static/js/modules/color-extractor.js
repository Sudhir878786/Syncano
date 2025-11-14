/**
 * Color Extractor Module
 * Extracts dominant colors from album art using Canvas API
 * Applies AI-generated mood colors dynamically
 */

export const ColorExtractor = {
    currentColors: {
        primary: '#1DB954',
        secondary: '#1ed760',
        shadow: 'rgba(29, 185, 84, 0.3)'
    },
    
    /**
     * Extract dominant colors from an image URL
     * @param {string} imageUrl - URL of the album art
     * @returns {Promise<Object>} Object containing color information
     */
    async extractColors(imageUrl) {
        return new Promise((resolve, reject) => {
            // Create temporary image element
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            
            img.onload = () => {
                try {
                    const colors = this.analyzeImage(img);
                    this.currentColors = colors;
                    resolve(colors);
                } catch (error) {
                    console.error('Error analyzing image:', error);
                    reject(error);
                }
            };
            
            img.onerror = () => {
                console.error('Failed to load image for color extraction');
                reject(new Error('Image load failed'));
            };
            
            // Handle CORS by using a proxy or ensuring proper headers
            img.src = imageUrl;
        });
    },
    
    /**
     * Analyze image and extract color palette
     * @param {HTMLImageElement} img - Image element to analyze
     * @returns {Object} Color palette object
     */
    analyzeImage(img) {
        // Create canvas for color sampling
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Use smaller size for performance
        const size = 100;
        canvas.width = size;
        canvas.height = size;
        
        // Draw image scaled down
        ctx.drawImage(img, 0, 0, size, size);
        
        // Get image data
        const imageData = ctx.getImageData(0, 0, size, size);
        const pixels = imageData.data;
        
        // Extract colors
        const colors = this.extractDominantColors(pixels, size * size);
        
        return colors;
    },
    
    /**
     * Extract dominant colors from pixel data
     * @param {Uint8ClampedArray} pixels - Pixel data from canvas
     * @param {number} pixelCount - Total number of pixels
     * @returns {Object} Dominant color palette
     */
    extractDominantColors(pixels, pixelCount) {
        // Color buckets for clustering
        const colorBuckets = {};
        
        // Sample every 4th pixel for performance
        for (let i = 0; i < pixels.length; i += 16) { // RGBA = 4 bytes, skip 4 pixels
            const r = pixels[i];
            const g = pixels[i + 1];
            const b = pixels[i + 2];
            const a = pixels[i + 3];
            
            // Skip transparent or very dark/light pixels
            if (a < 125 || (r + g + b) < 50 || (r + g + b) > 720) {
                continue;
            }
            
            // Quantize colors (reduce precision for clustering)
            const qr = Math.round(r / 32) * 32;
            const qg = Math.round(g / 32) * 32;
            const qb = Math.round(b / 32) * 32;
            
            const key = `${qr},${qg},${qb}`;
            colorBuckets[key] = (colorBuckets[key] || 0) + 1;
        }
        
        // Sort by frequency
        const sortedColors = Object.entries(colorBuckets)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5); // Top 5 colors
        
        if (sortedColors.length === 0) {
            // Fallback to default Spotify green
            return {
                primary: '#1DB954',
                secondary: '#1ed760',
                shadow: 'rgba(29, 185, 84, 0.3)',
                gradient: 'linear-gradient(135deg, #1DB954 0%, #1ed760 100%)'
            };
        }
        
        // Get most vibrant color as primary
        const primaryRgb = sortedColors[0][0].split(',').map(Number);
        const primary = this.rgbToHex(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
        
        // Generate complementary colors
        const secondary = this.lightenColor(primary, 20);
        const shadow = this.hexToRgba(primary, 0.3);
        const gradient = `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)`;
        
        return {
            primary,
            secondary,
            shadow,
            gradient,
            vibrant: this.getMostVibrant(sortedColors),
            muted: this.getMostMuted(sortedColors)
        };
    },
    
    /**
     * Get most vibrant color from color list
     */
    getMostVibrant(colors) {
        let maxSaturation = 0;
        let vibrant = colors[0][0];
        
        colors.forEach(([rgbStr]) => {
            const rgb = rgbStr.split(',').map(Number);
            const saturation = this.calculateSaturation(rgb[0], rgb[1], rgb[2]);
            
            if (saturation > maxSaturation) {
                maxSaturation = saturation;
                vibrant = rgbStr;
            }
        });
        
        const rgb = vibrant.split(',').map(Number);
        return this.rgbToHex(rgb[0], rgb[1], rgb[2]);
    },
    
    /**
     * Get most muted color from color list
     */
    getMostMuted(colors) {
        let minSaturation = Infinity;
        let muted = colors[0][0];
        
        colors.forEach(([rgbStr]) => {
            const rgb = rgbStr.split(',').map(Number);
            const saturation = this.calculateSaturation(rgb[0], rgb[1], rgb[2]);
            
            if (saturation < minSaturation && saturation > 0.1) {
                minSaturation = saturation;
                muted = rgbStr;
            }
        });
        
        const rgb = muted.split(',').map(Number);
        return this.rgbToHex(rgb[0], rgb[1], rgb[2]);
    },
    
    /**
     * Calculate color saturation
     */
    calculateSaturation(r, g, b) {
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const delta = max - min;
        
        if (max === 0) return 0;
        return delta / max;
    },
    
    /**
     * Convert RGB to HEX
     */
    rgbToHex(r, g, b) {
        return '#' + [r, g, b].map(x => {
            const hex = x.toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        }).join('');
    },
    
    /**
     * Convert HEX to RGBA
     */
    hexToRgba(hex, alpha) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    },
    
    /**
     * Lighten a hex color by percentage
     */
    lightenColor(hex, percent) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        
        const newR = Math.min(255, Math.round(r + (255 - r) * percent / 100));
        const newG = Math.min(255, Math.round(g + (255 - g) * percent / 100));
        const newB = Math.min(255, Math.round(b + (255 - b) * percent / 100));
        
        return this.rgbToHex(newR, newG, newB);
    },
    
    /**
     * Apply colors to UI elements
     * @param {Object} colors - Color palette to apply
     */
    applyColors(colors) {
        const root = document.documentElement;
        
        // Set CSS custom properties
        root.style.setProperty('--accent-color', colors.primary);
        root.style.setProperty('--accent-color-light', colors.secondary);
        root.style.setProperty('--shadow-color', colors.shadow);
        root.style.setProperty('--card-color', this.hexToRgba(colors.primary, 0.1));
        root.style.setProperty('--card-shadow', colors.shadow);
        root.style.setProperty('--album-color', colors.primary);
        root.style.setProperty('--waveform-color', colors.primary);
        root.style.setProperty('--glow-color', colors.shadow);
        
        // Apply to specific elements
        this.applyToPlayer(colors);
        this.applyToCards(colors);
    },
    
    /**
     * Apply colors to player
     */
    applyToPlayer(colors) {
        const albumArt = document.querySelector('.album-art-glow');
        if (albumArt) {
            albumArt.classList.add('playing');
        }
        
        // Add subtle background gradient
        const player = document.getElementById('player');
        if (player) {
            player.style.background = `
                linear-gradient(
                    to top,
                    ${this.hexToRgba(colors.primary, 0.15)} 0%,
                    rgba(18, 18, 18, 0.95) 50%
                )
            `;
        }
    },
    
    /**
     * Apply colors to song cards
     */
    applyToCards(colors) {
        const cards = document.querySelectorAll('.card-song');
        cards.forEach(card => {
            card.style.setProperty('--card-color', this.hexToRgba(colors.primary, 0.1));
            card.style.setProperty('--card-shadow', colors.shadow);
        });
    },
    
    /**
     * Reset to default colors
     */
    resetColors() {
        const defaultColors = {
            primary: '#1DB954',
            secondary: '#1ed760',
            shadow: 'rgba(29, 185, 84, 0.3)'
        };
        
        this.currentColors = defaultColors;
        this.applyColors(defaultColors);
    },
    
    /**
     * Extract and apply colors from current song
     * @param {string} albumArtUrl - Album art image URL
     */
    async updateColorsFromAlbum(albumArtUrl) {
        if (!albumArtUrl) {
            this.resetColors();
            return;
        }
        
        try {
            console.log('🎨 Extracting colors from album art...');
            const colors = await this.extractColors(albumArtUrl);
            console.log('✨ Colors extracted:', colors);
            
            this.applyColors(colors);
            
            // Dispatch event for other modules
            window.dispatchEvent(new CustomEvent('colorsExtracted', {
                detail: { colors }
            }));
        } catch (error) {
            console.error('❌ Color extraction failed:', error);
            this.resetColors();
        }
    }
};
