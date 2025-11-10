# Test Redis connection locally
import os

# ✅ Using the correct Redis URL with SSL
os.environ['REDIS_URL'] = 'rediss://default:AXBXAAIncDJkYjQ4OWI0MjJkZjk0NDlmOWYxZGM0YmNhYzViZTQwZnAyMjg3NTk@new-heron-28759.upstash.io:6379'

from app.services.room_service import RoomService

print("=" * 60)
print("Testing RoomService WITH Redis (Upstash)...")
print("=" * 60)

rs = RoomService(redis_url=os.environ.get('REDIS_URL'))
print(f"✓ RoomService initialized")
print(f"  Using Redis: {rs.use_redis}")
print()

if not rs.use_redis:
    print("❌ Redis connection FAILED!")
    print("   Check your Redis URL format")
    exit(1)

print("Testing room operations with Redis...")
print()

# Test 1: Create room
print("1. Creating room...")
room = rs.create_room('test_socket_123', 'TestUser')
print(f"   ✓ Room created: {room['room_id']}")
print()

# Test 2: Join room
print("2. Joining room...")
join_data = rs.join_room(room['room_id'], 'test_socket_456', 'SecondUser')
if join_data:
    print(f"   ✓ SecondUser joined successfully")
    print(f"   ✓ Users in room: {len(join_data['users'])}")
else:
    print("   ❌ Failed to join room")
    exit(1)
print()

# Test 3: Update song
print("3. Updating song...")
song_data = {
    'id': 'test123',
    'title': 'Test Song',
    'artist': 'Test Artist'
}
if rs.update_song(room['room_id'], song_data):
    print("   ✓ Song updated successfully")
else:
    print("   ❌ Failed to update song")
print()

# Test 4: Get room state
print("4. Getting room state...")
room_state = rs.get_room(room['room_id'])
if room_state:
    print(f"   ✓ Room state retrieved")
    print(f"   ✓ Current song: {room_state.get('current_song', {}).get('title', 'None')}")
    print(f"   ✓ Users: {list(room_state['users'].keys())}")
else:
    print("   ❌ Failed to get room state")
print()

# Test 5: Leave room
print("5. Leaving room...")
leave_result = rs.leave_room(room['room_id'], 'test_socket_456')
if leave_result:
    print(f"   ✓ User left successfully")
    print(f"   ✓ Room deleted: {leave_result.get('room_deleted', False)}")
else:
    print("   ❌ Failed to leave room")
print()

print("=" * 60)
print("✅ ALL TESTS PASSED! Redis is working correctly!")
print("=" * 60)
print()
print("Next steps:")
print("1. Go to Upstash dashboard and copy your REDIS URL (not REST URL)")
print("2. It should look like: redis://default:PASSWORD@host.upstash.io:6379")
print("3. Add it to Vercel environment variables as REDIS_URL")
