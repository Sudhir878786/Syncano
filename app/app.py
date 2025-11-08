"""
Vercel WSGI entrypoint for the Syncano Flask app.

This module is imported by Vercel during build/deploy. It must expose
the Flask WSGI application object named `app`.

It uses the application's factory `create_app` from the package so
the app is configured the same way as when running locally.
"""
import os

# Use a package-relative import to avoid accidental absolute import loops
from . import create_app, socketio  # socketio is initialized by create_app


# Respect FLASK_ENV or ENV; default to production for Vercel
env = os.environ.get('FLASK_ENV', os.environ.get('ENV', 'production'))

# Create the Flask application instance using the factory
app = create_app(env)

# Export socketio too in case a custom runner needs it
__all__ = ['app', 'socketio']
