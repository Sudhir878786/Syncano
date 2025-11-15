"""
WSGI entrypoint for Vercel / WSGI servers.

This module creates and exposes a top-level `app` variable which points
to the Flask application instance created by the project's application
factory (in `app.__init__`). Vercel looks for one of several common
entrypoint paths such as `app/app.py` and expects an `app` object.

WebRTC Architecture:
- Flask serves REST API for music service only
- Real-time signaling handled by separate Node.js WebSocket server
- Audio streaming via WebRTC P2P (no server bandwidth)
"""
import os

from . import create_app

# Create the Flask application instance at import time so WSGI servers
# (like Vercel's Python runtime) can import the module and find `app`.
env = os.environ.get('FLASK_ENV', 'production')
app = create_app(env)
