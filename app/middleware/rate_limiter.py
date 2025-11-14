"""
Rate Limiting Middleware for API Protection
Prevents abuse and ensures fair usage across all users.
"""
import time
import logging
from functools import wraps
from flask import request, jsonify
from typing import Dict, Tuple

logger = logging.getLogger(__name__)


class RateLimiter:
    """Simple in-memory rate limiter with Redis fallback."""
    
    def __init__(self, redis_client=None):
        """
        Initialize rate limiter.
        
        Args:
            redis_client: Optional Redis client for distributed rate limiting
        """
        self.redis_client = redis_client
        self.use_redis = redis_client is not None
        
        # In-memory storage (for single instance or dev)
        self.requests: Dict[str, list] = {}
        
        logger.info(f"Rate limiter initialized (Redis: {self.use_redis})")
    
    def _get_client_id(self) -> str:
        """Get unique identifier for the client."""
        # Use IP address or session ID
        if request.headers.get('X-Forwarded-For'):
            return request.headers.get('X-Forwarded-For').split(',')[0].strip()
        return request.remote_addr or 'unknown'
    
    def _check_rate_limit_redis(self, key: str, limit: int, window: int) -> Tuple[bool, int]:
        """Check rate limit using Redis (distributed)."""
        try:
            current_time = int(time.time())
            redis_key = f"ratelimit:{key}"
            
            # Remove old requests outside the time window
            self.redis_client.zremrangebyscore(redis_key, 0, current_time - window)
            
            # Count requests in current window
            request_count = self.redis_client.zcard(redis_key)
            
            if request_count < limit:
                # Add current request
                self.redis_client.zadd(redis_key, {str(current_time): current_time})
                self.redis_client.expire(redis_key, window)
                return True, limit - request_count - 1
            
            return False, 0
            
        except Exception as e:
            logger.error(f"Redis rate limit error: {e}")
            return True, limit  # Fail open on error
    
    def _check_rate_limit_memory(self, key: str, limit: int, window: int) -> Tuple[bool, int]:
        """Check rate limit using in-memory storage (single instance)."""
        current_time = time.time()
        
        if key not in self.requests:
            self.requests[key] = []
        
        # Remove old requests
        self.requests[key] = [
            req_time for req_time in self.requests[key]
            if current_time - req_time < window
        ]
        
        if len(self.requests[key]) < limit:
            self.requests[key].append(current_time)
            return True, limit - len(self.requests[key])
        
        return False, 0
    
    def check_rate_limit(self, limit: int = 100, window: int = 60) -> Tuple[bool, int]:
        """
        Check if request should be rate limited.
        
        Args:
            limit: Maximum requests allowed in window
            window: Time window in seconds
            
        Returns:
            Tuple of (allowed, remaining_requests)
        """
        client_id = self._get_client_id()
        key = f"{client_id}:{request.endpoint}"
        
        if self.use_redis:
            return self._check_rate_limit_redis(key, limit, window)
        else:
            return self._check_rate_limit_memory(key, limit, window)
    
    def limit(self, max_requests: int = 100, window: int = 60):
        """
        Decorator for rate limiting endpoints.
        
        Args:
            max_requests: Maximum requests per window
            window: Time window in seconds
        
        Usage:
            @rate_limiter.limit(max_requests=10, window=60)
            def my_endpoint():
                return "Hello"
        """
        def decorator(f):
            @wraps(f)
            def wrapped(*args, **kwargs):
                allowed, remaining = self.check_rate_limit(max_requests, window)
                
                if not allowed:
                    logger.warning(f"Rate limit exceeded for {self._get_client_id()} on {request.endpoint}")
                    return jsonify({
                        'error': 'Rate limit exceeded',
                        'message': f'Maximum {max_requests} requests per {window} seconds',
                        'retry_after': window
                    }), 429
                
                # Add rate limit headers
                response = f(*args, **kwargs)
                if hasattr(response, 'headers'):
                    response.headers['X-RateLimit-Limit'] = str(max_requests)
                    response.headers['X-RateLimit-Remaining'] = str(remaining)
                    response.headers['X-RateLimit-Window'] = str(window)
                
                return response
            
            return wrapped
        return decorator
