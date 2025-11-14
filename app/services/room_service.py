"""
Room Management Service
Handles collaborative listening room state and operations.
Uses Redis for shared state across serverless instances.
"""
import secrets
import time
import json
import os
from typing import Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)

try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False
    logger.warning("Redis not available, falling back to in-memory storage")


class RoomService:
    """Service for managing collaborative listening rooms."""
    
    def __init__(self, redis_url: Optional[str] = None):
        """
        Initialize room service with Upstash Redis or in-memory storage.
        
        Args:
            redis_url: Upstash Redis connection URL (required for production)
        """
        self.redis_client = None
        self.use_redis = False
        
        # Try to connect to Redis if URL provided
        if redis_url and REDIS_AVAILABLE:
            try:
                # Upstash Redis configuration (supports TLS by default)
                connection_kwargs = {
                    'decode_responses': True,
                    'socket_connect_timeout': 10,
                    'socket_timeout': 10,
                    'socket_keepalive': True,
                    'socket_keepalive_options': {},
                    'retry_on_timeout': True,
                    'health_check_interval': 30
                }
                
                # Upstash uses rediss:// (TLS) by default
                if redis_url.startswith('rediss://'):
                    import ssl
                    connection_kwargs['ssl_cert_reqs'] = ssl.CERT_NONE
                    connection_kwargs['ssl_check_hostname'] = False
                
                # Create connection pool for production-grade performance
                # Increased pool size for high concurrency
                self.redis_client = redis.from_url(
                    redis_url, 
                    max_connections=50,  # Increased from 20 for scalability
                    **connection_kwargs
                )
                
                # Test connection
                self.redis_client.ping()
                self.use_redis = True
                logger.info("✓ Connected to Upstash Redis for distributed room state")
            except Exception as e:
                logger.error(f"Failed to connect to Upstash Redis: {e}. Using in-memory storage.")
                self.redis_client = None
        
        # Fallback to in-memory storage (development only)
        if not self.use_redis:
            self.active_rooms: Dict[str, Dict[str, Any]] = {}
            logger.warning("⚠️ Using in-memory room storage (local development only)")
    
    def _get_room_key(self, room_id: str) -> str:
        """Get Redis key for room data."""
        return f"room:{room_id}"
    
    def _save_room(self, room_id: str, room_data: Dict[str, Any]):
        """Save room data to Redis or memory."""
        if self.use_redis:
            try:
                self.redis_client.setex(
                    self._get_room_key(room_id),
                    86400,  # 24 hour expiry
                    json.dumps(room_data)
                )
            except Exception as e:
                logger.error(f"Failed to save room {room_id} to Redis: {e}")
        else:
            self.active_rooms[room_id] = room_data
    
    def _get_room_data(self, room_id: str) -> Optional[Dict[str, Any]]:
        """Get room data from Redis or memory."""
        if self.use_redis:
            try:
                data = self.redis_client.get(self._get_room_key(room_id))
                return json.loads(data) if data else None
            except Exception as e:
                logger.error(f"Failed to get room {room_id} from Redis: {e}")
                return None
        else:
            return self.active_rooms.get(room_id)
    
    def _delete_room_data(self, room_id: str):
        """Delete room data from Redis or memory."""
        if self.use_redis:
            try:
                self.redis_client.delete(self._get_room_key(room_id))
            except Exception as e:
                logger.error(f"Failed to delete room {room_id} from Redis: {e}")
        else:
            self.active_rooms.pop(room_id, None)
    
    def create_room(self, host_sid: str, username: str) -> Dict[str, Any]:
        """
        Create a new listening room.
        
        Args:
            host_sid: Socket ID of the room host
            username: Host's username
            
        Returns:
            Room data dictionary
        """
        # Generate 5-digit numeric room ID
        room_id = str(secrets.randbelow(90000) + 10000)
        
        room_data = {
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
        
        self._save_room(room_id, room_data)
        
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
        room = self._get_room_data(room_id)
        if not room:
            logger.warning(f"Attempt to join non-existent room: {room_id}")
            return None
        
        # Add user to room
        room['users'][user_sid] = {
            'username': username,
            'is_host': False
        }
        
        self._save_room(room_id, room)
        
        logger.info(f"{username} (SID: {user_sid}) joined room {room_id}")
        
        return {
            'room_id': room_id,
            'username': username,
            'is_host': False,
            'users': list(room['users'].values()),
            'current_song': room['current_song'],
            'is_playing': room['is_playing'],
            'current_time': self.get_current_playback_time(room_id),
            'playlist': room['playlist']
        }
    
    def leave_room(self, room_id: str, user_sid: str, force_remove: bool = False) -> Optional[Dict[str, Any]]:
        """
        Remove user from room.
        
        Args:
            room_id: Room ID
            user_sid: Socket ID of leaving user
            force_remove: If True, only remove if host. If False, always remove.
            
        Returns:
            Updated room data or None
        """
        room = self._get_room_data(room_id)
        if not room:
            return None
        
        if user_sid not in room['users']:
            return None
        
        user = room['users'][user_sid]
        username = user['username']
        is_host = user['is_host']
        
        # Only delete room if host leaves explicitly
        if is_host:
            # Delete the entire room when host leaves
            self._delete_room_data(room_id)
            logger.info(f"Room {room_id} deleted - host {username} left")
            return {
                'room_deleted': True,
                'username': username,
                'is_host': True
            }
        
        # For non-host users, only remove if explicitly leaving (not just disconnecting)
        if force_remove:
            # Remove user
            del room['users'][user_sid]
            
            logger.info(f"{username} left room {room_id}")
            
            self._save_room(room_id, room)
            
            return {
                'room_deleted': False,
                'username': username,
                'users': list(room['users'].values())
            }
        
        # On disconnect (not explicit leave), keep user in room for rejoin
        logger.info(f"{username} disconnected from room {room_id} but can rejoin")
        return {
            'room_deleted': False,
            'username': username,
            'users': list(room['users'].values()),
            'temporarily_disconnected': True
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
        room = self._get_room_data(room_id)
        if not room:
            return False
        
        room['current_song'] = song
        room['is_playing'] = True
        room['current_time'] = 0
        room['last_update'] = time.time()
        
        self._save_room(room_id, room)
        
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
        room = self._get_room_data(room_id)
        if not room:
            return False
        
        room['is_playing'] = is_playing
        room['current_time'] = current_time
        room['last_update'] = time.time()
        
        self._save_room(room_id, room)
        
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
        room = self._get_room_data(room_id)
        if not room:
            return False
        
        room['current_time'] = current_time
        room['last_update'] = time.time()
        
        self._save_room(room_id, room)
        
        return True
    
    def get_room(self, room_id: str) -> Optional[Dict[str, Any]]:
        """
        Get room data.
        
        Args:
            room_id: Room ID
            
        Returns:
            Room data or None
        """
        return self._get_room_data(room_id)
    
    def get_current_playback_time(self, room_id: str) -> float:
        """
        Calculate the actual current playback position based on last update.
        
        Args:
            room_id: Room ID
            
        Returns:
            Current playback position in seconds
        """
        room = self._get_room_data(room_id)
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
        return self._get_room_data(room_id) is not None
    
    def get_all_rooms(self) -> Dict[str, Dict[str, Any]]:
        """Get all active rooms."""
        if self.use_redis:
            try:
                rooms = {}
                for key in self.redis_client.scan_iter("room:*"):
                    room_id = key.replace("room:", "")
                    room_data = self._get_room_data(room_id)
                    if room_data:
                        rooms[room_id] = room_data
                return rooms
            except Exception as e:
                logger.error(f"Failed to get all rooms from Redis: {e}")
                return {}
        else:
            return self.active_rooms
    
    def cleanup_stale_rooms(self, max_age_hours: int = 24):
        """
        Clean up rooms older than specified age.
        Note: Redis rooms auto-expire after 24 hours.
        
        Args:
            max_age_hours: Maximum room age in hours
        """
        if not self.use_redis:
            current_time = time.time()
            max_age_seconds = max_age_hours * 3600
            
            stale_rooms = [
                room_id for room_id, room in self.active_rooms.items()
                if current_time - room.get('created_at', current_time) > max_age_seconds
            ]
            
            for room_id in stale_rooms:
                del self.active_rooms[room_id]
                logger.info(f"Cleaned up stale room: {room_id}")
        # Redis rooms auto-expire, no manual cleanup needed
