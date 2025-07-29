"""
Production configuration - secure by default
"""
from superset_config_base import *

# Production-specific settings
WTF_CSRF_ENABLED = True  # Always enabled in production
ENABLE_PROXY_FIX = True  # If behind a proxy

# Strict CORS settings
CORS_OPTIONS = {
    'supports_credentials': True,
    'allow_headers': ['Content-Type', 'Authorization'],
    'resources': ['/api/*'],
    'origins': os.environ.get('CORS_ORIGINS', '').split(',') if os.environ.get('CORS_ORIGINS') else []
}

# Production logging
LOG_LEVEL = 'WARNING'

# Security headers
TALISMAN_ENABLED = True
TALISMAN_CONFIG = {
    'force_https': True,
    'strict_transport_security': True,
}
