import os
from pathlib import Path
from typing import Tuple
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from ..config import settings

class EncryptionManager:
    """
    AES-256-GCM Document Encryption and Key Management.
    Keys are stored separately from encrypted documents in private restricted storage.
    """

    def __init__(self):
        # Master key for wrapping document keys (32 bytes = 256 bits)
        master_hex = settings.MASTER_KEY_HEX.strip()
        self.master_key = bytes.fromhex(master_hex)
        if len(self.master_key) != 32:
            raise ValueError("MASTER_KEY_HEX must be exactly 32 bytes (64 hex characters) for AES-256.")

    def encrypt_document(self, plaintext_bytes: bytes, job_id: str, key_id: str) -> Tuple[str, str]:
        """
        Encrypts document bytes with a unique per-job AES-256-GCM key.
        Saves:
          1. Encrypted ciphertext into settings.STORAGE_DIR/{job_id}.enc
          2. Master-wrapped document key into settings.KEYS_DIR/{key_id}.key
        Returns (encrypted_file_path, key_path)
        """
        # 1. Generate unique 256-bit document key
        doc_key = AESGCM.generate_key(bit_length=256)

        # 2. Generate unique 12-byte nonce for AES-GCM
        doc_nonce = os.urandom(12)

        # 3. Encrypt document with authenticated data (binding job_id)
        aesgcm = AESGCM(doc_key)
        associated_data = job_id.encode("utf-8")
        ciphertext_with_tag = aesgcm.encrypt(doc_nonce, plaintext_bytes, associated_data)

        # 4. Save encrypted file: [12 bytes nonce] + [ciphertext + 16 bytes tag]
        encrypted_file_path = settings.STORAGE_DIR / f"{job_id}.enc"
        with open(encrypted_file_path, "wb") as f:
            f.write(doc_nonce + ciphertext_with_tag)

        # 5. Protect document key with Master Key using separate AES-GCM envelope
        master_aesgcm = AESGCM(self.master_key)
        key_nonce = os.urandom(12)
        wrapped_key_payload = master_aesgcm.encrypt(key_nonce, doc_key, key_id.encode("utf-8"))

        # 6. Save wrapped key separately in KEYS_DIR
        key_file_path = settings.KEYS_DIR / f"{key_id}.key"
        with open(key_file_path, "wb") as f:
            f.write(key_nonce + wrapped_key_payload)

        return str(encrypted_file_path), str(key_file_path)

    def decrypt_document(self, job_id: str, key_id: str) -> bytes:
        """
        Retrieves wrapped key, un-wraps it with master key,
        and decrypts the stored document verifying authentication tag.
        """
        key_file_path = settings.KEYS_DIR / f"{key_id}.key"
        encrypted_file_path = settings.STORAGE_DIR / f"{job_id}.enc"

        if not key_file_path.exists():
            raise FileNotFoundError(f"Key file {key_id} not found in secure key store.")
        if not encrypted_file_path.exists():
            raise FileNotFoundError(f"Encrypted file for job {job_id} not found.")

        # 1. Read wrapped key
        with open(key_file_path, "rb") as f:
            key_blob = f.read()
        key_nonce = key_blob[:12]
        wrapped_key = key_blob[12:]

        # 2. Unwrap document key
        master_aesgcm = AESGCM(self.master_key)
        doc_key = master_aesgcm.decrypt(key_nonce, wrapped_key, key_id.encode("utf-8"))

        # 3. Read encrypted document
        with open(encrypted_file_path, "rb") as f:
            file_blob = f.read()
        doc_nonce = file_blob[:12]
        ciphertext_with_tag = file_blob[12:]

        # 4. Decrypt document
        aesgcm = AESGCM(doc_key)
        plaintext = aesgcm.decrypt(doc_nonce, ciphertext_with_tag, job_id.encode("utf-8"))

        return plaintext

encryption_manager = EncryptionManager()
