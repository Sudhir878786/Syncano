"""
API routes for music streaming integration.
"""
from flask import Blueprint, request, jsonify, current_app
import logging
from traceback import print_exc

logger = logging.getLogger(__name__)

api_bp = Blueprint('api', __name__, url_prefix='/api')


def get_music_service():
    """Get music service instance from app context."""
    return current_app.music_service


@api_bp.route('/search')
def search():
    """
    Search for songs, artists, or albums.
    Rate limit: 30 requests per minute per IP
    
    Query Parameters:
        q: Search query (required)
        lyrics: Include lyrics (optional, default: false)
        limit: Maximum results (optional)
    """
    # Rate limiting
    rate_limiter = current_app.rate_limiter
    allowed, remaining = rate_limiter.check_rate_limit(limit=30, window=60)
    if not allowed:
        return jsonify({
            'error': 'Rate limit exceeded',
            'message': 'Maximum 30 searches per minute',
            'retry_after': 60
        }), 429
    
    query = request.args.get('q', '').strip()
    
    if not query:
        return jsonify({'error': 'Search query is required'}), 400
    
    try:
        include_lyrics = request.args.get('lyrics', 'false').lower() == 'true'
        limit = request.args.get('limit', type=int)
        
        logger.info(f"Search request: '{query}'")
        
        # Check cache first
        cache_manager = current_app.cache_manager
        cache_key = f"search:{query}:{include_lyrics}:{limit}"
        cached_result = cache_manager.get(cache_key)
        
        if cached_result:
            logger.debug(f"Cache hit for search: {query}")
            cached_result['cached'] = True
            return jsonify(cached_result)
        
        service = get_music_service()
        results = service.search_songs(query, include_lyrics=include_lyrics, limit=limit)
        
        response_data = {
            'results': results,
            'total': len(results),
            'query': query,
            'cached': False
        }
        
        # Cache for 5 minutes
        cache_manager.set(cache_key, response_data, ttl=300)
        
        return jsonify(response_data)
        
    except Exception as e:
        logger.error(f"Search error: {e}")
        print_exc()
        return jsonify({'error': 'Search failed', 'message': str(e)}), 500


@api_bp.route('/song/<song_id>')
def get_song(song_id):
    """
    Get detailed information about a song.
    Rate limit: 60 requests per minute per IP
    
    Path Parameters:
        song_id: Song ID
        
    Query Parameters:
        lyrics: Include lyrics (optional, default: false)
    """
    try:
        # Rate limiting
        rate_limiter = current_app.rate_limiter
        allowed, remaining = rate_limiter.check_rate_limit(limit=60, window=60)
        if not allowed:
            return jsonify({
                'error': 'Rate limit exceeded',
                'message': 'Maximum 60 requests per minute'
            }), 429
        
        include_lyrics = request.args.get('lyrics', 'false').lower() == 'true'
        
        service = get_music_service()
        song_data = service.get_song_details(song_id, include_lyrics=include_lyrics)
        
        if song_data:
            return jsonify(song_data)
        else:
            return jsonify({'error': 'Song not found'}), 404
            
    except Exception as e:
        logger.error(f"Error getting song {song_id}: {e}")
        print_exc()
        return jsonify({'error': 'Failed to fetch song', 'message': str(e)}), 500


@api_bp.route('/album/<album_id>')
def get_album(album_id):
    """
    Get album details with all songs.
    
    Path Parameters:
        album_id: Album ID
        
    Query Parameters:
        lyrics: Include lyrics for songs (optional, default: false)
    """
    try:
        include_lyrics = request.args.get('lyrics', 'false').lower() == 'true'
        
        service = get_music_service()
        album_data = service.get_album_details(album_id, include_lyrics=include_lyrics)
        
        if album_data:
            return jsonify(album_data)
        else:
            return jsonify({'error': 'Album not found'}), 404
            
    except Exception as e:
        logger.error(f"Error getting album {album_id}: {e}")
        print_exc()
        return jsonify({'error': 'Failed to fetch album', 'message': str(e)}), 500


@api_bp.route('/playlist/<playlist_id>')
def get_playlist(playlist_id):
    """
    Get playlist details with all songs.
    
    Path Parameters:
        playlist_id: Playlist ID
        
    Query Parameters:
        lyrics: Include lyrics for songs (optional, default: false)
    """
    try:
        include_lyrics = request.args.get('lyrics', 'false').lower() == 'true'
        
        service = get_music_service()
        playlist_data = service.get_playlist_details(playlist_id, include_lyrics=include_lyrics)
        
        if playlist_data:
            return jsonify(playlist_data)
        else:
            return jsonify({'error': 'Playlist not found'}), 404
            
    except Exception as e:
        logger.error(f"Error getting playlist {playlist_id}: {e}")
        print_exc()
        return jsonify({'error': 'Failed to fetch playlist', 'message': str(e)}), 500


@api_bp.route('/lyrics/<song_id>')
def get_lyrics(song_id):
    """
    Get lyrics for a song.
    Rate limit: 40 requests per minute per IP
    
    Path Parameters:
        song_id: Song ID
    """
    try:
        # Rate limiting
        rate_limiter = current_app.rate_limiter
        allowed, remaining = rate_limiter.check_rate_limit(limit=40, window=60)
        if not allowed:
            return jsonify({
                'error': 'Rate limit exceeded',
                'message': 'Maximum 40 requests per minute'
            }), 429
        
        service = get_music_service()
        lyrics = service.get_lyrics(song_id)
        
        return jsonify({
            'status': True,
            'song_id': song_id,
            'lyrics': lyrics
        })
        
    except Exception as e:
        logger.error(f"Error getting lyrics for {song_id}: {e}")
        print_exc()
        return jsonify({
            'status': False,
            'error': 'Failed to fetch lyrics',
            'message': str(e)
        }), 500


@api_bp.route('/test')
def test_api():
    """Test API functionality."""
    try:
        service = get_music_service()
        results = service.search_songs("test", limit=5)
        
        return jsonify({
            'status': 'success',
            'message': 'Music API is working',
            'test_results': len(results),
            'sample': results[0] if results else None
        })
        
    except Exception as e:
        logger.error(f"API test failed: {e}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500
