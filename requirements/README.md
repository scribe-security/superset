# Requirements Management

This project uses pip-tools to manage Python dependencies.

## Structure
- `*.in` files: Source files where you specify direct dependencies
- `*.txt` files: Compiled files with all transitive dependencies pinned

## Adding a New Dependency

1. Add the dependency to the appropriate `.in` file:
   - `base.in`: Core dependencies needed by the application
   - `development.in`: Additional dependencies for development

2. Recompile ALL requirements files:
   ```bash
   pip-compile requirements/base.in -o requirements/base.txt
   pip-compile requirements/development.in -o requirements/development.txt
   ```

## Important Notes

- NEVER edit `.txt` files directly
- ALWAYS recompile all `.txt` files together to avoid version conflicts
- Test the requirements installation before committing

## Quick Commands

```bash
# Install pip-tools in a virtual environment
python3 -m venv venv && source venv/bin/activate
pip install pip-tools

# Compile all requirements
make -f Makefile.requirements compile-requirements

# Upgrade all dependencies
make -f Makefile.requirements upgrade-requirements
```
