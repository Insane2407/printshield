import uuid
import random
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import PrintJob
from ..schemas import JobResponse, UploadResponse, JobListResponse
from ..security.validator import sanitize_filename, calculate_sha256, validate_pdf_content
from ..security.encryption import encryption_manager

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
    2. Calculates SHA-256 checksum of original bytes.
    3. Encrypts PDF using AES-256-GCM.
    4. Saves ONLY ciphertext on server (zero plaintext storage).
    5. Saves document key separately in secure key store.
    6. Stores audit metadata in SQLite database.
    """
    # 1. Read file bytes safely
    try:
        file_bytes = file.file.read()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to read upload stream: {str(e)}"
        )

    # 2. Sanitize and validate
    clean_filename = sanitize_filename(file.filename)
    validate_pdf_content(file_bytes, clean_filename)

    # 3. Calculate SHA-256 hash of original PDF
    original_sha256 = calculate_sha256(file_bytes)
    file_size_bytes = len(file_bytes)

    # 4. Generate unique IDs
    job_id, release_pin, key_id = generate_job_identifiers()

    # 5. Encrypt with AES-256-GCM
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

    # 6. Save metadata to SQLite
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
        page_count=max(1, file_size_bytes // (50 * 1024)), # heuristic page estimate
        copies=copies,
        color_mode=color_mode,
    )

    db.add(print_job)
    db.commit()
    db.refresh(print_job)

    return UploadResponse(
        success=True,
        message="Document encrypted with AES-256-GCM and stored in zero-retention vault.",
        job_id=job_id,
        job=JobResponse.from_orm(print_job)
    )

@router.get("", response_model=List[JobResponse])
def list_jobs(db: Session = Depends(get_db)):
    """
    List all print jobs (metadata only, keys are never exposed).
    """
    jobs = db.query(PrintJob).order_by(PrintJob.upload_timestamp.desc()).all()
    return [JobResponse.from_orm(j) for j in jobs]

@router.get("/{job_id}", response_model=JobResponse)
def get_job(job_id: str, db: Session = Depends(get_db)):
    """
    Retrieve specific job metadata and encryption status.
    """
    job = db.query(PrintJob).filter(PrintJob.job_id == job_id).first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Print job '{job_id}' not found."
        )
    return JobResponse.from_orm(job)
