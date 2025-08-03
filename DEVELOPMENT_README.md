# sps3 Superset Development Environment

This README explains how to run the Superset development environment for the sps3 project (Wolfi-based fork).

## 🏗️ Architecture Overview

This setup uses a dual-database architecture:

```
┌─────────────────────────────────────────────────────┐
│              Docker Containers                       │
├─────────────────────────────────────────────────────┤
│                                                      │
│  PostgreSQL (port 7432)     PostgreSQL (port 5432)  │
│  ┌──────────────────┐       ┌──────────────────┐   │
│  │ Metadata DB      │       │ Data Source DB   │   │
│  │ (superset-db-1)  │       │ (scribe2-postgres│   │
│  │                  │       │  -1)             │   │
│  │ • Dashboards     │       │ • Airflow data   │   │
│  │ • Users          │       │ • Business data  │   │
│  │ • Permissions    │       │                  │   │
│  │ • Charts         │       │                  │   │
│  └──────────────────┘       └──────────────────┘   │
│           ▲                          ▲              │
└───────────┼──────────────────────────┼─────────────┘
            │                          │
    ┌───────┴──────────────────────────┴────────┐
    │         sps3 Development Superset         │
    │         (Running locally on Flask)         │
    └────────────────────────────────────────────┘
```

## 📋 Prerequisites

### 1. Docker Containers Running
The following Docker containers must be running (from the scribe2 project):

```bash
# Check if containers are running
docker ps | grep -E "7432|5432"
```

You should see:
- `superset-db-1` on port 7432 (Metadata database)
- `scribe2-postgres-1` on port 5432 (Data source database)

If not running, start them:
```bash
cd /Users/scribe/Projects/scribe2
docker-compose up -d postgres superset-db redis
```

### 2. System Requirements
- **Python 3.8+**
- **Node.js 16+** (for frontend builds)
- **PostgreSQL client** (will be installed automatically)
- **Redis** (optional, can run in Docker)

### 3. Database Initialization
The metadata database (port 7432) should already be populated by scribe2's `docker-init.sh` with:
- Dashboards and charts
- Users (admin, ScribeHubAppAdmin, ScribeHubApp)
- Permissions and roles

## 🚀 Quick Start

### Step 1: Initial Setup (First Time Only)

```bash
cd /Users/scribe/Projects/sps3/superset

# Run the setup script
./development/tools/setup-dev.sh
```

This script will:
- ✅ Check Docker containers are running
- ✅ Install PostgreSQL client libraries
- ✅ Create Python virtual environment
- ✅ Install all Python dependencies
- ✅ Install Superset in editable mode
- ✅ Test database connections
- ✅ Create configuration files
- ✅ Set up environment variables

### Step 2: Start Development Server

```bash
# Navigate to project directory
cd /Users/scribe/Projects/sps3/superset

# Start the server
./development/tools/run-superset.sh
```

Or manually:
```bash
source .env.development
superset run -p 8088 --with-threads --reload --debugger
```

### Step 3: Access Superset

Open your browser and navigate to:
- **URL**: http://localhost:8088
- **Login with existing users**:
  - Username: `admin`
  - Username: `ScribeHubAppAdmin` 
  - Username: `ScribeHubApp`

## 🔧 Configuration Details

### Database Connections

| Database | Host | Port | Database Name | Username | Purpose |
|----------|------|------|---------------|----------|---------|
| Metadata | localhost | 7432 | superset | airflow | Stores Superset configuration, dashboards, users |
| Data Source | localhost | 5432 | airflow | airflow | Contains actual business data for dashboards |

### Important Files

```
/Users/scribe/Projects/sps3/superset/
├── superset_config.py           # Main configuration file
├── .env.development             # Environment variables
├── development/
│   └── tools/
│       ├── setup-dev.sh        # Initial setup script
│       └── run-superset.sh     # Server start script
└── superset/
    └── utils/
        └── excel_processing/
            └── post_processor.py  # Custom Excel processing
```

### Configuration File (`superset_config.py`)

Key settings:
- **SECRET_KEY**: Must match the key used in docker-init.sh (`5kdonWCKada1swkrae2ODVI/rFZMBsOf8bwUpH50xuE=`)
- **SQLALCHEMY_DATABASE_URI**: Points to metadata database on port 7432
- **Redis**: Configured for caching (localhost:6379)
- **Development Mode**: Debug enabled, CSRF disabled for development

## 🛠️ Common Tasks

### Rebuild Frontend Assets

```bash
cd /Users/scribe/Projects/sps3/superset/superset-frontend
npm ci
npm run build
```

### Watch Frontend Changes (Hot Reload)

```bash
# Terminal 1: Run frontend watcher
cd superset-frontend
npm run dev

# Terminal 2: Run backend server
./development/tools/run-superset.sh
```

### Check Database Status

```bash
# Check if metadata database is populated
PGPASSWORD=airflow psql -h localhost -p 7432 -U airflow -d superset -c "SELECT COUNT(*) FROM dashboards;"

# List existing users
PGPASSWORD=airflow psql -h localhost -p 7432 -U airflow -d superset -c "SELECT username FROM ab_user;"
```

### Activate Virtual Environment Manually

```bash
cd /Users/scribe/Projects/sps3/superset
source venv/bin/activate
source .env.development
```

## 🐛 Troubleshooting

### "Invalid decryption key" Error

**Problem**: Cannot view databases in Superset UI.

**Solution**: Ensure `SECRET_KEY` in `superset_config.py` matches the one used in Docker:
```python
SECRET_KEY = '5kdonWCKada1swkrae2ODVI/rFZMBsOf8bwUpH50xuE='
```

### Docker Containers Not Running

**Problem**: Setup script fails with database connection errors.

**Solution**: Start the required containers:
```bash
cd /Users/scribe/Projects/scribe2
docker-compose up -d postgres superset-db redis
```

### Port Already in Use

**Problem**: Cannot start Superset on port 8088.

**Solution**: Check what's using the port:
```bash
lsof -i :8088
# Kill the process or use a different port:
superset run -p 8089 --with-threads --reload --debugger
```

### Database Not Initialized

**Problem**: No dashboards or users in the database.

**Solution**: Run initialization from scribe2:
```bash
cd /Users/scribe/Projects/scribe2
docker-compose exec superset /app/docker/docker-init.sh
```

### Python Dependencies Issues

**Problem**: Import errors or missing packages.

**Solution**: Reinstall dependencies:
```bash
cd /Users/scribe/Projects/sps3/superset
rm -rf venv
./development/tools/setup-dev.sh
```

## 📝 Development Workflow

1. **Make code changes** in `/Users/scribe/Projects/sps3/superset/`
2. **Backend changes**: Will auto-reload due to `--reload` flag
3. **Frontend changes**: 
   - For one-time build: `cd superset-frontend && npm run build`
   - For watch mode: `cd superset-frontend && npm run dev`
4. **Test your changes** at http://localhost:8088
5. **Check logs** in the terminal running the server

## 🔄 Updating from scribe2

If scribe2's database is updated with new dashboards/users:

1. The changes will automatically appear in your dev environment (shared database)
2. No need to re-run setup unless database structure changes

## 🧹 Clean Start

If you need a completely fresh start:

```bash
cd /Users/scribe/Projects/sps3/superset

# Clean Python environment
rm -rf venv
rm -f superset_config.py .env.development

# Clean frontend
rm -rf superset-frontend/node_modules

# Re-run setup
./development/tools/setup-dev.sh
```

## 📚 Additional Resources

- **Superset Documentation**: https://superset.apache.org/
- **scribe2 Project**: `/Users/scribe/Projects/scribe2/`
- **Docker Dashboard**: Check container status and logs

## 🤝 Contributing

When making changes to the sps3 fork:
1. Test thoroughly in development environment
2. Ensure Excel processing (`post_processor.py`) works correctly
3. Document any new configuration requirements
4. Keep `SECRET_KEY` secure and consistent

## ⚠️ Important Notes

1. **SECRET_KEY**: The SECRET_KEY must match between environments to decrypt database connections
2. **Database Ports**: 
   - 7432 = Metadata (Superset configuration)
   - 5432 = Data Source (Airflow business data)
3. **Development Only**: CSRF is disabled and debug mode is enabled - never use these settings in production
4. **Shared Database**: Changes to dashboards/users affect both dev and Docker environments

## 📞 Support

If you encounter issues:
1. Check Docker containers are running
2. Verify database connections
3. Review logs in the terminal
4. Ensure SECRET_KEY matches across environments
