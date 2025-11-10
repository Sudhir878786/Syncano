"""
Logging configuration and setup.
"""
import logging
import os
from logging.handlers import RotatingFileHandler
from datetime import datetime


def setup_logger(app):
    """
    Configure application logging with file and console handlers.
    
    Args:
        app: Flask application instance
    """
    # Set log level from config
    log_level = getattr(logging, app.config.get('LOG_LEVEL', 'INFO'))
    
    # Create formatter
    formatter = logging.Formatter(
        '[%(asctime)s] %(levelname)s in %(module)s: %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    # Console handler (works on Vercel)
    console_handler = logging.StreamHandler()
    console_handler.setLevel(log_level)
    console_handler.setFormatter(formatter)
    
    # Try to setup file logging if not on serverless platform
    is_serverless = os.environ.get('VERCEL') or os.environ.get('AWS_LAMBDA_FUNCTION_NAME')
    
    if not is_serverless:
        try:
            # Create logs directory if it doesn't exist
            log_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'logs')
            os.makedirs(log_dir, exist_ok=True)
            
            log_file = os.path.join(log_dir, 'app.log')
            
            # File handler with rotation
            file_handler = RotatingFileHandler(
                log_file,
                maxBytes=app.config.get('LOG_MAX_BYTES', 10485760),
                backupCount=app.config.get('LOG_BACKUP_COUNT', 5)
            )
            file_handler.setLevel(log_level)
            file_handler.setFormatter(formatter)
            
            # Configure app logger with file handler
            app.logger.addHandler(file_handler)
        except (OSError, PermissionError):
            # If file logging fails, just use console
            pass
    
    # Configure app logger
    app.logger.setLevel(log_level)
    app.logger.addHandler(console_handler)
    
    # Configure root logger
    logging.basicConfig(
        level=log_level,
        handlers=[console_handler]
    )
    
    app.logger.info(f"Logging initialized - Level: {logging.getLevelName(log_level)}")


def log_request(request):
    """Log incoming HTTP request details."""
    logger = logging.getLogger(__name__)
    logger.debug(f"{request.method} {request.path} - {request.remote_addr}")


def log_error(error, context=""):
    """
    Log error with context information.
    
    Args:
        error: Exception or error message
        context: Additional context information
    """
    logger = logging.getLogger(__name__)
    if context:
        logger.error(f"{context}: {str(error)}", exc_info=True)
    else:
        logger.error(str(error), exc_info=True)
