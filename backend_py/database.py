"""Database abstraction for CloudRDR Python Flask Backend.

Provides thread-safe in-memory querying and persistence with data/db-storage.json.
"""

import copy
import json
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, Optional
from backend_py.config import Config


class Database:
    """In-memory database with JSON disk backing."""

    TABLES = [
        "protected_files",
        "baseline_snapshots",
        "change_events",
        "detection_runs",
        "incidents",
        "restore_jobs",
        "restore_results",
        "internal_users",
        "user_sessions",
        "registered_agents",
        "detection_config",
    ]

    def __init__(self, storage_file: Optional[Path | str] = None):
        self.storage_file = Path(storage_file) if storage_file else None
        self._lock = threading.RLock()
        self._data: dict[str, list[dict]] = {tbl: [] for tbl in self.TABLES}
        self.load()

    def load(self):
        """Load data from JSON file if available, otherwise seed defaults."""
        with self._lock:
            if self.storage_file and self.storage_file.exists():
                try:
                    raw = self.storage_file.read_text(encoding="utf-8")
                    parsed = json.loads(raw)
                    for k in self.TABLES:
                        if k in parsed and isinstance(parsed[k], list):
                            self._data[k] = parsed[k]
                    return
                except Exception as e:
                    print(f"[database] Error reading db-storage.json: {e}")

            self._seed_defaults()

    def save(self):
        """Persist current tables to JSON file."""
        with self._lock:
            if not self.storage_file:
                return
            try:
                self.storage_file.parent.mkdir(parents=True, exist_ok=True)
                payload = json.dumps(self._data, indent=2)
                self.storage_file.write_text(payload, encoding="utf-8")
            except Exception as e:
                print(f"[database] Error saving db-storage.json: {e}")

    def get_all(self, table: str) -> list[dict]:
        with self._lock:
            return copy.deepcopy(self._data.get(table, []))

    def find(self, table: str, predicate: Callable[[dict], bool]) -> list[dict]:
        with self._lock:
            return [copy.deepcopy(item) for item in self._data.get(table, []) if predicate(item)]

    def find_one(self, table: str, predicate: Callable[[dict], bool]) -> Optional[dict]:
        with self._lock:
            for item in self._data.get(table, []):
                if predicate(item):
                    return copy.deepcopy(item)
            return None

    def insert(self, table: str, record: dict) -> dict:
        with self._lock:
            if table not in self._data:
                self._data[table] = []
            rec = copy.deepcopy(record)
            if "created_at" not in rec:
                rec["created_at"] = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
            if "updated_at" not in rec:
                rec["updated_at"] = rec["created_at"]
            self._data[table].append(rec)
            self.save()
            return copy.deepcopy(rec)

    def update(self, table: str, predicate: Callable[[dict], bool], patch: dict) -> list[dict]:
        updated = []
        with self._lock:
            for item in self._data.get(table, []):
                if predicate(item):
                    item.update(patch)
                    item["updated_at"] = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
                    updated.append(copy.deepcopy(item))
            if updated:
                self.save()
        return updated

    def delete(self, table: str, predicate: Callable[[dict], bool]) -> int:
        with self._lock:
            before_len = len(self._data.get(table, []))
            self._data[table] = [item for item in self._data.get(table, []) if not predicate(item)]
            deleted_count = before_len - len(self._data[table])
            if deleted_count > 0:
                self.save()
            return deleted_count

    def _seed_defaults(self):
        """Seed realistic SOC defaults if database is empty."""
        now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

        # Registered agents
        self._data["registered_agents"] = [
            {
                "id": "agt-c-native-01",
                "name": "Linux Core C-Agent (Kali SOC)",
                "os": "Linux / Kali 6.12",
                "ip": "192.168.152.148",
                "port": 4455,
                "status": "connected",
                "engine": "C-Native Hook + Go Core",
                "lastHeartbeat": now,
                "rttMs": 14,
                "isolationArmed": True,
            },
            {
                "id": "agt-win-storage-02",
                "name": "Windows Storage Agent (NTFS/WORM)",
                "os": "Windows Server 2022",
                "ip": "127.0.0.1",
                "port": 4456,
                "status": "connected",
                "engine": "ReadDirectoryChangesW + icacls /deny",
                "lastHeartbeat": now,
                "rttMs": 4,
                "isolationArmed": True,
            },
            {
                "id": "agt-aws-s3-03",
                "name": "CloudTrail & S3 Event Bridge",
                "os": "AWS Cloud",
                "ip": "169.254.169.254",
                "port": 443,
                "status": "connected",
                "engine": "S3 EventBridge + Object Lock WORM",
                "lastHeartbeat": now,
                "rttMs": 28,
                "isolationArmed": True,
            },
        ]

        # Detection config
        self._data["detection_config"] = [
            {
                "id": "global",
                "windowSeconds": 30,
                "maxModificationsPerWindow": 25,
                "modificationRateThreshold": 0.35,
                "entropyThreshold": 7.2,
                "canaryAlertEnabled": True,
            }
        ]


# Global singleton database instance
db = Database(Config.DB_STORAGE_FILE)
