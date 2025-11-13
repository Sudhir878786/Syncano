"""
Test script to check if lyrics are available for a song
"""
import requests
import json
from app.services.jiosaavn_service import JioSaavnService
from config import Config

def test_lyrics_for_song(song_name):
    """Test if lyrics are available for a song"""
    print(f"\n{'='*60}")
    print(f"Testing lyrics for: {song_name}")
    print(f"{'='*60}\n")
    
    # Initialize service with proper config dict
    config_obj = Config()
    config_dict = {
        'JIOSAAVN_REQUEST_TIMEOUT': config_obj.JIOSAAVN_REQUEST_TIMEOUT,
        'JIOSAAVN_DECRYPT_KEY': config_obj.JIOSAAVN_DECRYPT_KEY,
        'JIOSAAVN_SEARCH_ENDPOINT': config_obj.JIOSAAVN_SEARCH_ENDPOINT,
        'JIOSAAVN_SONG_DETAILS_ENDPOINT': config_obj.JIOSAAVN_SONG_DETAILS_ENDPOINT,
        'JIOSAAVN_LYRICS_ENDPOINT': config_obj.JIOSAAVN_LYRICS_ENDPOINT,
        'MAX_SEARCH_RESULTS': config_obj.MAX_SEARCH_RESULTS
    }
    service = JioSaavnService(config_dict)
    
    # Search for the song
    print(f"Searching for '{song_name}'...")
    songs = service.search_songs(song_name, include_lyrics=False, limit=5)
    
    if not songs:
        print("[X] No songs found!")
        return
    
    print(f"[OK] Found {len(songs)} songs\n")
    
    # Test lyrics for each song
    for i, song in enumerate(songs, 1):
        song_id = song.get('id')
        song_title = song.get('song', 'Unknown')
        song_artist = song.get('singers', 'Unknown')
        has_lyrics = song.get('has_lyrics', 'false')
        
        print(f"\n{i}. {song_title} - {song_artist}")
        print(f"   Song ID: {song_id}")
        print(f"   Has Lyrics Flag: {has_lyrics}")
        
        # Try to fetch lyrics
        print(f"   Fetching lyrics...")
        lyrics = service.get_lyrics(song_id)
        
        if lyrics:
            lyrics_preview = lyrics[:200] + "..." if len(lyrics) > 200 else lyrics
            print(f"   [OK] Lyrics found! ({len(lyrics)} characters)")
            print(f"\n   Preview:")
            print(f"   {'-'*50}")
            for line in lyrics_preview.split('\n')[:5]:
                print(f"   {line}")
            print(f"   {'-'*50}\n")
        else:
            print(f"   [X] No lyrics available")
            
            # Try direct API call
            print(f"   Testing direct API call...")
            try:
                api_url = f"https://www.jiosaavn.com/api.php?__call=lyrics.getLyrics&ctx=web6dot0&api_version=4&_format=json&_marker=0%3F_marker%3D0&lyrics_id={song_id}"
                response = requests.get(api_url, timeout=10)
                data = response.json()
                print(f"   API Response: {json.dumps(data, indent=2)}")
            except Exception as e:
                print(f"   API Error: {e}")

if __name__ == "__main__":
    # Test with multiple songs to find one with actual lyrics
    test_songs = ["Tum Hi Ho", "Kesariya", "Channa Mereya", "Baby", "Dil Diyan Gallan"]
    
    for song in test_songs:
        test_lyrics_for_song(song)
        print("\n" + "="*60 + "\n")
