from flask import Flask, render_template, request, jsonify
from flask_socketio import SocketIO, emit, join_room, leave_room, rooms
import requests
import json
import secrets
import time
from datetime import datetime
import base64
import re
from pyDes import *
from traceback import print_exc

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key-here'
socketio = SocketIO(app, cors_allowed_origins="*")

# Store active rooms and their state
active_rooms = {}

# ============================================
# JIOSAAVN API INTEGRATION (Built-in)
# ============================================

# JioSaavn API Endpoints
SEARCH_BASE_URL = "https://www.jiosaavn.com/api.php?__call=autocomplete.get&_format=json&_marker=0&cc=in&includeMetaTags=1&query="
SONG_DETAILS_BASE_URL = "https://www.jiosaavn.com/api.php?__call=song.getDetails&cc=in&_marker=0%3F_marker%3D0&_format=json&pids="
ALBUM_DETAILS_BASE_URL = "https://www.jiosaavn.com/api.php?__call=content.getAlbumDetails&_format=json&cc=in&_marker=0%3F_marker%3D0&albumid="
PLAYLIST_DETAILS_BASE_URL = "https://www.jiosaavn.com/api.php?__call=playlist.getDetails&_format=json&cc=in&_marker=0%3F_marker%3D0&listid="
LYRICS_BASE_URL = "https://www.jiosaavn.com/api.php?__call=lyrics.getLyrics&ctx=web6dot0&api_version=4&_format=json&_marker=0%3F_marker%3D0&lyrics_id="

# Helper Functions
def format_string(string):
    """Format string by replacing HTML entities"""
    return string.encode().decode().replace("&quot;", "'").replace("&amp;", "&").replace("&#039;", "'")

def decrypt_url(url):
    """Decrypt JioSaavn media URLs"""
    try:
        des_cipher = des(b"38346591", ECB, b"\0\0\0\0\0\0\0\0", pad=None, padmode=PAD_PKCS5)
        enc_url = base64.b64decode(url.strip())
        dec_url = des_cipher.decrypt(enc_url, padmode=PAD_PKCS5).decode('utf-8')
        dec_url = dec_url.replace("_96.mp4", "_320.mp4")
        return dec_url
    except Exception as e:
        print(f"Decryption error: {e}")
        return None

def format_song_data(data, lyrics=False):
    """Format song data with decrypted URLs"""
    try:
        data['media_url'] = decrypt_url(data['encrypted_media_url'])
        if data.get('320kbps') != "true" and data['media_url']:
            data['media_url'] = data['media_url'].replace("_320.mp4", "_160.mp4")
        if data.get('media_url'):
            data['media_preview_url'] = data['media_url'].replace("_320.mp4", "_96_p.mp4").replace("_160.mp4", "_96_p.mp4").replace("//aac.", "//preview.")
    except (KeyError, TypeError):
        url = data.get('media_preview_url', '')
        url = url.replace("preview", "aac")
        if data.get('320kbps') == "true":
            url = url.replace("_96_p.mp4", "_320.mp4")
        else:
            url = url.replace("_96_p.mp4", "_160.mp4")
        data['media_url'] = url

    # Format text fields
    data['song'] = format_string(data.get('song', ''))
    data['music'] = format_string(data.get('music', ''))
    data['singers'] = format_string(data.get('singers', ''))
    data['starring'] = format_string(data.get('starring', ''))
    data['album'] = format_string(data.get('album', ''))
    data['primary_artists'] = format_string(data.get('primary_artists', ''))
    
    # Update image URL to higher quality
    if 'image' in data:
        data['image'] = data['image'].replace("150x150", "500x500")

    # Add lyrics if requested
    if lyrics and data.get('has_lyrics') == 'true':
        data['lyrics'] = get_lyrics(data['id'])
    elif lyrics:
        data['lyrics'] = None

    # Format copyright
    if 'copyright_text' in data:
        data['copyright_text'] = data['copyright_text'].replace("&copy;", "©")
    
    # Add convenient fields for frontend
    data['title'] = data.get('song', '')
    data['artist'] = data.get('singers', '')
    data['url'] = data.get('media_url', '')
    data['image_url'] = data.get('image', '')
    
    return data

def get_song_id(url):
    """Extract song ID from JioSaavn URL"""
    try:
        res = requests.get(url, data=[('bitrate', '320')])
        try:
            return (res.text.split('"pid":"'))[1].split('","')[0]
        except IndexError:
            return res.text.split('"song":{"type":"')[1].split('","image":')[0].split('"id":"')[-1]
    except Exception as e:
        print(f"Error getting song ID: {e}")
        return None

def get_song_details(song_id, lyrics=False):
    """Get detailed information about a song"""
    try:
        song_details_url = SONG_DETAILS_BASE_URL + song_id
        response = requests.get(song_details_url).text.encode().decode('unicode-escape')
        song_response = json.loads(response)
        
        if song_id in song_response:
            song_data = format_song_data(song_response[song_id], lyrics)
            return song_data
        return None
    except Exception as e:
        print(f"Error getting song details: {e}")
        return None

def search_songs(query, lyrics=False, get_song_data=True):
    """Search for songs on JioSaavn"""
    try:
        # If it's a JioSaavn URL, extract song ID
        if query.startswith('http') and 'saavn.com' in query:
            song_id = get_song_id(query)
            if song_id:
                return get_song_details(song_id, lyrics)
        
        # Search for songs
        search_url = SEARCH_BASE_URL + query
        response = requests.get(search_url).text.encode().decode('unicode-escape')
        
        # Fix JSON formatting issues
        pattern = r'\(From "([^"]+)"\)'
        response = json.loads(re.sub(pattern, r"(From '\1')", response))
        
        song_response = response['songs']['data']
        
        if not get_song_data:
            return song_response
        
        # Get detailed info for each song
        songs = []
        for song in song_response[:20]:  # Limit to 20 results
            song_id = song['id']
            song_data = get_song_details(song_id, lyrics)
            if song_data:
                songs.append(song_data)
        
        return songs
    except Exception as e:
        print(f"Search error: {e}")
        print_exc()
        return []

def get_album_id(url):
    """Extract album ID from JioSaavn URL"""
    try:
        res = requests.get(url)
        try:
            return res.text.split('"album_id":"')[1].split('"')[0]
        except IndexError:
            return res.text.split('"page_id","')[1].split('","')[0]
    except Exception as e:
        print(f"Error getting album ID: {e}")
        return None

def get_album_details(album_id, lyrics=False):
    """Get album details"""
    try:
        response = requests.get(ALBUM_DETAILS_BASE_URL + album_id)
        if response.status_code == 200:
            songs_json = response.text.encode().decode('unicode-escape')
            data = json.loads(songs_json)
            
            # Format album data
            data['image'] = data['image'].replace("150x150", "500x500")
            data['name'] = format_string(data.get('name', ''))
            data['primary_artists'] = format_string(data.get('primary_artists', ''))
            data['title'] = format_string(data.get('title', ''))
            
            # Format each song
            for song in data.get('songs', []):
                format_song_data(song, lyrics)
            
            return data
        return None
    except Exception as e:
        print(f"Error getting album: {e}")
        return None

def get_playlist_id(url):
    """Extract playlist ID from JioSaavn URL"""
    try:
        res = requests.get(url).text
        try:
            return res.split('"type":"playlist","id":"')[1].split('"')[0]
        except IndexError:
            return res.split('"page_id","')[1].split('","')[0]
    except Exception as e:
        print(f"Error getting playlist ID: {e}")
        return None

def get_playlist_details(playlist_id, lyrics=False):
    """Get playlist details"""
    try:
        response = requests.get(PLAYLIST_DETAILS_BASE_URL + playlist_id)
        if response.status_code == 200:
            songs_json = response.text.encode().decode('unicode-escape')
            data = json.loads(songs_json)
            
            # Format playlist data
            data['firstname'] = format_string(data.get('firstname', ''))
            data['listname'] = format_string(data.get('listname', ''))
            
            # Format each song
            for song in data.get('songs', []):
                format_song_data(song, lyrics)
            
            return data
        return None
    except Exception as e:
        print(f"Error getting playlist: {e}")
        print_exc()
        return None

def get_lyrics(song_id):
    """Get lyrics for a song"""
    try:
        url = LYRICS_BASE_URL + song_id
        lyrics_json = requests.get(url).text
        lyrics_data = json.loads(lyrics_json)
        return lyrics_data.get('lyrics', '')
    except Exception as e:
        print(f"Error getting lyrics: {e}")
        return ""

# ============================================
# MAIN APP ROUTES
# ============================================

@app.route('/')
def index():
    """Main page with search interface"""
    return render_template('index.html')

@app.route('/search')
def search_songs_route():
    """Search for songs using built-in JioSaavn API"""
    query = request.args.get('q', '')
    
    if not query:
        return jsonify({'error': 'No search query provided'}), 400
    
    try:
        print(f"Searching for: {query}")
        
        # Use built-in search function
        results = search_songs(query, lyrics=False, get_song_data=True)
        
        if results:
            print(f"Found {len(results)} results")
            return jsonify({
                'results': results,
                'total': len(results)
            })
        else:
            return jsonify({
                'results': [],
                'total': 0,
                'message': 'No results found'
            })
            
    except Exception as e:
        print(f"Search error: {str(e)}")
        print_exc()
        return jsonify({'error': f'Search failed: {str(e)}'}), 500

@app.route('/test-api')
def test_api():
    """Test built-in JioSaavn API"""
    try:
        # Test search function
        results = search_songs("test", lyrics=False, get_song_data=True)
        
        return jsonify({
            'api_test': {
                'api_server': 'Built-in JioSaavn API',
                'status': 'success',
                'working': True,
                'sample_results': len(results) if results else 0,
                'message': 'Built-in API is working! No external server needed.'
            }
        })
        
    except Exception as e:
        return jsonify({
            'api_test': {
                'api_server': 'Built-in JioSaavn API',
                'status': 'error',
                'working': False,
                'error': str(e)
            }
        })

@app.route('/song/<song_id>')
def get_song_route(song_id):
    """Get detailed information about a specific song"""
    try:
        lyrics = request.args.get('lyrics', 'false').lower() == 'true'
        
        # Use built-in function
        song_data = get_song_details(song_id, lyrics=lyrics)
        
        if song_data:
            return jsonify(song_data)
        else:
            return jsonify({'error': 'Song not found or invalid ID'}), 404
            
    except Exception as e:
        print(f"Song details error: {str(e)}")
        print_exc()
        return jsonify({'error': f'Failed to fetch song: {str(e)}'}), 500

@app.route('/lyrics/<song_id>')
def get_lyrics_route(song_id):
    """Get lyrics for a specific song"""
    try:
        # Use built-in function
        lyrics_text = get_lyrics(song_id)
        
        return jsonify({
            'status': True,
            'lyrics': lyrics_text
        })
            
    except Exception as e:
        print(f"Lyrics error: {str(e)}")
        print_exc()
        return jsonify({
            'status': False,
            'error': f'Failed to fetch lyrics: {str(e)}'
        }), 500

@app.route('/album/<album_id>')
def get_album_route(album_id):
    """Get detailed information about a specific album"""
    try:
        lyrics = request.args.get('lyrics', 'false').lower() == 'true'
        
        # Use built-in function
        album_data = get_album_details(album_id, lyrics=lyrics)
        
        if album_data:
            return jsonify(album_data)
        else:
            return jsonify({'error': 'Album not found or invalid ID'}), 404
            
    except Exception as e:
        print(f"Album details error: {str(e)}")
        print_exc()
        return jsonify({'error': f'Failed to fetch album: {str(e)}'}), 500

@app.route('/playlist/<playlist_id>')
def get_playlist_route(playlist_id):
    """Get detailed information about a specific playlist"""
    try:
        lyrics = request.args.get('lyrics', 'false').lower() == 'true'
        
        # Use built-in function
        playlist_data = get_playlist_details(playlist_id, lyrics=lyrics)
        
        if playlist_data:
            return jsonify(playlist_data)
        else:
            return jsonify({'error': 'Playlist not found or invalid ID'}), 404
            
    except Exception as e:
        print(f"Playlist details error: {str(e)}")
        print_exc()
        return jsonify({'error': f'Failed to fetch playlist: {str(e)}'}), 500

# Socket.IO event handlers
@socketio.on('create_room')
def handle_create_room(data):
    """Create a new listening room"""
    room_id = secrets.token_urlsafe(8)
    username = data.get('username', f'User_{secrets.token_urlsafe(4)}')
    
    # Initialize room state
    active_rooms[room_id] = {
        'host': request.sid,
        'users': {request.sid: {'username': username, 'is_host': True}},
        'current_song': None,
        'is_playing': False,
        'current_time': 0,
        'last_update': time.time(),
        'playlist': []
    }
    
    join_room(room_id)
    
    emit('room_created', {
        'room_id': room_id,
        'username': username,
        'is_host': True
    })
    
    print(f"Room {room_id} created by {username}")

@socketio.on('join_room')  
def handle_join_room(data):
    """Join an existing listening room"""
    room_id = data.get('room_id')
    username = data.get('username', f'User_{secrets.token_urlsafe(4)}')
    
    if room_id not in active_rooms:
        emit('error', {'message': 'Room not found'})
        return
    
    # Add user to room
    active_rooms[room_id]['users'][request.sid] = {
        'username': username,
        'is_host': False
    }
    
    join_room(room_id)
    
    # Get current room state
    room_state = active_rooms[room_id]
    
    # Send room state to the new user
    emit('room_joined', {
        'room_id': room_id,
        'username': username,
        'is_host': False,
        'users': list(room_state['users'].values()),
        'current_song': room_state['current_song'],
        'is_playing': room_state['is_playing'],
        'current_time': room_state['current_time'],
        'playlist': room_state['playlist']
    })
    
    # Notify other users
    emit('user_joined', {
        'username': username,
        'users': list(room_state['users'].values())
    }, room=room_id, include_self=False)
    
    print(f"{username} joined room {room_id}")

@socketio.on('play_song')
def handle_play_song(data):
    """Play a song in the room"""
    room_id = data.get('room_id')
    song = data.get('song')
    
    print(f"Received play_song request for room {room_id}")
    print(f"Song data: {song}")
    
    if room_id not in active_rooms:
        emit('error', {'message': 'Room not found'})
        return
    
    room_state = active_rooms[room_id]
    
    # Update room state
    room_state['current_song'] = song
    room_state['is_playing'] = True
    room_state['current_time'] = 0
    room_state['last_update'] = time.time()
    
    # Broadcast to all users in room
    broadcast_data = {
        'song': song,
        'is_playing': True,
        'current_time': 0,
        'timestamp': time.time()
    }
    
    print(f"Broadcasting song_changed to room {room_id}: {broadcast_data}")
    
    emit('song_changed', broadcast_data, room=room_id)
    
    print(f"Song changed in room {room_id}: {song.get('title', song.get('song', 'Unknown'))}")

@socketio.on('play_pause')
def handle_play_pause(data):
    """Handle play/pause in room"""
    room_id = data.get('room_id')
    is_playing = data.get('is_playing')
    current_time = data.get('current_time', 0)
    
    print(f"Received play_pause for room {room_id}: playing={is_playing}, time={current_time}")
    
    if room_id not in active_rooms:
        emit('error', {'message': 'Room not found'})
        return
    
    room_state = active_rooms[room_id]
    room_state['is_playing'] = is_playing
    room_state['current_time'] = current_time
    room_state['last_update'] = time.time()
    
    # Broadcast to all users in room (including sender for multi-tab support)
    emit('playback_changed', {
        'is_playing': is_playing,
        'current_time': current_time,
        'timestamp': time.time()
    }, room=room_id)
    
    print(f"Broadcasted playback_changed to room {room_id}")

@socketio.on('seek')
def handle_seek(data):
    """Handle seek in room"""
    room_id = data.get('room_id')
    current_time = data.get('current_time', 0)
    
    print(f"Received seek for room {room_id}: time={current_time}")
    
    if room_id not in active_rooms:
        emit('error', {'message': 'Room not found'})
        return
    
    room_state = active_rooms[room_id]
    room_state['current_time'] = current_time
    room_state['last_update'] = time.time()
    
    # Broadcast to all users in room (including sender for multi-tab support)
    emit('seek_changed', {
        'current_time': current_time,
        'timestamp': time.time()
    }, room=room_id)

@socketio.on('disconnect')
def handle_disconnect():
    """Handle user disconnection"""
    user_rooms = rooms(request.sid)
    
    for room_id in user_rooms:
        if room_id in active_rooms:
            room_state = active_rooms[room_id]
            
            if request.sid in room_state['users']:
                username = room_state['users'][request.sid]['username']
                is_host = room_state['users'][request.sid]['is_host']
                
                # Remove user from room
                del room_state['users'][request.sid]
                
                # If host left and there are still users, assign new host
                if is_host and room_state['users']:
                    new_host_sid = next(iter(room_state['users']))
                    room_state['users'][new_host_sid]['is_host'] = True
                    room_state['host'] = new_host_sid
                    
                    emit('new_host', {
                        'new_host': room_state['users'][new_host_sid]['username']
                    }, room=room_id)
                
                # If no users left, delete room
                if not room_state['users']:
                    del active_rooms[room_id]
                    print(f"Room {room_id} deleted - no users left")
                else:
                    # Notify remaining users
                    emit('user_left', {
                        'username': username,
                        'users': list(room_state['users'].values())
                    }, room=room_id)
                
                print(f"{username} left room {room_id}")

# Route to get room info
@app.route('/room/<room_id>')
def get_room_info(room_id):
    """Get information about a room"""
    if room_id in active_rooms:
        room_state = active_rooms[room_id]
        return jsonify({
            'exists': True,
            'users_count': len(room_state['users']),
            'current_song': room_state['current_song'],
            'is_playing': room_state['is_playing']
        })
    else:
        return jsonify({'exists': False})

if __name__ == '__main__':
    socketio.run(app, debug=False, host='0.0.0.0', port=3001)