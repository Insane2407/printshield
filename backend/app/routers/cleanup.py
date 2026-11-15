import json
from typing import Optional, List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import PrintJob, CleanupReport
from ..schemas import (
    CleanupReportResponse,
    TriggerCleanupRequest,
    SweepExpiredResponse,
    StationCleanupReportRequest
)
from ..security.cleanup import cleanup_service

router = APIRouter(prefix="/api", tags=["Cleanup & Retention"])

def format_cleanup_report_response(report: CleanupReport, job: PrintJob) -> CleanupReportResponse:
    errors = []
    if report.errors_json:
        try:
            errors = json.loads(report.errors_json)
        except Exception:
            errors = [report.errors_json]

    return CleanupReportResponse(
        success=True,
        message=f"Cleanup audit retrieved. Current status: {report.status}",
        report_id=report.report_id,
        job_id=report.job_id,
        status=report.status,
        trigger_reason=report.trigger_reason,
        initiated_at=report.initiated_at,
        completed_at=report.completed_at,
        server={
            "encrypted_file_deleted": report.server_encrypted_file_deleted,
            "encrypted_file_path": report.server_encrypted_file_path,
            "key_file_deleted": report.server_key_file_deleted,
            "key_file_path": report.server_key_file_path,
            "tokens_invalidated_count": report.server_tokens_invalidated_count,
        },
        station={
            "decrypted_file_deleted": report.station_decrypted_file_deleted,
            "decrypted_file_path": report.station_decrypted_file_path,
            "temp_files_deleted_count": report.station_temp_files_deleted_count,
            "job_data_cleared": report.station_job_data_cleared,
        },
        deleted_items_count=report.deleted_items_count,
        failed_items_count=report.failed_items_count,
        errors=errors,
        summary=report.summary or "",
        shredding_hash=job.shredding_hash
    )

@router.post("/jobs/{job_id}/cleanup", response_model=CleanupReportResponse)
def trigger_job_cleanup(
    job_id: str,
    payload: Optional[TriggerCleanupRequest] = None,
    db: Session = Depends(get_db)
):
    """
    Trigger Manual / Automatic Cleanup for a specific Print Job:
    1. Validates that the job exists.
    2. Runs secure deletion of temporary encrypted ciphertext and wrapped key.
    3. Invalidates all active access tokens.
    4. Records DoD 5220.22-M audit record and timestamps.
    5. Returns transparent report of files verified absent.
    """
    job = db.query(PrintJob).filter(PrintJob.job_id == job_id).first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Print job '{job_id}' not found."
        )

    reason = payload.reason if payload else "MANUAL_RETRY"

    report = cleanup_service.execute_server_cleanup(
        db=db,
        job=job,
        trigger_reason=reason
    )

    return format_cleanup_report_response(report, job)

@router.get("/jobs/{job_id}/cleanup-report", response_model=CleanupReportResponse)
def get_cleanup_report(
    job_id: str,
    db: Session = Depends(get_db)
):
    """
    Get Verified Cleanup Report:
    Returns the latest audit record showing the exact deletion status,
    timestamps, and verified absence of PrintShield-managed files.
    """
    job = db.query(PrintJob).filter(PrintJob.job_id == job_id).first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Print job '{job_id}' not found."
        )

    # Find latest report
    report = (
        db.query(CleanupReport)
        .filter(CleanupReport.job_id == job_id)
        .order_by(CleanupReport.initiated_at.desc())
        .first()
    )

    if not report:
        # If no report yet, create initial PENDING view
        now = datetime.utcnow()
        return CleanupReportResponse(
            success=True,
            message="Job cleanup is currently PENDING.",
            report_id=f"PENDING-{job.job_id}",
            job_id=job.job_id,
            status=job.cleanup_status or "PENDING",
            trigger_reason="AWAITING_TRIGGER",
            initiated_at=job.upload_timestamp,
            completed_at=None,
            server={
                "encrypted_file_deleted": False,
                "encrypted_file_path": job.encrypted_file_path,
                "key_file_deleted": False,
                "key_file_path": f"keys/{job.key_id}.key",
                "tokens_invalidated_count": 0,
            },
            station={
                "decrypted_file_deleted": False,
                "decrypted_file_path": None,
                "temp_files_deleted_count": 0,
                "job_data_cleared": False,
            },
            deleted_items_count=0,
            failed_items_count=0,
            errors=[],
            summary="Cleanup has not run yet. Files remain secured in encrypted vault.",
            shredding_hash=None
        )

    return format_cleanup_report_response(report, job)

@router.post("/station/jobs/{job_id}/report-cleanup", response_model=CleanupReportResponse)
def report_station_cleanup(
    job_id: str,
    payload: StationCleanupReportRequest,
    db: Session = Depends(get_db)
):
    """
    Print Station Cleanup Report Submission:
    - Station agent reports the destruction of the decrypted PDF and scratch temp files.
    - Server verifies and executes server-side cleanup.
    - Correlates both environments into one comprehensive CleanupReport.
    """
    job = db.query(PrintJob).filter(PrintJob.job_id == job_id).first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Print job '{job_id}' not found."
        )

    report = cleanup_service.execute_server_cleanup(
        db=db,
        job=job,
        trigger_reason="STATION_PRINT_COMPLETED",
        station_report_data=payload.dict()
    )

    # Automatically generate / refresh digital receipt
    try:
        from ..services.receipt_service import receipt_service
        receipt_service.generate_receipt_for_job(db, job.job_id)
    except Exception:
        pass

    return format_cleanup_report_response(report, job)

@router.post("/cleanup/sweep-expired", response_model=SweepExpiredResponse)
def sweep_expired_print_jobs(db: Session = Depends(get_db)):
    """
    Execute Retention Sweep on Expired Jobs:
    Automatically searches for print jobs whose TTL has expired and purges
    their encrypted documents, keys, and tokens.
    """
    reports = cleanup_service.sweep_expired_jobs(db)

    return SweepExpiredResponse(
        success=True,
        message=f"Retention sweep finished. {len(reports)} expired jobs cleaned.",
        scanned_jobs_count=len(reports),
        cleaned_jobs_count=len(reports),
        reports=[r.to_dict() for r in reports]
    )
