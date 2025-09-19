#!/bin/bash
set -e

echo "Starting FastAPI application..."
echo "Python version: $(python --version)"
echo "Current directory: $(pwd)"
echo "Files in current directory: $(ls -la)"

# Start the uvicorn server
exec python -m uvicorn Server:app --host 0.0.0.0 --port ${PORT:-8000} --reload