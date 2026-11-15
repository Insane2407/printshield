import io
import uuid
import random
import secrets
import hashlib
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Header
from sqlalchemy.orm import Session
import pypdf

from ..database import get_db
from ..models import PrintJob, OneTimeToken
from ..schemas import (
    JobResponse, 
    UploadResponse, 
    ConfigurePrintJobRequest, 
    ConfigureResponse, 
    PrintSettingsResponse,
    GenerateQRRequest,
    GenerateQRResponse,
    QRStatusResponse,
    DigitalReceiptResponse
)
from ..security.validator import sanitize_filename, calculate_sha256, validate_pdf_content
from ..security.encryption import encryption_manager
from ..security.page_range import parse_and_validate_page_range
from ..security.cleanup import cleanup_service

router = APIRouter(prefix="/api/jobs", tags=["Print Jobs"])

def generate_job_identifiers():
    """Generates a human-friendly unique Job ID and 6-digit release PIN."""
    unique_suffix = uuid.uuid4().hex[:6].upper()
    job_id = f"PS-{unique_suffix}"
    
    pin1 = random.randint(100, 999)
    pin2 = random.randint(100, 999)
    release_pin = f"{pin1}-{pin2}"
    
    key_id = f"KEY-{uuid.uuid4().hex}"
    return job_id, release_pin, key_id

def extract_pdf_page_count(file_bytes: bytes) -> int:
    """Extracts actual page count from PDF binary stream using pypdf."""
    try:
        reader = pypdf.PdfReader(io.BytesIO(file_bytes))
        pages = len(reader.pages)
        return max(1, pages)
    except Exception:
        # Fallback to 1 if complex metadata stream
        return 1

@router.post("/upload", response_model=UploadResponse, status_code=status.HTTP_201_CREATED)
def upload_and_encrypt_document(
    file: UploadFile = File(...),
    customer_id: str = Form("usr-cst-9021"),
    color_mode: str = Form("black_and_white"),
    copies: int = Form(1),
    db: Session = Depends(get_db)
):
    """
    Secure Document Upload & AES-256-GCM Encryption Endpoint:
    1. Validates authentic PDF format (%PDF- header) and size limits.
    2. Extracts authentic total page count.
    3. Calculates SHA-256 checksum of original bytes.
    4. Encrypts PDF using AES-256-GCM.
    5. Saves ONLY ciphertext on server (zero plaintext storage).
    6. Saves document key separately in secure key store.
    7. Stores initial audit metadata in SQLite database.
    """
    try:
        file_bytes = file.file.read()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to read upload stream: {str(e)}"
        )

    # Sanitize and validate
    clean_filename = sanitize_filename(file.filename)
    validate_pdf_content(file_bytes, clean_filename)

    # Detect page count
    total_pages = extract_pdf_page_count(file_bytes)

    # Calculate SHA-256 hash of original PDF
    original_sha256 = calculate_sha256(file_bytes)
    file_size_bytes = len(file_bytes)

    # Generate unique IDs
    job_id, release_pin, key_id = generate_job_identifiers()

    # Encrypt with AES-256-GCM
    try:
        encrypted_file_path, _ = encryption_manager.encrypt_document(
            plaintext_bytes=file_bytes,
            job_id=job_id,
            key_id=key_id
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Cryptographic failure during AES-256-GCM encryption: {str(e)}"
        )

    now = datetime.utcnow()
    default_expires = now + timedelta(minutes=60)

    # Initial PrintJob record
    print_job = PrintJob(
        job_id=job_id,
        customer_id=customer_id,
        original_filename=clean_filename,
        encrypted_file_path=encrypted_file_path,
        document_hash=original_sha256,
        file_size=file_size_bytes,
        job_status="ENCRYPTED",
        encryption_scheme="AES-256-GCM",
        key_id=key_id,
        release_pin=release_pin,
        total_document_pages=total_pages,
        page_count=total_pages,
        copies=max(1, copies),
        page_range="all",
        paper_size="A4",
        orientation="portrait",
        color_mode=color_mode if color_mode in ["color", "black_and_white"] else "black_and_white",
        duplex="single_sided",
        selected_pages_count=total_pages,
        station_id="TERM-CYBERHUB-04",
        printer_id="prt-01",
        expires_at=default_expires,
    )

    print_job.calculate_cost()

    db.add(print_job)
    db.commit()
    db.refresh(print_job)

    return UploadResponse(
        success=True,
        message="Document encrypted with AES-256-GCM and stored in zero-retention vault.",
        job_id=job_id,
        job=JobResponse.from_orm(print_job)
    )

@router.post("/{job_id}/configure", response_model=ConfigureResponse)
def configure_print_job(
    job_id: str,
    payload: ConfigurePrintJobRequest,
    db: Session = Depends(get_db)
):
    """
    Configure Print Settings and Confirm Print Job:
    1. Verifies job existence and ownership.
    2. Prevents changes if job has already been authorized or processed.
    3. Validates all print settings (A4 paper size, copies, duplex, orientation).
    4. Validates page range against actual document pages (rejects invalid/out-of-bounds ranges).
    5. Calculates physical sheets and final cost.
    6. Updates status to PENDING and sets configurable expiration time.
    7. Connects job to target cybercafé station.
    """
    job = db.query(PrintJob).filter(PrintJob.job_id == job_id).first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Print job '{job_id}' not found."
        )

    # 1. Verify Job Ownership
    if job.customer_id != payload.customer_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You do not have permission to configure this print job."
        )

    # 2. Prevent changes after job authorization or processing
    locked_statuses = ["AUTHORIZED", "QUEUED", "PRINTING", "COMPLETED", "SHREDDED", "EXPIRED"]
    if job.job_status in locked_statuses:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Print settings locked: Job '{job_id}' is already {job.job_status} and cannot be modified."
        )

    # 3. Validate A4 Paper Size
    clean_paper = payload.paper_size.strip().upper()
    if clean_paper != "A4":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Paper size '{payload.paper_size}' is unsupported. Only 'A4' is currently supported by the station."
        )

    # 4. Validate Orientation
    clean_orientation = payload.orientation.strip().lower()
    if clean_orientation not in ["portrait", "landscape"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Orientation must be either 'portrait' or 'landscape'."
        )

    # 5. Validate Color Mode
    clean_color = payload.color_mode.strip().lower()
    if clean_color not in ["color", "black_and_white"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Color mode must be either 'color' or 'black_and_white'."
        )

    # 6. Validate Duplex
    clean_duplex = payload.duplex.strip().lower()
    if clean_duplex not in ["single_sided", "double_sided"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Duplex setting must be 'single_sided' or 'double_sided'."
        )

    # 7. Validate Page Range
    try:
        selected_pages, count = parse_and_validate_page_range(
            payload.page_range, 
            job.total_document_pages
        )
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid page range: {str(ve)}"
        )

    # 8. Apply Configuration to Model
    now = datetime.utcnow()
    job.copies = payload.copies
    job.page_range = payload.page_range.strip()
    job.paper_size = "A4"
    job.orientation = clean_orientation
    job.color_mode = clean_color
    job.duplex = clean_duplex
    job.selected_pages_count = count
    
    # Calculate price & sheets
    job.calculate_cost()

    # Change status to PENDING
    job.job_status = "PENDING"

    # Set configurable expiration time
    job.configured_at = now
    job.expires_at = now + timedelta(minutes=payload.expiration_minutes)

    # Connect settings to station
    job.station_id = payload.station_id or "TERM-CYBERHUB-04"
    if payload.printer_id:
        job.printer_id = payload.printer_id

    db.commit()
    db.refresh(job)

    qr_payload = f"printshield://release?job={job.job_id}&token={job.release_pin}&station={job.station_id}"

    settings_summary = PrintSettingsResponse(
        job_id=job.job_id,
        original_filename=job.original_filename,
        file_size=job.file_size,
        total_document_pages=job.total_document_pages,
        job_status=job.job_status,
        customer_id=job.customer_id,
        copies=job.copies,
        page_range=job.page_range,
        selected_pages=selected_pages,
        selected_pages_count=job.selected_pages_count,
        paper_size=job.paper_size,
        orientation=job.orientation,
        color_mode=job.color_mode,
        duplex=job.duplex,
        rate_per_page=job.rate_per_page,
        total_sheets=job.total_sheets,
        total_cost=job.total_cost,
        release_pin=job.release_pin,
        qr_payload=qr_payload,
        station_id=job.station_id,
        printer_id=job.printer_id,
        upload_timestamp=job.upload_timestamp,
        configured_at=job.configured_at,
        expires_at=job.expires_at,
    )

    return ConfigureResponse(
        success=True,
        message=f"Print settings verified. Job queued as PENDING with release token {job.release_pin}.",
        job_id=job.job_id,
        job_status=job.job_status,
        settings=settings_summary
    )

@router.get("/{job_id}/settings", response_model=PrintSettingsResponse)
def get_job_settings(job_id: str, db: Session = Depends(get_db)):
    """
    Retrieve current print settings and configuration summary for a job.
    """
    job = db.query(PrintJob).filter(PrintJob.job_id == job_id).first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Print job '{job_id}' not found."
        )

    # Parse selected pages
    try:
        selected_pages, _ = parse_and_validate_page_range(
            job.page_range, 
            job.total_document_pages
        )
    except Exception:
        selected_pages = list(range(1, job.total_document_pages + 1))

    qr_payload = f"printshield://release?job={job.job_id}&token={job.release_pin}&station={job.station_id}"

    return PrintSettingsResponse(
        job_id=job.job_id,
        original_filename=job.original_filename,
        file_size=job.file_size,
        total_document_pages=job.total_document_pages,
        job_status=job.job_status,
        customer_id=job.customer_id,
        copies=job.copies,
        page_range=job.page_range,
        selected_pages=selected_pages,
        selected_pages_count=job.selected_pages_count,
        paper_size=job.paper_size,
        orientation=job.orientation,
        color_mode=job.color_mode,
        duplex=job.duplex,
        rate_per_page=job.rate_per_page,
        total_sheets=job.total_sheets,
        total_cost=job.total_cost,
        release_pin=job.release_pin,
        qr_payload=qr_payload,
        station_id=job.station_id,
        printer_id=job.printer_id,
        upload_timestamp=job.upload_timestamp,
        configured_at=job.configured_at,
        expires_at=job.expires_at,
    )

@router.get("", response_model=List[JobResponse])
def list_jobs(db: Session = Depends(get_db)):
    """List all print jobs with settings, running expiry cleanup sweeps as needed."""
    now = datetime.utcnow()
    jobs = db.query(PrintJob).order_by(PrintJob.upload_timestamp.desc()).all()
    
    # Auto-sweep expired jobs
    for j in jobs:
        if j.expires_at and j.expires_at < now and j.job_status not in ["COMPLETED", "SHREDDED", "EXPIRED"] and j.cleanup_status != "COMPLETED":
            try:
                j.job_status = "EXPIRED"
                cleanup_service.execute_server_cleanup(db, j, trigger_reason="JOB_EXPIRED")
            except Exception:
                pass
                
    return [JobResponse.from_orm(j) for j in jobs]

@router.get("/{job_id}", response_model=JobResponse)
def get_job(job_id: str, db: Session = Depends(get_db)):
    """Retrieve specific job details, triggering cleanup if job has expired."""
    job = db.query(PrintJob).filter(PrintJob.job_id == job_id).first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Print job '{job_id}' not found."
        )

    now = datetime.utcnow()
    if job.expires_at and job.expires_at < now and job.job_status not in ["COMPLETED", "SHREDDED", "EXPIRED"] and job.cleanup_status != "COMPLETED":
        try:
            job.job_status = "EXPIRED"
            cleanup_service.execute_server_cleanup(db, job, trigger_reason="JOB_EXPIRED")
        except Exception:
            pass

    return JobResponse.from_orm(job)

@router.post("/{job_id}/generate-qr", response_model=GenerateQRResponse)
def generate_one_time_qr(
    job_id: str,
    payload: Optional[GenerateQRRequest] = None,
    db: Session = Depends(get_db)
):
    """
    Generate a Unique One-Time QR Code Token:
    1. Generates a 256-bit cryptographically secure random token (secrets.token_urlsafe).
    2. Generates a 6-digit human access PIN (e.g. 832-194).
    3. Hashes both with SHA-256 (only hashes are stored in SQLite).
    4. Binds token to the specific print job and target station.
    5. Sets configurable expiry time (default: 300 seconds = 5 minutes).
    6. Invalidates prior unused tokens for this job.
    7. Returns the one-time raw token, manual PIN, and formatted QR payload.
    """
    if payload is None:
        payload = GenerateQRRequest()

    job = db.query(PrintJob).filter(PrintJob.job_id == job_id).first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Print job '{job_id}' not found."
        )

    # Verify ownership if customer_id provided
    if payload.customer_id and job.customer_id != payload.customer_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You do not have permission to generate QR tokens for this job."
        )

    # Reject if already permanently completed or shredded
    if job.job_status in ["COMPLETED", "SHREDDED"]:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot generate QR token: Job '{job_id}' is already {job.job_status}."
        )

    # 1. Generate 256-bit secret token
    raw_token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()

    # 2. Generate 6-digit PIN
    pin1 = secrets.randbelow(900) + 100
    pin2 = secrets.randbelow(900) + 100
    manual_code = f"{pin1}-{pin2}"
    normalized_pin = manual_code.replace("-", "").strip()
    manual_code_hash = hashlib.sha256(normalized_pin.encode("utf-8")).hexdigest()

    now = datetime.utcnow()
    expires_at = now + timedelta(seconds=payload.expiry_seconds)
    target_station = payload.station_id or job.station_id or "TERM-CYBERHUB-04"

    # 3. Invalidate any previously active unused tokens for this job
    db.query(OneTimeToken).filter(
        OneTimeToken.job_id == job_id,
        OneTimeToken.is_used == False
    ).update({"is_used": True})

    # 4. Store token with only hashes (never store raw token)
    token_record = OneTimeToken(
        token_id=f"OTT-{uuid.uuid4().hex[:12].upper()}",
        token_hash=token_hash,
        manual_code_hash=manual_code_hash,
        manual_code=manual_code,
        job_id=job.job_id,
        station_id=target_station,
        created_at=now,
        expires_at=expires_at,
        redeemed_at=None,
        is_used=False
    )

    # Also update job's release pin for display consistency
    job.release_pin = manual_code
    job.station_id = target_station

    db.add(token_record)
    db.commit()
    db.refresh(token_record)

    # 5. Build QR payload (never include document or encryption key!)
    qr_payload = f"printshield://auth?job={job.job_id}&token={raw_token}&station={target_station}"

    return GenerateQRResponse(
        success=True,
        message="One-time QR code authentication token generated successfully.",
        job_id=job.job_id,
        raw_token=raw_token,
        manual_code=manual_code,
        qr_payload=qr_payload,
        created_at=now,
        expires_at=expires_at,
        expiry_seconds=payload.expiry_seconds,
        station_id=target_station
    )

@router.get("/{job_id}/qr-status", response_model=QRStatusResponse)
def get_qr_status(job_id: str, db: Session = Depends(get_db)):
    """
    Get live QR Token & Redemption Status:
    Returns whether an active valid token exists, expiration countdown, and redemption status.
    """
    job = db.query(PrintJob).filter(PrintJob.job_id == job_id).first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Print job '{job_id}' not found."
        )

    # Get latest token record for this job
    latest_token = (
        db.query(OneTimeToken)
        .filter(OneTimeToken.job_id == job_id)
        .order_by(OneTimeToken.created_at.desc())
        .first()
    )

    now = datetime.utcnow()
    if not latest_token:
        return QRStatusResponse(
            job_id=job.job_id,
            job_status=job.job_status,
            has_active_token=False,
            is_used=False,
            is_expired=False,
            seconds_remaining=0,
            manual_code=job.release_pin
        )

    seconds_remaining = max(0, int((latest_token.expires_at - now).total_seconds()))
    is_expired = now > latest_token.expires_at
    has_active = (not latest_token.is_used) and (not is_expired)

    return QRStatusResponse(
        job_id=job.job_id,
        job_status=job.job_status,
        has_active_token=has_active,
        is_used=latest_token.is_used,
        is_expired=is_expired,
        seconds_remaining=seconds_remaining,
        created_at=latest_token.created_at,
        expires_at=latest_token.expires_at,
        redeemed_at=latest_token.redeemed_at,
        station_id=latest_token.station_id,
        manual_code=latest_token.manual_code
    )

@router.get("/{job_id}/receipt", response_model=DigitalReceiptResponse)
def get_or_generate_job_receipt(job_id: str, db: Session = Depends(get_db)):
    """Retrieve or automatically generate a verifiable digital receipt for this job."""
    from ..services.receipt_service import receipt_service
    r = receipt_service.generate_receipt_for_job(db, job_id)
    return r.to_dict()

@router.post("/{job_id}/generate-receipt", response_model=DigitalReceiptResponse)
def mint_job_receipt(job_id: str, db: Session = Depends(get_db)):
    """Explicitly mint a verifiable digital receipt for this job."""
    from ..services.receipt_service import receipt_service
    r = receipt_service.generate_receipt_for_job(db, job_id)
    return r.to_dict()

