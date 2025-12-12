from typing import Any
import sys
import os

# Add the parent directory to sys.path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

# Import the FastAPI app
try:
    from backend.main import app
except ImportError:
    # Fallback if backend module not found (local debugging vs vercel structure)
    sys.path.append(os.path.join(os.path.dirname(__file__), '../backend'))
    from main import app

# Vercel needs a handler, but for FastAPI/Uvicorn, the 'app' object is enough 
# if using vercel.json "rewrites".
# However, standard Vercel python builds look for 'handler' or 'app'.
# We expose 'app' as the WSGI/ASGI application.
