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
    """Health check endpoint for monitoring."""
    return jsonify({
        'status': 'healthy',
        'service': 'syncano-music-app'
    }), 200


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
