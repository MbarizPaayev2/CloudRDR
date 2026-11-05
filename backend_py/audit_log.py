"""Hash-Chained Tamper-Evident Audit Ledger for CloudRDR.

Implements an immutable, append-only cryptographic audit ledger.
Each block:
    hash = SHA-256(index : prevHash : timestamp : canonicalJson(data))
"""

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional
from backend_py.crypto_utils import canonical_json
from backend_py.config import Config

GENESIS_PREV_HASH = "0" * 64


class AuditLog:
    """Hash-chained immutable audit log ledger."""

    def __init__(self, log_file_path: Optional[Path | str] = None):
        self.log_file_path = Path(log_file_path) if log_file_path else None
        self.entries: list[dict] = []
        self._initialized = False

    def init(self):
        """Initialise ledger from disk if a log file path is configured."""
        if self._initialized:
            return

        if self.log_file_path:
            try:
                self.log_file_path.parent.mkdir(parents=True, exist_ok=True)
                if self.log_file_path.exists():
                    lines = self.log_file_path.read_text(encoding="utf-8").splitlines()
                    self.entries = [
                        json.loads(line) for line in lines if line.strip()
                    ]
            except Exception as e:
                print(f"[audit_log] Error reading log file: {e}")

        self._initialized = True

    @staticmethod
    def compute_block_hash(index: int, prev_hash: str, timestamp: str, data: Any) -> str:
        """Compute the SHA-256 hash of an audit block payload."""
        canonical = canonical_json(data)
        payload = f"{index}:{prev_hash}:{timestamp}:{canonical}"
        return hashlib.sha256(payload.encode("utf-8")).hexdigest()

    def append(self, data: Any) -> dict:
        """Append an entry to the hash-chain and persist to disk."""
        self.init()

        index = len(self.entries)
        prev_hash = GENESIS_PREV_HASH if index == 0 else self.entries[index - 1]["hash"]
        timestamp = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        block_hash = self.compute_block_hash(index, prev_hash, timestamp, data)

        block = {
            "index": index,
            "prevHash": prev_hash,
            "timestamp": timestamp,
            "data": data,
            "hash": block_hash,
        }

        self.entries.append(block)

        if self.log_file_path:
            try:
                with open(self.log_file_path, "a", encoding="utf-8") as f:
                    f.write(json.dumps(block, separators=(",", ":")) + "\n")
            except Exception as e:
                print(f"[audit_log] Error writing block to disk: {e}")

        return block

    def get_entries(self) -> list[dict]:
        """Retrieve all blocks in the ledger."""
        self.init()
        return list(self.entries)

    def verify_audit_chain(self, entries: Optional[list[dict]] = None) -> dict:
        """
        Cryptographically verify the integrity of the audit chain from Genesis to head.
        Validates sequential index, previous hash pointer, and content digest.
        """
        blocks = entries if entries is not None else self.get_entries()

        if not blocks:
            return {
                "valid": True,
                "totalEntries": 0,
                "brokenIndex": None,
                "reason": None,
                "headHash": None,
            }

        # Check Genesis
        if blocks[0]["prevHash"] != GENESIS_PREV_HASH:
            return {
                "valid": False,
                "totalEntries": len(blocks),
                "brokenIndex": 0,
                "reason": "Genesis block prevHash must be 64 zeros",
                "headHash": None,
            }

        for i, block in enumerate(blocks):
            # 1. Sequential index check
            if block.get("index") != i:
                return {
                    "valid": False,
                    "totalEntries": len(blocks),
                    "brokenIndex": i,
                    "reason": f"Non-sequential block index. Expected {i}, got {block.get('index')}",
                    "headHash": None,
                }

            # 2. Previous hash link check
            if i > 0 and block.get("prevHash") != blocks[i - 1]["hash"]:
                return {
                    "valid": False,
                    "totalEntries": len(blocks),
                    "brokenIndex": i,
                    "reason": f"Broken prevHash link at block #{i}",
                    "headHash": None,
                }

            # 3. Content hash check
            expected_hash = self.compute_block_hash(
                block["index"],
                block["prevHash"],
                block["timestamp"],
                block["data"],
            )
            if block.get("hash") != expected_hash:
                return {
                    "valid": False,
                    "totalEntries": len(blocks),
                    "brokenIndex": i,
                    "reason": f"Tampered block content detected at block #{i}",
                    "headHash": None,
                }

        head_hash = blocks[-1]["hash"]
        return {
            "valid": True,
            "totalEntries": len(blocks),
            "brokenIndex": None,
            "reason": None,
            "headHash": head_hash,
        }


# Global singleton instance
default_audit_log = AuditLog(Config.AUDIT_LOG_FILE)
