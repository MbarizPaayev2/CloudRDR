"""Detection Engine routes for CloudRDR."""

from datetime import datetime, timezone
from flask import Blueprint, jsonify, request
from backend_py.database import db

detection_bp = Blueprint("detection", __name__)


@detection_bp.route("/detection/summary", methods=["GET"])
def detection_summary():
    cfg = db.get_all("detection_config")
    active_cfg = cfg[0] if cfg else {
        "windowSeconds": 30,
        "maxModificationsPerWindow": 25,
        "modificationRateThreshold": 0.35,
        "entropyThreshold": 7.2,
        "canaryAlertEnabled": True,
    }

    incidents = db.get_all("incidents")
    active_incidents = [i for i in incidents if i.get("status") not in ("resolved", "dismissed")]
    has_active_threat = len(active_incidents) > 0

    velocity = 0.88 if has_active_threat else 0.04
    gauge_pct = min(100, round(velocity * 100))

    return jsonify({
        "slidingWindow": {
            "windowSeconds": active_cfg.get("windowSeconds", 30),
            "maxModifications": active_cfg.get("maxModificationsPerWindow", 25),
            "thresholdRate": active_cfg.get("modificationRateThreshold", 0.35),
        },
        "velocityScore": {
            "currentVelocity": velocity,
            "gaugeFillPercent": gauge_pct,
            "status": "ALERT" if has_active_threat else "NORMAL",
            "verdict": "ransomware" if has_active_threat else "normal",
        },
        "thresholds": {
            "modificationThreshold": active_cfg.get("modificationRateThreshold", 0.35),
            "canaryAlertEnabled": active_cfg.get("canaryAlertEnabled", True),
            "entropyThreshold": active_cfg.get("entropyThreshold", 7.2),
            "lastEvaluatedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        },
        "activeAlerts": len(active_incidents),
        "pendingReview": len(active_incidents),
    })


@detection_bp.route("/detection/runs", methods=["GET"])
def detection_runs():
    limit = int(request.args.get("limit", 50))
    runs = db.get_all("detection_runs")
    if not runs:
        now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        runs = [
            {
                "id": "run-baseline-01",
                "accountId": "victim-account-1",
                "windowSeconds": 30,
                "totalFiles": 100,
                "changedFiles": 2,
                "changeRate": 0.02,
                "threshold": 0.35,
                "verdict": "normal",
                "canaryTriggered": False,
                "riskScore": 4,
                "threatLevel": "LOW",
                "created_at": now,
            }
        ]
    return jsonify({"runs": runs[-limit:]})


@detection_bp.route("/detection/config", methods=["POST"])
def update_detection_config():
    data = request.get_json(silent=True) or {}
    updated = db.update("detection_config", lambda c: True, data)
    if not updated:
        db.insert("detection_config", data)
    return jsonify({"ok": True, "config": data})
