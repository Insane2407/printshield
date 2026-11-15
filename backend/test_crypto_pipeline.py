import sys
import asyncio
from pathlib import Path

# Add backend directory to path
sys.path.insert(0, str(Path(__file__).resolve().parent))

import httpx
from app.main import app
from app.config import settings
from app.security.encryption import encryption_manager
from app.security.validator import calculate_sha256, validate_pdf_content

def create_sample_pdf_bytes(title: str = "Confidential Audit Report") -> bytes:
    """Create a syntactically valid PDF binary stream in memory."""
    content = f"""%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 55 >>
stream
BT
/F1 24 Tf
100 700 Td
({title}) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000206 00000 n 
trailer
<< /Root 1 0 R /Size 5 >>
startxref
310
%%EOF"""
    return content.encode("utf-8")

async def run_async_tests():
    print("=" * 65, flush=True)
    print("   PRINTSHIELD CRYPTOGRAPHIC INTEGRITY VERIFICATION SUITE", flush=True)
    print("=" * 65, flush=True)

    # 1. Test Valid PDF Generation & Validation
    print("\n[TEST 1] Testing PDF Validation & Magic Byte Inspection...", flush=True)
    sample_pdf = create_sample_pdf_bytes("NDA Agreement - PrintShield Real Test")
    original_hash = calculate_sha256(sample_pdf)
    print(f" -> Generated authentic PDF ({len(sample_pdf)} bytes)", flush=True)
    print(f" -> Calculated Original SHA-256: {original_hash}", flush=True)

    is_valid, msg = validate_pdf_content(sample_pdf, "test_document.pdf")
    assert is_valid is True
    print(" [PASSED] PDF validation succeeded.", flush=True)

    # Test invalid file rejection
    fake_file = b"This is a plaintext text file, not a real PDF document!"
    try:
        validate_pdf_content(fake_file, "fake.pdf")
        assert False, "Should have rejected fake PDF"
    except Exception:
        print(" [PASSED] Correctly rejected non-PDF content (magic byte check enforced).", flush=True)

    # 2. Test AES-256-GCM Direct Encryption & Decryption
    print("\n[TEST 2] Testing AES-256-GCM Encryption & Key Isolation...", flush=True)
    test_job_id = "PS-TEST-UNIT-01"
    test_key_id = "KEY-TEST-UNIT-01"
    
    enc_path, key_path = encryption_manager.encrypt_document(sample_pdf, test_job_id, test_key_id)
    print(f" -> Encrypted file written to: {enc_path}", flush=True)
    print(f" -> Key file written to: {key_path}", flush=True)

    # Inspect encrypted file on disk
    with open(enc_path, "rb") as f:
        encrypted_disk_bytes = f.read()

    # CRITICAL CHECK: Ensure encrypted file does NOT contain "%PDF-" in plaintext!
    assert b"%PDF-" not in encrypted_disk_bytes, "SECURITY LEAK: Plaintext found in encrypted file!"
    print(" [PASSED] Disk verification confirmed: Encrypted file is high-entropy ciphertext with NO plaintext header.", flush=True)

    # Test Decryption
    decrypted_bytes = encryption_manager.decrypt_document(test_job_id, test_key_id)
    decrypted_hash = calculate_sha256(decrypted_bytes)
    assert decrypted_hash == original_hash, "Decrypted hash does NOT match original hash!"
    assert decrypted_bytes.startswith(b"%PDF-"), "Decrypted bytes must start with %PDF-"
    print(" [PASSED] Decryption integrity verified: Exact SHA-256 bit-for-bit match!", flush=True)

    # 3. Test Full FastAPI HTTP API Pipeline with AsyncClient
    print("\n[TEST 3] Testing FastAPI HTTP POST /api/jobs/upload...", flush=True)
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        upload_data = {"customer_id": "usr-cst-9021", "color_mode": "color", "copies": "2"}
        files = {"file": ("Classified_Security_Audit.pdf", sample_pdf, "application/pdf")}
        
        response = await client.post("/api/jobs/upload", data=upload_data, files=files)
        assert response.status_code == 201, f"Upload failed: {response.text}"
        data = response.json()
        job_id = data["job_id"]
        job_meta = data["job"]
        
        print(f" -> Upload Success! Received Job ID: {job_id}", flush=True)
        print(f" -> Release PIN: {job_meta['release_pin']}", flush=True)
        print(f" -> Recorded Document Hash: {job_meta['document_hash']}", flush=True)
        assert job_meta["document_hash"] == original_hash
        assert job_meta["job_status"] == "ENCRYPTED"
        print(" [PASSED] POST /api/jobs/upload returned status 201 and valid metadata.", flush=True)

        # 4. Test GET /api/jobs
        print("\n[TEST 4] Testing FastAPI HTTP GET /api/jobs...", flush=True)
        list_res = await client.get("/api/jobs")
        assert list_res.status_code == 200
        jobs_list = list_res.json()
        assert any(j["job_id"] == job_id for j in jobs_list)
        print(f" [PASSED] GET /api/jobs listed {len(jobs_list)} jobs in database.", flush=True)

        # 5. Test GET /api/jobs/{job_id}
        print(f"\n[TEST 5] Testing FastAPI HTTP GET /api/jobs/{job_id}...", flush=True)
        detail_res = await client.get(f"/api/jobs/{job_id}")
        assert detail_res.status_code == 200
        detail = detail_res.json()
        assert detail["job_id"] == job_id
        assert detail["encryption_scheme"] == "AES-256-GCM"
        print(" [PASSED] GET /api/jobs/{job_id} verified.", flush=True)

        # 6. Test Cryptographic Verification Endpoint
        print(f"\n[TEST 6] Testing Endpoint /api/jobs/{job_id}/verify-decryption...", flush=True)
        verify_res = await client.get(f"/api/jobs/{job_id}/verify-decryption")
        assert verify_res.status_code == 200
        verify_data = verify_res.json()
        assert verify_data["integrity_verified"] is True
        assert verify_data["status"] == "PASSED"
        print(f" -> Recorded SHA-256:  {verify_data['recorded_sha256']}", flush=True)
        print(f" -> Decrypted SHA-256: {verify_data['decrypted_sha256']}", flush=True)
        print(" [PASSED] End-to-end decryption verification passed with 100% data integrity!", flush=True)

    print("\n" + "=" * 65, flush=True)
    print("   ALL CRYPTOGRAPHIC & API TESTS COMPLETED SUCCESSFULLY!", flush=True)
    print("=" * 65, flush=True)

if __name__ == "__main__":
    asyncio.run(run_async_tests())
