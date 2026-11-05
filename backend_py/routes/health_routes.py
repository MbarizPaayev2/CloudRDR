"""Health check routes for CloudRDR."""

import time
from datetime import datetime, timezone
from flask import Blueprint, jsonify

health_bp = Blueprint("health", __name__)
_start_time = time.time()


@health_bp.route("/health", methods=["GET"])
@health_bp.route("/api/health", methods=["GET"])
def get_health():
    uptime = time.time() - _start_time
    return jsonify({
        "status": "ok",
        "uptime": round(uptime, 4),
        "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
    })
