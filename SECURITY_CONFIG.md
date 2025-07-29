# 🔐 Superset Security Configuration Guide

## Overview

This guide explains the security improvements made to the Superset configuration, using TypeScript analogies to make it easier to understand.

## Architecture

Think of our configuration system like TypeScript's type system:

```
BaseConfig (abstract class) 
    ↓
DevConfig extends BaseConfig
ProdConfig extends BaseConfig
```

## Configuration Files

### 1. `superset_config_base.py`
- **Purpose**: Base configuration with secure defaults
- **Analogy**: Like a TypeScript interface with required security properties
- **Features**:
  - Environment variable validation
  - Type-safe configuration loading
  - Factory functions for consistent configs

### 2. `superset_config_dev.py`
- **Purpose**: Development-specific overrides
- **Analogy**: Like TypeScript's `Partial<Config>` for dev overrides
- **Only runs**: When `SUPERSET_ENV=development`

### 3. `superset_config_prod.py`
- **Purpose**: Production security hardening
- **Analogy**: Like TypeScript's strict mode
- **Features**: CSRF, HTTPS enforcement, strict CORS

## Security Improvements

### 1. **No More Hardcoded Secrets**
```python
# ❌ OLD (Bad)
SECRET_KEY = '5kdonWCKada1swkrae2ODVI/rFZMBsOf8bwUpH50xuE='

# ✅ NEW (Good)
SECRET_KEY = get_env_variable('SUPERSET_SECRET_KEY')
```

### 2. **Environment Variable Validation**
```python
def get_env_variable(var_name: str, default: Optional[str] = None) -> str:
    """Like TypeScript's strict null checking"""
    value = os.environ.get(var_name, default)
    if value is None:
        raise ValueError(f"Required variable '{var_name}' not set!")
    return value
```

### 3. **Type-Safe Feature Flags**
```python
# Like TypeScript boolean type guards
FEATURE_FLAGS = {
    'ENABLE_TEMPLATE_PROCESSING': get_env_variable('FF_TEMPLATE_PROCESSING', 'false').lower() == 'true',
}
```

## Setup Instructions

### 1. Initial Setup
```bash
# Copy environment template
cp .env.example .env

# Generate secure secret key
python scripts/secure_setup.py generate-key

# Edit .env with your values
nano .env
```

### 2. Docker Setup
```bash
# Copy Docker environment template
cp docker/.env.example docker/.env

# Generate secure passwords
openssl rand -base64 32  # For each password field

# Edit docker/.env
nano docker/.env
```

### 3. Run Security Check
```bash
# Check configuration and clean sensitive files
python scripts/secure_setup.py
```

## Environment Variables Reference

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `SUPERSET_SECRET_KEY` | Flask secret key | ✅ Yes | None |
| `SUPERSET_DATABASE_URI` | Database connection | ✅ Yes | None |
| `REDIS_HOST` | Redis hostname | No | localhost |
| `REDIS_PORT` | Redis port | No | 6379 |
| `CSRF_ENABLED` | Enable CSRF protection | No | true |
| `ENABLE_CORS` | Enable CORS | No | false |
| `LOG_LEVEL` | Logging level | No | INFO |

## Security Checklist

- [ ] Generated unique `SUPERSET_SECRET_KEY`
- [ ] Updated all default passwords
- [ ] Removed `.act-secrets` and `.github-act-secrets`
- [ ] Never committed `.env` files
- [ ] Set `SUPERSET_ENV=production` for production
- [ ] Enabled CSRF protection in production
- [ ] Configured proper CORS origins
- [ ] Set up secret rotation schedule

## Best Practices

1. **Secret Generation**
   ```bash
   # Python method
   python -c 'import secrets; print(secrets.token_urlsafe(32))'
   
   # OpenSSL method
   openssl rand -base64 32
   ```

2. **Environment Isolation**
   - Use different secret keys per environment
   - Never share secrets between dev/staging/prod
   - Rotate secrets regularly

3. **Git Safety**
   - Always check `git status` before committing
   - Use `git add -p` to review changes
   - Never force-add ignored files

## Troubleshooting

### Missing Environment Variables
```
ValueError: Required environment variable 'SUPERSET_SECRET_KEY' is not set!
```
**Solution**: Copy `.env.example` to `.env` and fill in values

### Configuration Not Loading
**Check**:
1. Environment variables are exported
2. `SUPERSET_ENV` is set correctly
3. Python path includes config directory

### Docker Issues
**Check**:
1. `docker/.env` exists and has values
2. Docker Compose is using correct env file
3. No spaces around `=` in env file

## Migration from Old Config

1. **Backup old config**
   ```bash
   cp superset_config.py superset_config.backup.py
   ```

2. **Extract values to .env**
   ```
   SUPERSET_SECRET_KEY=your-old-secret-key
   SUPERSET_DATABASE_URI=your-old-database-uri
   ```

3. **Switch to new config**
   ```bash
   export SUPERSET_CONFIG=superset_config_dev.py
   ```

## Security Resources

- [OWASP Configuration Guide](https://owasp.org/www-project-application-security-verification-standard/)
- [12 Factor App Config](https://12factor.net/config)
- [Flask Security Best Practices](https://flask.palletsprojects.com/en/2.3.x/security/)
