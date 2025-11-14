#!/usr/bin/env python
"""
Test room creation and Redis storage
"""
import os
import sys

print("=" * 70)
print("Room Creation and Redis Storage Test")
print("=" * 70)

# Check environment
redis_url = os.environ.get('REDIS_URL')
if not redis_url:
    print("\n❌ REDIS_URL not set in environment!")
    sys.exit(1)

print(f"\n1. Environment:")
print(f"   REDIS_URL: {'SET' if redis_url else 'NOT SET'}")

# Import RoomService
print(f"\n2. Importing RoomService...")
try:
    from app.services.room_service import RoomService
    print(f"   ✓ RoomService imported")
except Exception as e:
    print(f"   ❌ Failed to import: {e}")
    sys.exit(1)

# Initialize RoomService
print(f"\n3. Initializing RoomService...")
try:
    room_service = RoomService(redis_url=redis_url)
    print(f"   ✓ RoomService initialized")
    print(f"   Using Redis: {room_service.use_redis}")
    
    if not room_service.use_redis:
        print(f"   ❌ RoomService is NOT using Redis!")
        sys.exit(1)
except Exception as e:
    print(f"   ❌ Initialization failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Create a test room
print(f"\n4. Creating test room...")
try:
    test_sid = "test_socket_123"
    test_username = "TestUser_Redis"
    
    room_data = room_service.create_room(test_sid, test_username)
    room_id = room_data['room_id']
    
    print(f"   ✓ Room created successfully!")
    print(f"   Room ID: {room_id}")
    print(f"   Returned data keys: {list(room_data.keys())}")
except Exception as e:
    print(f"   ❌ Room creation failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Verify room in Redis
print(f"\n5. Verifying room in Redis...")
try:
    import redis
    import ssl
    
    connection_kwargs = {
        'decode_responses': True,
        'socket_connect_timeout': 10,
        'socket_timeout': 10,
    }
    
    if redis_url.startswith('rediss://'):
        connection_kwargs['ssl_cert_reqs'] = ssl.CERT_REQUIRED
    
    client = redis.from_url(redis_url, max_connections=10, **connection_kwargs)
    
    # Check if key exists
    room_key = f"room:{room_id}"
    exists = client.exists(room_key)
    
    if exists:
        print(f"   ✓ Room key found in Redis: {room_key}")
        
        # Get the data
        room_json = client.get(room_key)
        print(f"   ✓ Room data retrieved from Redis")
        
        # Check TTL
        ttl = client.ttl(room_key)
        print(f"   TTL: {ttl} seconds (~{ttl // 86400} days)")
        
        # Parse and display
        import json
        room_data_from_redis = json.loads(room_json)
        print(f"\n   Room data from Redis:")
        print(f"      Room ID: {room_data_from_redis.get('room_id')}")
        print(f"      Host: {room_data_from_redis.get('host')}")
        print(f"      Participants: {room_data_from_redis.get('participants', {})}")
        print(f"      Created at: {room_data_from_redis.get('created_at')}")
    else:
        print(f"   ❌ Room key NOT found in Redis: {room_key}")
        
        # List all keys to see what's there
        all_keys = client.keys('*')
        print(f"\n   All keys in Redis ({len(all_keys)}):")
        for key in all_keys[:10]:
            print(f"      - {key}")
        sys.exit(1)
    
except Exception as e:
    print(f"   ❌ Redis verification failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Retrieve room using RoomService
print(f"\n6. Retrieving room using RoomService...")
try:
    retrieved_room = room_service.get_room(room_id)
    
    if retrieved_room:
        print(f"   ✓ Room retrieved successfully!")
        print(f"   Keys in retrieved room: {list(retrieved_room.keys())}")
        print(f"   Host SID: {retrieved_room.get('host', 'N/A')}")
        print(f"   Participants: {list(retrieved_room.get('participants', {}).keys())}")
        print(f"   Created at: {retrieved_room.get('created_at', 'N/A')}")
    else:
        print(f"   ❌ Room NOT found via RoomService.get_room()")
        sys.exit(1)
        
except Exception as e:
    print(f"   ❌ Room retrieval failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# List all rooms
print(f"\n7. Listing all rooms in Redis...")
try:
    room_keys = client.keys('room:*')
    print(f"   Total room keys: {len(room_keys)}")
    
    for key in room_keys[:5]:
        ttl = client.ttl(key)
        print(f"      - {key} (TTL: {ttl}s)")
    
    if len(room_keys) > 5:
        print(f"      ... and {len(room_keys) - 5} more")
        
except Exception as e:
    print(f"   ⚠️  Could not list rooms: {e}")

print("\n" + "=" * 70)
print("✅ ALL TESTS PASSED!")
print("✅ Room successfully created and stored in Redis")
print("=" * 70)
print(f"\nRoom {room_id} is now in Redis with a 7-day TTL")
print(f"You can verify this in Upstash dashboard → Data Browser → room:{room_id}")
print()
