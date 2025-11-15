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
    from flask import current_app
    logger.debug("Serving main page")
    
    # Get backend URL from config or environment
    backend_url = current_app.config.get('BACKEND_URL', request.url_root.rstrip('/'))
    logger.info(f"Rendering index with backend_url: {backend_url}")
    
    return render_template('index.html', backend_url=backend_url)


@main_bp.route('/health')
def health_check():
    """Lightweight health check endpoint for monitoring."""
    import time
    from flask import current_app
    
    health_status = {
        'status': 'ok',
        'service': 'melodexa',
        'timestamp': time.time(),
        'uptime': time.process_time()
    }
    
    # Check Redis connection (optional)
    try:
        room_service = current_app.room_service
        if room_service.use_redis and room_service.redis_client:
            room_service.redis_client.ping()
            health_status['redis'] = 'connected'
    except Exception:
        health_status['redis'] = 'error'
    
    return jsonify(health_status), 200


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
