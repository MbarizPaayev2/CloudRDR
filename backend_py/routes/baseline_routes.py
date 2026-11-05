"""Cryptographic Baseline routes for CloudRDR."""

import uuid
from datetime import datetime, timezone
from flask import Blueprint, jsonify, request
from backend_py.database import db
from backend_py.crypto_utils import hash_buffer, merkle_root
from backend_py.audit_log import default_audit_log

baseline_bp = Blueprint("baseline", __name__)


@baseline_bp.route("/baseline/<bucket>", methods=["GET"])
@baseline_bp.route("/baseline", methods=["GET"])
def get_baseline(bucket="protected"):
    req_bucket = request.args.get("bucket", bucket)
    snapshots = db.find("baseline_snapshots", lambda s: s.get("bucket") == req_bucket)
    if not snapshots:
        snapshots = db.get_all("baseline_snapshots")

    if not snapshots:
        # Create initial baseline on the fly if none exists
        return create_baseline_internal(req_bucket)

    latest = snapshots[-1]
    return jsonify(latest)


@baseline_bp.route("/baseline", methods=["POST"])
def post_baseline():
    data = request.get_json(silent=True) or {}
    bucket = data.get("bucket", "protected")
    return create_baseline_internal(bucket)


def create_baseline_internal(bucket="protected"):
    files = db.find("protected_files", lambda f: f.get("bucket") == bucket)
    if not files:
        # Seed 100 sample protected objects
        now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        seeded = []
        for i in range(1, 101):
            is_canary = (i == 100)
            p = "canary/tripwire_sentinel.docx" if is_canary else f"corporate/doc_{i}.dat"
            h = hash_buffer(f"content_seed_{p}_{i}")
            rec = {
                "id": str(uuid.uuid4()),
                "bucket": bucket,
                "path": p,
                "size_bytes": 1024 + (i * 37),
                "baseline_sha256": h,
                "baseline_version": 1,
                "is_canary": is_canary,
                "created_at": now,
            }
            db.insert("protected_files", rec)
            seeded.append(rec)
        files = seeded

    leaf_hashes = sorted([f["baseline_sha256"] for f in files])
    m_root = merkle_root(leaf_hashes)
    now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

    snapshots = db.find("baseline_snapshots", lambda s: s.get("bucket") == bucket)
    version = f"v{len(snapshots) + 1}"

    snapshot = {
        "id": str(uuid.uuid4()),
        "bucket": bucket,
        "version": version,
        "object_count": len(files),
        "total_objects": len(files),
        "merkle_root": m_root,
        "status": "VALID",
        "created_at": now,
    }
    db.insert("baseline_snapshots", snapshot)

    default_audit_log.append({
        "event": "BASELINE_CAPTURED",
        "bucket": bucket,
        "version": version,
        "objectCount": len(files),
        "merkleRoot": m_root,
    })

    return jsonify(snapshot), 201
