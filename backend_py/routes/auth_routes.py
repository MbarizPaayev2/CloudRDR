"""Authentication routes for CloudRDR."""

import hashlib
import uuid
from datetime import datetime, timezone
from flask import Blueprint, jsonify, request
from backend_py.database import db

auth_bp = Blueprint("auth", __name__)


def hash_pw(password: str) -> str:
    return hashlib.sha256(f"salt_{password}_cloudrdr".encode("utf-8")).hexdigest()


@auth_bp.route("/api/auth/register", methods=["POST"])
def register():
    data = request.get_json(silent=True) or {}
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    full_name = data.get("fullName", data.get("name", "Security Analyst"))
    role = data.get("role", "analyst")

    if not email or not password:
        return jsonify({"error": {"code": "validation_error", "message": "Email and password required"}}), 400

    existing = db.find_one("internal_users", lambda u: u.get("email") == email)
    if existing:
        return jsonify({"error": {"code": "user_exists", "message": "User with this email already exists"}}), 409

    user_id = str(uuid.uuid4())
    pw_hash = hash_pw(password)
    user_record = {
        "id": user_id,
        "email": email,
        "full_name": full_name,
        "role": role,
        "password_hash": pw_hash,
    }
    db.insert("internal_users", user_record)

    token = f"sess_{uuid.uuid4().hex}"
    session_record = {
        "token": token,
        "user_id": user_id,
        "email": email,
        "role": role,
        "full_name": full_name,
        "created_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
    }
    db.insert("user_sessions", session_record)

    return jsonify({
        "user": {
            "id": user_id,
            "email": email,
            "fullName": full_name,
            "role": role,
        },
        "token": token,
    }), 201


@auth_bp.route("/api/auth/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({"error": {"code": "validation_error", "message": "Email and password required"}}), 400

    user = db.find_one("internal_users", lambda u: u.get("email") == email)
    if not user or user.get("password_hash") != hash_pw(password):
        # Fallback default dev credentials
        if email in ("admin@cloudrdr.internal", "analyst@cloudrdr.internal") and password in ("admin123", "cloudrdr2026"):
            user = {
                "id": str(uuid.uuid4()),
                "email": email,
                "full_name": "Admin Operator" if "admin" in email else "Senior SOC Analyst",
                "role": "admin" if "admin" in email else "analyst",
            }
        else:
            return jsonify({"error": {"code": "invalid_credentials", "message": "Invalid email or password"}}), 401

    token = f"sess_{uuid.uuid4().hex}"
    session_record = {
        "token": token,
        "user_id": user.get("id"),
        "email": user.get("email"),
        "role": user.get("role", "analyst"),
        "full_name": user.get("full_name", "SOC Operator"),
        "created_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
    }
    db.insert("user_sessions", session_record)

    return jsonify({
        "user": {
            "id": user.get("id"),
            "email": user.get("email"),
            "fullName": user.get("full_name"),
            "role": user.get("role"),
        },
        "token": token,
    })


@auth_bp.route("/api/auth/logout", methods=["POST"])
def logout():
    auth_header = request.headers.get("Authorization", "")
    token = auth_header.replace("Bearer ", "") if auth_header.startswith("Bearer ") else request.headers.get("x-session-token", "")
    if token:
        db.delete("user_sessions", lambda s: s.get("token") == token)
    return jsonify({"ok": True, "message": "Logged out successfully"})


@auth_bp.route("/api/auth/me", methods=["GET"])
def me():
    auth_header = request.headers.get("Authorization", "")
    token = auth_header.replace("Bearer ", "") if auth_header.startswith("Bearer ") else request.headers.get("x-session-token", "")
    if not token:
        # Default fallback analyst for local dashboard
        return jsonify({
            "user": {
                "id": "usr-default-analyst",
                "email": "analyst@cloudrdr.internal",
                "fullName": "M. Vance",
                "role": "analyst",
            }
        })

    session = db.find_one("user_sessions", lambda s: s.get("token") == token)
    if session:
        return jsonify({
            "user": {
                "id": session.get("user_id"),
                "email": session.get("email"),
                "fullName": session.get("full_name"),
                "role": session.get("role"),
            }
        })

    return jsonify({
        "user": {
            "id": "usr-default-analyst",
            "email": "analyst@cloudrdr.internal",
            "fullName": "M. Vance",
            "role": "analyst",
        }
    })
