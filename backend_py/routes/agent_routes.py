"""Agent fleet management and health routes for CloudRDR."""

from datetime import datetime, timezone
from flask import Blueprint, jsonify, request
from backend_py.database import db

agent_bp = Blueprint("agent", __name__)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


@agent_bp.route("/api/agent/status", methods=["GET"])
def get_agent_status():
    agents = db.get_all("registered_agents")
    return jsonify({
        "agents": agents,
        "count": len(agents),
        "allHealthy": all(a.get("status") == "connected" for a in agents),
        "timestamp": now_iso(),
    })


@agent_bp.route("/api/agent/ping", methods=["POST"])
def ping_agent():
    data = request.get_json(silent=True) or {}
    agent_id = data.get("agentId", "agt-c-native-01")
    now = now_iso()

    db.update(
        "registered_agents",
        lambda a: a.get("id") == agent_id,
        {"lastHeartbeat": now, "status": "connected"},
    )

    return jsonify({
        "ok": True,
        "agentId": agent_id,
        "status": "connected",
        "lastHeartbeat": now,
        "rttMs": 14,
    })


@agent_bp.route("/api/agent/restart", methods=["POST"])
def restart_agent():
    data = request.get_json(silent=True) or {}
    agent_id = data.get("agentId", "agt-c-native-01")
    now = now_iso()

    db.update(
        "registered_agents",
        lambda a: a.get("id") == agent_id,
        {"status": "connected", "lastHeartbeat": now},
    )

    return jsonify({
        "ok": True,
        "agentId": agent_id,
        "status": "connected",
        "message": f"Agent {agent_id} re-synchronized successfully.",
        "timestamp": now,
    })


@agent_bp.route("/api/agent/register", methods=["POST"])
def register_agent():
    data = request.get_json(silent=True) or {}
    agent_id = data.get("id", f"agt-{datetime.now().strftime('%M%S')}")
    record = {
        "id": agent_id,
        "name": data.get("name", "Edge Node Agent"),
        "os": data.get("os", "Linux / POSIX"),
        "ip": data.get("ip", request.remote_addr or "127.0.0.1"),
        "port": data.get("port", 4455),
        "status": "connected",
        "engine": data.get("engine", "C-Native Inotify / Go Core"),
        "lastHeartbeat": now_iso(),
        "rttMs": 12,
        "isolationArmed": True,
    }
    db.insert("registered_agents", record)
    return jsonify({"ok": True, "agent": record}), 201
