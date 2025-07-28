# Development configuration for connecting to existing databases
import os
from cachelib.redis import RedisCache

# Two database connections needed:
# 1. Superset metadata database (for Superset's own tables)
SQLALCHEMY_DATABASE_URI = 'postgresql://airflow:airflow@localhost:7432/superset'

# 2. Data source database (the Airflow database with your actual data)
# This will be configured through the Superset UI or import process

# Redis configuration (using the same Redis from scribe2)
REDIS_HOST = 'localhost'
REDIS_PORT = '6379'
REDIS_DB = 2

# Configure Redis caching
CACHE_CONFIG = {
    'CACHE_TYPE': 'RedisCache',
    'CACHE_DEFAULT_TIMEOUT': 300,
    'CACHE_KEY_PREFIX': 'superset_dev_',
    'CACHE_REDIS_HOST': REDIS_HOST,
    'CACHE_REDIS_PORT': REDIS_PORT,
    'CACHE_REDIS_DB': REDIS_DB,
}

# Data cache for charts
DATA_CACHE_CONFIG = CACHE_CONFIG.copy()
DATA_CACHE_CONFIG['CACHE_KEY_PREFIX'] = 'superset_data_dev_'

# Filter state cache
FILTER_STATE_CACHE_CONFIG = CACHE_CONFIG.copy()
FILTER_STATE_CACHE_CONFIG['CACHE_KEY_PREFIX'] = 'superset_filter_dev_'

# Explore form data cache
EXPLORE_FORM_DATA_CACHE_CONFIG = CACHE_CONFIG.copy()
EXPLORE_FORM_DATA_CACHE_CONFIG['CACHE_KEY_PREFIX'] = 'superset_explore_dev_'

# Secret key (use the same as in scribe2 for consistency)
SECRET_KEY = '5kdonWCKada1swkrae2ODVI/rFZMBsOf8bwUpH50xuE='

# Additional configuration
WTF_CSRF_ENABLED = False  # Disable CSRF for development
ENABLE_PROXY_FIX = True

# Feature flags for development
FEATURE_FLAGS = {
    'ENABLE_TEMPLATE_PROCESSING': True,
    'ENABLE_EXPLORE_DRAG_AND_DROP': True,
    'DASHBOARD_NATIVE_FILTERS': True,
    'DASHBOARD_CROSS_FILTERS': True,
    'DASHBOARD_NATIVE_FILTERS_SET': True,
}

# Allow loading examples (useful for development)
PREVENT_UNSAFE_DB_CONNECTIONS = False

# Logging configuration for development
LOG_LEVEL = 'DEBUG'

# CORS settings for development
ENABLE_CORS = True
CORS_OPTIONS = {
    'supports_credentials': True,
    'allow_headers': ['*'],
    'resources': ['*'],
    'origins': ['http://localhost:9000', 'http://localhost:8088'],
}

# Add any custom CSV export configurations here
# CSV_EXPORT = {
#     'encoding': 'utf-8',
#     # Add your custom CSV settings
# }

# Important: The data source connection to Airflow database
# This will be added through Superset's database connections UI
# URL: postgresql://airflow:airflow@localhost:5432/airflow
