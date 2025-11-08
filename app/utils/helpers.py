"""
Utility functions for JioSaavn API integration.
Handles encryption, decryption, and data formatting.
"""
import base64
import re
from pyDes import des, ECB, PAD_PKCS5
from typing import Optional, Dict, Any
import logging

logger = logging.getLogger(__name__)


def format_string(text: str) -> str:
    """
    Format string by replacing HTML entities.
    
    Args:
        text: Input string with HTML entities
        
    Returns:
        Formatted string with entities replaced
    """
    if not text:
        return ""
    
    replacements = {
        "&quot;": "'",
        "&amp;": "&",
        "&#039;": "'",
        "&lt;": "<",
        "&gt;": ">"
    }
    
    result = str(text)
    for old, new in replacements.items():
        result = result.replace(old, new)
    
    return result


def decrypt_url(encrypted_url: str, key: bytes = b"38346591") -> Optional[str]:
    """
    Decrypt JioSaavn media URLs using DES encryption.
    
    Args:
        encrypted_url: Base64 encoded encrypted URL
        key: Decryption key (default: JioSaavn key)
        
    Returns:
        Decrypted URL or None if decryption fails
    """
    try:
        des_cipher = des(key, ECB, b"\0\0\0\0\0\0\0\0", pad=None, padmode=PAD_PKCS5)
        enc_url = base64.b64decode(encrypted_url.strip())
        dec_url = des_cipher.decrypt(enc_url, padmode=PAD_PKCS5).decode('utf-8')
        
        # Replace quality markers
        dec_url = dec_url.replace("_96.mp4", "_320.mp4")
        
        return dec_url
    except Exception as e:
        logger.error(f"URL decryption failed: {e}")
        return None


def get_quality_url(base_url: str, quality: str = '320kbps') -> str:
    """
    Get media URL with specified quality.
    
    Args:
        base_url: Base media URL
        quality: Desired quality ('320kbps' or '160kbps')
        
    Returns:
        URL with appropriate quality marker
    """
    if not base_url:
        return ""
    
    if quality == '320kbps':
        return base_url.replace("_96.mp4", "_320.mp4").replace("_160.mp4", "_320.mp4")
    elif quality == '160kbps':
        return base_url.replace("_96.mp4", "_160.mp4").replace("_320.mp4", "_160.mp4")
    
    return base_url


def clean_json_response(text: str) -> str:
    """
    Clean JSON response by fixing common formatting issues.
    
    Args:
        text: Raw JSON text from API
        
    Returns:
        Cleaned JSON text
    """
    # Fix quoted strings in parentheses
    pattern = r'\(From "([^"]+)"\)'
    text = re.sub(pattern, r"(From '\1')", text)
    
    return text


def get_image_url(image_url: str, quality: str = 'high') -> str:
    """
    Get image URL with specified quality.
    
    Args:
        image_url: Base image URL
        quality: Image quality ('high', 'medium', 'low')
        
    Returns:
        Image URL with appropriate resolution
    """
    if not image_url:
        return "https://via.placeholder.com/500x500/1DB954/FFFFFF?text=♪"
    
    quality_map = {
        'high': '500x500',
        'medium': '300x300',
        'low': '150x150'
    }
    
    target_quality = quality_map.get(quality, '500x500')
    
    # Replace all common resolutions with target
    for size in ['50x50', '150x150', '300x300', '500x500']:
        image_url = image_url.replace(size, target_quality)
    
    return image_url


def extract_id_from_url(url: str, id_type: str = 'song') -> Optional[str]:
    """
    Extract ID from JioSaavn URL.
    
    Args:
        url: JioSaavn URL
        id_type: Type of ID to extract ('song', 'album', 'playlist')
        
    Returns:
        Extracted ID or None
    """
    try:
        if id_type == 'song':
            patterns = [
                r'"pid":"([^"]+)"',
                r'"song":{"type":"[^"]*","image":[^}]*"id":"([^"]+)"'
            ]
        elif id_type == 'album':
            patterns = [r'"album_id":"([^"]+)"', r'"page_id","([^"]+)"']
        elif id_type == 'playlist':
            patterns = [r'"type":"playlist","id":"([^"]+)"', r'"page_id","([^"]+)"']
        else:
            return None
        
        for pattern in patterns:
            match = re.search(pattern, url)
            if match:
                return match.group(1)
        
        return None
    except Exception as e:
        logger.error(f"ID extraction failed: {e}")
        return None


def validate_song_data(data: Dict[str, Any]) -> bool:
    """
    Validate song data structure.
    
    Args:
        data: Song data dictionary
        
    Returns:
        True if valid, False otherwise
    """
    required_fields = ['id', 'song', 'singers']
    return all(field in data for field in required_fields)


def safe_get(dictionary: Dict[str, Any], key: str, default: Any = "") -> Any:
    """
    Safely get value from dictionary with default.
    
    Args:
        dictionary: Source dictionary
        key: Key to retrieve
        default: Default value if key not found
        
    Returns:
        Value or default
    """
    return dictionary.get(key, default)
