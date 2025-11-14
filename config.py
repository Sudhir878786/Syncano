"""
Application Configuration
Centralized configuration management for the Syncano music streaming application.
"""
import os
from datetime import timedelta


class Config:
    """Base configuration class with common settings."""
    
    # Flask Settings
    SECRET_KEY = os.environ.get('SECRET_KEY', 'syncano-secret-key-change-in-production')
    DEBUG = False
    TESTING = False
    
    # Server Settings
    HOST = os.environ.get('HOST', '0.0.0.0')
    PORT = int(os.environ.get('PORT', 10000))  # Render default port
    
    # CORS Settings for Vercel frontend + Render backend
    FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:5173')
    BACKEND_URL = os.environ.get('BACKEND_URL', 'http://localhost:10000')
    
    # Socket.IO Settings - Optimized to prevent disconnections
    SOCKETIO_CORS_ALLOWED_ORIGINS = os.environ.get('CORS_ORIGINS', '*')
    SOCKETIO_PING_TIMEOUT = 120  # Increased from 60 to prevent disconnects
    SOCKETIO_PING_INTERVAL = 25  # Keep pings frequent
    SOCKETIO_MAX_HTTP_BUFFER_SIZE = 100000000  # 100MB for large payloads
    SOCKETIO_ALWAYS_CONNECT = True
    # Use threading by default, eventlet if explicitly set and available
    SOCKETIO_ASYNC_MODE = os.environ.get('SOCKETIO_ASYNC_MODE', 'threading')
    
    # Session Settings
    PERMANENT_SESSION_LIFETIME = timedelta(hours=24)
    SESSION_COOKIE_SECURE = False
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    
    # Redis Settings (Upstash Redis for distributed room state)
    REDIS_URL = os.environ.get('REDIS_URL', None)
    REDIS_SSL = os.environ.get('REDIS_SSL', 'true').lower() == 'true'
    
    # Music API Settings
    MUSIC_API_BASE_URL = "https://www.jiosaavn.com/api.php"
    MUSIC_API_DECRYPT_KEY = b"38346591"
    MUSIC_API_REQUEST_TIMEOUT = 15
    
    # API Endpoints
    MUSIC_API_SEARCH_ENDPOINT = f"{MUSIC_API_BASE_URL}?__call=autocomplete.get&_format=json&_marker=0&cc=in&includeMetaTags=1&query="
    MUSIC_API_SONG_DETAILS_ENDPOINT = f"{MUSIC_API_BASE_URL}?__call=song.getDetails&cc=in&_marker=0%3F_marker%3D0&_format=json&pids="
    MUSIC_API_ALBUM_DETAILS_ENDPOINT = f"{MUSIC_API_BASE_URL}?__call=content.getAlbumDetails&_format=json&cc=in&_marker=0%3F_marker%3D0&albumid="
    MUSIC_API_PLAYLIST_DETAILS_ENDPOINT = f"{MUSIC_API_BASE_URL}?__call=playlist.getDetails&_format=json&cc=in&_marker=0%3F_marker%3D0&listid="
    MUSIC_API_LYRICS_ENDPOINT = f"{MUSIC_API_BASE_URL}?__call=lyrics.getLyrics&ctx=web6dot0&api_version=4&_format=json&_marker=0%3F_marker%3D0&lyrics_id="
    
    # Application Settings
    MAX_SEARCH_RESULTS = 20
    DEFAULT_AUDIO_QUALITY = '320kbps'
    FALLBACK_AUDIO_QUALITY = '160kbps'
    
    # Logging Settings
    LOG_LEVEL = os.environ.get('LOG_LEVEL', 'INFO')
    LOG_FILE = os.path.join(os.path.dirname(__file__), 'logs', 'app.log')
    LOG_MAX_BYTES = 10485760  # 10MB
    LOG_BACKUP_COUNT = 5


class DevelopmentConfig(Config):
    """Development environment configuration."""
    DEBUG = True
    LOG_LEVEL = 'DEBUG'


class ProductionConfig(Config):
    """Production environment configuration for Render backend."""
    DEBUG = False
    SESSION_COOKIE_SECURE = True
    LOG_LEVEL = 'INFO'
    
    # Production CORS - allow Vercel frontend
    SOCKETIO_CORS_ALLOWED_ORIGINS = os.environ.get(
        'CORS_ORIGINS', 
        'https://*.vercel.app'
    )
    
    # Longer timeouts for production to handle network latency
    SOCKETIO_PING_TIMEOUT = 180  # 3 minutes
    SOCKETIO_PING_INTERVAL = 30   # Ping every 30 seconds


class TestingConfig(Config):
    """Testing environment configuration."""
    TESTING = True
    DEBUG = True


# Configuration dictionary for easy access
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}


def get_config(env=None):
    """Get configuration based on environment."""
    env = env or os.environ.get('FLASK_ENV', 'development')
    return config.get(env, config['default'])
