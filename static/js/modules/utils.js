/**
 * Utilities Module
 * Helper functions used across the application
 */

/**
 * Format seconds to MM:SS
 * @param {number} seconds - Time in seconds
 * @returns {string} Formatted time string
 */
export function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * Escape HTML special characters
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
export function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, m => map[m]);
}

/**
 * Show sync/notification indicator
 * @param {string} message - Message to show
 * @param {string} type - Type of indicator (success, error, info, syncing)
 */
export function showSyncIndicator(message, type = 'success') {
    const indicator = document.createElement('div');
    const colors = {
        'success': 'bg-green-500',
        'error': 'bg-red-500',
        'info': 'bg-blue-500',
        'syncing': 'bg-yellow-500'
    };
    indicator.className = `fixed top-4 right-4 px-4 py-2 rounded-lg font-semibold shadow-lg z-50 transition-all ${colors[type] || colors.success} text-white`;
    indicator.textContent = message;
    document.body.appendChild(indicator);
    
    setTimeout(() => {
        indicator.classList.add('opacity-100');
    }, 10);
    
    setTimeout(() => {
        indicator.classList.add('opacity-0');
        setTimeout(() => {
            indicator.remove();
        }, 300);
    }, 3000);
}

/**
 * Show error message
 * @param {string} message - Error message
 */
export function showError(message) {
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 px-4 py-2 rounded-lg font-semibold shadow-lg z-50 transition-all bg-red-500 text-white';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('opacity-100');
    }, 10);
    
    setTimeout(() => {
        toast.classList.add('opacity-0');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 4000);
}

/**
 * Update greeting based on time of day
 */
export function updateGreeting() {
    const hour = new Date().getHours();
    let greeting;
    
    if (hour < 12) {
        greeting = 'Good Morning';
    } else if (hour < 18) {
        greeting = 'Good Afternoon';
    } else {
        greeting = 'Good Evening';
    }
    
    const greetingElement = document.getElementById('greeting');
    if (greetingElement) {
        greetingElement.textContent = greeting;
    }
}

/**
 * Debounce function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
