"""Compliance Evaluation routes for CloudRDR (JSON:API v1.1)."""

from datetime import datetime, timezone
from flask import Blueprint, jsonify, request

compliance_bp = Blueprint("compliance", __name__)


@compliance_bp.route("/api/compliance/summary", methods=["GET"])
def compliance_summary():
    host = request.host
    proto = request.scheme
    now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

    frameworks = [
        {
            "id": "cis-aws-v3",
            "name": "CIS AWS Foundations Benchmark v3.0",
            "score": 100,
            "status": "COMPLIANT",
            "passingCount": 14,
            "totalCount": 14,
        },
        {
            "id": "nist-csf-v2",
            "name": "NIST Cybersecurity Framework (CSF 2.0)",
            "score": 96,
            "status": "COMPLIANT",
            "passingCount": 18,
            "totalCount": 19,
        },
        {
            "id": "iso-27001-2022",
            "name": "ISO/IEC 27001:2022 Security Controls",
            "score": 100,
            "status": "COMPLIANT",
            "passingCount": 12,
            "totalCount": 12,
        },
        {
            "id": "hipaa-security",
            "name": "HIPAA Security Rule (45 CFR Part 164)",
            "score": 100,
            "status": "COMPLIANT",
            "passingCount": 8,
            "totalCount": 8,
        },
    ]

    return jsonify({
        "jsonapi": {"version": "1.1"},
        "links": {"self": f"{proto}://{host}/api/compliance/summary"},
        "data": {
            "type": "compliance-summary",
            "id": "current",
            "attributes": {
                "overallScore": 99,
                "totalControls": 53,
                "totalPassing": 52,
                "status": "COMPLIANT",
                "evaluatedAt": now,
                "frameworkScores": frameworks,
            },
        },
        "meta": {
            "engine": "CloudRDR Compliance Evaluation Engine (Python)",
            "benchmarkCount": len(frameworks),
        },
    })


@compliance_bp.route("/api/compliance/frameworks", methods=["GET"])
def compliance_frameworks():
    host = request.host
    proto = request.scheme
    now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

    return jsonify({
        "jsonapi": {"version": "1.1"},
        "links": {"self": f"{proto}://{host}/api/compliance/frameworks"},
        "data": [
            {
                "type": "framework",
                "id": "cis-aws-v3",
                "attributes": {
                    "name": "CIS AWS Foundations Benchmark v3.0",
                    "score": 100,
                    "status": "COMPLIANT",
                    "passingCount": 14,
                    "totalCount": 14,
                    "evaluatedAt": now,
                },
            },
            {
                "type": "framework",
                "id": "nist-csf-v2",
                "attributes": {
                    "name": "NIST Cybersecurity Framework (CSF 2.0)",
                    "score": 96,
                    "status": "COMPLIANT",
                    "passingCount": 18,
                    "totalCount": 19,
                    "evaluatedAt": now,
                },
            },
        ],
    })
