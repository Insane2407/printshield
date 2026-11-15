from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Response
from fastapi.responses import Response
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import DigitalReceipt, PrintJob
from ..schemas import (
    DigitalReceiptResponse,
    VerifyReceiptRequest,
    VerifyReceiptResponse
)
from ..services.receipt_service import receipt_service
from ..security.signing import signing_service

router = APIRouter(prefix="/api/receipts", tags=["Digital Receipts & Audit"])

@router.get("", response_model=List[DigitalReceiptResponse])
def list_receipts(db: Session = Depends(get_db)):
    """List all minted digital receipts."""
    receipts = db.query(DigitalReceipt).order_by(DigitalReceipt.created_at.desc()).all()
    res = []
    for r in receipts:
        res.append(DigitalReceiptResponse(
            receipt_id=r.receipt_id,
            job_id=r.job_id,
            customer_id=r.customer_id,
            original_filename=r.original_filename,
            document_hash=r.document_hash,
            station_id=r.station_id,
            upload_timestamp=r.upload_timestamp,
            qr_redemption_timestamp=r.qr_redemption_timestamp,
            print_submission_status=r.print_submission_status,
            server_cleanup_status=r.server_cleanup_status,
            station_cleanup_status=r.station_cleanup_status,
            cleanup_status=r.cleanup_status,
            document_integrity_status=r.document_integrity_status,
            job_parameters={
                "total_pages": r.total_pages,
                "copies": r.copies,
                "total_sheets": r.total_sheets,
                "color_mode": r.color_mode,
                "total_cost": r.total_cost,
            },
            canonical_data=r.canonical_data,
            receipt_hash=r.receipt_hash,
            signature=r.signature,
            signer_public_key=r.signer_public_key,
            created_at=r.created_at
        ))
    return res

@router.get("/public-key")
def get_signer_public_key():
    """Returns the server's Ed25519 public key for independent offline audit verification."""
    return {
        "algorithm": "Ed25519",
        "public_key_hex": signing_service.public_key_hex,
        "public_key_pem": signing_service.public_key_pem,
        "authority": "PrintShield Root Cryptographic Signer",
    }

@router.get("/{receipt_id}", response_model=DigitalReceiptResponse)
def get_receipt(receipt_id: str, db: Session = Depends(get_db)):
    """Retrieve a specific digital receipt by receipt_id or job_id."""
    clean_id = receipt_id.strip()
    r = db.query(DigitalReceipt).filter(
        (DigitalReceipt.receipt_id == clean_id) |
        (DigitalReceipt.job_id == clean_id)
    ).first()

    if not r:
        # If job exists, attempt on-demand minting
        job = db.query(PrintJob).filter(PrintJob.job_id == clean_id).first()
        if job:
            r = receipt_service.generate_receipt_for_job(db, job.job_id)
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Digital receipt '{receipt_id}' not found."
            )

    return DigitalReceiptResponse(
        receipt_id=r.receipt_id,
        job_id=r.job_id,
        customer_id=r.customer_id,
        original_filename=r.original_filename,
        document_hash=r.document_hash,
        station_id=r.station_id,
        upload_timestamp=r.upload_timestamp,
        qr_redemption_timestamp=r.qr_redemption_timestamp,
        print_submission_status=r.print_submission_status,
        server_cleanup_status=r.server_cleanup_status,
        station_cleanup_status=r.station_cleanup_status,
        cleanup_status=r.cleanup_status,
        document_integrity_status=r.document_integrity_status,
        job_parameters={
            "total_pages": r.total_pages,
            "copies": r.copies,
            "total_sheets": r.total_sheets,
            "color_mode": r.color_mode,
            "total_cost": r.total_cost,
        },
        canonical_data=r.canonical_data,
        receipt_hash=r.receipt_hash,
        signature=r.signature,
        signer_public_key=r.signer_public_key,
        created_at=r.created_at
    )

@router.get("/{receipt_id}/download-pdf")
def download_pdf_receipt(receipt_id: str, db: Session = Depends(get_db)):
    """
    Generate & Download Official PDF Receipt Certificate:
    Renders ReportLab PDF with verifiable audit trail, hashes, and Ed25519 signature.
    """
    clean_id = receipt_id.strip()
    r = db.query(DigitalReceipt).filter(
        (DigitalReceipt.receipt_id == clean_id) |
        (DigitalReceipt.job_id == clean_id)
    ).first()

    if not r:
        job = db.query(PrintJob).filter(PrintJob.job_id == clean_id).first()
        if job:
            r = receipt_service.generate_receipt_for_job(db, job.job_id)
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Digital receipt '{receipt_id}' not found."
            )

    pdf_bytes = receipt_service.get_pdf_for_receipt(r)

    filename = f"PrintShield_Receipt_{r.receipt_id}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Cache-Control": "no-cache"
        }
    )

@router.post("/verify", response_model=VerifyReceiptResponse)
def verify_receipt(payload: VerifyReceiptRequest, db: Session = Depends(get_db)):
    """
    Cryptographic Receipt Verification:
    - Verifies Ed25519 digital signature
    - Recomputes SHA-256 canonical hash
    - Confirms document SHA-256 integrity status
    """
    result = receipt_service.verify_receipt_authenticity(
        db=db,
        receipt_id=payload.receipt_id,
        canonical_data=payload.canonical_data,
        signature=payload.signature,
        public_key=payload.public_key
    )

    return VerifyReceiptResponse(
        is_valid=result["is_valid"],
        receipt_id=result.get("receipt_id"),
        job_id=result.get("job_id"),
        document_integrity=result.get("document_integrity", "UNKNOWN"),
        document_hash=result.get("document_hash"),
        hash_valid=result.get("hash_valid", False),
        signature_valid=result.get("signature_valid", False),
        print_submission_status=result.get("print_submission_status"),
        server_cleanup_status=result.get("server_cleanup_status"),
        station_cleanup_status=result.get("station_cleanup_status"),
        cleanup_status=result.get("cleanup_status"),
        signer_public_key=result.get("signer_public_key"),
        message=result["message"],
        disclaimer=result["disclaimer"],
        receipt=result.get("receipt")
    )
