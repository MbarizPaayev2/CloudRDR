#!/usr/bin/env python3
"""Convenience root entrypoint for CloudRDR Python Flask Application."""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from backend_py.app import create_app
from backend_py.config import Config

app = create_app()

if __name__ == "__main__":
    port = Config.PORT
    host = Config.HOST
    print(f"[*] CloudRDR Python Flask Server listening on http://{host}:{port}")
    app.run(host=host, port=port, debug=False)
