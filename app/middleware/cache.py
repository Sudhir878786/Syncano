"""
Response Caching Middleware
Improves performance by caching frequently requested data.
"""
import time
import json
import hashlib
import logging
from functools import wraps
from flask import request, jsonify, make_response
from typing import Optional, Any

logger = logging.getLogger(__name__)


class CacheManager:
    """Cache manager with Redis backend for distributed caching."""
    
    def __init__(self, redis_client=None, default_ttl: int = 300):
        """
        Initialize cache manager.
        
        Args:
            redis_client: Optional Redis client for distributed caching
            default_ttl: Default time-to-live in seconds
        """
        self.redis_client = redis_client
        self.use_redis = redis_client is not None
        self.default_ttl = default_ttl
        
        # In-memory cache for fallback
        self.cache: dict = {}
        
        logger.info(f"Cache manager initialized (Redis: {self.use_redis}, TTL: {default_ttl}s)")
    
    def _get_cache_key(self, prefix: str, *args, **kwargs) -> str:
        """Generate cache key from function arguments."""
        key_data = f"{prefix}:{json.dumps(args, sort_keys=True)}:{json.dumps(kwargs, sort_keys=True)}"
        return hashlib.md5(key_data.encode()).hexdigest()
    
    def get(self, key: str) -> Optional[Any]:
        """Get value from cache."""
        if self.use_redis:
            try:
                cached = self.redis_client.get(f"cache:{key}")
                if cached:
                    logger.debug(f"Cache hit (Redis): {key}")
                    return json.loads(cached)
            except Exception as e:
                logger.error(f"Redis cache get error: {e}")
        
        # Fallback to memory cache
        if key in self.cache:
            value, expiry = self.cache[key]
            if expiry > time.time():
                logger.debug(f"Cache hit (Memory): {key}")
                return value
            else:
                del self.cache[key]
        
        return None
    
    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """Set value in cache with TTL."""
        ttl = ttl or self.default_ttl
        
        if self.use_redis:
            try:
                self.redis_client.setex(
                    f"cache:{key}",
                    ttl,
                    json.dumps(value)
                )
                logger.debug(f"Cache set (Redis): {key} (TTL: {ttl}s)")
                return True
            except Exception as e:
                logger.error(f"Redis cache set error: {e}")
        
        # Fallback to memory cache
        self.cache[key] = (value, time.time() + ttl)
        logger.debug(f"Cache set (Memory): {key} (TTL: {ttl}s)")
        return True
    
    def delete(self, key: str) -> bool:
        """Delete value from cache."""
        if self.use_redis:
            try:
                self.redis_client.delete(f"cache:{key}")
            except Exception as e:
                logger.error(f"Redis cache delete error: {e}")
        
        if key in self.cache:
            del self.cache[key]
        
        return True
    
    def clear_pattern(self, pattern: str) -> int:
        """Clear all cache keys matching pattern."""
        count = 0
        
        if self.use_redis:
            try:
                keys = self.redis_client.keys(f"cache:{pattern}")
                if keys:
                    count = self.redis_client.delete(*keys)
                    logger.info(f"Cleared {count} cache keys matching '{pattern}'")
            except Exception as e:
                logger.error(f"Redis cache clear error: {e}")
        
        # Clear memory cache
        memory_keys = [k for k in self.cache.keys() if pattern in k]
        for key in memory_keys:
            del self.cache[key]
            count += 1
        
        return count
    
    def cached(self, ttl: Optional[int] = None, key_prefix: Optional[str] = None):
        """
        Decorator for caching function results.
        
        Args:
            ttl: Time-to-live in seconds (None = use default)
            key_prefix: Custom cache key prefix
        
        Usage:
            @cache_manager.cached(ttl=300)
            def expensive_function(param):
                return slow_calculation(param)
        """
        def decorator(f):
            prefix = key_prefix or f.__name__
            
            @wraps(f)
            def wrapped(*args, **kwargs):
                # Generate cache key
                cache_key = self._get_cache_key(prefix, *args, **kwargs)
                
                # Try to get from cache
                cached_value = self.get(cache_key)
                if cached_value is not None:
                    return cached_value
                
                # Call function and cache result
                result = f(*args, **kwargs)
                self.set(cache_key, result, ttl)
                
                return result
            
            return wrapped
        return decorator
    
    def cached_route(self, ttl: Optional[int] = None):
        """
        Decorator for caching Flask route responses.
        
        Args:
            ttl: Time-to-live in seconds
        
        Usage:
            @app.route('/api/data')
            @cache_manager.cached_route(ttl=60)
            def get_data():
                return jsonify(data)
        """
        def decorator(f):
            @wraps(f)
            def wrapped(*args, **kwargs):
                # Generate cache key from route + query params
                cache_key = self._get_cache_key(
                    f"route:{request.endpoint}",
                    request.path,
                    request.args.to_dict()
                )
                
                # Try to get from cache
                cached_response = self.get(cache_key)
                if cached_response is not None:
                    response = make_response(jsonify(cached_response))
                    response.headers['X-Cache'] = 'HIT'
                    return response
                
                # Call route handler
                result = f(*args, **kwargs)
                
                # Cache JSON responses only
                if hasattr(result, 'get_json'):
                    response_data = result.get_json()
                    self.set(cache_key, response_data, ttl)
                    result.headers['X-Cache'] = 'MISS'
                
                return result
            
            return wrapped
        return decorator
