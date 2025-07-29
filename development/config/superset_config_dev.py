"""
Development configuration - extends base like TypeScript interface extension
"""
from superset_config_base import *
import os

# Override for development only
if os.environ.get('SUPERSET_ENV') == 'development':
    # Development-specific overrides
    WTF_CSRF_ENABLED = False  # Only for local dev
    LOG_LEVEL = 'DEBUG'
    
    # Allow unsafe connections only in dev
    PREVENT_UNSAFE_DB_CONNECTIONS = False
    
    # Development CORS settings
    CORS_OPTIONS = {
        'supports_credentials': True,
        'allow_headers': ['*'],
        'resources': ['*'],
        'origins': ['http://localhost:9000', 'http://localhost:8088'],
    }
    
    # Enable all features in dev
    FEATURE_FLAGS.update({
        'ENABLE_TEMPLATE_PROCESSING': True,
        'ENABLE_EXPLORE_DRAG_AND_DROP': True,
        'DASHBOARD_NATIVE_FILTERS': True,
        'DASHBOARD_CROSS_FILTERS': True,
        'DASHBOARD_NATIVE_FILTERS_SET': True,
    })
