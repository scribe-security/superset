#!/usr/bin/env python3
"""
Migration script from old hardcoded config to secure environment-based config
"""
import re
import sys
from pathlib import Path


def extract_config_values(config_file='superset_config_dev.py'):
    """Extract hardcoded values from old config"""
    
    if not Path(config_file).exists():
        print(f"❌ Config file {config_file} not found")
        return {}
    
    with open(config_file, 'r') as f:
        content = f.read()
    
    # Extract values using regex
    patterns = {
        'SECRET_KEY': r"SECRET_KEY\s*=\s*['\"]([^'\"]+)['\"]",
        'DATABASE_URI': r"SQLALCHEMY_DATABASE_URI\s*=\s*['\"]([^'\"]+)['\"]",
        'REDIS_HOST': r"REDIS_HOST\s*=\s*['\"]([^'\"]+)['\"]",
        'REDIS_PORT': r"REDIS_PORT\s*=\s*['\"]([^'\"]+)['\"]",
        'REDIS_DB': r"REDIS_DB\s*=\s*(\d+)",
    }
    
    values = {}
    for key, pattern in patterns.items():
        match = re.search(pattern, content)
        if match:
            values[key] = match.group(1)
            print(f"✅ Found {key}: {values[key][:20]}...")
    
    return values


def create_env_file(values):
    """Create .env file from extracted values"""
    
    env_path = Path('.env')
    if env_path.exists():
        print("⚠️  .env file already exists")
        response = input("Overwrite? (y/N): ")
        if response.lower() != 'y':
            return
    
    # Read template
    template_path = Path('.env.example')
    if not template_path.exists():
        print("❌ .env.example not found")
        return
    
    content = template_path.read_text()
    
    # Replace values
    replacements = {
        'SUPERSET_SECRET_KEY=your-secret-key-here': f'SUPERSET_SECRET_KEY={values.get("SECRET_KEY", "GENERATE-NEW-KEY")}',
        'SUPERSET_DATABASE_URI=postgresql://user:password@localhost:5432/superset': f'SUPERSET_DATABASE_URI={values.get("DATABASE_URI", "")}',
        'REDIS_HOST=localhost': f'REDIS_HOST={values.get("REDIS_HOST", "localhost")}',
        'REDIS_PORT=6379': f'REDIS_PORT={values.get("REDIS_PORT", "6379")}',
        'REDIS_DB=0': f'REDIS_DB={values.get("REDIS_DB", "0")}',
    }
    
    for old, new in replacements.items():
        content = content.replace(old, new)
    
    # Write new .env
    env_path.write_text(content)
    print("✅ Created .env file")
    
    # Check for WARNING
    if "GENERATE-NEW-KEY" in content:
        print("\n⚠️  WARNING: No secret key found in old config!")
        print("Generate a new one with: python scripts/secure_setup.py generate-key")


def main():
    """Main migration function"""
    print("🔄 Superset Configuration Migration")
    print("=" * 40)
    
    # Extract old values
    print("\n📤 Extracting values from old config...")
    values = extract_config_values()
    
    if not values:
        print("❌ No values found to migrate")
        return
    
    # Create new .env
    print("\n📥 Creating new .env file...")
    create_env_file(values)
    
    print("\n✅ Migration complete!")
    print("\nNext steps:")
    print("1. Review .env file and update any placeholder values")
    print("2. Generate new secret key if needed")
    print("3. Remove old config file")
    print("4. Update SUPERSET_CONFIG environment variable")


if __name__ == "__main__":
    main()
