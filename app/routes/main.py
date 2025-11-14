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
    """Health check endpoint for monitoring and debugging."""
    from flask import current_app
    import time
    
    health_status = {
        'status': 'healthy',
        'service': 'syncano-backend',
        'timestamp': int(time.time()),
        'environment': current_app.config.get('FLASK_ENV', 'unknown'),
        'components': {}
    }
    
    # Check Redis connection
    try:
        room_service = current_app.room_service
        if room_service.use_redis and room_service.redis_client:
            room_service.redis_client.ping()
            health_status['components']['redis'] = 'connected'
        else:
            health_status['components']['redis'] = 'not_configured'
    except Exception as e:
        health_status['components']['redis'] = f'error: {str(e)}'
        health_status['status'] = 'degraded'
    
    # Check Music API service
    try:
        music_service = current_app.music_service
        health_status['components']['music_api'] = 'available'
    except Exception as e:
        health_status['components']['music_api'] = f'error: {str(e)}'
    
    return jsonify(health_status), 200 if health_status['status'] == 'healthy' else 503


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
