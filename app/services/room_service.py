"""
Room Management Service
Handles collaborative listening room state and operations.
"""
import secrets
import time
from typing import Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)


class RoomService:
    """Service for managing collaborative listening rooms."""
    
    def __init__(self):
        """Initialize room service with empty room storage."""
        self.active_rooms: Dict[str, Dict[str, Any]] = {}
    
    def create_room(self, host_sid: str, username: str) -> Dict[str, Any]:
        """
        Create a new listening room.
        
        Args:
            host_sid: Socket ID of the room host
            username: Host's username
            
        Returns:
            Room data dictionary
        """
        room_id = secrets.token_urlsafe(8)
        
        self.active_rooms[room_id] = {
            'host': host_sid,
            'users': {
                host_sid: {
                    'username': username,
                    'is_host': True
                }
            },
            'current_song': None,
            'is_playing': False,
            'current_time': 0,
            'last_update': time.time(),
            'playlist': [],
            'created_at': time.time()
        }
        
        logger.info(f"Room {room_id} created by {username} (SID: {host_sid})")
        
        return {
            'room_id': room_id,
            'username': username,
            'is_host': True
        }
    
    def join_room(self, room_id: str, user_sid: str, username: str) -> Optional[Dict[str, Any]]:
        """
        Join an existing room.
        
        Args:
            room_id: ID of room to join
            user_sid: Socket ID of joining user
            username: User's username
            
        Returns:
            Room join data or None if room doesn't exist
        """
        if room_id not in self.active_rooms:
            logger.warning(f"Attempt to join non-existent room: {room_id}")
            return None
        
        room = self.active_rooms[room_id]
        
        # Add user to room
        room['users'][user_sid] = {
            'username': username,
            'is_host': False
        }
        
        logger.info(f"{username} (SID: {user_sid}) joined room {room_id}")
        
        return {
            'room_id': room_id,
            'username': username,
            'is_host': False,
            'users': list(room['users'].values()),
            'current_song': room['current_song'],
            'is_playing': room['is_playing'],
            'current_time': room['current_time'],
            'playlist': room['playlist']
        }
    
    def leave_room(self, room_id: str, user_sid: str) -> Optional[Dict[str, Any]]:
        """
        Remove user from room.
        
        Args:
            room_id: Room ID
            user_sid: Socket ID of leaving user
            
        Returns:
            Updated room data or None
        """
        if room_id not in self.active_rooms:
            return None
        
        room = self.active_rooms[room_id]
        
        if user_sid not in room['users']:
            return None
        
        user = room['users'][user_sid]
        username = user['username']
        is_host = user['is_host']
        
        # Remove user
        del room['users'][user_sid]
        
        logger.info(f"{username} left room {room_id}")
        
        # Handle host departure
        if is_host and room['users']:
            # Assign new host
            new_host_sid = next(iter(room['users']))
            room['users'][new_host_sid]['is_host'] = True
            room['host'] = new_host_sid
            
            logger.info(f"New host assigned in room {room_id}: {room['users'][new_host_sid]['username']}")
            
            return {
                'room_deleted': False,
                'new_host': room['users'][new_host_sid]['username'],
                'username': username,
                'users': list(room['users'].values())
            }
        
        # Delete room if empty
        if not room['users']:
            del self.active_rooms[room_id]
            logger.info(f"Room {room_id} deleted - no users remaining")
            return {'room_deleted': True, 'username': username}
        
        return {
            'room_deleted': False,
            'username': username,
            'users': list(room['users'].values())
        }
    
    def update_song(self, room_id: str, song: Dict[str, Any]) -> bool:
        """
        Update current song in room.
        
        Args:
            room_id: Room ID
            song: Song data dictionary
            
        Returns:
            True if successful, False otherwise
        """
        if room_id not in self.active_rooms:
            return False
        
        room = self.active_rooms[room_id]
        room['current_song'] = song
        room['is_playing'] = True
        room['current_time'] = 0
        room['last_update'] = time.time()
        
        logger.debug(f"Song updated in room {room_id}: {song.get('title', 'Unknown')}")
        return True
    
    def update_playback(self, room_id: str, is_playing: bool, current_time: float) -> bool:
        """
        Update playback state in room.
        
        Args:
            room_id: Room ID
            is_playing: Playback state
            current_time: Current playback position
            
        Returns:
            True if successful, False otherwise
        """
        if room_id not in self.active_rooms:
            return False
        
        room = self.active_rooms[room_id]
        room['is_playing'] = is_playing
        room['current_time'] = current_time
        room['last_update'] = time.time()
        
        return True
    
    def update_seek(self, room_id: str, current_time: float) -> bool:
        """
        Update playback position in room.
        
        Args:
            room_id: Room ID
            current_time: New playback position
            
        Returns:
            True if successful, False otherwise
        """
        if room_id not in self.active_rooms:
            return False
        
        room = self.active_rooms[room_id]
        room['current_time'] = current_time
        room['last_update'] = time.time()
        
        return True
    
    def get_room(self, room_id: str) -> Optional[Dict[str, Any]]:
        """
        Get room data.
        
        Args:
            room_id: Room ID
            
        Returns:
            Room data or None
        """
        return self.active_rooms.get(room_id)
    
    def get_current_playback_time(self, room_id: str) -> float:
        """
        Calculate the actual current playback position based on last update.
        
        Args:
            room_id: Room ID
            
        Returns:
            Current playback position in seconds
        """
        room = self.active_rooms.get(room_id)
        if not room:
            return 0.0
        
        current_time = room.get('current_time', 0)
        is_playing = room.get('is_playing', False)
        last_update = room.get('last_update', time.time())
        
        # If playing, calculate how much time has passed since last update
        if is_playing:
            time_elapsed = time.time() - last_update
            current_time += time_elapsed
        
        return current_time
    
    def room_exists(self, room_id: str) -> bool:
        """Check if room exists."""
        return room_id in self.active_rooms
    
    def get_all_rooms(self) -> Dict[str, Dict[str, Any]]:
        """Get all active rooms."""
        return self.active_rooms
    
    def cleanup_stale_rooms(self, max_age_hours: int = 24):
        """
        Clean up rooms older than specified age.
        
        Args:
            max_age_hours: Maximum room age in hours
        """
        current_time = time.time()
        max_age_seconds = max_age_hours * 3600
        
        stale_rooms = [
            room_id for room_id, room in self.active_rooms.items()
            if current_time - room.get('created_at', current_time) > max_age_seconds
        ]
        
        for room_id in stale_rooms:
            del self.active_rooms[room_id]
            logger.info(f"Cleaned up stale room: {room_id}")
