"""
Music API Service
Handles all interactions with music API endpoints for Melodexa.
"""
import requests
import json
from typing import List, Dict, Any, Optional
import logging
from ..utils import (
    format_string, decrypt_url, get_quality_url, 
    clean_json_response, get_image_url, safe_get
)

logger = logging.getLogger(__name__)


class MusicService:
    """Service class for music API operations."""
    
    def __init__(self, config):
        """
        Initialize music service with configuration.
        
        Args:
            config: Application configuration object (Flask config dict)
        """
        self.config = config
        self.timeout = config['MUSIC_API_REQUEST_TIMEOUT']
        self.decrypt_key = config['MUSIC_API_DECRYPT_KEY']
        
    def format_song_data(self, data: Dict[str, Any], include_lyrics: bool = False) -> Dict[str, Any]:
        """
        Format raw song data from API into clean structure.
        
        Args:
            data: Raw song data from API
            include_lyrics: Whether to fetch and include lyrics
            
        Returns:
            Formatted song data dictionary
        """
        try:
            # Decrypt media URL
            encrypted_url = data.get('encrypted_media_url', '')
            if encrypted_url:
                media_url = decrypt_url(encrypted_url, self.decrypt_key)
                
                # Adjust quality based on availability
                if data.get('320kbps') == "true":
                    data['media_url'] = get_quality_url(media_url, '320kbps')
                else:
                    data['media_url'] = get_quality_url(media_url, '160kbps')
            else:
                # Fallback URL construction
                preview_url = data.get('media_preview_url', '')
                data['media_url'] = preview_url.replace("preview", "aac").replace("_96_p.mp4", "_320.mp4" if data.get('320kbps') == "true" else "_160.mp4")
            
            # Format text fields
            data['song'] = format_string(safe_get(data, 'song'))
            data['music'] = format_string(safe_get(data, 'music'))
            data['singers'] = format_string(safe_get(data, 'singers'))
            data['starring'] = format_string(safe_get(data, 'starring'))
            data['album'] = format_string(safe_get(data, 'album'))
            data['primary_artists'] = format_string(safe_get(data, 'primary_artists'))
            
            # High quality image
            if 'image' in data:
                data['image'] = get_image_url(data['image'], 'high')
            
            # Add lyrics if requested
            if include_lyrics and data.get('has_lyrics') == 'true':
                data['lyrics'] = self.get_lyrics(data['id'])
            elif include_lyrics:
                data['lyrics'] = None
            
            # Format copyright
            if 'copyright_text' in data:
                data['copyright_text'] = data['copyright_text'].replace("&copy;", "©")
            
            # Add convenient frontend fields
            data['title'] = data.get('song', '')
            data['artist'] = data.get('singers', '')
            data['url'] = data.get('media_url', '')
            data['image_url'] = data.get('image', '')
            
            return data
            
        except Exception as e:
            logger.error(f"Error formatting song data: {e}")
            return data
    
    def search_songs(self, query: str, include_lyrics: bool = False, 
                    get_details: bool = True, limit: int = None) -> List[Dict[str, Any]]:
        """
        Search for songs.
        
        Args:
            query: Search query string
            include_lyrics: Whether to include lyrics
            get_details: Whether to fetch detailed info
            limit: Maximum results (None uses config default)
            
        Returns:
            List of song dictionaries
        """
        try:
            # Check if query is a URL
            if query.startswith('http') and 'saavn.com' in query:
                song_id = self._extract_song_id(query)
                if song_id:
                    song = self.get_song_details(song_id, include_lyrics)
                    return [song] if song else []
            
            # Perform search
            search_url = f"{self.config['MUSIC_API_SEARCH_ENDPOINT']}{query}"
            response = requests.get(search_url, timeout=self.timeout)
            response.raise_for_status()
            
            # Clean and parse response
            text = response.text.encode().decode('unicode-escape')
            text = clean_json_response(text)
            data = json.loads(text)
            
            songs_data = data.get('songs', {}).get('data', [])
            
            if not get_details:
                return songs_data
            
            # Get detailed info for each song
            max_results = limit or self.config['MAX_SEARCH_RESULTS']
            songs = []
            
            for song in songs_data[:max_results]:
                song_id = song.get('id')
                if song_id:
                    detailed_song = self.get_song_details(song_id, include_lyrics)
                    if detailed_song:
                        songs.append(detailed_song)
            
            logger.info(f"Search for '{query}' returned {len(songs)} results")
            return songs
            
        except requests.RequestException as e:
            logger.error(f"Search request failed: {e}")
            return []
        except Exception as e:
            logger.error(f"Search error: {e}")
            return []
    
    def get_song_details(self, song_id: str, include_lyrics: bool = False) -> Optional[Dict[str, Any]]:
        """
        Get detailed information about a specific song.
        
        Args:
            song_id: Song ID
            include_lyrics: Whether to include lyrics
            
        Returns:
            Song data dictionary or None
        """
        try:
            url = f"{self.config['MUSIC_API_SONG_DETAILS_ENDPOINT']}{song_id}"
            response = requests.get(url, timeout=self.timeout)
            response.raise_for_status()
            
            text = response.text.encode().decode('unicode-escape')
            data = json.loads(text)
            
            if song_id in data:
                return self.format_song_data(data[song_id], include_lyrics)
            
            logger.warning(f"Song {song_id} not found in response")
            return None
            
        except Exception as e:
            logger.error(f"Error getting song details for {song_id}: {e}")
            return None
    
    def get_album_details(self, album_id: str, include_lyrics: bool = False) -> Optional[Dict[str, Any]]:
        """
        Get album details with all songs.
        
        Args:
            album_id: Album ID
            include_lyrics: Whether to include lyrics for songs
            
        Returns:
            Album data dictionary or None
        """
        try:
            url = f"{self.config['MUSIC_API_ALBUM_DETAILS_ENDPOINT']}{album_id}"
            response = requests.get(url, timeout=self.timeout)
            response.raise_for_status()
            
            text = response.text.encode().decode('unicode-escape')
            data = json.loads(text)
            
            # Format album metadata
            data['image'] = get_image_url(data.get('image', ''), 'high')
            data['name'] = format_string(safe_get(data, 'name'))
            data['primary_artists'] = format_string(safe_get(data, 'primary_artists'))
            data['title'] = format_string(safe_get(data, 'title'))
            
            # Format songs
            for song in data.get('songs', []):
                self.format_song_data(song, include_lyrics)
            
            logger.info(f"Retrieved album {album_id} with {len(data.get('songs', []))} songs")
            return data
            
        except Exception as e:
            logger.error(f"Error getting album details for {album_id}: {e}")
            return None
    
    def get_playlist_details(self, playlist_id: str, include_lyrics: bool = False) -> Optional[Dict[str, Any]]:
        """
        Get playlist details with all songs.
        
        Args:
            playlist_id: Playlist ID
            include_lyrics: Whether to include lyrics for songs
            
        Returns:
            Playlist data dictionary or None
        """
        try:
            url = f"{self.config['MUSIC_API_PLAYLIST_DETAILS_ENDPOINT']}{playlist_id}"
            response = requests.get(url, timeout=self.timeout)
            response.raise_for_status()
            
            text = response.text.encode().decode('unicode-escape')
            data = json.loads(text)
            
            # Format playlist metadata
            data['firstname'] = format_string(safe_get(data, 'firstname'))
            data['listname'] = format_string(safe_get(data, 'listname'))
            
            # Format songs
            for song in data.get('songs', []):
                self.format_song_data(song, include_lyrics)
            
            logger.info(f"Retrieved playlist {playlist_id} with {len(data.get('songs', []))} songs")
            return data
            
        except Exception as e:
            logger.error(f"Error getting playlist details for {playlist_id}: {e}")
            return None
    
    def get_lyrics(self, song_id: str) -> str:
        """
        Get lyrics for a song.
        
        Args:
            song_id: Song ID
            
        Returns:
            Lyrics text or empty string
        """
        try:
            url = f"{self.config['MUSIC_API_LYRICS_ENDPOINT']}{song_id}"
            response = requests.get(url, timeout=self.timeout)
            response.raise_for_status()
            
            data = json.loads(response.text)
            return data.get('lyrics', '')
            
        except Exception as e:
            logger.error(f"Error getting lyrics for {song_id}: {e}")
            return ""
    
    def _extract_song_id(self, url: str) -> Optional[str]:
        """Extract song ID from music service URL."""
        try:
            response = requests.get(url, timeout=self.timeout)
            text = response.text
            
            # Try multiple extraction patterns
            patterns = [
                (r'"pid":"([^"]+)"', 1),
                (r'"song":{"type":"[^"]*","image":[^}]*"id":"([^"]+)"', 1)
            ]
            
            for pattern, group in patterns:
                import re
                match = re.search(pattern, text)
                if match:
                    return match.group(group)
            
            return None
            
        except Exception as e:
            logger.error(f"Error extracting song ID from URL: {e}")
            return None
