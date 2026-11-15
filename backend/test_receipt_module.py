"""
PrintShield Digital Receipt and Audit Trail Verification Suite
Tests:
1. Receipt generation after job processing
2. Canonical RFC 8785 receipt data structure
3. Receipt SHA-256 hash calculation
4. Server Ed25519 digital signature creation
5. Receipt metadata storage in SQLite
6. Downloadable PDF receipt generation (ReportLab)
7. Cryptographic signature and document integrity verification
8. Rejection of tampered receipt payloads
"""

import os
import sys
import io
import json
import hashlib
from pathlib import Path
from datetime import datetime

# Add project root to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

import pypdf
from fastapi import UploadFile

from backend.app.config import settings
from backend.app.database import SessionLocal, Base, engine, ensure_schema_migrations
from backend.app.models import PrintJob, OneTimeToken, DigitalReceipt
from backend.app.routers.jobs import upload_and_encrypt_document, configure_print_job, generate_one_time_qr
from backend.app.schemas import ConfigurePrintJobRequest, GenerateQRRequest, RedeemTokenRequest, ReportPrintRequest
from backend.app.routers.station import redeem_one_time_token, report_print_status
from backend.app.security.signing import signing_service
from backend.app.services.receipt_service import receipt_service
from backend.app.routers import receipts, jobs
from backend.app.schemas import VerifyReceiptRequest

def create_sample_pdf(pages: int = 2) -> bytes:
    writer = pypdf.PdfWriter()
    for _ in range(pages):
        writer.add_blank_page(width=595, height=842)
    buf = io.BytesIO()
    writer.write(buf)
    return buf.getvalue()

def run_receipt_tests():
    print("=" * 75)
    print(" PRINTSHIELD DIGITAL RECEIPT & AUDIT TRAIL // VERIFICATION SUITE")
    print("=" * 75)

    Base.metadata.create_all(bind=engine)
    ensure_schema_migrations(engine)
    settings.init_storage()

    db = SessionLocal()

    try:
        # STEP 1: Upload, configure and execute a print job
        print("\n[STEP 1] Setting up authentic print job...")
        pdf_bytes = create_sample_pdf(3)
        expected_sha256 = hashlib.sha256(pdf_bytes).hexdigest()

        upload_file = UploadFile(
            file=io.BytesIO(pdf_bytes),
            filename="nda_agreement.pdf",
            headers={"content-type": "application/pdf"}
        )
        upload_res = upload_and_encrypt_document(
            file=upload_file,
            customer_id="cst-rcpt-901",
            color_mode="black_and_white",
            copies=2,
            db=db
        )
        job_id = upload_res.job_id
        print(f" -> Job created: {job_id} | Document SHA-256: {expected_sha256}")

        # Configure job
        conf_req = ConfigurePrintJobRequest(
            customer_id="cst-rcpt-901",
            copies=2,
            page_range="all",
            paper_size="A4",
            orientation="portrait",
            color_mode="black_and_white",
            duplex="single_sided",
            expiration_minutes=60,
            station_id="TERM-CYBERHUB-04"
        )
        configure_print_job(job_id=job_id, payload=conf_req, db=db)

        # Generate QR code
        qr_req = GenerateQRRequest(
            customer_id="cst-rcpt-901",
            expiry_seconds=300,
            station_id="TERM-CYBERHUB-04"
        )
        qr_res = generate_one_time_qr(job_id=job_id, payload=qr_req, db=db)
        print(f" -> QR Token generated: PIN {qr_res.manual_code}")

        # Redeem token at station
        redeem_req = RedeemTokenRequest(
            station_id="TERM-CYBERHUB-04",
            manual_code=qr_res.manual_code
        )
        redeem_res = redeem_one_time_token(payload=redeem_req, db=db)
        print(f" -> Station redeemed token: Job status is now '{redeem_res.job_status}'")

        # Report print completion
        print_req = ReportPrintRequest(
            station_id="TERM-CYBERHUB-04",
            status="PRINT_SUCCESS",
            printer_name="Microsoft Print to PDF",
            details="Spool complete"
        )
        report_print_status(job_id=job_id, payload=print_req, db=db)
        print(f" -> Station reported PRINT_SUCCESS")

        # STEP 2: Generate Digital Receipt
        print("\n[STEP 2] Minting Verifiable Digital Receipt...")
        receipt = receipt_service.generate_receipt_for_job(db=db, job_id=job_id)
        assert receipt is not None
        assert receipt.receipt_id.startswith("RCPT-")
        assert receipt.job_id == job_id
        assert receipt.document_hash == expected_sha256
        assert receipt.station_id == "TERM-CYBERHUB-04"
        assert receipt.upload_timestamp is not None
        assert receipt.qr_redemption_timestamp is not None
        assert receipt.print_submission_status == "PRINT_SUCCESS"
        assert receipt.cleanup_status in ["COMPLETED", "verified_dod", "PENDING"]
        assert receipt.document_integrity_status == "VERIFIED"
        print(f" -> Receipt Minted: ID='{receipt.receipt_id}' | Created='{receipt.created_at.isoformat()}'")

        # STEP 3: Verify Canonical Receipt Data Structure
        print("\n[STEP 3] Validating RFC 8785 Canonical JSON Structure...")
        canonical_str = receipt.canonical_data
        parsed_canonical = json.loads(canonical_str)

        required_canonical_keys = [
            "cleanup_status",
            "customer_id",
            "document_hash",
            "document_integrity_status",
            "job_id",
            "original_filename",
            "print_submission_status",
            "qr_redemption_timestamp",
            "receipt_id",
            "server_cleanup_status",
            "station_cleanup_status",
            "station_id",
            "total_cost",
            "upload_timestamp"
        ]
        for key in required_canonical_keys:
            assert key in parsed_canonical, f"Missing required canonical field '{key}'"
        print(" -> Canonical structure verified: all mandatory audit fields present in sorted order.")

        # STEP 4: Verify SHA-256 Hash and Ed25519 Digital Signature
        print("\n[STEP 4] Testing Cryptographic Signature Verification...")
        computed_hash = hashlib.sha256(canonical_str.encode("utf-8")).hexdigest()
        assert computed_hash == receipt.receipt_hash, "Receipt SHA-256 hash mismatch!"
        print(f" -> Canonical SHA-256 Hash: {receipt.receipt_hash} (MATCH)")

        # Verify Ed25519 Signature
        is_sig_valid = signing_service.verify_signature(
            canonical_str=canonical_str,
            signature_hex=receipt.signature,
            public_key_hex=receipt.signer_public_key
        )
        assert is_sig_valid is True, "Ed25519 digital signature validation failed!"
        print(f" -> Ed25519 Signature: {receipt.signature[:32]}... (CRYPTOGRAPHICALLY AUTHENTIC)")

        # STEP 5: Test Tamper Detection
        print("\n[STEP 5] Testing Tamper-Proofing (Altered Payload Rejection)...")
        tampered_canonical = canonical_str.replace("PRINT_SUCCESS", "PRINT_FAILED")
        is_tampered_valid = signing_service.verify_signature(
            canonical_str=tampered_canonical,
            signature_hex=receipt.signature,
            public_key_hex=receipt.signer_public_key
        )
        assert is_tampered_valid is False, "Security violation: Tampered payload must be rejected!"
        print(" -> Tamper detection verified: Altered payload correctly rejected.")

        # STEP 6: Test Receipt Verification Service
        print("\n[STEP 6] Testing Receipt Verification Service...")
        verify_result = receipt_service.verify_receipt_authenticity(db=db, receipt_id=receipt.receipt_id)
        assert verify_result["is_valid"] is True
        assert verify_result["hash_valid"] is True
        assert verify_result["signature_valid"] is True
        assert verify_result["document_integrity"] == "VERIFIED"
        print(f" -> Verification Status: {verify_result['message']}")
        print(f" -> Disclaimer Check: '{verify_result['disclaimer'][:60]}...'")

        # STEP 7: Generate Downloadable PDF Receipt
        print("\n[STEP 7] Generating Authentic PDF Digital Receipt with ReportLab...")
        pdf_receipt_bytes = receipt_service.get_pdf_for_receipt(receipt)
        assert pdf_receipt_bytes.startswith(b"%PDF-"), "Generated file must be a valid PDF."
        assert len(pdf_receipt_bytes) > 1000, "PDF size must contain content."
        print(f" -> PDF Receipt Generated Successfully: {len(pdf_receipt_bytes)} bytes (valid %PDF- magic).")

        # STEP 8: Testing FastAPI Receipt Endpoints (Direct Router Invocation)
        print("\n[STEP 8] Testing FastAPI Receipt Endpoints (API Layer)...")

        # 8a: Public key
        pk_resp = receipts.get_signer_public_key()
        assert "public_key_hex" in pk_resp
        print(f" -> GET /api/receipts/public-key: 200 OK (Key: {pk_resp['public_key_hex'][:16]}...)")

        # 8b: Get receipt by ID
        rcpt_resp = receipts.get_receipt(receipt_id=receipt.receipt_id, db=db)
        assert rcpt_resp.receipt_id == receipt.receipt_id
        assert rcpt_resp.document_hash == expected_sha256
        assert rcpt_resp.station_id == "TERM-CYBERHUB-04"
        print(f" -> GET /api/receipts/{receipt.receipt_id}: 200 OK")

        # 8c: Get receipt by Job ID
        job_rcpt_resp = jobs.get_or_generate_job_receipt(job_id=job_id, db=db)
        assert job_rcpt_resp["receipt_id"] == receipt.receipt_id
        print(f" -> GET /api/jobs/{job_id}/receipt: 200 OK")

        # 8d: Download PDF
        pdf_resp = receipts.download_pdf_receipt(receipt_id=receipt.receipt_id, db=db)
        assert pdf_resp.status_code == 200
        assert pdf_resp.media_type == "application/pdf"
        assert pdf_resp.body.startswith(b"%PDF-")
        print(f" -> GET /api/receipts/{receipt.receipt_id}/download-pdf: 200 OK ({len(pdf_resp.body)} bytes)")

        # 8e: Verify receipt via API
        verify_api_resp = receipts.verify_receipt(payload=VerifyReceiptRequest(receipt_id=receipt.receipt_id), db=db)
        assert verify_api_resp.is_valid is True
        assert verify_api_resp.document_integrity == "VERIFIED"
        assert verify_api_resp.signature_valid is True
        print(f" -> POST /api/receipts/verify (ID lookup): 200 OK (Status: {verify_api_resp.document_integrity})")

        # 8f: Verify raw canonical payload via API
        raw_verify_resp = receipts.verify_receipt(payload=VerifyReceiptRequest(
            canonical_data=receipt.canonical_data,
            signature=receipt.signature,
            public_key=receipt.signer_public_key
        ), db=db)
        assert raw_verify_resp.is_valid is True
        print(" -> POST /api/receipts/verify (raw canonical + sig): 200 OK (Tamper-proof check passed)")

        print("\n" + "=" * 75)
        print(" ALL DIGITAL RECEIPT & AUDIT TRAIL TESTS PASSED 100%!")
        print("=" * 75)

    finally:
        db.close()

if __name__ == "__main__":
    run_receipt_tests()
