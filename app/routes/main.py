"""
Main application routes.
"""
from flask import Blueprint, render_template, request, jsonify
import logging

logger = logging.getLogger(__name__)

main_bp = Blueprint('main', __name__)


@main_bp.route('/')
def index():
    """Render main application page."""
    logger.debug("Serving main page")
    return render_template('index.html')


@main_bp.route('/health')
def health_check():
    """Comprehensive health check endpoint for monitoring and debugging."""
    from flask import current_app
    import time
    import sys
    import psutil
    
    health_status = {
        'status': 'healthy',
        'service': 'syncano-backend',
        'timestamp': int(time.time()),
        'environment': current_app.config.get('FLASK_ENV', 'unknown'),
        'version': '2.0.0',
        'components': {},
        'metrics': {}
    }
    
    # System metrics
    try:
        process = psutil.Process()
        memory_info = process.memory_info()
        health_status['metrics'] = {
            'cpu_percent': psutil.cpu_percent(interval=0.1),
            'memory_used_mb': round(memory_info.rss / 1024 / 1024, 2),
            'memory_percent': round(process.memory_percent(), 2),
            'uptime_seconds': int(time.time() - process.create_time()),
            'python_version': sys.version.split()[0],
            'threads': process.num_threads()
        }
    except Exception as e:
        logger.warning(f"Failed to get system metrics: {e}")
    
    # Check Redis connection
    try:
        room_service = current_app.room_service
        if room_service.use_redis and room_service.redis_client:
            start = time.time()
            room_service.redis_client.ping()
            latency = round((time.time() - start) * 1000, 2)
            health_status['components']['redis'] = {
                'status': 'connected',
                'latency_ms': latency
            }
        else:
            health_status['components']['redis'] = {
                'status': 'not_configured',
                'note': 'Using in-memory storage'
            }
    except Exception as e:
        health_status['components']['redis'] = {
            'status': 'error',
            'error': str(e)
        }
        health_status['status'] = 'degraded'
    
    # Check Music API service
    try:
        music_service = current_app.music_service
        health_status['components']['music_api'] = {
            'status': 'available',
            'provider': 'JioSaavn'
        }
    except Exception as e:
        health_status['components']['music_api'] = {
            'status': 'error',
            'error': str(e)
        }
        health_status['status'] = 'degraded'
    
    # Check Socket.IO
    try:
        from .. import socketio
        health_status['components']['socketio'] = {
            'status': 'initialized',
            'async_mode': socketio.async_mode
        }
    except Exception as e:
        health_status['components']['socketio'] = {
            'status': 'error',
            'error': str(e)
        }
    
    # Check middleware
    try:
        health_status['components']['rate_limiter'] = {
            'status': 'active',
            'backend': 'redis' if hasattr(current_app, 'rate_limiter') and current_app.rate_limiter.use_redis else 'memory'
        }
        health_status['components']['cache'] = {
            'status': 'active',
            'backend': 'redis' if hasattr(current_app, 'cache_manager') and current_app.cache_manager.use_redis else 'memory'
        }
    except Exception as e:
        logger.warning(f"Middleware health check failed: {e}")
    
    status_code = 200 if health_status['status'] == 'healthy' else 503
    return jsonify(health_status), status_code


@main_bp.route('/room/<room_id>')
def room_info(room_id):
    """
    Get information about a specific room.
    
    Args:
        room_id: Room ID to query
    """
    from ..services import RoomService
    
    room_service = RoomService()
    room = room_service.get_room(room_id)
    
    if room:
        return jsonify({
            'exists': True,
            'users_count': len(room['users']),
            'current_song': room.get('current_song'),
            'is_playing': room.get('is_playing', False)
        })
    else:
        return jsonify({'exists': False}), 404
