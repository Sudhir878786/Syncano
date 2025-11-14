"""
Socket.IO event handlers for real-time room functionality.
"""
from flask_socketio import emit, join_room, leave_room, rooms
from flask import request, current_app
import logging

logger = logging.getLogger(__name__)


def get_room_service():
    """Get room service instance from app context."""
    return current_app.room_service


def register_socketio_events(socketio):
    """
    Register all Socket.IO event handlers.
    
    Args:
        socketio: SocketIO instance
    """
    
    @socketio.on('create_room')
    def handle_create_room(data):
        """
        Create a new listening room.
        
        Data:
            username: User's display name
        """
        try:
            username = data.get('username', f'User_{request.sid[:8]}')
            
            room_service = get_room_service()
            logger.info(f"Creating room for {username}, Redis enabled: {room_service.use_redis}")
            
            room_data = room_service.create_room(request.sid, username)
            
            # Join Socket.IO room
            join_room(room_data['room_id'])
            
            # Send confirmation to creator
            emit('room_created', room_data)
            
            logger.info(f"Room {room_data['room_id']} created by {username} (Redis: {room_service.use_redis})")
            
        except Exception as e:
            logger.error(f"Error creating room: {e}")
            import traceback
            logger.error(traceback.format_exc())
            emit('error', {'message': 'Failed to create room'})
    
    @socketio.on('join_room')
    def handle_join_room(data):
        """
        Join an existing room (or rejoin with new socket ID).
        
        Data:
            room_id: ID of room to join
            username: User's display name
        """
        try:
            room_id = data.get('room_id')
            username = data.get('username', f'User_{request.sid[:8]}')
            
            if not room_id:
                emit('error', {'message': 'Room ID is required'})
                return
            
            room_service = get_room_service()
            
            # Check if room exists
            if not room_service.room_exists(room_id):
                emit('error', {'message': 'Room not found or has been closed'})
                return
            
            # Join or rejoin room
            room_data = room_service.join_room(room_id, request.sid, username)
            
            if not room_data:
                emit('error', {'message': 'Failed to join room'})
                return
            
            # Join Socket.IO room
            join_room(room_id)
            
            # Send room state to user
            emit('room_joined', room_data)
            
            # Notify other users
            emit('user_joined', {
                'username': username,
                'users': room_data['users']
            }, room=room_id, include_self=False)
            
            logger.info(f"{username} joined room {room_id}")
            
        except Exception as e:
            logger.error(f"Error joining room: {e}")
            emit('error', {'message': 'Failed to join room'})
    
    @socketio.on('play_song')
    def handle_play_song(data):
        """
        Broadcast song change to room.
        
        Data:
            room_id: Room ID
            song: Song data object
        """
        try:
            room_id = data.get('room_id')
            song = data.get('song')
            
            if not room_id or not song:
                emit('error', {'message': 'Invalid play_song data'})
                return
            
            room_service = get_room_service()
            
            if not room_service.update_song(room_id, song):
                emit('error', {'message': 'Room not found'})
                return
            
            # Broadcast to all users in room
            import time
            emit('song_changed', {
                'song': song,
                'is_playing': True,
                'current_time': 0,
                'timestamp': time.time()
            }, room=room_id)
            
            logger.debug(f"Song changed in room {room_id}: {song.get('title', 'Unknown')}")
            
        except Exception as e:
            logger.error(f"Error playing song: {e}")
            emit('error', {'message': 'Failed to play song'})
    
    @socketio.on('play_pause')
    def handle_play_pause(data):
        """
        Broadcast play/pause state to room.
        
        Data:
            room_id: Room ID
            is_playing: Playback state
            current_time: Current playback position
        """
        try:
            room_id = data.get('room_id')
            is_playing = data.get('is_playing', False)
            current_time = data.get('current_time', 0)
            
            if not room_id:
                emit('error', {'message': 'Room ID is required'})
                return
            
            room_service = get_room_service()
            
            if not room_service.update_playback(room_id, is_playing, current_time):
                emit('error', {'message': 'Room not found'})
                return
            
            # Broadcast to all users
            import time
            emit('playback_changed', {
                'is_playing': is_playing,
                'current_time': current_time,
                'timestamp': time.time()
            }, room=room_id)
            
            logger.debug(f"Playback changed in room {room_id}: {'playing' if is_playing else 'paused'}")
            
        except Exception as e:
            logger.error(f"Error handling play/pause: {e}")
            emit('error', {'message': 'Failed to update playback'})
    
    @socketio.on('seek')
    def handle_seek(data):
        """
        Broadcast seek position to room.
        
        Data:
            room_id: Room ID
            current_time: New playback position
        """
        try:
            room_id = data.get('room_id')
            current_time = data.get('current_time', 0)
            
            if not room_id:
                emit('error', {'message': 'Room ID is required'})
                return
            
            room_service = get_room_service()
            
            if not room_service.update_seek(room_id, current_time):
                emit('error', {'message': 'Room not found'})
                return
            
            # Broadcast to all users
            import time
            emit('seek_changed', {
                'current_time': current_time,
                'timestamp': time.time()
            }, room=room_id)
            
            logger.debug(f"Seek in room {room_id} to {current_time}s")
            
        except Exception as e:
            logger.error(f"Error handling seek: {e}")
            emit('error', {'message': 'Failed to seek'})
    
    @socketio.on('request_sync')
    def handle_request_sync(data):
        """
        Request current room state for manual sync (Vibe Check).
        
        Data:
            room_id: Room ID
        """
        try:
            room_id = data.get('room_id')
            
            if not room_id:
                emit('error', {'message': 'Room ID is required'})
                return
            
            room_service = get_room_service()
            room = room_service.get_room(room_id)
            
            if not room:
                emit('error', {'message': 'Room not found'})
                return
            
            # Calculate actual current playback position
            actual_current_time = room_service.get_current_playback_time(room_id)
            
            # Send current room state to requesting user only
            import time
            emit('sync_state', {
                'current_song': room.get('current_song'),
                'is_playing': room.get('is_playing', False),
                'current_time': actual_current_time,
                'timestamp': time.time()
            })
            
            logger.debug(f"Sync requested in room {room_id} by user {request.sid[:8]} - syncing to {actual_current_time:.2f}s")
            
        except Exception as e:
            logger.error(f"Error handling sync request: {e}")
            emit('error', {'message': 'Failed to sync'})
    
    @socketio.on('leave_room_request')
    def handle_leave_room_request(data):
        """
        Manually leave a room.
        
        Data:
            room_id: Room ID to leave
        """
        try:
            room_id = data.get('room_id')
            
            if not room_id:
                emit('error', {'message': 'Room ID is required'})
                return
            
            room_service = get_room_service()
            leave_result = room_service.leave_room(room_id, request.sid, force_remove=True)
            
            if not leave_result:
                emit('error', {'message': 'Failed to leave room'})
                return
            
            # Leave Socket.IO room
            leave_room(room_id)
            
            # Notify user they've left
            emit('room_left', {'room_id': room_id})
            
            if leave_result.get('room_deleted'):
                logger.info(f"Room {room_id} deleted after user left")
                return
            
            # Notify if new host assigned
            if leave_result.get('new_host'):
                emit('new_host', {
                    'new_host': leave_result['new_host']
                }, room=room_id)
            
            # Notify remaining users
            emit('user_left', {
                'username': leave_result['username'],
                'users': leave_result['users']
            }, room=room_id)
            
            logger.info(f"User manually left room {room_id}")
            
        except Exception as e:
            logger.error(f"Error handling leave room: {e}")
            emit('error', {'message': 'Failed to leave room'})
    
    @socketio.on('disconnect')
    def handle_disconnect():
        """Handle user disconnection - keep them in room for rejoin unless host."""
        try:
            user_rooms = rooms(request.sid)
            room_service = get_room_service()
            
            for room_id in user_rooms:
                if room_id == request.sid:  # Skip user's own room
                    continue
                
                # Don't force remove - allow rejoin (unless host)
                leave_result = room_service.leave_room(room_id, request.sid, force_remove=False)
                
                if not leave_result:
                    continue
                
                if leave_result.get('room_deleted'):
                    # Room deleted because host left
                    emit('room_closed', {
                        'room_id': room_id,
                        'message': 'Room closed - host disconnected'
                    }, room=room_id)
                    logger.info(f"Room {room_id} closed - host disconnected")
                    continue
                
                # If temporarily disconnected, don't notify others yet
                if not leave_result.get('temporarily_disconnected'):
                    # Notify remaining users only if permanently left
                    emit('user_left', {
                        'username': leave_result['username'],
                        'users': leave_result['users']
                    }, room=room_id)
                    
                    logger.info(f"User {leave_result['username']} left room {room_id}")
                else:
                    logger.info(f"User {leave_result['username']} disconnected from room {room_id} but can rejoin")
                
        except Exception as e:
            logger.error(f"Error handling disconnect: {e}")
    
    logger.info("Socket.IO event handlers registered")
