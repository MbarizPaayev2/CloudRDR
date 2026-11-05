"""CloudRDR Enterprise Python Flask Application Server."""

import sys
from pathlib import Path
from flask import Flask, request, jsonify
from flask_cors import CORS
from backend_py.config import Config
from backend_py.database import db

# Import all blueprints
from backend_py.routes.health_routes import health_bp
from backend_py.routes.auth_routes import auth_bp
from backend_py.routes.telemetry_routes import telemetry_bp
from backend_py.routes.detection_routes import detection_bp
from backend_py.routes.baseline_routes import baseline_bp
from backend_py.routes.incident_routes import incident_bp
from backend_py.routes.restore_routes import restore_bp
from backend_py.routes.agent_routes import agent_bp
from backend_py.routes.simulation_routes import simulation_bp
from backend_py.routes.compliance_routes import compliance_bp
from backend_py.routes.static_routes import static_bp


def create_app() -> Flask:
    """Create and configure the Flask application."""
    app = Flask(__name__)
    app.config.from_object(Config)

    # 1. CORS
    CORS(
        app,
        resources={r"/*": {"origins": "*"}},
        supports_credentials=True,
        methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization", "X-API-Key", "x-session-token", "Accept"],
    )

    # 2. Authentication & Public Route Hook
    @app.before_request
    def authenticate_request():
        if request.method == "OPTIONS":
            return "", 204

        path = request.path

        # Whitelist public pages, assets, health, and simulation endpoints
        is_public = (
            path in ("/", "/index.html", "/health", "/api/health", "/favicon.ico", "/landing", "/landing.html")
            or path.startswith(("/dashboard", "/site", "/css", "/js", "/assets"))
            or path.startswith(("/api/auth", "/api/agent", "/api/simulate", "/simulation", "/events", "/status", "/metrics", "/telemetry", "/detection", "/baseline", "/incidents", "/recovery", "/integrity", "/storage", "/restore", "/audit", "/evidence", "/api/compliance"))
        )

        if is_public:
            return None

        auth_header = request.headers.get("Authorization", "")
        custom_header = request.headers.get("X-API-Key", "")
        session_header = request.headers.get("x-session-token", "")

        api_key = custom_header or (auth_header.replace("Bearer ", "") if auth_header.startswith("Bearer ") else None)

        if api_key and api_key in Config.VALID_API_KEYS:
            return None

        # Check session token
        sess_token = session_header or api_key
        if sess_token:
            sess = db.find_one("user_sessions", lambda s: s.get("token") == sess_token)
            if sess:
                request.user = sess
                return None

        return jsonify({
            "error": {
                "code": "unauthorized",
                "message": "Valid API key or authenticated user session required",
            }
        }), 401

    # 3. Global Error Envelopes
    @app.errorhandler(400)
    def bad_request(error):
        return jsonify({
            "error": {
                "code": "bad_request",
                "message": str(error.description if hasattr(error, "description") else error),
            }
        }), 400

    @app.errorhandler(404)
    def not_found(error):
        # If API route, return JSON error; otherwise return static 404
        if request.path.startswith(("/api", "/status", "/metrics", "/telemetry", "/detection", "/baseline", "/incidents")):
            return jsonify({
                "error": {
                    "code": "not_found",
                    "message": f"Resource {request.path} not found",
                }
            }), 404
        return "404 Not Found", 404

    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({
            "error": {
                "code": "internal_server_error",
                "message": "An unexpected error occurred",
            }
        }), 500

    # 4. Register Route Blueprints
    app.register_blueprint(health_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(telemetry_bp)
    app.register_blueprint(detection_bp)
    app.register_blueprint(baseline_bp)
    app.register_blueprint(incident_bp)
    app.register_blueprint(restore_bp)
    app.register_blueprint(agent_bp)
    app.register_blueprint(simulation_bp)
    app.register_blueprint(compliance_bp)
    app.register_blueprint(static_bp)

    return app


if __name__ == "__main__":
    app = create_app()
    port = Config.PORT
    host = Config.HOST
    print(f"[*] CloudRDR Python Flask API Server running on http://{host}:{port}")
    app.run(host=host, port=port, debug=False)
