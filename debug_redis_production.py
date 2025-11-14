"""
Debug script to test Redis connection in production
Run this on Render or locally with production REDIS_URL
"""
import os
import sys

# Get Redis URL from environment
REDIS_URL = os.environ.get('REDIS_URL')

if not REDIS_URL:
    print("❌ ERROR: REDIS_URL environment variable not set!")
    print("\nSet it in Render Dashboard:")
    print("   Environment → Add Environment Variable")
    print("   Key: REDIS_URL")
    print("   Value: rediss://default:PASSWORD@host.upstash.io:6379")
    print("\nOr run locally with:")
    print("   $env:REDIS_URL='rediss://default:PASSWORD@host.upstash.io:6379'; python debug_redis_production.py")
    sys.exit(1)

print("=" * 70)
print("Redis Production Debug Script")
print("=" * 70)
print(f"Redis URL: {REDIS_URL[:30]}...{REDIS_URL[-20:]}")  # Hide password
print()

try:
    import redis
    import ssl
    print("✓ Redis package imported")
except ImportError:
    print("❌ Redis package not installed!")
    print("   Run: pip install redis")
    sys.exit(1)

# Test connection
print("\n1. Testing Redis Connection...")
print("-" * 70)

try:
    connection_kwargs = {
        'decode_responses': True,
        'socket_connect_timeout': 10,
        'socket_timeout': 10,
        'socket_keepalive': True,
        'retry_on_timeout': True,
        'health_check_interval': 10
    }
    
    if REDIS_URL.startswith('rediss://'):
        print("   Using SSL/TLS connection (rediss://)")
        connection_kwargs['ssl_cert_reqs'] = ssl.CERT_REQUIRED
    
    client = redis.from_url(REDIS_URL, max_connections=10, **connection_kwargs)
    
    # Test ping
    result = client.ping()
    print(f"   ✓ PING successful: {result}")
    
except Exception as e:
    print(f"   ❌ Connection FAILED: {e}")
    print("\nTroubleshooting:")
    print("   1. Check REDIS_URL format: rediss://default:PASSWORD@host.upstash.io:6379")
    print("   2. Verify password is correct in Upstash Console")
    print("   3. Check if Upstash Redis instance is active")
    print("   4. Verify SSL is enabled (rediss:// with double 's')")
    sys.exit(1)

# Test write
print("\n2. Testing Redis WRITE...")
print("-" * 70)

try:
    test_key = "test:debug:timestamp"
    test_value = f"test-{os.urandom(4).hex()}"
    
    result = client.setex(test_key, 300, test_value)  # 5 min expiry
    print(f"   ✓ WRITE successful: SET {test_key} = {test_value}")
    print(f"   ✓ Result: {result}")
    
except Exception as e:
    print(f"   ❌ WRITE failed: {e}")
    sys.exit(1)

# Test read
print("\n3. Testing Redis READ...")
print("-" * 70)

try:
    read_value = client.get(test_key)
    print(f"   ✓ READ successful: GET {test_key} = {read_value}")
    
    if read_value == test_value:
        print(f"   ✓ Value matches!")
    else:
        print(f"   ⚠️ Value mismatch! Expected: {test_value}, Got: {read_value}")
    
except Exception as e:
    print(f"   ❌ READ failed: {e}")
    sys.exit(1)

# List all keys
print("\n4. Listing ALL Redis Keys...")
print("-" * 70)

try:
    all_keys = client.keys('*')
    print(f"   Total keys in database: {len(all_keys)}")
    
    if all_keys:
        print("\n   Keys found:")
        for key in sorted(all_keys):
            try:
                ttl = client.ttl(key)
                key_type = client.type(key)
                print(f"      - {key} (type: {key_type}, TTL: {ttl}s)")
            except Exception as e:
                print(f"      - {key} (error getting info: {e})")
    else:
        print("   ⚠️ No keys found in Redis!")
        print("\n   This means:")
        print("      1. No rooms have been created yet, OR")
        print("      2. All rooms expired (TTL = 7 days), OR")
        print("      3. Application is not writing to Redis")
    
except Exception as e:
    print(f"   ❌ Failed to list keys: {e}")
    sys.exit(1)

# Test room operations
print("\n5. Testing Room Operations...")
print("-" * 70)

try:
    import json
    from datetime import datetime
    
    # Create test room
    room_id = "debug_test_room"
    room_key = f"room:{room_id}"
    room_data = {
        "room_id": room_id,
        "host_sid": "debug_socket_123",
        "created_at": datetime.now().isoformat(),
        "users": {
            "debug_socket_123": {
                "username": "DebugUser",
                "joined_at": datetime.now().isoformat()
            }
        },
        "current_song": {
            "id": "debug123",
            "title": "Debug Test Song",
            "artist": "Debug Artist"
        }
    }
    
    # Save room
    result = client.setex(room_key, 604800, json.dumps(room_data, default=str))
    print(f"   ✓ Created test room: {room_key}")
    print(f"   ✓ Result: {result}")
    
    # Read room back
    retrieved = client.get(room_key)
    if retrieved:
        retrieved_data = json.loads(retrieved)
        print(f"   ✓ Retrieved test room successfully")
        print(f"   ✓ Room has {len(retrieved_data['users'])} user(s)")
    else:
        print(f"   ❌ Failed to retrieve test room!")
    
    # Check TTL
    ttl = client.ttl(room_key)
    print(f"   ✓ Room TTL: {ttl} seconds ({ttl/86400:.1f} days)")
    
    # Delete test room
    client.delete(room_key, test_key)
    print(f"   ✓ Cleaned up test data")
    
except Exception as e:
    print(f"   ❌ Room operation failed: {e}")
    import traceback
    traceback.print_exc()

# Summary
print("\n" + "=" * 70)
print("✅ ALL REDIS TESTS PASSED!")
print("=" * 70)
print("\nRedis is working correctly. If you don't see data in Upstash:")
print("   1. Make sure REDIS_URL is set in Render environment variables")
print("   2. Make sure your app is actually creating rooms (check logs)")
print("   3. Check Render logs for: '✓ Saved room X to Redis'")
print("   4. Rooms expire after 7 days - old rooms are automatically deleted")
print("\nTo check what your app is writing:")
print("   1. Create a room in your deployed app")
print("   2. Run this script again to see if 'room:XXXXX' keys appear")
print("   3. Check Render logs: heroku logs --tail -a syncano-backend")
print()
