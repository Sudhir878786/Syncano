#!/usr/bin/env python3
"""
WSGI Entry Point for Melodexa Deployment
This file is used by gunicorn to start the application
"""
import os
import sys

# Add project root to path
sys.path.insert(0, os.path.dirname(__file__))

from app import create_app

# Create app instance for gunicorn
env = os.environ.get('FLASK_ENV', 'production')
app = create_app(env)

if __name__ == '__main__':
    # This block is only used for local testing
    # In production, gunicorn will use the 'app' variable above
    app.run(
        host=app.config.get('HOST', '0.0.0.0'),
        port=app.config.get('PORT', 10000),
        debug=False
    )
