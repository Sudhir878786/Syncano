"""
WSGI entrypoint for Vercel / WSGI servers.

This module creates and exposes a top-level `app` variable which points
to the Flask application instance created by the project's application
factory (in `app.__init__`). Vercel looks for one of several common
entrypoint paths such as `app/app.py` and expects an `app` object.
"""
import os

from . import create_app, socketio  # socketio is initialized at package level

# Create the Flask application instance at import time so WSGI servers
# (like Vercel's Python runtime) can import the module and find `app`.
env = os.environ.get('FLASK_ENV', 'production')
app = create_app(env)

# socketio is available as the package-level `socketio` (if needed by server)
# Do NOT call socketio.run() here; server should run the app via WSGI.
