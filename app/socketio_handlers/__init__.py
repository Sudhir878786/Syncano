"""Socket.IO handlers package initialization."""
from .room_events import register_socketio_events

__all__ = ['register_socketio_events']
