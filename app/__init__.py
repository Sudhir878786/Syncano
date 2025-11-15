"""
Application factory and initialization.
WebRTC-based architecture - Flask serves REST API only.
Real-time audio distribution via WebRTC P2P (no server bandwidth).
"""
from flask import Flask
from flask_cors import CORS
import logging
import os

logger = logging.getLogger(__name__)


def create_app(config_name='development'):
    """
    Application factory pattern.
    
    Args:
        config_name: Configuration environment name
        
    Returns:
        Configured Flask application instance
    """
    from config import get_config
    from .utils import setup_logger
    from .services import MusicService, RoomService
    from .routes import main_bp, api_bp
    
    # Create Flask app
    app = Flask(__name__,
                template_folder=os.path.join(os.path.dirname(os.path.dirname(__file__)), 'templates'),
                static_folder=os.path.join(os.path.dirname(os.path.dirname(__file__)), 'static'))
    
    # Load configuration
    config_class = get_config(config_name)
    app.config.from_object(config_class)
    
    # Enable CORS for frontend (Vercel) to backend (Render) communication
    # Support Vercel preview deployments - use regex pattern for wildcard domains
    cors_origins = app.config.get('SOCKETIO_CORS_ALLOWED_ORIGINS', '*')
    
    # Use regex pattern to match all Vercel domains
    if cors_origins == '*' or '*.vercel.app' in str(cors_origins):
        # Regex pattern to match all .vercel.app domains and localhost
        cors_pattern = r"^https?://([\w\-]+\.)?vercel\.app$|^https?://localhost(:\d+)?$|^https?://127\.0\.0\.1(:\d+)?$"
        
        CORS(app, resources={
            r"/*": {
                "origins": cors_pattern,
                "supports_credentials": True,
                "allow_headers": ["Content-Type", "Authorization"],
                "expose_headers": ["Content-Type"],
                "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
            }
        })
        logger.info("CORS enabled with regex pattern for all Vercel deployments")
    else:
        # Parse comma-separated list of specific origins
        origins_list = [o.strip().rstrip('/') for o in str(cors_origins).split(',') if o.strip()]
        
        CORS(app, resources={
            r"/*": {
                "origins": origins_list,
                "supports_credentials": True,
                "allow_headers": ["Content-Type", "Authorization"],
                "expose_headers": ["Content-Type"],
                "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
            }
        })
        logger.info(f"CORS enabled for specific origins: {origins_list}")
    
    # Setup logging
    setup_logger(app)
    
    # Initialize services
    app.music_service = MusicService(app.config)
    # Clean Redis URL (strip whitespace and trailing slashes)
    redis_url = app.config.get('REDIS_URL')
    if redis_url:
        redis_url = redis_url.strip().rstrip('/')
        logger.info(f"Initializing RoomService with Redis URL: SET (length: {len(redis_url)})")
        logger.info(f"Redis URL starts with: {redis_url[:20]}...")
    else:
        logger.warning("Initializing RoomService with Redis URL: NOT SET")
    app.room_service = RoomService(redis_url=redis_url)
    
    logger.info(f"Initialized services: MusicService, RoomService (Redis: {app.room_service.use_redis})")
    
    # Initialize middleware for production
    from .middleware import RateLimiter, CacheManager
    redis_client = app.room_service.redis_client if app.room_service.use_redis else None
    app.rate_limiter = RateLimiter(redis_client=redis_client)
    app.cache_manager = CacheManager(redis_client=redis_client, default_ttl=300)
    
    logger.info(f"Initialized middleware: RateLimiter, CacheManager")
    
    # Register blueprints
    app.register_blueprint(main_bp)
    app.register_blueprint(api_bp)
    
    logger.info("Registered blueprints: main, api")
    
    # WebRTC architecture - No Socket.IO needed
    # Signaling handled by Node.js WebSocket server
    # Audio distribution via P2P WebRTC connections
    logger.info("Flask app initialized for HTTP API only (WebRTC P2P architecture)")
    
    # Register error handlers
    register_error_handlers(app)
    
    # Request lifecycle hooks
    @app.before_request
    def before_request():
        """Log incoming requests."""
        from flask import request
        from .utils import log_request
        log_request(request)
    
    @app.after_request
    def after_request(response):
        """Add security headers to responses."""
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'SAMEORIGIN'
        response.headers['X-XSS-Protection'] = '1; mode=block'
        return response
    
    logger.info(f"Application initialized in {config_name} mode")
    
    return app


def register_error_handlers(app):
    """
    Register error handlers for common HTTP errors.
    
    Args:
        app: Flask application instance
    """
    @app.errorhandler(404)
    def not_found(error):
        """Handle 404 errors."""
        from flask import request
        logger.warning(f"404 error: {request.url}")
        return {'error': 'Resource not found'}, 404
    
    @app.errorhandler(500)
    def internal_error(error):
        """Handle 500 errors."""
        logger.error(f"500 error: {str(error)}")
        return {'error': 'Internal server error'}, 500
    
    @app.errorhandler(Exception)
    def handle_exception(error):
        """Handle uncaught exceptions."""
        logger.error(f"Unhandled exception: {str(error)}", exc_info=True)
        return {'error': 'An unexpected error occurred'}, 500
    
    logger.info("Error handlers registered")
