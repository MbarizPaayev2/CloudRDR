"""Core Cryptography module for CloudRDR Python Flask Backend.

Provides:
  - SHA-256 streaming and buffer hashing
  - Pairwise Merkle Tree calculation
  - RFC 8032 Ed25519 digital signatures & canonical JSON serialization
  - Shannon entropy calculation for ransomware detection
"""

import hashlib
import json
import math
from typing import Any, Optional
from cryptography.hazmat.primitives.asymmetric import ed25519
from cryptography.hazmat.primitives import serialization
from cryptography.exceptions import InvalidSignature

_active_key_pair: Optional[dict] = None


def hash_buffer(data: bytes | str) -> str:
    """Compute the SHA-256 hash of a buffer or string as a 64-char lowercase hex string."""
    if isinstance(data, str):
        data = data.encode("utf-8")
    return hashlib.sha256(data).hexdigest()


def hash_file(file_path) -> str:
    """Compute the SHA-256 hash of a file by streaming in chunks."""
    h = hashlib.sha256()
    with open(file_path, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()


def merkle_root(hashes: list[str]) -> str:
    """
    Compute the Merkle root of an ordered list of leaf SHA-256 hashes.
    Pairwise SHA-256(left + right); duplicates last leaf on odd lengths.
    """
    if not hashes:
        return hashlib.sha256(b"").hexdigest()

    layer = list(hashes)
    while len(layer) > 1:
        next_layer = []
        for i in range(0, len(layer), 2):
            left = layer[i]
            right = layer[i + 1] if i + 1 < len(layer) else layer[i]
            combined = (left + right).encode("utf-8")
            next_layer.append(hashlib.sha256(combined).hexdigest())
        layer = next_layer
    return layer[0]


def canonical_json(value: Any) -> str:
    """
    Produce a canonical (RFC 8785 style) deterministic JSON representation of an object.
    Keys are sorted recursively to guarantee signature reproducibility.
    """
    if value is None or not isinstance(value, (dict, list)):
        return json.dumps(value, separators=(",", ":"))
    if isinstance(value, list):
        return "[" + ",".join(canonical_json(v) for v in value) + "]"
    sorted_keys = sorted(value.keys())
    pairs = [f"{json.dumps(k)}:{canonical_json(value[k])}" for k in sorted_keys]
    return "{" + ",".join(pairs) + "}"


def generate_ed25519_key_pair() -> dict:
    """Generate a new Ed25519 key pair in PKCS#8 / SPKI DER hex format."""
    priv_key = ed25519.Ed25519PrivateKey.generate()
    pub_key = priv_key.public_key()

    priv_der = priv_key.private_bytes(
        encoding=serialization.Encoding.DER,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )
    pub_der = pub_key.public_bytes(
        encoding=serialization.Encoding.DER,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    )

    key_id = "key-" + hashlib.sha256(pub_der).hexdigest()[:16]

    return {
        "publicKey": pub_der.hex(),
        "privateKey": priv_der.hex(),
        "keyId": key_id,
    }


def init_signing_key(keys: Optional[dict] = None) -> dict:
    """Initialise or load the active signing key."""
    global _active_key_pair
    if keys and keys.get("privateKey") and keys.get("publicKey"):
        pub_bytes = bytes.fromhex(keys["publicKey"])
        key_id = keys.get("keyId") or ("key-" + hashlib.sha256(pub_bytes).hexdigest()[:16])
        _active_key_pair = {
            "publicKey": keys["publicKey"],
            "privateKey": keys["privateKey"],
            "keyId": key_id,
        }
    elif not _active_key_pair:
        _active_key_pair = generate_ed25519_key_pair()
    return _active_key_pair


def sign_record(
    record: dict,
    private_key_hex: Optional[str] = None,
    key_id_override: Optional[str] = None,
) -> dict:
    """Sign an incident record using the active Ed25519 private key."""
    if not isinstance(record, dict):
        raise ValueError("Record must be a valid dictionary")

    keys = init_signing_key()
    priv_hex = private_key_hex or keys["privateKey"]
    key_id = key_id_override or keys["keyId"]

    canonical = canonical_json(record)
    data_bytes = canonical.encode("utf-8")

    priv_bytes = bytes.fromhex(priv_hex)
    priv_key = ed25519.Ed25519PrivateKey.from_private_bytes(priv_bytes[-32:]) if len(priv_bytes) == 32 else serialization.load_der_private_key(priv_bytes, password=None)

    sig_bytes = priv_key.sign(data_bytes)
    return {
        "signature": sig_bytes.hex(),
        "keyId": key_id,
        "canonicalPayload": canonical,
    }


def verify_record(
    record: dict | str,
    signature_hex: str,
    public_key_hex: Optional[str] = None,
) -> bool:
    """Verify an Ed25519 signature over a record."""
    if not record or not signature_hex:
        return False
    try:
        keys = init_signing_key()
        pub_hex = public_key_hex or keys["publicKey"]
        pub_bytes = bytes.fromhex(pub_hex)

        canonical = canonical_json(record) if isinstance(record, dict) else str(record)
        data_bytes = canonical.encode("utf-8")
        sig_bytes = bytes.fromhex(signature_hex)

        if len(pub_bytes) == 32:
            pub_key = ed25519.Ed25519PublicKey.from_public_bytes(pub_bytes)
        else:
            pub_key = serialization.load_der_public_key(pub_bytes)

        pub_key.verify(sig_bytes, data_bytes)
        return True
    except (InvalidSignature, Exception):
        return False


def calculate_shannon_entropy(data: bytes) -> float:
    """Calculate Shannon entropy of byte data (0.0 to 8.0). High entropy (>7.2) indicates encryption/compression."""
    if not data:
        return 0.0
    freq = {}
    for byte in data:
        freq[byte] = freq.get(byte, 0) + 1
    entropy = 0.0
    length = len(data)
    for count in freq.values():
        p = count / length
        entropy -= p * math.log2(p)
    return round(entropy, 4)
