#!/usr/bin/env python3
"""
Secrets management helper for Superset
Like a TypeScript utility module for handling sensitive data
"""
import os
import secrets
import sys
from pathlib import Path


def generate_secret_key():
    """Generate a cryptographically secure secret key"""
    return secrets.token_urlsafe(32)


def check_env_file():
    """Check if .env file exists and has required variables"""
    env_file = Path('.env')
    required_vars = [
        'SUPERSET_SECRET_KEY',
        'SUPERSET_DATABASE_URI',
    ]
    
    if not env_file.exists():
        print("❌ .env file not found!")
        print("✅ Creating from .env.example...")
        
        example_file = Path('.env.example')
        if example_file.exists():
            env_file.write_text(example_file.read_text())
            print("📝 Please edit .env with your values")
        return False
    
    env_content = env_file.read_text()
    missing_vars = []
    
    for var in required_vars:
        if f"{var}=" not in env_content:
            missing_vars.append(var)
    
    if missing_vars:
        print(f"❌ Missing required variables: {', '.join(missing_vars)}")
        return False
    
    return True


def remove_sensitive_files():
    """Remove sensitive files that shouldn't be in git"""
    sensitive_files = [
        '.act-secrets',
        '.github-act-secrets',
        'superset_config.py',
    ]
    
    for file in sensitive_files:
        file_path = Path(file)
        if file_path.exists():
            print(f"🗑️  Removing {file}")
            file_path.unlink()


def main():
    """Main function to set up secure configuration"""
    print("🔐 Superset Security Setup")
    print("=" * 40)
    
    # Generate secret key if requested
    if len(sys.argv) > 1 and sys.argv[1] == 'generate-key':
        key = generate_secret_key()
        print(f"Generated secret key: {key}")
        print("Add this to your .env file as SUPERSET_SECRET_KEY")
        return
    
    # Check environment setup
    if not check_env_file():
        print("\n⚠️  Please configure your .env file before running Superset")
        print(f"Generate a secret key with: {sys.argv[0]} generate-key")
        sys.exit(1)
    
    # Clean up sensitive files
    remove_sensitive_files()
    
    print("\n✅ Security setup complete!")
    print("Remember to:")
    print("- Never commit .env files")
    print("- Use different secret keys for each environment")
    print("- Rotate secrets regularly")


if __name__ == "__main__":
    main()
