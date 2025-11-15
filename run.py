"""
Main entry point for Melodexa Music Streaming Application.
Run this file to start the server.
Can be used directly (python run.py) or with gunicorn (gunicorn run:app)

WebRTC Architecture:
- Flask serves REST API for music service
- Signaling handled by separate Node.js server
- Audio streaming via WebRTC P2P
"""
import os
import sys

# Add project root to path
sys.path.insert(0, os.path.dirname(__file__))

from app import create_app
import logging

logger = logging.getLogger(__name__)

# Create app instance for gunicorn
env = os.environ.get('FLASK_ENV', 'development')
app = create_app(env)


def main():
    """Main application entry point for direct execution."""
    global app  # Use the module-level app instance
    
    # Get configuration
    host = app.config.get('HOST', '0.0.0.0')
    port = app.config.get('PORT', 3001)
    debug = app.config.get('DEBUG', False)
    
    # Print startup banner
    print("=" * 60)
    print("🎧 Melodexa - Listen together, anywhere")
    print("=" * 60)
    print(f"Environment: {env}")
    print(f"Server URL: http://{host}:{port}")
    print(f"Debug mode: {'ON' if debug else 'OFF'}")
    print(f"Built-in JioSaavn API: ✓ Active")
    print(f"WebRTC P2P Audio: ✓ Enabled")
    print(f"Note: Run signaling server separately on port 3001")
    print("=" * 60)
    print("Press Ctrl+C to stop the server")
    print("=" * 60)
    
    logger.info(f"Starting Melodexa Flask API server on {host}:{port}")
    
    try:
        # Run Flask app without Socket.IO (standard WSGI)
        app.run(
            host=host,
            port=port,
            debug=debug,
            use_reloader=debug
        )
    except KeyboardInterrupt:
        print("\n" + "=" * 60)
        print("Server stopped by user")
        print("=" * 60)
        logger.info("Server stopped by user interrupt")
    except Exception as e:
        logger.error(f"Server error: {e}", exc_info=True)
        sys.exit(1)


if __name__ == '__main__':
    main()
