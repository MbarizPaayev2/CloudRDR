"""Static file serving routes for CloudRDR Frontend UI."""

from pathlib import Path
from flask import Blueprint, send_from_directory, abort, Response
from backend_py.config import Config

static_bp = Blueprint("static_files", __name__)

DASHBOARD_DIR = Config.DASHBOARD_DIR
SITE_DIR = Config.SITE_DIR
ROOT_DIR = Config.ROOT_DIR


@static_bp.route("/", methods=["GET"])
def index():
    if (DASHBOARD_DIR / "index.html").exists():
        return send_from_directory(DASHBOARD_DIR, "index.html")
    return "CloudRDR Backend is operational.", 200


@static_bp.route("/index.html", methods=["GET"])
def index_html():
    return send_from_directory(DASHBOARD_DIR, "index.html")


@static_bp.route("/landing", methods=["GET"])
@static_bp.route("/landing.html", methods=["GET"])
def landing():
    return send_from_directory(DASHBOARD_DIR, "landing.html")


@static_bp.route("/dashboard", methods=["GET"])
@static_bp.route("/dashboard/", methods=["GET"])
def dashboard_root():
    return send_from_directory(DASHBOARD_DIR, "index.html")


@static_bp.route("/dashboard/<path:filename>", methods=["GET"])
def serve_dashboard(filename):
    file_path = (DASHBOARD_DIR / filename).resolve()
    if not str(file_path).startswith(str(DASHBOARD_DIR.resolve())):
        abort(403)
    if file_path.is_dir():
        return send_from_directory(file_path, "index.html")
    if file_path.exists():
        return send_from_directory(file_path.parent, file_path.name)
    abort(404)


@static_bp.route("/site", methods=["GET"])
@static_bp.route("/site/", methods=["GET"])
def site_root():
    if (SITE_DIR / "index.html").exists():
        return send_from_directory(SITE_DIR, "index.html")
    return send_from_directory(DASHBOARD_DIR, "index.html")


@static_bp.route("/site/<path:filename>", methods=["GET"])
def serve_site(filename):
    file_path = (SITE_DIR / filename).resolve()
    if not str(file_path).startswith(str(SITE_DIR.resolve())):
        abort(403)
    if file_path.is_dir():
        return send_from_directory(file_path, "index.html")
    if file_path.exists():
        return send_from_directory(file_path.parent, file_path.name)
    abort(404)


@static_bp.route("/css/<path:filename>", methods=["GET"])
def serve_css(filename):
    # Try dashboard/css first, then site/css
    if (DASHBOARD_DIR / "css" / filename).exists():
        return send_from_directory(DASHBOARD_DIR / "css", filename, mimetype="text/css")
    if (SITE_DIR / "css" / filename).exists():
        return send_from_directory(SITE_DIR / "css", filename, mimetype="text/css")
    abort(404)


@static_bp.route("/js/<path:filename>", methods=["GET"])
def serve_js(filename):
    # Try dashboard/js first, then site/js
    if (DASHBOARD_DIR / "js" / filename).exists():
        return send_from_directory(DASHBOARD_DIR / "js", filename, mimetype="application/javascript")
    if (SITE_DIR / "js" / filename).exists():
        return send_from_directory(SITE_DIR / "js", filename, mimetype="application/javascript")
    abort(404)


@static_bp.route("/assets/<path:filename>", methods=["GET"])
def serve_assets(filename):
    if (DASHBOARD_DIR / "assets" / filename).exists():
        return send_from_directory(DASHBOARD_DIR / "assets", filename)
    if (SITE_DIR / "assets" / filename).exists():
        return send_from_directory(SITE_DIR / "assets", filename)
    abort(404)


@static_bp.route("/favicon.ico", methods=["GET"])
def favicon():
    if (ROOT_DIR / "favicon.ico").exists():
        return send_from_directory(ROOT_DIR, "favicon.ico", mimetype="image/x-icon")
    abort(404)
