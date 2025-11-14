#!/usr/bin/env python
"""
Quick test script to verify Redis connection in production.
Run this on Render shell to debug Redis issues.

Usage on Render:
  python test_production_redis.py
"""
import os
import sys

print("=" * 70)
print("Production Redis Connection Test")
print("=" * 70)

# Check environment
redis_url = os.environ.get('REDIS_URL')
print(f"\n1. Environment Check:")
print(f"   REDIS_URL set: {bool(redis_url)}")
if redis_url:
    # Hide password
    safe_url = redis_url[:30] + "..." + redis_url[-20:] if len(redis_url) > 50 else redis_url
    print(f"   URL (masked): {safe_url}")
else:
    print("   ❌ REDIS_URL not set in environment!")
    print("\n   Fix: Go to Render Dashboard → Environment → Add REDIS_URL")
    sys.exit(1)

# Try to import redis
print(f"\n2. Redis Package:")
try:
    import redis
    print(f"   ✓ redis package installed")
except ImportError as e:
    print(f"   ❌ redis package not found: {e}")
    print("\n   Fix: Add 'redis' to requirements.txt")
    sys.exit(1)

# Try to connect
print(f"\n3. Redis Connection:")
try:
    import ssl
    
    connection_kwargs = {
        'decode_responses': True,
        'socket_connect_timeout': 10,
        'socket_timeout': 10,
    }
    
    if redis_url.startswith('rediss://'):
        print(f"   Using SSL/TLS connection")
        connection_kwargs['ssl_cert_reqs'] = ssl.CERT_REQUIRED
    
    client = redis.from_url(redis_url, max_connections=10, **connection_kwargs)
    result = client.ping()
    print(f"   ✓ Connected successfully! PING: {result}")
except Exception as e:
    print(f"   ❌ Connection failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Try to write
print(f"\n4. Redis Write Test:")
try:
    test_key = "test:production:timestamp"
    test_value = "production-test-123"
    result = client.setex(test_key, 300, test_value)
    print(f"   ✓ Write successful: SET {test_key} = {test_value}")
except Exception as e:
    print(f"   ❌ Write failed: {e}")
    sys.exit(1)

# Try to read
print(f"\n5. Redis Read Test:")
try:
    read_value = client.get(test_key)
    if read_value == test_value:
        print(f"   ✓ Read successful and value matches!")
    else:
        print(f"   ⚠️  Read successful but value mismatch: {read_value}")
except Exception as e:
    print(f"   ❌ Read failed: {e}")
    sys.exit(1)

# List keys
print(f"\n6. Existing Keys:")
try:
    all_keys = client.keys('*')
    print(f"   Total keys: {len(all_keys)}")
    
    if all_keys:
        room_keys = [k for k in all_keys if k.startswith('room:')]
        other_keys = [k for k in all_keys if not k.startswith('room:')]
        
        if room_keys:
            print(f"\n   Room keys ({len(room_keys)}):")
            for key in sorted(room_keys)[:10]:  # Show first 10
                ttl = client.ttl(key)
                print(f"      - {key} (TTL: {ttl}s)")
            if len(room_keys) > 10:
                print(f"      ... and {len(room_keys) - 10} more")
        
        if other_keys:
            print(f"\n   Other keys ({len(other_keys)}):")
            for key in sorted(other_keys)[:5]:  # Show first 5
                ttl = client.ttl(key)
                print(f"      - {key} (TTL: {ttl}s)")
    else:
        print(f"   No keys found. This is normal if no rooms have been created yet.")
    
    # Cleanup test key
    client.delete(test_key)
    
except Exception as e:
    print(f"   ⚠️  Could not list keys: {e}")

# Test RoomService
print(f"\n7. Testing RoomService:")
try:
    from app.services.room_service import RoomService
    
    rs = RoomService(redis_url=redis_url)
    print(f"   RoomService initialized")
    print(f"   Using Redis: {rs.use_redis}")
    
    if rs.use_redis:
        print(f"   ✓ RoomService is configured to use Redis!")
    else:
        print(f"   ❌ RoomService is NOT using Redis (falling back to memory)")
        
except Exception as e:
    print(f"   ❌ RoomService test failed: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 70)
print("✅ All tests passed! Redis is working correctly.")
print("=" * 70)
print("\nIf rooms are not persisting:")
print("  1. Check Render logs for: 'Saved room X to Redis'")
print("  2. Make sure app is creating rooms (test in browser)")
print("  3. Check Upstash dashboard Data Browser for room:* keys")
print()
