#!/usr/bin/env python
"""
Quick script to check all keys in Redis
"""
import os
import redis
import ssl
import json

redis_url = os.environ.get('REDIS_URL')
if not redis_url:
    print("❌ REDIS_URL not set!")
    exit(1)

print(f"Connecting to Redis...")

connection_kwargs = {
    'decode_responses': True,
    'socket_connect_timeout': 10,
    'socket_timeout': 10,
}

if redis_url.startswith('rediss://'):
    connection_kwargs['ssl_cert_reqs'] = ssl.CERT_REQUIRED

client = redis.from_url(redis_url, max_connections=10, **connection_kwargs)

print(f"✓ Connected!\n")

# Get all keys
all_keys = client.keys('*')
print(f"Total keys in Redis: {len(all_keys)}\n")

if not all_keys:
    print("No keys found in Redis.")
    exit(0)

# Separate room keys from others
room_keys = [k for k in all_keys if k.startswith('room:')]
other_keys = [k for k in all_keys if not k.startswith('room:')]

if room_keys:
    print(f"ROOM KEYS ({len(room_keys)}):")
    print("=" * 70)
    for key in sorted(room_keys):
        ttl = client.ttl(key)
        ttl_str = f"{ttl}s (~{ttl // 3600}h)" if ttl > 0 else "no expiry"
        
        # Get the data
        data = client.get(key)
        room_data = json.loads(data)
        
        host_user = None
        if 'users' in room_data:
            for sid, user in room_data['users'].items():
                if user.get('is_host'):
                    host_user = user.get('username', 'Unknown')
                    break
        
        print(f"  {key}")
        print(f"    Host: {host_user or room_data.get('host', 'N/A')}")
        print(f"    TTL: {ttl_str}")
        print(f"    Created: {room_data.get('created_at', 'N/A')}")
        print()

if other_keys:
    print(f"\nOTHER KEYS ({len(other_keys)}):")
    print("=" * 70)
    for key in sorted(other_keys):
        ttl = client.ttl(key)
        ttl_str = f"{ttl}s" if ttl > 0 else "no expiry"
        print(f"  {key} (TTL: {ttl_str})")
