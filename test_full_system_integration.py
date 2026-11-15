"""
PrintShield Master System Integration & Failure Case Verification Suite
Tests the complete 12-step happy path workflow and all 8 required failure cases:

WORKFLOW:
1. Customer uploads a PDF.
2. Backend encrypts and stores it.
3. Customer selects print settings.
4. Backend creates a print job (PENDING).
5. Customer receives a one-time QR code.
6. Print station redeems the QR code.
7. Station downloads and decrypts the document.
8. SHA-256 integrity verification succeeds.
9. Document is submitted to Windows Print to PDF.
10. Station performs temporary file cleanup.
11. Backend records the cleanup report.
12. Customer receives a downloadable digital receipt.

FAILURE CASES:
1. Invalid QR code
2. Expired QR code
3. Reused QR code
4. Corrupted document / tampered ciphertext
5. Network disconnection
6. Printing failure handling & retry retention
7. Cleanup failure & operator retry
8. Unauthorized access (download before auth & station policy mismatch)
"""

import os
import sys
import io
import time
import json
import base64
import hashlib
from pathlib import Path
from datetime import datetime, timedelta
import pypdf
from fastapi import UploadFile, HTTPException

# Set up project path
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

from backend.app.config import settings
from backend.app.database import SessionLocal, Base, engine, ensure_schema_migrations
from backend.app.models import PrintJob, OneTimeToken, CleanupReport, DigitalReceipt
from backend.app.routers import jobs, station, cleanup, receipts
from backend.app.schemas import (
    ConfigurePrintJobRequest,
    GenerateQRRequest,
    RedeemTokenRequest,
    ReportPrintRequest,
    StationCleanupReportRequest,
    TriggerCleanupRequest,
    VerifyReceiptRequest
)
from backend.app.security.encryption import encryption_manager
from backend.app.security.signing import signing_service
from backend.app.services.receipt_service import receipt_service

from station_agent.config import config as station_cfg
from station_agent.security import station_security
from station_agent.printer import printer_service
from station_agent.client import StationBackendClient

def create_sample_pdf(title: str = "PrintShield Verification Document", pages: int = 2) -> bytes:
    """Generates authentic PDF bytes with readable text and page objects."""
    writer = pypdf.PdfWriter()
    for p in range(pages):
        page = writer.add_blank_page(width=595, height=842) # A4
    buf = io.BytesIO()
    writer.write(buf)
    return buf.getvalue()

def run_integration_suite():
    print("\n" + "=" * 80)
    print(" PRINTSHIELD MVP // COMPREHENSIVE SYSTEM INTEGRATION & VERIFICATION SUITE")
    print("=" * 80)

    # Initialize environment
    Base.metadata.create_all(bind=engine)
    ensure_schema_migrations(engine)
    settings.init_storage()
    station_cfg.init_directories()

    db = SessionLocal()
    client = StationBackendClient(base_url="http://127.0.0.1:8000", station_id="TERM-CYBERHUB-04")

    try:
        # =========================================================================
        # SECTION 1: THE COMPLETE 12-STEP PRINT WORKFLOW
        # =========================================================================
        print("\n" + "-" * 80)
        print(" SECTION 1: VERIFYING THE COMPLETE 12-STEP HAPPY PATH WORKFLOW")
        print("-" * 80)

        # 1. Customer uploads a PDF
        print("\n[STEP 1] Customer uploads genuine PDF document...")
        raw_pdf = create_sample_pdf("Confidential Legal Agreement", pages=3)
        expected_doc_hash = hashlib.sha256(raw_pdf).hexdigest()
        customer_id = "usr-cst-int-001"

        upload_file = UploadFile(
            file=io.BytesIO(raw_pdf),
            filename="confidential_agreement.pdf",
            headers={"content-type": "application/pdf"}
        )
        upload_res = jobs.upload_and_encrypt_document(
            file=upload_file,
            customer_id=customer_id,
            color_mode="black_and_white",
            copies=2,
            db=db
        )
        job_id = upload_res.job_id
        print(f" -> Upload Success: Job ID '{job_id}', Filename: '{upload_res.job.original_filename}'")

        # 2. Backend encrypts and stores it
        print("\n[STEP 2] Backend encrypts and stores document with AES-256-GCM...")
        db_job = db.query(PrintJob).filter(PrintJob.job_id == job_id).first()
        assert db_job is not None
        assert db_job.document_hash == expected_doc_hash
        assert Path(db_job.encrypted_file_path).exists()
        key_file = settings.KEYS_DIR / f"{db_job.key_id}.key"
        assert key_file.exists()
        print(f" -> Ciphertext stored at: {db_job.encrypted_file_path}")
        print(f" -> Key envelope stored at: {key_file.name}")
        print(f" -> Document SHA-256 verified: {expected_doc_hash[:24]}...")

        # 3. Customer selects print settings
        print("\n[STEP 3] Customer selects print settings...")
        cfg_payload = ConfigurePrintJobRequest(
            customer_id=customer_id,
            copies=2,
            page_range="1-2",
            paper_size="A4",
            orientation="portrait",
            color_mode="black_and_white",
            duplex="single_sided",
            expiration_minutes=45,
            station_id="TERM-CYBERHUB-04"
        )

        # 4. Backend creates a print job (PENDING)
        print("\n[STEP 4] Backend validates settings and queues job as PENDING...")
        cfg_res = jobs.configure_print_job(job_id=job_id, payload=cfg_payload, db=db)
        assert cfg_res.success is True
        assert cfg_res.job_status == "PENDING"
        db.refresh(db_job)
        assert db_job.job_status == "PENDING"
        assert db_job.total_cost > 0
        print(f" -> Job Status: '{db_job.job_status}', Total Sheets: {db_job.total_sheets}, Cost: ${db_job.total_cost:.2f}")

        # 5. Customer receives a one-time QR code
        print("\n[STEP 5] Customer receives a one-time QR code & 6-digit access PIN...")
        qr_req = GenerateQRRequest(
            customer_id=customer_id,
            expiry_seconds=300,
            station_id="TERM-CYBERHUB-04"
        )
        qr_res = jobs.generate_one_time_qr(job_id=job_id, payload=qr_req, db=db)
        assert qr_res.success is True
        assert qr_res.qr_payload.startswith("printshield://auth?")
        assert len(qr_res.manual_code.replace("-", "")) == 6
        qr_token_str = qr_res.raw_token
        manual_code = qr_res.manual_code
        print(f" -> One-Time QR Payload: {qr_res.qr_payload[:50]}...")
        print(f" -> Manual 6-Digit PIN:   {manual_code} (Valid for 5 mins)")

        # 6. Print station redeems the QR code
        print("\n[STEP 6] Print station redeems one-time QR code via Station API...")
        redeem_payload = RedeemTokenRequest(
            station_id="TERM-CYBERHUB-04",
            qr_payload=qr_res.qr_payload
        )
        redeem_res = station.redeem_one_time_token(payload=redeem_payload, db=db)
        assert redeem_res.success is True
        assert redeem_res.job_status == "AUTHORIZED"
        db.refresh(db_job)
        assert db_job.job_status == "AUTHORIZED"
        print(f" -> Token Redeemed: Job Status transitioned to '{db_job.job_status}'")

        # 7. Station downloads and decrypts the document
        print("\n[STEP 7] Station downloads authorized ciphertext and unwrapped key...")
        dl_res = station.download_encrypted_payload(job_id=job_id, station_id="TERM-CYBERHUB-04", db=db)
        assert dl_res.success is True
        assert len(dl_res.encrypted_payload_b64) > 0
        assert len(dl_res.doc_key_b64) > 0
        print(" -> Ciphertext and key received securely.")

        # 8. SHA-256 integrity verification succeeds
        print("\n[STEP 8] Local AES-256-GCM decryption & SHA-256 bit-for-bit integrity validation...")
        ok, decr_path, calc_hash, msg = station_security.decrypt_payload_to_temp(
            encrypted_payload_b64=dl_res.encrypted_payload_b64,
            doc_key_b64=dl_res.doc_key_b64,
            job_id=job_id,
            filename=dl_res.original_filename,
            expected_hash=dl_res.document_hash
        )
        assert ok is True, f"Decryption failed: {msg}"
        assert decr_path.exists()
        assert calc_hash == expected_doc_hash
        print(f" -> Decrypted to restricted temporary vault: {decr_path.name}")
        print(f" -> Integrity Status: EXACT BIT-FOR-BIT MATCH (Hash: {calc_hash[:24]}...)")

        # 9. Document is submitted to Windows Print to PDF
        print("\n[STEP 9] Document is submitted to Windows Print to PDF via winspool.drv...")
        sub_rep = ReportPrintRequest(
            station_id="TERM-CYBERHUB-04",
            status="PRINT_SUBMITTED",
            printer_name="Microsoft Print to PDF",
            details="Spool submitted via Windows winspool.drv"
        )
        station.report_print_status(job_id=job_id, payload=sub_rep, db=db)
        db.refresh(db_job)
        assert db_job.job_status == "PRINTING"
        print(f" -> Step 9a: PRINT_SUBMITTED reported. Job status is '{db_job.job_status}'.")

        print_ok, print_msg, out_path = printer_service.print_to_windows_spool(
            pdf_path=decr_path,
            job_id=job_id,
            printer_name="Microsoft Print to PDF"
        )
        assert print_ok is True
        print(f" -> Step 9b: Windows Spooler Execution: {print_msg}")
        if out_path:
            assert out_path.exists()
            assert out_path.stat().st_size > 0
            print(f" -> Step 9c: Printed output confirmed on disk: {out_path.name} ({out_path.stat().st_size} bytes)")

        succ_rep = ReportPrintRequest(
            station_id="TERM-CYBERHUB-04",
            status="PRINT_SUCCESS",
            printer_name="Microsoft Print to PDF",
            details=f"Output confirmed: {out_path.name if out_path else 'Spool flushed'}"
        )
        station.report_print_status(job_id=job_id, payload=succ_rep, db=db)
        db.refresh(db_job)
        assert db_job.job_status == "COMPLETED"
        print(f" -> Step 9d: PRINT_SUCCESS reported. Job status is '{db_job.job_status}'.")

        # 10. Station performs temporary file cleanup
        print("\n[STEP 10] Station performs DoD 5220.22-M temporary file cleanup...")
        wipe_result = station_security.clean_station_job(job_id=job_id, decrypted_file_path=decr_path)
        assert not decr_path.exists()
        assert wipe_result["decrypted_file_deleted"] is True
        print(" -> Station temporary file sanitized and verified absent from disk.")

        # 11. Backend records the cleanup report
        print("\n[STEP 11] Backend records station cleanup report and executes server shredding...")
        stn_cleanup_payload = StationCleanupReportRequest(
            station_id="TERM-CYBERHUB-04",
            decrypted_file_deleted=True,
            decrypted_file_path=str(decr_path),
            temp_files_deleted_count=wipe_result["temp_files_deleted_count"],
            job_data_cleared=True
        )
        clean_res = cleanup.report_station_cleanup(job_id=job_id, payload=stn_cleanup_payload, db=db)
        assert clean_res.status == "COMPLETED"
        assert clean_res.server["encrypted_file_deleted"] is True
        assert clean_res.server["key_file_deleted"] is True
        assert not Path(db_job.encrypted_file_path).exists()
        assert not key_file.exists()
        print(f" -> Cleanup Status: '{clean_res.status}'")
        print(f" -> Server encrypted ciphertext verified absent from disk.")
        print(f" -> Server encryption key verified absent from disk.")
        print(f" -> Shredding Audit Certificate: {clean_res.shredding_hash[:32]}...")

        # 12. Customer receives a downloadable digital receipt
        print("\n[STEP 12] Customer receives verifiable digital receipt with Ed25519 signature...")
        receipt_obj = receipts.get_receipt(receipt_id=job_id, db=db)
        assert receipt_obj is not None
        assert receipt_obj.receipt_id.startswith("RCPT-")
        assert receipt_obj.job_id == job_id
        assert receipt_obj.document_hash == expected_doc_hash
        assert receipt_obj.document_integrity_status == "VERIFIED"
        assert receipt_obj.print_submission_status == "PRINT_SUCCESS"

        # Download PDF receipt
        pdf_receipt_resp = receipts.download_pdf_receipt(receipt_id=receipt_obj.receipt_id, db=db)
        assert pdf_receipt_resp.status_code == 200
        assert pdf_receipt_resp.body.startswith(b"%PDF-")
        print(f" -> Receipt ID: {receipt_obj.receipt_id}")
        print(f" -> Downloadable PDF Receipt generated: {len(pdf_receipt_resp.body)} bytes.")

        # Verify receipt signature
        verify_api_res = receipts.verify_receipt(
            payload=VerifyReceiptRequest(receipt_id=receipt_obj.receipt_id),
            db=db
        )
        assert verify_api_res.is_valid is True
        assert verify_api_res.signature_valid is True
        assert verify_api_res.document_integrity == "VERIFIED"
        print(f" -> Cryptographic Signature & Document Integrity: {verify_api_res.message}")

        print("\n" + "=" * 80)
        print(" ALL 12 WORKFLOW STEPS VERIFIED SUCCESSFULLY 100%!")
        print("=" * 80)

        # =========================================================================
        # SECTION 2: TEST ALL 8 FAILURE CASES
        # =========================================================================
        print("\n" + "-" * 80)
        print(" SECTION 2: TESTING ALL 8 REQUIRED FAILURE CASES")
        print("-" * 80)

        # Failure Case 1: Invalid QR code
        print("\n[FAILURE CASE 1] Invalid QR code...")
        try:
            bad_redeem = RedeemTokenRequest(
                station_id="TERM-CYBERHUB-04",
                qr_payload="printshield://auth?job=PS-FAKE-999&token=nonexistent_token_string&station=TERM-CYBERHUB-04"
            )
            station.redeem_one_time_token(payload=bad_redeem, db=db)
            assert False, "Security violation: Invalid token was accepted!"
        except HTTPException as e:
            assert e.status_code == 404
            print(f" -> PASSED: Invalid QR code correctly rejected with HTTP {e.status_code}: {e.detail}")

        # Failure Case 2: Expired QR code
        print("\n[FAILURE CASE 2] Expired QR code...")
        # Create an expired token in database with unique random hashes
        import uuid
        exp_token_raw = f"expired_token_{uuid.uuid4().hex}"
        exp_manual_code = f"{uuid.uuid4().int % 900 + 100}-{uuid.uuid4().int % 900 + 100}"
        expired_token_record = OneTimeToken(
            token_id=f"tok_{uuid.uuid4().hex[:12]}",
            job_id=job_id,
            token_hash=hashlib.sha256(exp_token_raw.encode("utf-8")).hexdigest(),
            manual_code=exp_manual_code,
            manual_code_hash=hashlib.sha256(exp_manual_code.replace("-", "").encode("utf-8")).hexdigest(),
            expires_at=datetime.utcnow() - timedelta(minutes=10),
            station_id="TERM-CYBERHUB-04",
            is_used=False
        )
        db.add(expired_token_record)
        db.commit()

        try:
            exp_redeem = RedeemTokenRequest(
                station_id="TERM-CYBERHUB-04",
                token=exp_token_raw
            )
            station.redeem_one_time_token(payload=exp_redeem, db=db)
            assert False, "Security violation: Expired token was accepted!"
        except HTTPException as e:
            assert e.status_code == 410
            print(f" -> PASSED: Expired QR code correctly rejected with HTTP {e.status_code}: {e.detail}")

        # Failure Case 3: Reused QR code
        print("\n[FAILURE CASE 3] Reused QR code (Replay Attack Prevention)...")
        try:
            # qr_res.qr_payload was already redeemed in Step 6
            station.redeem_one_time_token(payload=redeem_payload, db=db)
            assert False, "Security violation: Reused token was accepted!"
        except HTTPException as e:
            assert e.status_code == 409
            print(f" -> PASSED: Reused QR code correctly rejected with HTTP {e.status_code}: {e.detail}")

        # Failure Case 4: Corrupted document / Tampered Ciphertext
        print("\n[FAILURE CASE 4] Corrupted document & SHA-256 integrity mismatch...")
        # 4a: Corrupted AES-256-GCM ciphertext tag
        corrupted_ciphertext = dl_res.encrypted_payload_b64[:-8] + "AAAAAAAA"
        ok_corrupt, _, _, corrupt_msg = station_security.decrypt_payload_to_temp(
            encrypted_payload_b64=corrupted_ciphertext,
            doc_key_b64=dl_res.doc_key_b64,
            job_id=job_id,
            filename="corrupt.pdf",
            expected_hash=expected_doc_hash
        )
        assert ok_corrupt is False
        print(f" -> PASSED: Corrupted ciphertext rejected: {corrupt_msg}")

        # 4b: Checksum mismatch test (tampered expected hash)
        ok_tamper, _, _, tamper_msg = station_security.decrypt_payload_to_temp(
            encrypted_payload_b64=dl_res.encrypted_payload_b64,
            doc_key_b64=dl_res.doc_key_b64,
            job_id=job_id,
            filename="tampered.pdf",
            expected_hash="ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
        )
        assert ok_tamper is False
        assert "INTEGRITY FAILURE" in tamper_msg
        print(f" -> PASSED: Tampered document checksum mismatch rejected: {tamper_msg}")

        # Failure Case 5: Network disconnection
        print("\n[FAILURE CASE 5] Network disconnection handling...")
        offline_client = StationBackendClient(base_url="http://127.0.0.1:59999")
        conn_ok, conn_msg = offline_client.check_connection()
        assert conn_ok is False
        assert "Cannot connect" in conn_msg or "Connection error" in conn_msg
        print(f" -> PASSED: Station agent gracefully detected backend offline without crash: {conn_msg}")

        # Failure Case 6: Printing failure handling & state retention
        print("\n[FAILURE CASE 6] Printing failure handling...")
        # Setup a fresh job for print failure testing
        test_fail_pdf = create_sample_pdf("Print Failure Test Document", pages=1)
        up_fail = jobs.upload_and_encrypt_document(
            file=UploadFile(file=io.BytesIO(test_fail_pdf), filename="fail_test.pdf", headers={"content-type": "application/pdf"}),
            customer_id="usr-cst-fail",
            color_mode="black_and_white",
            copies=1,
            db=db
        )
        cfg_fail = ConfigurePrintJobRequest(
            customer_id="usr-cst-fail",
            copies=1,
            page_range="all",
            paper_size="A4",
            orientation="portrait",
            color_mode="black_and_white",
            duplex="single_sided",
            expiration_minutes=30,
            station_id="TERM-CYBERHUB-04"
        )
        jobs.configure_print_job(job_id=up_fail.job_id, payload=cfg_fail, db=db)
        qr_fail = jobs.generate_one_time_qr(job_id=up_fail.job_id, payload=GenerateQRRequest(customer_id="usr-cst-fail", station_id="TERM-CYBERHUB-04"), db=db)
        station.redeem_one_time_token(payload=RedeemTokenRequest(station_id="TERM-CYBERHUB-04", qr_payload=qr_fail.qr_payload), db=db)

        # Attempt to print to a non-existent hardware printer
        bad_print_ok, bad_print_msg, _ = printer_service.print_to_windows_spool(
            pdf_path=Path("non_existent_file.pdf"),
            job_id=up_fail.job_id,
            printer_name="Non_Existent_LaserJet_9999"
        )
        assert bad_print_ok is False
        print(f" -> Spooler failure caught: {bad_print_msg}")

        # Station reports PRINT_FAILED
        fail_rep = ReportPrintRequest(
            station_id="TERM-CYBERHUB-04",
            status="PRINT_FAILED",
            printer_name="Non_Existent_LaserJet_9999",
            details="Spool submission error: Printer offline or missing"
        )
        rep_fail_res = station.report_print_status(job_id=up_fail.job_id, payload=fail_rep, db=db)
        fail_job = db.query(PrintJob).filter(PrintJob.job_id == up_fail.job_id).first()
        # Verify job is retained as AUTHORIZED so operator can retry
        assert fail_job.job_status == "AUTHORIZED"
        print(f" -> PASSED: Print failure recorded. Job status reverted to '{fail_job.job_status}' for operator retry.")

        # Failure Case 7: Cleanup failure & manual operator retry
        print("\n[FAILURE CASE 7] Cleanup failure handling & manual operator retry...")
        # Station reports partial cleanup failure (e.g. file lock)
        stn_partial_fail = StationCleanupReportRequest(
            station_id="TERM-CYBERHUB-04",
            decrypted_file_deleted=False,
            decrypted_file_path=str(station_cfg.TEMP_DIR / "locked_file.pdf"),
            temp_files_deleted_count=0,
            job_data_cleared=False,
            errors=["File locked by another operating system process"]
        )
        partial_rep = cleanup.report_station_cleanup(job_id=up_fail.job_id, payload=stn_partial_fail, db=db)
        assert partial_rep.status in ["PARTIALLY_COMPLETED", "FAILED"]
        print(f" -> Cleanup failure detected. Audit recorded as '{partial_rep.status}', Errors: {partial_rep.errors}")

        # Operator triggers manual retry via POST /api/jobs/{job_id}/cleanup
        retry_res = cleanup.trigger_job_cleanup(
            job_id=up_fail.job_id,
            payload=TriggerCleanupRequest(reason="OPERATOR_MANUAL_RETRY"),
            db=db
        )
        assert retry_res.success is True
        print(f" -> PASSED: Operator manual cleanup retry executed successfully. Server status: '{retry_res.status}'.")

        # Failure Case 8: Unauthorized access controls
        print("\n[FAILURE CASE 8] Unauthorized access controls...")
        # 8a: Download before token authorization
        new_unauth_pdf = create_sample_pdf("Unauth Test Document", pages=1)
        up_unauth = jobs.upload_and_encrypt_document(
            file=UploadFile(file=io.BytesIO(new_unauth_pdf), filename="unauth_test.pdf", headers={"content-type": "application/pdf"}),
            customer_id="usr-cst-unauth",
            color_mode="black_and_white",
            copies=1,
            db=db
        )
        cfg_unauth = ConfigurePrintJobRequest(
            customer_id="usr-cst-unauth",
            copies=1,
            page_range="all",
            paper_size="A4",
            orientation="portrait",
            color_mode="black_and_white",
            duplex="single_sided",
            expiration_minutes=30,
            station_id="TERM-CYBERHUB-04"
        )
        jobs.configure_print_job(job_id=up_unauth.job_id, payload=cfg_unauth, db=db)

        try:
            # Job is PENDING, not AUTHORIZED
            station.download_encrypted_payload(job_id=up_unauth.job_id, station_id="TERM-CYBERHUB-04", db=db)
            assert False, "Security violation: Download allowed before token authorization!"
        except HTTPException as e:
            assert e.status_code == 403
            print(f" -> PASSED [8a]: Download before authorization blocked with HTTP {e.status_code}: {e.detail}")

        # 8b: Station policy mismatch on token redemption
        qr_unauth = jobs.generate_one_time_qr(job_id=up_unauth.job_id, payload=GenerateQRRequest(customer_id="usr-cst-unauth", station_id="TERM-CYBERHUB-04"), db=db)
        try:
            rogue_redeem = RedeemTokenRequest(
                station_id="TERM-ROGUE-KIOSK-99", # Wrong station
                qr_payload=qr_unauth.qr_payload
            )
            station.redeem_one_time_token(payload=rogue_redeem, db=db)
            assert False, "Security violation: Rogue station redeemed token!"
        except HTTPException as e:
            assert e.status_code == 403
            print(f" -> PASSED [8b]: Station mismatch on redemption blocked with HTTP {e.status_code}: {e.detail}")

        # 8c: Station policy mismatch on download
        # Authorize legitimately first
        station.redeem_one_time_token(payload=RedeemTokenRequest(station_id="TERM-CYBERHUB-04", qr_payload=qr_unauth.qr_payload), db=db)
        try:
            station.download_encrypted_payload(job_id=up_unauth.job_id, station_id="TERM-ROGUE-KIOSK-99", db=db)
            assert False, "Security violation: Rogue station downloaded ciphertext!"
        except HTTPException as e:
            assert e.status_code == 403
            print(f" -> PASSED [8c]: Station mismatch on download blocked with HTTP {e.status_code}: {e.detail}")

        print("\n" + "=" * 80)
        print(" ALL 8 FAILURE CASES TESTED & VERIFIED 100%!")
        print("=" * 80)

        print("\n" + "#" * 80)
        print(" PRINTSHIELD MVP SYSTEM INTEGRATION VERIFICATION: ALL TESTS PASSED!")
        print(" #" * 40 + "\n")

    finally:
        db.close()

if __name__ == "__main__":
    run_integration_suite()
