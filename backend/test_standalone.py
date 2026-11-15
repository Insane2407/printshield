import sys
from pathlib import Path

# Add backend directory to path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.database import SessionLocal, Base, engine
from app.models import PrintJob
from app.config import settings
from app.security.encryption import encryption_manager
from app.security.validator import calculate_sha256, validate_pdf_content
from app.routers.jobs import upload_and_encrypt_document
from fastapi import UploadFile
import io

def test_full_pipeline():
    print("=" * 65)
    print("   PRINTSHIELD CRYPTOGRAPHIC MODULE & DATABASE VERIFICATION")
    print("=" * 65)

    # 1. Create a genuine PDF document with binary payload
    pdf_content = (
        b"%PDF-1.4\n"
        b"1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n"
        b"2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n"
        b"3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >> endobj\n"
        b"4 0 obj << /Length 44 >> stream\n"
        b"BT /F1 12 Tf 100 700 Td (Confidential Print Payload) ET\n"
        b"endstream endobj\n"
        b"xref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000206 00000 n \n"
        b"trailer << /Root 1 0 R /Size 5 >>\nstartxref\n299\n%%EOF"
    )

    original_sha256 = calculate_sha256(pdf_content)
    print(f"\n[STEP 1] Created sample PDF document ({len(pdf_content)} bytes)")
    print(f" -> Computed Original SHA-256: {original_sha256}")

    # 2. Content & Magic Bytes Validation
    print("\n[STEP 2] Validating file format and magic bytes...")
    is_valid, msg = validate_pdf_content(pdf_content, "Classified_Doc.pdf")
    assert is_valid is True
    print(f" -> {msg}: Magic %PDF- header confirmed.")

    # 3. Direct AES-256-GCM Encryption
    print("\n[STEP 3] Performing AES-256-GCM Encryption...")
    job_id = "PS-REAL-TEST-8901"
    key_id = "KEY-REAL-TEST-8901"
    
    enc_path, key_path = encryption_manager.encrypt_document(pdf_content, job_id, key_id)
    print(f" -> Encrypted document saved to: {enc_path}")
    print(f" -> Ephemeral key saved separately to: {key_path}")

    # Verify physical file on disk
    with open(enc_path, "rb") as f:
        disk_ciphertext = f.read()

    # Verify security: plaintext must NOT exist in ciphertext
    assert b"%PDF-" not in disk_ciphertext
    assert b"Confidential Print Payload" not in disk_ciphertext
    print(" -> SECURITY CHECK PASSED: Ciphertext contains ZERO plaintext leaks.")

    # 4. Decrypt & Verify Integrity
    print("\n[STEP 4] Decrypting AES-256-GCM payload and validating SHA-256...")
    decrypted_bytes = encryption_manager.decrypt_document(job_id, key_id)
    decrypted_sha256 = calculate_sha256(decrypted_bytes)
    print(f" -> Decrypted SHA-256: {decrypted_sha256}")
    
    assert decrypted_sha256 == original_sha256, "Integrity failure: Hashes do not match!"
    assert decrypted_bytes == pdf_content, "Integrity failure: Byte arrays do not match!"
    print(" -> INTEGRITY CHECK PASSED: Bit-for-bit exact match with original PDF!")

    # 5. Database Storage Verification
    print("\n[STEP 5] Testing SQLite / SQLAlchemy PrintJob Persistence...")
    db = SessionLocal()
    try:
        # Upload through the router function directly with UploadFile
        fake_spool = io.BytesIO(pdf_content)
        upload_file = UploadFile(
            file=fake_spool,
            filename="Financial_Audit_2026.pdf",
            headers={"content-type": "application/pdf"}
        )
        
        response = upload_and_encrypt_document(
            file=upload_file,
            customer_id="usr-cst-9021",
            color_mode="color",
            copies=1,
            db=db
        )
        
        created_job_id = response.job_id
        print(f" -> Generated Job ID: {created_job_id}")
        print(f" -> Assigned Release PIN: {response.job.release_pin}")
        print(f" -> Recorded Document Hash: {response.job.document_hash}")

        # Query database to confirm row exists and matches schema
        record = db.query(PrintJob).filter(PrintJob.job_id == created_job_id).first()
        assert record is not None
        assert record.document_hash == original_sha256
        assert record.job_status == "ENCRYPTED"
        assert record.file_size == len(pdf_content)
        assert Path(record.encrypted_file_path).exists()
        
        print(" -> DATABASE CHECK PASSED: Record stored in SQLite with valid schema!")
    finally:
        db.close()

    print("\n" + "=" * 65)
    print("   ALL TESTS PASSED: 100% CRYPTOGRAPHIC INTEGRITY VERIFIED")
    print("=" * 65)

if __name__ == "__main__":
    test_full_pipeline()
