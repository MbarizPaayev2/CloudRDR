#!/usr/bin/env python3
"""Root launcher for CloudRDR Python Flask Backend."""

import os
import sys

# Ensure repository root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from backend_py.app import create_app
from backend_py.config import Config

if __name__ == "__main__":
    app = create_app()
    port = Config.PORT
    host = Config.HOST
    print(f"[*] CloudRDR Python Flask Server starting on http://{host}:{port}")
    app.run(host=host, port=port, debug=False)
