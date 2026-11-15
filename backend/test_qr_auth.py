"""
Comprehensive Test Suite for One-Time QR Code Authentication Module
Validates:
1. Generation of cryptographically secure random token and 6-digit manual PIN
2. Zero plaintext retention: only SHA-256 hashes stored in SQLite
3. Successful redemption of valid QR token and status transition to AUTHORIZED
4. Rejection of expired QR token (HTTP 410)
5. Rejection of reused QR token (HTTP 409)
6. Rejection of invalid / non-existent QR token (HTTP 404)
7. Successful redemption via manual 6-digit PIN
8. Rejection of station policy mismatch (HTTP 403)
9. GET /api/jobs/{job_id}/qr-status query
"""

import io
import sys
from pathlib import Path
from datetime import datetime, timedelta
from fastapi import UploadFile, HTTPException
import pypdf

# Add backend directory to sys.path
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

from app.database import SessionLocal, Base, engine, ensure_schema_migrations
from app.models import PrintJob, OneTimeToken
from app.schemas import (
    ConfigurePrintJobRequest,
    GenerateQRRequest,
    RedeemTokenRequest
)
from app.routers.jobs import (
    upload_and_encrypt_document,
    configure_print_job,
    generate_one_time_qr,
    get_qr_status
)
from app.routers.station import redeem_one_time_token

def create_sample_pdf() -> bytes:
    writer = pypdf.PdfWriter()
    for _ in range(3):
        writer.add_blank_page(width=595, height=842)
    buf = io.BytesIO()
    writer.write(buf)
    return buf.getvalue()

def run_tests():
    print("=" * 70)
    print(" PRINTSHIELD ONE-TIME QR CODE AUTHENTICATION TEST SUITE")
    print("=" * 70)

    Base.metadata.create_all(bind=engine)
    ensure_schema_migrations(engine)

    db = SessionLocal()
    try:
        # Step 1: Upload and configure a print job
        print("\n[STEP 1] Setting up confirmed print job...")
        pdf_bytes = create_sample_pdf()
        customer_id = "usr-cst-9021"

        upload_file = UploadFile(
            file=io.BytesIO(pdf_bytes),
            filename="classified_briefing.pdf",
            headers={"content-type": "application/pdf"}
        )
        upload_res = upload_and_encrypt_document(
            file=upload_file,
            customer_id=customer_id,
            color_mode="color",
            copies=1,
            db=db
        )
        job_id = upload_res.job_id

        # Configure job to PENDING
        req = ConfigurePrintJobRequest(
            customer_id=customer_id,
            copies=1,
            page_range="all",
            paper_size="A4",
            orientation="portrait",
            color_mode="color",
            duplex="single_sided",
            expiration_minutes=60,
            station_id="TERM-CYBERHUB-04"
        )
        conf_res = configure_print_job(job_id=job_id, payload=req, db=db)
        assert conf_res.job_status == "PENDING"
        print(f" -> Job {job_id} configured and queued as PENDING.")

        # Step 2: Generate One-Time QR Token
        print("\n[STEP 2] Generating cryptographically secure QR token...")
        gen_req = GenerateQRRequest(
            customer_id=customer_id,
            expiry_seconds=300,  # 5 minutes
            station_id="TERM-CYBERHUB-04"
        )
        gen_res = generate_one_time_qr(job_id=job_id, payload=gen_req, db=db)
        assert gen_res.success is True
        raw_token = gen_res.raw_token
        manual_code = gen_res.manual_code
        qr_payload = gen_res.qr_payload
        print(f" -> Generated raw token: {raw_token[:10]}... (256-bit entropy)")
        print(f" -> Manual 6-digit access PIN: {manual_code}")
        print(f" -> QR Payload: {qr_payload}")
        print(f" -> Expires at: {gen_res.expires_at} ({gen_res.expiry_seconds}s TTL)")

        # Verify Database Security: Only hashes exist, zero plaintext token in DB!
        token_row = db.query(OneTimeToken).filter(OneTimeToken.job_id == job_id).first()
        assert token_row is not None
        assert raw_token not in [token_row.token_hash]
        assert len(token_row.token_hash) == 64  # SHA-256
        assert len(token_row.manual_code_hash) == 64  # SHA-256
        print(" -> SECURITY AUDIT: Only SHA-256 hashes stored in DB. Zero plaintext token leak.")

        # Step 3: Check QR Status endpoint
        print("\n[STEP 3] Verifying GET /api/jobs/{job_id}/qr-status...")
        qr_status = get_qr_status(job_id=job_id, db=db)
        assert qr_status.has_active_token is True
        assert qr_status.is_used is False
        assert qr_status.is_expired is False
        assert qr_status.seconds_remaining > 0
        print(f" -> QR Status: Active={qr_status.has_active_token}, Remaining={qr_status.seconds_remaining}s")

        # Step 4: Test Invalid QR Token (random garbage)
        print("\n[STEP 4] Testing rejection of INVALID QR token...")
        try:
            redeem_req_invalid = RedeemTokenRequest(
                station_id="TERM-CYBERHUB-04",
                token="totally-bogus-token-xyz-12345"
            )
            redeem_one_time_token(payload=redeem_req_invalid, db=db)
            assert False, "Should have rejected invalid token"
        except HTTPException as he:
            assert he.status_code == 404
            print(f" -> Invalid token successfully rejected (HTTP 404): {he.detail}")

        # Step 5: Test Station Policy Mismatch
        print("\n[STEP 5] Testing STATION POLICY violation (unauthorized station)...")
        try:
            redeem_req_wrong_station = RedeemTokenRequest(
                station_id="TERM-ROGUE-STATION-99",
                token=raw_token
            )
            redeem_one_time_token(payload=redeem_req_wrong_station, db=db)
            assert False, "Should have rejected wrong station"
        except HTTPException as he:
            assert he.status_code == 403
            print(f" -> Station policy mismatch rejected (HTTP 403): {he.detail}")

        # Step 6: Test Successful Valid QR Redemption
        print("\n[STEP 6] Testing VALID QR Token Redemption...")
        redeem_req_valid = RedeemTokenRequest(
            station_id="TERM-CYBERHUB-04",
            token=raw_token
        )
        redeem_res = redeem_one_time_token(payload=redeem_req_valid, db=db)
        assert redeem_res.success is True
        assert redeem_res.job_status == "AUTHORIZED"
        print(f" -> Token successfully redeemed! Job status updated to: {redeem_res.job_status}")
        print(f" -> Redeemed at: {redeem_res.redeemed_at}")

        # Verify PrintJob in DB is now AUTHORIZED
        job_db = db.query(PrintJob).filter(PrintJob.job_id == job_id).first()
        assert job_db.job_status == "AUTHORIZED"

        # Step 7: Test Reused Token Rejection
        print("\n[STEP 7] Testing REUSED Token Rejection...")
        try:
            redeem_one_time_token(payload=redeem_req_valid, db=db)
            assert False, "Should have rejected reused token"
        except HTTPException as he:
            assert he.status_code == 409
            print(f" -> Reused token rejected with security alert (HTTP 409): {he.detail}")

        # Step 8: Test Manual 6-Digit PIN Redemption (Generate another token for second job)
        print("\n[STEP 8] Testing MANUAL 6-DIGIT PIN redemption flow...")
        upload_file2 = UploadFile(
            file=io.BytesIO(pdf_bytes),
            filename="financial_summary.pdf",
            headers={"content-type": "application/pdf"}
        )
        upload_res2 = upload_and_encrypt_document(
            file=upload_file2,
            customer_id=customer_id,
            color_mode="black_and_white",
            copies=1,
            db=db
        )
        job_id2 = upload_res2.job_id
        configure_print_job(job_id=job_id2, payload=req, db=db)

        gen_res2 = generate_one_time_qr(job_id=job_id2, payload=gen_req, db=db)
        manual_pin2 = gen_res2.manual_code
        print(f" -> Second job {job_id2} created with PIN: {manual_pin2}")

        redeem_req_pin = RedeemTokenRequest(
            station_id="TERM-CYBERHUB-04",
            manual_code=manual_pin2
        )
        redeem_res_pin = redeem_one_time_token(payload=redeem_req_pin, db=db)
        assert redeem_res_pin.success is True
        assert redeem_res_pin.job_status == "AUTHORIZED"
        print(f" -> Manual PIN redemption successful! Job {job_id2} is AUTHORIZED.")

        # Step 9: Test Expired Token Rejection
        print("\n[STEP 9] Testing EXPIRED Token Rejection (HTTP 410)...")
        # Generate token and manually simulate expiration
        gen_res3 = generate_one_time_qr(job_id=job_id2, payload=gen_req, db=db)
        token3_raw = gen_res3.raw_token

        # Backdate expiration time in database to simulate timeout
        token3_row = (
            db.query(OneTimeToken)
            .filter(OneTimeToken.job_id == job_id2)
            .order_by(OneTimeToken.created_at.desc())
            .first()
        )
        token3_row.expires_at = datetime.utcnow() - timedelta(minutes=1)
        db.commit()

        try:
            redeem_req_exp = RedeemTokenRequest(
                station_id="TERM-CYBERHUB-04",
                token=token3_raw
            )
            redeem_one_time_token(payload=redeem_req_exp, db=db)
            assert False, "Should have rejected expired token"
        except HTTPException as he:
            assert he.status_code == 410
            print(f" -> Expired token rejected (HTTP 410): {he.detail}")

        print("\n" + "=" * 70)
        print("ALL ONE-TIME QR CODE AUTHENTICATION TESTS PASSED 100%!")
        print("=" * 70)

    finally:
        db.close()

if __name__ == "__main__":
    run_tests()
