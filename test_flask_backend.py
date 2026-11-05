"""Comprehensive Verification Test Suite for CloudRDR Python Flask Backend."""

import json
import unittest
from backend_py.app import create_app
from backend_py.config import Config


class FlaskBackendTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = create_app()
        cls.client = cls.app.test_client()
        cls.headers = {
            "Content-Type": "application/json",
            "X-API-Key": Config.API_KEY,
        }

    def test_01_health_endpoint(self):
        res = self.client.get("/health")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data.get("status"), "ok")
        self.assertIn("uptime", data)
        self.assertIn("timestamp", data)

    def test_02_system_status_endpoint(self):
        res = self.client.get("/status/system", headers=self.headers)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIn("detectionEngine", data)
        self.assertIn("cloudStorage", data)
        self.assertIn("baselineIntegrity", data)
        self.assertIn("backupService", data)

    def test_03_kpis_endpoint(self):
        res = self.client.get("/metrics/kpis", headers=self.headers)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIn("protectedFiles", data)
        self.assertIn("activeIncidents", data)
        self.assertIn("events24h", data)
        self.assertIn("backupHealth", data)

    def test_04_telemetry_activity_endpoint(self):
        res = self.client.get("/telemetry/activity?range=24H", headers=self.headers)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data.get("range"), "24H")
        self.assertIsInstance(data.get("points"), list)
        self.assertGreater(len(data["points"]), 0)

    def test_05_detection_summary_endpoint(self):
        res = self.client.get("/detection/summary", headers=self.headers)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIn("slidingWindow", data)
        self.assertIn("velocityScore", data)
        self.assertIn("thresholds", data)

    def test_06_baseline_endpoint(self):
        res = self.client.get("/baseline/protected", headers=self.headers)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data.get("bucket"), "protected")
        self.assertIn("merkle_root", data)

    def test_07_incidents_list_and_detail(self):
        res = self.client.get("/incidents", headers=self.headers)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIsInstance(data, list)

    def test_08_evidence_verification(self):
        res = self.client.post("/evidence/verify", headers=self.headers, json={})
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIn("verified", data)
        self.assertIn("chainVerified", data)
        self.assertIn("merkleVerified", data)
        self.assertTrue(data.get("chainVerified"))

    def test_09_agent_status_and_ping(self):
        res = self.client.get("/api/agent/status", headers=self.headers)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIn("agents", data)
        self.assertGreater(len(data["agents"]), 0)

        # Ping
        ping_res = self.client.post("/api/agent/ping", headers=self.headers, json={"agentId": "agt-c-native-01"})
        self.assertEqual(ping_res.status_code, 200)
        ping_data = ping_res.get_json()
        self.assertTrue(ping_data.get("ok"))
        self.assertEqual(ping_data.get("agentId"), "agt-c-native-01")

    def test_10_compliance_summary(self):
        res = self.client.get("/api/compliance/summary", headers=self.headers)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data.get("jsonapi", {}).get("version"), "1.1")
        self.assertIn("data", data)
        self.assertEqual(data["data"]["type"], "compliance-summary")

    def test_11_simulation_attack_containment_and_reset(self):
        # Trigger attack
        atk = self.client.post("/api/simulate/attack", headers=self.headers)
        self.assertEqual(atk.status_code, 200)
        atk_data = atk.get_json()
        self.assertTrue(atk_data.get("ok"))
        inc_id = atk_data.get("incidentId")
        self.assertTrue(inc_id)

        # Verify incident is listed and frozen
        inc = self.client.get(f"/incidents/{inc_id}", headers=self.headers)
        self.assertEqual(inc.status_code, 200)
        self.assertEqual(inc.get_json().get("status"), "frozen")

        # Execute 1-click restore
        rst = self.client.post(f"/incidents/{inc_id}/restore", headers=self.headers)
        self.assertEqual(rst.status_code, 200)
        rst_data = rst.get_json()
        self.assertTrue(rst_data.get("ok"))
        self.assertEqual(rst_data.get("status"), "verified")

        # Reset simulation
        reset = self.client.post("/api/simulate/reset", headers=self.headers)
        self.assertEqual(reset.status_code, 200)
        self.assertTrue(reset.get_json().get("ok"))

    def test_12_static_files_serving(self):
        # Serves root dashboard
        res = self.client.get("/")
        self.assertEqual(res.status_code, 200)
        self.assertIn(b"html", res.data.lower())

        # Serves tokens.css
        res_css = self.client.get("/css/tokens.css")
        self.assertEqual(res_css.status_code, 200)
        self.assertIn(b"--bg-canvas", res_css.data)

        # Serves api.js
        res_js = self.client.get("/js/api.js")
        self.assertEqual(res_js.status_code, 200)
        self.assertIn(b"httpRequest", res_js.data)


if __name__ == "__main__":
    unittest.main()
