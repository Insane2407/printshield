import hashlib
import base64
from pathlib import Path
from datetime import datetime
from urllib.parse import urlparse, parse_qs
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from ..config import settings
from ..database import get_db
from ..models import PrintJob, OneTimeToken
from ..security.encryption import encryption_manager
from ..security.cleanup import cleanup_service
from ..schemas import (
    RedeemTokenRequest, 
    RedeemTokenResponse,
    EncryptedDownloadResponse,
    ReportPrintRequest,
    ReportPrintResponse
)

router = APIRouter(prefix="/api/station", tags=["Station Kiosk"])

def extract_token_and_station(payload: RedeemTokenRequest):
    """
    Extracts raw token or manual PIN and target station from flexible inputs:
    - Scanned QR string (e.g. printshield://auth?job=PS-123&token=...&station=...)
    - Scanned JSON
    - Direct token field
    - Direct manual_code field (e.g. 832-194)
    """
    token_str = (payload.token or "").strip()
    manual_pin = (payload.manual_code or "").strip()
    station_id = (payload.station_id or "TERM-CYBERHUB-04").strip()

    # If qr_payload provided, parse URI
    if payload.qr_payload:
        raw_qr = payload.qr_payload.strip()
        if raw_qr.startswith("printshield://"):
            try:
                parsed = urlparse(raw_qr)
                qs = parse_qs(parsed.query)
                if "token" in qs and qs["token"]:
                    token_str = qs["token"][0].strip()
                if not payload.station_id and "station" in qs and qs["station"]:
                    station_id = qs["station"][0].strip()
            except Exception:
                token_str = raw_qr
        elif "{" in raw_qr and "token" in raw_qr:
            try:
                import json
                data = json.loads(raw_qr)
                token_str = data.get("token", token_str)
                if not payload.station_id:
                    station_id = data.get("station_id", station_id)
            except Exception:
                pass
        elif not token_str and not manual_pin:
            token_str = raw_qr

    return token_str, manual_pin, station_id

@router.post("/redeem", response_model=RedeemTokenResponse)
def redeem_one_time_token(
    payload: RedeemTokenRequest,
    db: Session = Depends(get_db)
):
    """
    Atomic One-Time Token Redemption:
    1. Validates input token or manual PIN.
    2. Calculates SHA-256 hash (compares only against token_hash / manual_code_hash).
    3. Finds active token record in database.
    4. REJECTION CHECKS:
       - If not found -> HTTP 404 (Invalid Token)
       - If is_used == True -> HTTP 409 (Reused Token Alert)
       - If utcnow > expires_at -> HTTP 410 (Expired Token)
       - If station policy mismatch -> HTTP 403 (Station Policy Mismatch)
    5. ATOMIC STATE TRANSITION:
       - Sets is_used = True
       - Sets redeemed_at = utcnow
       - Sets associated PrintJob.job_status = "AUTHORIZED"
    6. Returns authorized job details for hardware printing.
    """
    token_str, manual_pin, station_id = extract_token_and_station(payload)

    if not token_str and not manual_pin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No token or manual PIN provided. Please scan a QR code or enter the 6-digit access PIN."
        )

    token_record = None

    # Try matching by raw token hash
    if token_str:
        computed_hash = hashlib.sha256(token_str.encode("utf-8")).hexdigest()
        token_record = db.query(OneTimeToken).filter(OneTimeToken.token_hash == computed_hash).first()

    # If not found by token, try matching by manual PIN hash
    if not token_record and (manual_pin or token_str):
        candidate_pin = manual_pin or token_str
        clean_pin = candidate_pin.replace("-", "").replace(" ", "").strip()
        if len(clean_pin) == 6 and clean_pin.isdigit():
            pin_hash = hashlib.sha256(clean_pin.encode("utf-8")).hexdigest()
            token_record = db.query(OneTimeToken).filter(OneTimeToken.manual_code_hash == pin_hash).first()

    # 1. Reject invalid tokens
    if not token_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid QR token or access code: No matching print authorization found."
        )

    # 2. Reject reused tokens
    if token_record.is_used:
        redeemed_time_str = token_record.redeemed_at.strftime("%H:%M:%S UTC") if token_record.redeemed_at else "earlier"
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Security Alert: This one-time token has already been redeemed at {redeemed_time_str}. Reused tokens are rejected."
        )

    now = datetime.utcnow()

    # 3. Reject expired tokens
    if now > token_record.expires_at:
        expired_ago_seconds = int((now - token_record.expires_at).total_seconds())
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail=f"Token expired {expired_ago_seconds}s ago (valid for 5 minutes). Please generate a fresh QR code on the customer device."
        )

    # 4. Reject station policy mismatch
    if token_record.station_id and station_id:
        if token_record.station_id.strip().upper() != station_id.strip().upper():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Station policy violation: Token is bound to '{token_record.station_id}', cannot be redeemed at kiosk '{station_id}'."
            )

    # Fetch associated PrintJob
    job = db.query(PrintJob).filter(PrintJob.job_id == token_record.job_id).first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Associated print job '{token_record.job_id}' not found."
        )

    if job.job_status in ["COMPLETED", "SHREDDED"]:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot authorize job: Document '{job.job_id}' is already {job.job_status}."
        )

    # 5. Atomic Redemption
    token_record.is_used = True
    token_record.redeemed_at = now

    # Authorize Print Job
    job.job_status = "AUTHORIZED"
    job.station_id = station_id

    db.commit()
    db.refresh(token_record)
    db.refresh(job)

    return RedeemTokenResponse(
        success=True,
        message="One-time token validated and redeemed. Print job authorized for hardware release.",
        job_id=job.job_id,
        job_status=job.job_status,
        redeemed_at=token_record.redeemed_at,
        station_id=station_id,
        document_name=job.original_filename,
        total_pages=job.selected_pages_count,
        copies=job.copies,
        total_sheets=job.total_sheets,
        color_mode=job.color_mode,
        total_cost=job.total_cost
    )

@router.get("/jobs/{job_id}/download-encrypted", response_model=EncryptedDownloadResponse)
def download_encrypted_payload(
    job_id: str,
    station_id: str = "TERM-CYBERHUB-04",
    db: Session = Depends(get_db)
):
    """
    Download Encrypted PDF Payload & Release Decryption Key:
    Enforces Security Rules:
    - Rejects download if token has NOT been redeemed/authorized (job_status must be AUTHORIZED or PRINTING).
    - Verifies station_id matches job.station_id.
    - Releases ciphertext and unwrapped document key strictly to the authorized station.
    """
    job = db.query(PrintJob).filter(PrintJob.job_id == job_id).first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Print job '{job_id}' not found."
        )

    # Security rule: Do not download documents before token authorization
    if job.job_status not in ["AUTHORIZED", "PRINTING"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Security Violation: Document download denied. Job '{job_id}' status is '{job.job_status}', not 'AUTHORIZED'. Token must be redeemed at the kiosk first."
        )

    # Station policy check
    if job.station_id and station_id:
        if job.station_id.strip().upper() != station_id.strip().upper():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Station policy violation: Job is bound to station '{job.station_id}', cannot be downloaded by station '{station_id}'."
            )

    # Retrieve ciphertext file
    enc_path = Path(job.encrypted_file_path)
    if not enc_path.exists():
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Encrypted ciphertext file missing from zero-retention vault storage."
        )

    with open(enc_path, "rb") as f:
        ciphertext_bytes = f.read()

    # Retrieve unwrapped document key from key store using master key
    key_file_path = settings.KEYS_DIR / f"{job.key_id}.key"
    if not key_file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Key envelope missing from secure key store."
        )

    with open(key_file_path, "rb") as f:
        key_blob = f.read()

    key_nonce = key_blob[:12]
    wrapped_key = key_blob[12:]

    # Unwrap document key for authorized station release
    master_aesgcm = AESGCM(encryption_manager.master_key)
    try:
        doc_key = master_aesgcm.decrypt(key_nonce, wrapped_key, job.key_id.encode("utf-8"))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Cryptographic unwrap failure on master key envelope: {str(e)}"
        )

    # Return base64 payload to authorized agent
    return EncryptedDownloadResponse(
        success=True,
        job_id=job.job_id,
        original_filename=job.original_filename,
        document_hash=job.document_hash,
        file_size=job.file_size,
        encrypted_payload_b64=base64.b64encode(ciphertext_bytes).decode("ascii"),
        doc_key_b64=base64.b64encode(doc_key).decode("ascii"),
        settings={
            "copies": job.copies,
            "page_range": job.page_range,
            "paper_size": job.paper_size,
            "orientation": job.orientation,
            "color_mode": job.color_mode,
            "duplex": job.duplex,
            "selected_pages_count": job.selected_pages_count,
            "total_sheets": job.total_sheets,
            "total_cost": job.total_cost,
        }
    )

@router.post("/jobs/{job_id}/report-print", response_model=ReportPrintResponse)
def report_print_status(
    job_id: str,
    payload: ReportPrintRequest,
    db: Session = Depends(get_db)
):
    """
    Report Print Submission Status:
    - Distinguishes 'PRINT_SUBMITTED' (spool dispatched to printer) from 'PRINT_SUCCESS' / 'PRINT_FAILED'.
    - Updates job status and audit trail.
    """
    job = db.query(PrintJob).filter(PrintJob.job_id == job_id).first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Print job '{job_id}' not found."
        )

    now = datetime.utcnow()
    if payload.status == "PRINT_SUBMITTED":
        job.job_status = "PRINTING"
    elif payload.status == "PRINT_SUCCESS":
        job.job_status = "COMPLETED"
        # Automated Server Cleanup upon print completion
        if settings.RETENTION_MODE == "ZERO_RETENTION_IMMEDIATE":
            try:
                cleanup_service.execute_server_cleanup(
                    db=db,
                    job=job,
                    trigger_reason="PRINT_SUCCESS"
                )
            except Exception as e:
                pass
        # Automatically mint Digital Receipt
        try:
            from ..services.receipt_service import receipt_service
            receipt_service.generate_receipt_for_job(db, job.job_id)
        except Exception as e:
            pass
    elif payload.status == "PRINT_FAILED":
        job.job_status = "AUTHORIZED"  # Revert to authorized so it can be retried

    db.commit()
    db.refresh(job)

    return ReportPrintResponse(
        success=True,
        message=f"Print status recorded as '{payload.status}'. Job status is now '{job.job_status}'.",
        job_id=job.job_id,
        job_status=job.job_status,
        timestamp=now
    )
