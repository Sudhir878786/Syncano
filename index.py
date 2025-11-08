"""
Simple Vercel entrypoint at repository root.

This avoids ambiguity between the `app` package and the `app` module
by importing the Flask application from the module directly and
exposing it as the name `app` (what Vercel expects).
"""

from app.app import app  # import the Flask instance created in app/app.py

__all__ = ['app']
