"""
Application factory and initialization.
"""
from flask import Flask
from flask_socketio import SocketIO
from flask_cors import CORS
import logging
import os

# Initialize SocketIO
socketio = SocketIO()

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
    from .socketio_handlers import register_socketio_events
    
    # Create Flask app
    app = Flask(__name__,
                template_folder=os.path.join(os.path.dirname(os.path.dirname(__file__)), 'templates'),
                static_folder=os.path.join(os.path.dirname(os.path.dirname(__file__)), 'static'))
    
    # Load configuration
    config_class = get_config(config_name)
    app.config.from_object(config_class)
    
    # Enable CORS for frontend (Vercel) to backend (Render) communication
    CORS(app, resources={
        r"/*": {
            "origins": app.config.get('SOCKETIO_CORS_ALLOWED_ORIGINS', '*'),
            "supports_credentials": True
        }
    })
    
    # Setup logging
    setup_logger(app)
    
    # Initialize services
    app.music_service = MusicService(app.config)
    app.room_service = RoomService(redis_url=app.config.get('REDIS_URL'))
    
    logger.info(f"Initialized services: MusicService, RoomService")
    
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
    
    # Initialize Socket.IO with appropriate async_mode
    # Try eventlet first, fall back to threading if not available
    async_mode = app.config.get('SOCKETIO_ASYNC_MODE', 'threading')
    
    # Check if eventlet is available and working
    if async_mode == 'eventlet':
        try:
            import eventlet
            eventlet.monkey_patch()
            logger.info("Using eventlet async_mode for Socket.IO")
        except Exception as e:
            logger.warning(f"Eventlet not available ({e}), falling back to threading")
            async_mode = 'threading'
    
    socketio.init_app(
        app, 
        cors_allowed_origins=app.config['SOCKETIO_CORS_ALLOWED_ORIGINS'],
        async_mode=async_mode,
        logger=True,
        engineio_logger=True,
        ping_timeout=app.config['SOCKETIO_PING_TIMEOUT'],
        ping_interval=app.config['SOCKETIO_PING_INTERVAL'],
        max_http_buffer_size=app.config.get('SOCKETIO_MAX_HTTP_BUFFER_SIZE', 100000000),
        allow_upgrades=True,
        always_connect=app.config.get('SOCKETIO_ALWAYS_CONNECT', True),
        transports=['polling', 'websocket']
    )
    
    # Register Socket.IO events
    register_socketio_events(socketio)
    
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
