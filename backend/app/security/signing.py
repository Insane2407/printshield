import os
import json
import hashlib
from pathlib import Path
from typing import Tuple, Optional, Dict, Any

from cryptography.hazmat.primitives.asymmetric import ed25519
from cryptography.hazmat.primitives import serialization
from ..config import settings

class ReceiptSigningService:
    """
    Cryptographic Signing Engine for PrintShield Verifiable Digital Receipts:
    - Uses Edwards-curve Digital Signature Algorithm (Ed25519).
    - Guarantees non-repudiation, integrity, and authenticity.
    - Canonicalizes receipt metadata (RFC 8785 JSON Canonicalization).
    - Signs canonical receipt digest with server-managed signing key.
    - Exposes public key for client-side or third-party audit verification.
    """

    def __init__(self):
        self.key_path = settings.KEYS_DIR / "receipt_signer_ed25519.pem"
        self._private_key, self._public_key = self._load_or_generate_key()

    def _load_or_generate_key(self) -> Tuple[ed25519.Ed25519PrivateKey, ed25519.Ed25519PublicKey]:
        """Loads existing server Ed25519 signing key or generates a fresh persistent one."""
        settings.KEYS_DIR.mkdir(parents=True, exist_ok=True)

        if self.key_path.exists():
            try:
                with open(self.key_path, "rb") as f:
                    private_key = serialization.load_pem_private_key(
                        f.read(),
                        password=None
                    )
                if isinstance(private_key, ed25519.Ed25519PrivateKey):
                    return private_key, private_key.public_key()
            except Exception as e:
                print(f"[Warning] Failed to load existing signing key ({e}), generating a fresh key.")

        # Generate new Ed25519 private key
        private_key = ed25519.Ed25519PrivateKey.generate()
        pem_bytes = private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption()
        )
        with open(self.key_path, "wb") as f:
            f.write(pem_bytes)

        return private_key, private_key.public_key()

    @property
    def public_key_hex(self) -> str:
        """Returns the 32-byte public key as a 64-character lowercase hex string."""
        raw_bytes = self._public_key.public_bytes(
            encoding=serialization.Encoding.Raw,
            format=serialization.PublicFormat.Raw
        )
        return raw_bytes.hex()

    @property
    def public_key_pem(self) -> str:
        """Returns the public key in standard PEM format."""
        pem_bytes = self._public_key.public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo
        )
        return pem_bytes.decode("utf-8")

    @staticmethod
    def canonicalize_data(payload: Dict[str, Any]) -> str:
        """
        RFC 8785 / Canonical JSON Encoding:
        - Sorted keys
        - Compact separators (no extra whitespace)
        - UTF-8 encoding
        """
        return json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False)

    @staticmethod
    def calculate_digest(canonical_str: str) -> str:
        """Calculates standard SHA-256 hex digest of the canonical string."""
        return hashlib.sha256(canonical_str.encode("utf-8")).hexdigest()

    def sign_canonical_data(self, canonical_str: str) -> Tuple[str, str, str]:
        """
        Signs the canonical receipt string:
        Returns:
            (receipt_hash, signature_hex, public_key_hex)
        """
        receipt_hash = self.calculate_digest(canonical_str)
        # Sign the canonical string bytes with Ed25519
        sig_bytes = self._private_key.sign(canonical_str.encode("utf-8"))
        signature_hex = sig_bytes.hex()
        return receipt_hash, signature_hex, self.public_key_hex

    def verify_signature(
        self,
        canonical_str: str,
        signature_hex: str,
        public_key_hex: Optional[str] = None
    ) -> bool:
        """
        Verifies the Ed25519 signature of the canonical string.
        Can verify using the provided public_key_hex or the server's current key.
        """
        try:
            sig_bytes = bytes.fromhex(signature_hex)
            if public_key_hex:
                pub_bytes = bytes.fromhex(public_key_hex)
                pub_key = ed25519.Ed25519PublicKey.from_public_bytes(pub_bytes)
            else:
                pub_key = self._public_key

            pub_key.verify(sig_bytes, canonical_str.encode("utf-8"))
            return True
        except Exception:
            return False

signing_service = ReceiptSigningService()
