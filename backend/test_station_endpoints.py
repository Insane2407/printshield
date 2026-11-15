"""
Test Suite for Station Kiosk Endpoints:
1. Rejects document download before token authorization (HTTP 403)
2. Token redemption transitions job to AUTHORIZED
3. Station downloads encrypted payload and unwrapped document key
4. Agent decrypts locally in restricted temp directory
5. Agent verifies SHA-256 integrity match
6. Agent reports print submission status (PRINT_SUBMITTED -> PRINTING)
7. Agent reports physical print completion (PRINT_SUCCESS -> COMPLETED)
"""

import io
import sys
import base64
import hashlib
from pathlib import Path
from datetime import datetime
from fastapi import UploadFile, HTTPException
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
import pypdf

# Add backend directory to sys.path
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

from app.database import SessionLocal, Base, engine, ensure_schema_migrations
from app.models import PrintJob
from app.schemas import (
    ConfigurePrintJobRequest,
    GenerateQRRequest,
    RedeemTokenRequest,
    ReportPrintRequest
)
from app.routers.jobs import (
    upload_and_encrypt_document,
    configure_print_job,
    generate_one_time_qr
)
from app.routers.station import (
    redeem_one_time_token,
    download_encrypted_payload,
    report_print_status
)

def create_sample_pdf() -> bytes:
    writer = pypdf.PdfWriter()
    for _ in range(2):
        writer.add_blank_page(width=595, height=842)
    buf = io.BytesIO()
    writer.write(buf)
    return buf.getvalue()

def run_tests():
    print("=" * 70)
    print(" PRINTSHIELD STATION AGENT PROTOCOL TEST SUITE")
    print("=" * 70)

    Base.metadata.create_all(bind=engine)
    ensure_schema_migrations(engine)

    db = SessionLocal()
    try:
        # Step 1: Upload and configure PDF
        print("\n[STEP 1] Uploading and configuring sample PDF...")
        pdf_bytes = create_sample_pdf()
        original_hash = hashlib.sha256(pdf_bytes).hexdigest()
        customer_id = "usr-cst-9021"

        upload_file = UploadFile(
            file=io.BytesIO(pdf_bytes),
            filename="classified_kiosk_doc.pdf",
            headers={"content-type": "application/pdf"}
        )
        upload_res = upload_and_encrypt_document(
            file=upload_file,
            customer_id=customer_id,
            color_mode="black_and_white",
            copies=1,
            db=db
        )
        job_id = upload_res.job_id

        # Configure to PENDING
        cfg = ConfigurePrintJobRequest(
            customer_id=customer_id,
            copies=1,
            page_range="all",
            paper_size="A4",
            orientation="portrait",
            color_mode="black_and_white",
            duplex="single_sided",
            expiration_minutes=30,
            station_id="TERM-CYBERHUB-04"
        )
        configure_print_job(job_id=job_id, payload=cfg, db=db)
        print(f" -> Job {job_id} created with SHA-256: {original_hash}")

        # Step 2: Test security rule: CANNOT download before token authorization
        print("\n[STEP 2] Testing download denial BEFORE authorization (HTTP 403)...")
        try:
            download_encrypted_payload(job_id=job_id, station_id="TERM-CYBERHUB-04", db=db)
            assert False, "Should have rejected download before token redemption"
        except HTTPException as he:
            assert he.status_code == 403
            print(f" -> Unauthorized download blocked (HTTP 403): {he.detail}")

        # Step 3: Generate token and redeem at station
        print("\n[STEP 3] Generating QR token and redeeming at kiosk station...")
        gen_req = GenerateQRRequest(
            customer_id=customer_id,
            expiry_seconds=300,
            station_id="TERM-CYBERHUB-04"
        )
        gen_res = generate_one_time_qr(job_id=job_id, payload=gen_req, db=db)
        print(f" -> Token generated: {gen_res.manual_code}")

        redeem_req = RedeemTokenRequest(
            station_id="TERM-CYBERHUB-04",
            token=gen_res.raw_token
        )
        redeem_res = redeem_one_time_token(payload=redeem_req, db=db)
        assert redeem_res.job_status == "AUTHORIZED"
        print(f" -> Token redeemed! Job status updated to: {redeem_res.job_status}")

        # Step 4: Download encrypted payload as authorized station
        print("\n[STEP 4] Downloading encrypted payload as authorized station...")
        download_res = download_encrypted_payload(job_id=job_id, station_id="TERM-CYBERHUB-04", db=db)
        assert download_res.success is True
        assert download_res.document_hash == original_hash
        print(f" -> Received ciphertext ({len(download_res.encrypted_payload_b64)} b64 chars)")

        # Step 5: Agent local decryption in restricted environment
        print("\n[STEP 5] Performing local agent AES-256-GCM decryption...")
        ciphertext_blob = base64.b64decode(download_res.encrypted_payload_b64)
        doc_key = base64.b64decode(download_res.doc_key_b64)

        doc_nonce = ciphertext_blob[:12]
        ciphertext_with_tag = ciphertext_blob[12:]

        aesgcm = AESGCM(doc_key)
        decrypted_bytes = aesgcm.decrypt(doc_nonce, ciphertext_with_tag, job_id.encode("utf-8"))
        decrypted_hash = hashlib.sha256(decrypted_bytes).hexdigest()
        print(f" -> Decrypted SHA-256: {decrypted_hash}")
        print(f" -> Original  SHA-256: {original_hash}")
        assert decrypted_hash == original_hash, "Integrity failure: Hashes do not match!"
        assert decrypted_bytes == pdf_bytes, "Integrity failure: Byte arrays do not match!"
        print(" -> INTEGRITY CHECK PASSED: Exact bit-for-bit match verified.")

        # Step 6: Report print submission status
        print("\n[STEP 6] Reporting print submission status to backend...")
        report_sub = ReportPrintRequest(
            station_id="TERM-CYBERHUB-04",
            status="PRINT_SUBMITTED",
            printer_name="Microsoft Print to PDF",
            details="Spool submitted to Microsoft Print to PDF"
        )
        rep_res1 = report_print_status(job_id=job_id, payload=report_sub, db=db)
        assert rep_res1.job_status == "PRINTING"
        print(f" -> Reported submission: status is now '{rep_res1.job_status}'")

        # Step 7: Report physical print completion
        print("\n[STEP 7] Reporting physical print completion to backend...")
        report_comp = ReportPrintRequest(
            station_id="TERM-CYBERHUB-04",
            status="PRINT_SUCCESS",
            printer_name="Microsoft Print to PDF",
            details="Physical output confirmed"
        )
        rep_res2 = report_print_status(job_id=job_id, payload=report_comp, db=db)
        assert rep_res2.job_status == "COMPLETED"
        print(f" -> Reported completion: status is now '{rep_res2.job_status}'")

        print("\n" + "=" * 70)
        print("ALL STATION AGENT PROTOCOL TESTS PASSED 100%!")
        print("=" * 70)

    finally:
        db.close()

if __name__ == "__main__":
    run_tests()
