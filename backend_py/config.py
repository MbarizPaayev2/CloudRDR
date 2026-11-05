"""Configuration module for CloudRDR Python Flask Backend."""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env file if present
ROOT_DIR = Path(__file__).resolve().parent.parent
load_dotenv(ROOT_DIR / ".env")

class Config:
    PORT = int(os.getenv("PORT", 3000))
    HOST = os.getenv("HOST", "0.0.0.0")
    API_KEY = os.getenv("API_KEY", "cloudrdr-default-key-2026")
    ENV = os.getenv("NODE_ENV", os.getenv("FLASK_ENV", "development"))
    DEBUG = ENV == "development"
    
    ROOT_DIR = ROOT_DIR
    FRONTEND_DIR = ROOT_DIR / "frontend"
    DASHBOARD_DIR = FRONTEND_DIR / "dashboard"
    SITE_DIR = FRONTEND_DIR / "site"
    DATA_DIR = ROOT_DIR / "data"
    AUDIT_LOG_FILE = DATA_DIR / "audit-log" / "audit.jsonl"
    DB_STORAGE_FILE = DATA_DIR / "db-storage.json"
    
    DEFAULT_BUCKET = os.getenv("BUCKET_NAME", "protected")
    RATE_LIMIT_PER_MINUTE = int(os.getenv("RATE_LIMIT", 2000))
    
    # Valid API Keys allowed
    VALID_API_KEYS = {
        API_KEY,
        "cloudrdr-default-key-2026",
        "dev-secret-key-12345",
    }
