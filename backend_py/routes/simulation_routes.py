"""Attack Simulation & Chaos Engineering routes for CloudRDR."""

import uuid
from datetime import datetime, timezone
from flask import Blueprint, jsonify, request
from backend_py.database import db
from backend_py.crypto_utils import sign_record, hash_buffer
from backend_py.audit_log import default_audit_log

simulation_bp = Blueprint("simulation", __name__)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


@simulation_bp.route("/api/simulate/attack", methods=["POST"])
def simulate_attack():
    now = now_iso()
    inc_id = str(uuid.uuid4())

    affected_paths = [
        "corporate/payroll_q3.xlsx",
        "corporate/executive_memo.docx",
        "financials/gl_ledger_2026.dat",
        "financials/q2_audit_report.pdf",
        "canary/tripwire_sentinel.docx",
    ]

    record_to_sign = {
        "incidentId": inc_id,
        "accountId": "victim-account-1",
        "detectedAt": now,
        "frozenAt": now,
        "shannonEntropy": 7.98,
        "affectedCount": len(affected_paths),
        "verdict": "ransomware",
    }
    signed_meta = sign_record(record_to_sign)

    incident = {
        "id": inc_id,
        "title": "Ransomware Mass Modification Spike (Shannon Entropy > 7.95)",
        "severity": "Critical",
        "status": "frozen",
        "freezeStatus": "frozen",
        "account_id": "victim-account-1",
        "detection_reason": "ENTROPY_AND_VELOCITY_SPIKE",
        "shannon_entropy": 7.98,
        "affected_paths": affected_paths,
        "created_at": now,
        "frozen_at": now,
        "record_json": record_to_sign,
        "record_signature": signed_meta["signature"],
        "signing_key_id": signed_meta["keyId"],
    }
    db.insert("incidents", incident)

    # Add detection run
    run = {
        "id": f"run-{uuid.uuid4().hex[:8]}",
        "accountId": "victim-account-1",
        "windowSeconds": 30,
        "totalFiles": 100,
        "changedFiles": len(affected_paths),
        "changeRate": 0.40,
        "threshold": 0.35,
        "verdict": "ransomware",
        "canaryTriggered": True,
        "meanEntropy": 7.98,
        "highEntropyFilesCount": 5,
        "riskScore": 96,
        "threatLevel": "CRITICAL",
        "created_at": now,
    }
    db.insert("detection_runs", run)

    # Append to audit ledger
    default_audit_log.append({
        "event": "incident_created",
        "incidentId": inc_id,
        "status": "frozen",
        "signature": signed_meta["signature"],
        "keyId": signed_meta["keyId"],
        "record": record_to_sign,
    })

    return jsonify({
        "ok": True,
        "incidentId": inc_id,
        "status": "frozen",
        "message": "Critical: Ransomware mass modification simulated. Automated freeze engaged in 14ms.",
    })


@simulation_bp.route("/api/simulate/canary", methods=["POST"])
def simulate_canary():
    now = now_iso()
    inc_id = str(uuid.uuid4())

    incident = {
        "id": inc_id,
        "title": "Zero-Touch Canary Trap Sentinel Tampered",
        "severity": "Critical",
        "status": "frozen",
        "freezeStatus": "frozen",
        "account_id": "victim-account-1",
        "detection_reason": "CANARY_MODIFIED",
        "canary_triggered": True,
        "affected_paths": ["canary/tripwire_sentinel.docx"],
        "created_at": now,
        "frozen_at": now,
    }
    db.insert("incidents", incident)

    default_audit_log.append({
        "event": "CANARY_TRIPWIRE_TRIGGERED",
        "incidentId": inc_id,
        "canaryPath": "canary/tripwire_sentinel.docx",
        "action": "AUTOMATED_CONTAINMENT_LOCKED",
    })

    return jsonify({
        "ok": True,
        "incidentId": inc_id,
        "status": "frozen",
        "message": "Canary decoy touched! Dual-layer isolation locked.",
    })


@simulation_bp.route("/api/simulate/reset", methods=["POST"])
def reset_simulation():
    now = now_iso()
    # Mark all active incidents as resolved
    db.update(
        "incidents",
        lambda i: i.get("status") not in ("resolved", "dismissed"),
        {"status": "resolved", "resolved_at": now, "freezeStatus": "unlocked"},
    )

    default_audit_log.append({
        "event": "SIMULATION_RESET",
        "status": "ALL_CLEAR",
        "timestamp": now,
    })

    return jsonify({
        "ok": True,
        "message": "Simulation reset. System returned to verified healthy posture.",
    })


@simulation_bp.route("/api/simulate/tamper", methods=["POST"])
def simulate_tamper():
    data = request.get_json(silent=True) or {}
    revert = data.get("revert", False)
    now = now_iso()

    default_audit_log.append({
        "event": "TAMPER_SIMULATION",
        "revert": revert,
        "timestamp": now,
    })

    return jsonify({
        "ok": True,
        "tampered": not revert,
        "message": "Tamper simulation state toggled.",
    })
