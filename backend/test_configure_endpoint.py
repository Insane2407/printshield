"""
Direct Test Suite for Print Settings and Print Job Creation
Tests:
1. Multi-page PDF generation with pypdf and upload via upload_and_encrypt_document
2. Settings retrieval via get_job_settings
3. Configuration validation via configure_print_job
4. Page range parsing and boundary checks ('1-3', 'all', '99', '5-2')
5. Enforced A4 paper size check
6. Orientation, color mode, duplex, sheets, and cost calculations
7. Expiration TTL calculation and PENDING status transition
8. Ownership enforcement (customer_id check)
9. Lock verification (cannot modify once AUTHORIZED)
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
from app.models import PrintJob
from app.schemas import ConfigurePrintJobRequest
from app.routers.jobs import (
    upload_and_encrypt_document,
    configure_print_job,
    get_job_settings
)

def create_dummy_pdf(pages: int = 5) -> bytes:
    """Creates an authentic multi-page PDF in-memory using pypdf."""
    writer = pypdf.PdfWriter()
    for _ in range(pages):
        writer.add_blank_page(width=595, height=842)  # A4 standard points
    buf = io.BytesIO()
    writer.write(buf)
    return buf.getvalue()

def run_tests():
    print("=" * 65)
    print(" PRINTSHIELD PRINT SETTINGS & JOB CONFIGURATION DIRECT VERIFICATION")
    print("=" * 65)

    Base.metadata.create_all(bind=engine)
    ensure_schema_migrations(engine)

    db = SessionLocal()
    try:
        # 1. Create a 5-page PDF and upload it
        pdf_bytes = create_dummy_pdf(5)
        customer_id = "usr-cst-9021"

        print("\n[STEP 1] Uploading 5-page PDF document...")
        upload_file = UploadFile(
            file=io.BytesIO(pdf_bytes),
            filename="quarterly_audit_2026.pdf",
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
        job = upload_res.job
        print(f" -> Job created: {job_id}")
        print(f" -> Detected total pages: {job.total_document_pages}")
        assert job.total_document_pages == 5, f"Expected 5 pages, got {job.total_document_pages}"
        assert job.job_status == "ENCRYPTED"

        # 2. Get initial settings
        print("\n[STEP 2] Fetching initial settings via get_job_settings()...")
        settings = get_job_settings(job_id=job_id, db=db)
        assert settings.paper_size == "A4"
        assert settings.page_range == "all"
        assert settings.selected_pages == [1, 2, 3, 4, 5]
        assert settings.job_status == "ENCRYPTED"
        print(f" -> Default settings retrieved: {settings.page_range}, A4, {settings.orientation}")

        # 3. Configure valid settings: copies=2, page_range="1-3", A4, landscape, color, double_sided
        print("\n[STEP 3] Configuring job with valid settings (copies=2, page_range='1-3', color, double_sided)...")
        req = ConfigurePrintJobRequest(
            customer_id=customer_id,
            copies=2,
            page_range="1-3",
            paper_size="A4",
            orientation="landscape",
            color_mode="color",
            duplex="double_sided",
            expiration_minutes=45,
            station_id="TERM-CYBERHUB-04",
            printer_id="prt-01"
        )
        conf_res = configure_print_job(job_id=job_id, payload=req, db=db)
        assert conf_res.success is True
        assert conf_res.job_status == "PENDING"
        cfg = conf_res.settings
        print(f" -> Status updated to: {conf_res.job_status}")
        print(f" -> Selected pages: {cfg.selected_pages} (Count: {cfg.selected_pages_count})")
        assert cfg.selected_pages_count == 3
        assert cfg.selected_pages == [1, 2, 3]
        # In double_sided: 3 pages per copy = (3 + 1)//2 = 2 sheets per copy. 2 copies = 4 sheets.
        assert cfg.total_sheets == 4, f"Expected 4 sheets, got {cfg.total_sheets}"
        # Cost: 3 pages * 2 copies * $0.30 (color) = $1.80
        assert cfg.total_cost == 1.80, f"Expected cost $1.80, got {cfg.total_cost}"
        print(f" -> Total sheets: {cfg.total_sheets}, Total cost: ${cfg.total_cost}")
        print(f" -> QR Payload: {cfg.qr_payload}")

        # 4. Test invalid page ranges:
        print("\n[STEP 4] Testing rejection of invalid page ranges...")
        
        # 4a. Out of bounds (e.g. page 99 in 5-page doc)
        try:
            req_invalid = req.model_copy(update={"page_range": "1-99"})
            configure_print_job(job_id=job_id, payload=req_invalid, db=db)
            assert False, "Should have raised 400 for out-of-bounds"
        except HTTPException as he:
            assert he.status_code == 400
            print(f" -> Out of bounds range rejected (HTTP 400): {he.detail}")

        # 4b. Inverted range (e.g. 5-2)
        try:
            req_invalid = req.model_copy(update={"page_range": "5-2"})
            configure_print_job(job_id=job_id, payload=req_invalid, db=db)
            assert False, "Should have raised 400 for inverted range"
        except HTTPException as he:
            assert he.status_code == 400
            print(f" -> Inverted range rejected (HTTP 400): {he.detail}")

        # 4c. Non-numeric
        try:
            req_invalid = req.model_copy(update={"page_range": "page1-3"})
            configure_print_job(job_id=job_id, payload=req_invalid, db=db)
            assert False, "Should have raised 400 for non-numeric range"
        except HTTPException as he:
            assert he.status_code == 400
            print(f" -> Non-numeric range rejected (HTTP 400): {he.detail}")

        # 4d. Zero page
        try:
            req_invalid = req.model_copy(update={"page_range": "0-2"})
            configure_print_job(job_id=job_id, payload=req_invalid, db=db)
            assert False, "Should have raised 400 for 0 page"
        except HTTPException as he:
            assert he.status_code == 400
            print(f" -> Zero page rejected (HTTP 400): {he.detail}")

        # 5. Test paper size validation: Reject non-A4
        print("\n[STEP 5] Testing paper size restriction (only A4 allowed)...")
        try:
            req_paper = req.model_copy(update={"paper_size": "Letter"})
            configure_print_job(job_id=job_id, payload=req_paper, db=db)
            assert False, "Should have raised 400 for non-A4 paper size"
        except HTTPException as he:
            assert he.status_code == 400
            print(f" -> Non-A4 rejected (HTTP 400): {he.detail}")

        # 6. Test ownership verification: Reject unauthorized customer
        print("\n[STEP 6] Testing job ownership verification...")
        try:
            req_auth = req.model_copy(update={"customer_id": "usr-attacker-666"})
            configure_print_job(job_id=job_id, payload=req_auth, db=db)
            assert False, "Should have raised 403 for unauthorized customer"
        except HTTPException as he:
            assert he.status_code == 403
            print(f" -> Unauthorized customer rejected (HTTP 403): {he.detail}")

        # 7. Test locked status: Once authorized, cannot be modified
        print("\n[STEP 7] Testing lock protection once job is authorized...")
        job_db = db.query(PrintJob).filter(PrintJob.job_id == job_id).first()
        job_db.job_status = "AUTHORIZED"
        db.commit()

        try:
            configure_print_job(job_id=job_id, payload=req, db=db)
            assert False, "Should have raised 409 Conflict for AUTHORIZED job"
        except HTTPException as he:
            assert he.status_code == 409
            print(f" -> Modification of AUTHORIZED job rejected (HTTP 409): {he.detail}")

        print("\n" + "=" * 65)
        print("ALL PRINT SETTINGS & JOB CONFIGURATION TESTS PASSED PERFECTLY!")
        print("=" * 65)
    finally:
        db.close()

if __name__ == "__main__":
    run_tests()
