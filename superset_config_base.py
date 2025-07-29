"""
Base configuration for Superset - secure by default
This is like a TypeScript abstract class that enforces secure patterns
"""
import os
from typing import Optional, Dict, Any

def get_env_variable(var_name: str, default: Optional[str] = None) -> str:
    """Get environment variable or raise exception if not found and no default."""
    value = os.environ.get(var_name, default)
    if value is None:
        raise ValueError(f"Required environment variable '{var_name}' is not set!")
    return value

# Database configuration - like TypeScript strict mode for DB connections
SQLALCHEMY_DATABASE_URI = get_env_variable(
    'SUPERSET_DATABASE_URI',
    'postgresql://localhost/superset'  # Only for local dev
)

# Secret key - MUST be set in production
SECRET_KEY = get_env_variable('SUPERSET_SECRET_KEY')

# Redis configuration with secure defaults
REDIS_HOST = get_env_variable('REDIS_HOST', 'localhost')
REDIS_PORT = int(get_env_variable('REDIS_PORT', '6379'))
REDIS_DB = int(get_env_variable('REDIS_DB', '0'))

# Security settings - like TypeScript strict null checks
WTF_CSRF_ENABLED = get_env_variable('CSRF_ENABLED', 'true').lower() == 'true'
ENABLE_PROXY_FIX = get_env_variable('ENABLE_PROXY_FIX', 'false').lower() == 'true'

# CORS configuration - like TypeScript type guards
ENABLE_CORS = get_env_variable('ENABLE_CORS', 'false').lower() == 'true'
CORS_OPTIONS = {
    'supports_credentials': True,
    'allow_headers': ['Content-Type', 'Authorization'],
    'resources': ['/api/*'],
    'origins': os.environ.get('CORS_ORIGINS', '').split(',') if os.environ.get('CORS_ORIGINS') else []
}

# Cache configuration factory
def create_cache_config(prefix: str) -> Dict[str, Any]:
    """Factory function - like a TypeScript generic function"""
    return {
        'CACHE_TYPE': 'RedisCache',
        'CACHE_DEFAULT_TIMEOUT': int(get_env_variable('CACHE_TIMEOUT', '300')),
        'CACHE_KEY_PREFIX': prefix,
        'CACHE_REDIS_HOST': REDIS_HOST,
        'CACHE_REDIS_PORT': REDIS_PORT,
        'CACHE_REDIS_DB': REDIS_DB,
    }

# Apply cache configurations
CACHE_CONFIG = create_cache_config('superset_')
DATA_CACHE_CONFIG = create_cache_config('superset_data_')
FILTER_STATE_CACHE_CONFIG = create_cache_config('superset_filter_')
EXPLORE_FORM_DATA_CACHE_CONFIG = create_cache_config('superset_explore_')

# Feature flags - like TypeScript feature toggles
FEATURE_FLAGS = {
    'ENABLE_TEMPLATE_PROCESSING': get_env_variable('FF_TEMPLATE_PROCESSING', 'false').lower() == 'true',
    'ENABLE_EXPLORE_DRAG_AND_DROP': get_env_variable('FF_EXPLORE_DRAG_DROP', 'false').lower() == 'true',
    'DASHBOARD_NATIVE_FILTERS': get_env_variable('FF_NATIVE_FILTERS', 'false').lower() == 'true',
    'DASHBOARD_CROSS_FILTERS': get_env_variable('FF_CROSS_FILTERS', 'false').lower() == 'true',
}

# Security defaults
PREVENT_UNSAFE_DB_CONNECTIONS = True  # Always true unless explicitly overridden
LOG_LEVEL = get_env_variable('LOG_LEVEL', 'INFO')
