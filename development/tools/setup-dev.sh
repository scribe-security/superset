#!/bin/bash

# Script to set up the development environment for Superset
# Connects to LOCAL Docker PostgreSQL containers:
# - Metadata DB (superset-db-1) on port 7432
# - Data Source DB (scribe2-postgres-1) on port 5432

set -e

echo "🔧 Setting up Superset development environment..."
echo "================================================="
echo ""
echo "📌 This setup connects to LOCAL Docker databases:"
echo "   Metadata DB: localhost:7432 (Superset tables, users, dashboards)"
echo "   Data Source: localhost:5432 (Airflow data)"
echo ""

# Navigate to the sps3 superset directory
cd /Users/scribe/Projects/sps3/superset

# Check if Docker containers are running
echo "🐳 Checking Docker containers..."

# Check metadata database on port 7432
if docker ps | grep -q "7432->5432"; then
    echo "   ✅ Metadata database is running on port 7432"
else
    echo "   ⚠️  Metadata database not running on port 7432!"
    echo "   Please ensure the superset-db-1 container is running"
    exit 1
fi

# Check data source database on port 5432
if docker ps | grep -q "5432->5432"; then
    echo "   ✅ Data source database is running on port 5432"
else
    echo "   ⚠️  Data source database not running on port 5432!"
    echo "   Please ensure the scribe2-postgres-1 container is running"
    exit 1
fi

# Check and install PostgreSQL client libraries
echo "📦 Checking PostgreSQL client libraries..."
if ! brew list postgresql@15 &>/dev/null && ! brew list postgresql &>/dev/null; then
    echo "   Installing PostgreSQL client via Homebrew..."
    brew install postgresql@15
    echo "   ✅ PostgreSQL client installed"
else
    echo "   ✅ PostgreSQL client already installed"
fi

# Set up PostgreSQL environment variables
PG_PREFIX=$(brew --prefix postgresql@15 2>/dev/null || brew --prefix postgresql 2>/dev/null || echo "/opt/homebrew/opt/postgresql@15")
export PATH="${PG_PREFIX}/bin:$PATH"
export LDFLAGS="-L${PG_PREFIX}/lib"
export CPPFLAGS="-I${PG_PREFIX}/include"
export PKG_CONFIG_PATH="${PG_PREFIX}/lib/pkgconfig:$PKG_CONFIG_PATH"

echo "   ✅ Database clients environment configured"
echo ""

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🐍 Activating virtual environment..."
source venv/bin/activate

# Upgrade pip first
echo "⬆️  Upgrading pip..."
pip install --upgrade pip setuptools wheel

# Install dependencies
echo "📦 Installing dependencies..."

# Install PostgreSQL adapter
echo "   Installing PostgreSQL adapter (psycopg2-binary)..."
pip install psycopg2-binary==2.9.9 || {
    echo "   ⚠️  psycopg2-binary installation failed, trying psycopg2..."
    pip install psycopg2==2.9.9
}

# Check if requirements/development.txt exists
if [ -f "requirements/development.txt" ]; then
    echo "   Installing from requirements/development.txt..."
    pip install -r requirements/development.txt || {
        echo "   ⚠️  Some packages failed, installing core dependencies separately..."
        pip install boto3==1.34.24  # For S3 support
        pip install flask-cors
        pip install flask-testing
        pip install pytest
        pip install pytest-cov
        pip install redis
        # Try installing the rest
        cat requirements/development.txt | grep -v -E "mysqlclient|psycopg2" | pip install -r /dev/stdin || true
    }
else
    # If no development requirements, try base requirements
    echo "   Installing from requirements/base.txt..."
    pip install -r requirements/base.txt
    
    # Install additional development dependencies
    echo "   Installing additional development dependencies..."
    pip install flask-cors
    pip install flask-testing
    pip install pytest
    pip install pytest-cov
    pip install boto3==1.34.24
    pip install redis
fi

# Install Superset in editable mode
echo "📦 Installing Superset in editable mode..."
pip install -e .

# Test metadata database connection
echo ""
echo "🔍 Testing metadata database connection (port 7432)..."
python -c "
import psycopg2
try:
    conn = psycopg2.connect(
        host='localhost',
        port=7432,
        database='superset',
        user='airflow',
        password='airflow'
    )
    cursor = conn.cursor()
    # Check for core Superset tables
    cursor.execute('''
        SELECT COUNT(*) 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('dashboards', 'slices', 'ab_user', 'ab_role')
    ''')
    count = cursor.fetchone()[0]
    conn.close()
    if count >= 4:
        print('   ✅ Successfully connected to metadata database on port 7432')
        print('   ✅ Found core Superset tables')
    else:
        print('   ⚠️  Connected but some Superset tables might be missing')
except Exception as e:
    print(f'   ❌ Failed to connect to metadata database: {e}')
    exit(1)
"

# Test data source database connection
echo ""
echo "🔍 Testing data source database connection (port 5432)..."
python -c "
import psycopg2
try:
    conn = psycopg2.connect(
        host='localhost',
        port=5432,
        database='airflow',
        user='airflow',
        password='airflow'
    )
    conn.close()
    print('   ✅ Successfully connected to data source database on port 5432')
except Exception as e:
    print(f'   ❌ Failed to connect to data source: {e}')
    print('   Note: The data source connection can also be configured later in Superset UI')
"

# Check if database is initialized
echo ""
echo "🔍 Checking if metadata database is initialized..."
TABLES_COUNT=$(PGPASSWORD=airflow psql -h localhost -p 7432 -U airflow -d superset -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null || echo "0")

if [ "$TABLES_COUNT" -gt "50" ]; then
    echo "   ✅ Database is initialized with $TABLES_COUNT tables"
    echo "   📊 Dashboards, users, and permissions should be available"
    
    # Try to list users
    echo ""
    echo "   📋 Checking existing users..."
    PGPASSWORD=airflow psql -h localhost -p 7432 -U airflow -d superset -t -c "SELECT username FROM ab_user;" 2>/dev/null || echo "   Could not list users"
else
    echo "   ⚠️  Database appears empty or uninitialized ($TABLES_COUNT tables)"
    echo ""
    echo "   The database needs to be initialized. You have two options:"
    echo ""
    echo "   Option 1: Run the initialization from scribe2 Docker container"
    echo "   --------------------------------------------------------"
    echo "   cd /Users/scribe/Projects/scribe2"
    echo "   docker-compose exec superset /app/docker/docker-init.sh"
    echo ""
    echo "   Option 2: Initialize locally (basic setup without ScribeHub assets)"
    echo "   --------------------------------------------------------"
    echo "   cd /Users/scribe/Projects/sps3/superset"
    echo "   source venv/bin/activate"
    echo "   export SUPERSET_CONFIG_PATH=/Users/scribe/Projects/sps3/superset/superset_config.py"
    echo "   superset db upgrade"
    echo "   superset init"
    echo "   superset fab create-admin --username admin --firstname Admin --lastname User --email admin@example.com --password admin"
fi

# Create the configuration file
echo ""
echo "📝 Creating Superset configuration file..."
cat > superset_config.py << 'EOF'
import os
from celery.schedules import crontab
from typing import Optional


def get_env_variable(var_name: str, default: Optional[str] = None) -> str:
    """Get the environment variable or raise exception."""
    try:
        return os.environ[var_name]
    except KeyError:
        if default is not None:
            return default
        else:
            error_msg = f"The environment variable {var_name} was missing, abort..."
            raise OSError(error_msg)


def get_env_bool(var_name: str, default: bool = False) -> bool:
    """Get environment variable as boolean.
    
    Treats 'true', '1', 'yes' (case-insensitive) as True.
    Everything else is False.
    """
    value = get_env_variable(var_name, str(default).lower())
    return value.lower() in ("true", "1", "yes")

# =============================================================================
# DUAL DATABASE CONFIGURATION
# =============================================================================
# Metadata DB: localhost:7432 (Superset tables, users, dashboards)
# Data Source: localhost:5432 (Airflow data - configured in metadata)

# Main metadata database (Local Docker PostgreSQL on port 7432)
SQLALCHEMY_DATABASE_URI = "postgresql://airflow:airflow@localhost:7432/superset"

# Note: The data source (Airflow DB) should already be configured in the metadata
# as "PostgreSQL" or similar, pointing to localhost:5432/airflow

# Security - MUST match the key used in docker-init.sh to decrypt existing database connections
SECRET_KEY = '5kdonWCKada1swkrae2ODVI/rFZMBsOf8bwUpH50xuE='

# JWT configuration (same as SECRET_KEY for consistency with docker setup)
JWT_SECRET = '5kdonWCKada1swkrae2ODVI/rFZMBsOf8bwUpH50xuE='
GUEST_TOKEN_JWT_SECRET = '5kdonWCKada1swkrae2ODVI/rFZMBsOf8bwUpH50xuE='
GLOBAL_ASYNC_QUERIES_JWT_SECRET = '5kdonWCKada1swkrae2ODVI/rFZMBsOf8bwUpH50xuE='

# Redis configuration (shared instance from scribe2)
REDIS_HOST = get_env_variable("REDIS_HOST", "localhost")
REDIS_PORT = get_env_variable("REDIS_PORT", "6379")
REDIS_DB = get_env_variable("REDIS_DB", "2")

# Celery configuration
class CeleryConfig:
    broker_url = f"redis://{REDIS_HOST}:{REDIS_PORT}/0"
    imports = ("superset.sql_lab", "superset.tasks")
    result_backend = f"redis://{REDIS_HOST}:{REDIS_PORT}/0"
    worker_prefetch_multiplier = 10
    task_acks_late = True
    beat_schedule = {
        'reports.scheduler': {
            'task': 'reports.scheduler',
            'schedule': crontab(minute='*', hour='*'),
        },
        'reports.prune_log': {
            'task': 'reports.prune_log',
            'schedule': crontab(minute=0, hour=0),
        },
    }

CELERY_CONFIG = CeleryConfig

# Flask App configuration
DEBUG = get_env_bool("FLASK_DEBUG", default=True)
FLASK_ENV = get_env_variable("FLASK_ENV", "development")
SUPERSET_ENV = get_env_variable("SUPERSET_ENV", "development")

# Superset specific config
APP_NAME = "Superset"
APP_ICON = "/static/assets/images/superset-logo-horiz.png"

# Allow data upload functionality
UPLOAD_ENABLED = get_env_bool("UPLOAD_ENABLED", default=True)
UPLOAD_FOLDER = get_env_variable("UPLOAD_FOLDER", "/tmp/")
ALLOWED_EXTENSIONS = {'csv', 'tsv', 'txt', 'xls', 'xlsx', 'json'}

# Feature flags
FEATURE_FLAGS = {
    "ENABLE_TEMPLATE_PROCESSING": True,
    "ENABLE_EXPLORE_DRAG_AND_DROP": True,
    "DASHBOARD_NATIVE_FILTERS": True,
    "DASHBOARD_CROSS_FILTERS": True,
    "DASHBOARD_FILTERS_EXPERIMENTAL": True,
    "DASHBOARD_NATIVE_FILTERS_SET": True,
    "ENABLE_EXPLORE_JSON_CSRF_PROTECTION": False,  # For development
    "ENABLE_JAVASCRIPT_CONTROLS": True,
    "VERSIONED_EXPORT": True,
}

# Disable CSRF for development (set to True in production!)
WTF_CSRF_ENABLED = get_env_bool("WTF_CSRF_ENABLED", default=False)

# SQL Lab settings
SQLLAB_TIMEOUT = 300
SUPERSET_WEBSERVER_TIMEOUT = 300

# Map settings
MAPBOX_API_KEY = get_env_variable("MAPBOX_API_KEY", "")

# Cache configuration (using shared Redis)
CACHE_CONFIG = {
    'CACHE_TYPE': 'RedisCache',
    'CACHE_DEFAULT_TIMEOUT': 86400,  # 1 day
    'CACHE_KEY_PREFIX': 'superset_view_',
    'CACHE_REDIS_HOST': REDIS_HOST,
    'CACHE_REDIS_PORT': REDIS_PORT,
    'CACHE_REDIS_DB': REDIS_DB,
}

DATA_CACHE_CONFIG = {
    'CACHE_TYPE': 'RedisCache',
    'CACHE_DEFAULT_TIMEOUT': 300,  # 5 minutes
    'CACHE_KEY_PREFIX': 'superset_data_',
    'CACHE_REDIS_HOST': REDIS_HOST,
    'CACHE_REDIS_PORT': REDIS_PORT,
    'CACHE_REDIS_DB': REDIS_DB,
}

# Configure logging
LOG_FORMAT = '%(asctime)s:%(levelname)s:%(name)s:%(message)s'
LOG_LEVEL = 'DEBUG'

# Additional Scribe-specific settings
BACKUP_SUPERSET_ASSETS = False
SCRIBE_ENVIRONMENT = 'development'
EOF

echo "   ✅ Configuration file created"

# Create environment activation script
echo ""
echo "📝 Creating environment activation script..."
cat > .env.development << 'EOF'
#!/bin/bash

# Environment setup for Superset development
# Source this file to set up your environment: source .env.development

# Virtual environment activation
if [ -d "venv" ]; then
    source venv/bin/activate
    echo "✅ Virtual environment activated"
fi

# Tell Superset where to find the config
export SUPERSET_CONFIG_PATH=/Users/scribe/Projects/sps3/superset/superset_config.py
export PYTHONPATH=/Users/scribe/Projects/sps3/superset:$PYTHONPATH

# Redis configuration (shared instance)
export REDIS_HOST=localhost
export REDIS_PORT=6379
export REDIS_DB=2

# Flask configuration
export FLASK_APP=superset
export FLASK_ENV=development
export FLASK_DEBUG=true
export SUPERSET_ENV=development

# Scribe specific
export SCRIBE_ENVIRONMENT=dev
export BACKUP_SUPERSET_ASSETS=false

echo "✅ Environment variables set"
echo "📍 Config file: $SUPERSET_CONFIG_PATH"
echo ""
echo "🔗 Database connections:"
echo "   Metadata DB: localhost:7432/superset (Superset tables)"
echo "   Data Source: localhost:5432/airflow (configured in metadata)"
echo ""
echo "🚀 Ready to run Superset!"
echo ""
echo "Expected users in the database:"
echo "  - admin (Admin role)"
echo "  - ScribeHubAppAdmin (Admin role)"
echo "  - ScribeHubApp (ScribeHub role)"
EOF

echo ""
echo "================================================="
echo "✅ Setup complete!"
echo "================================================="
echo ""
echo "📊 Database Configuration:"
echo "   Metadata DB: localhost:7432/superset"
echo "   Data Source: localhost:5432/airflow"
echo ""
echo "🚀 To start the development server:"
echo ""
echo "   source .env.development"
echo "   superset run -p 8088 --with-threads --reload --debugger"
echo ""
echo "   Or use the run script:"
echo "   ./development/tools/run-superset.sh"
echo ""
echo "👤 Expected users (if database is initialized):"
echo "   - admin (Admin role)"
echo "   - ScribeHubAppAdmin (Admin role)" 
echo "   - ScribeHubApp (ScribeHub role)"
echo ""
echo "📦 To build frontend assets:"
echo "   cd superset-frontend"
echo "   npm ci"
echo "   npm run build"
echo ""
