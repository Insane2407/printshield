from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field

class ConfigurePrintJobRequest(BaseModel):
    customer_id: str = Field(..., description="Customer ID for ownership verification")
    copies: int = Field(1, ge=1, le=50, description="Number of copies (1-50)")
    page_range: str = Field("all", description="Page range: 'all', '1-5', '1,3,5'")
    paper_size: str = Field("A4", description="Paper size: must be 'A4'")
    orientation: str = Field("portrait", description="Orientation: 'portrait' or 'landscape'")
    color_mode: str = Field("black_and_white", description="'black_and_white' or 'color'")
    duplex: str = Field("single_sided", description="'single_sided' or 'double_sided'")
    expiration_minutes: int = Field(60, ge=5, le=1440, description="TTL in minutes (5-1440)")
    station_id: Optional[str] = Field("TERM-CYBERHUB-04", description="Target Cybercafé Kiosk Station")
    printer_id: Optional[str] = Field("prt-01", description="Assigned hardware spooler")

class PrintSettingsResponse(BaseModel):
    job_id: str
    original_filename: str
    file_size: int
    total_document_pages: int
    job_status: str
    customer_id: str
    
    # Configuration
    copies: int
    page_range: str
    selected_pages: List[int]
    selected_pages_count: int
    paper_size: str
    orientation: str
    color_mode: str
    duplex: str
    
    # Cost & Operational Summary
    rate_per_page: float
    total_sheets: int
    total_cost: float
    
    # Kiosk Access
    release_pin: str
    qr_payload: str
    station_id: str
    printer_id: Optional[str]
    
    # Timestamps
    upload_timestamp: datetime
    configured_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None

class ConfigureResponse(BaseModel):
    success: bool = True
    message: str
    job_id: str
    job_status: str
    settings: PrintSettingsResponse

class JobResponse(BaseModel):
    job_id: str
    customer_id: str
    original_filename: str
    document_hash: str
    file_size: int
    upload_timestamp: datetime
    job_status: str
    encryption_scheme: str
    release_pin: str
    total_document_pages: int
    copies: int
    page_range: str
    paper_size: str
    orientation: str
    color_mode: str
    duplex: str
    selected_pages_count: int
    total_sheets: int
    total_cost: float
    station_id: str
    printer_id: Optional[str] = None
    expires_at: Optional[datetime] = None
    configured_at: Optional[datetime] = None
    shredded_at: Optional[datetime] = None
    shredding_hash: Optional[str] = None
    cleanup_status: str = "PENDING"
    cleanup_timestamp: Optional[datetime] = None
    cleanup_details: Optional[str] = None

    class Config:
        from_attributes = True

class UploadResponse(BaseModel):
    success: bool = True
    message: str = "Document encrypted and queued securely."
    job_id: str
    job: JobResponse

class JobListResponse(BaseModel):
    total: int
    jobs: List[JobResponse]

# One-Time QR Code Authentication Schemas
class GenerateQRRequest(BaseModel):
    customer_id: Optional[str] = Field("usr-cst-9021", description="Customer ID for ownership verification")
    expiry_seconds: int = Field(300, ge=30, le=3600, description="Expiration TTL in seconds (default 300 = 5 min)")
    station_id: Optional[str] = Field("TERM-CYBERHUB-04", description="Target Cybercafé Kiosk Station")

class GenerateQRResponse(BaseModel):
    success: bool = True
    message: str = "Unique one-time QR authentication token generated."
    job_id: str
    raw_token: str
    manual_code: str
    qr_payload: str
    created_at: datetime
    expires_at: datetime
    expiry_seconds: int
    station_id: str

class RedeemTokenRequest(BaseModel):
    station_id: str = Field("TERM-CYBERHUB-04", description="Print Station Terminal Identifier")
    token: Optional[str] = Field(None, description="Raw one-time secret token from QR code")
    manual_code: Optional[str] = Field(None, description="6-digit manual access PIN")
    qr_payload: Optional[str] = Field(None, description="Raw scanned QR payload or URI")

class RedeemTokenResponse(BaseModel):
    success: bool = True
    message: str = "One-time token validated and redeemed. Job authorized for release."
    job_id: str
    job_status: str
    redeemed_at: datetime
    station_id: str
    document_name: str
    total_pages: int
    copies: int
    total_sheets: int
    color_mode: str
    total_cost: float

class QRStatusResponse(BaseModel):
    job_id: str
    job_status: str
    has_active_token: bool
    is_used: bool
    is_expired: bool
    seconds_remaining: int
    created_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    redeemed_at: Optional[datetime] = None
    station_id: Optional[str] = None
    manual_code: Optional[str] = None

# Station Agent Download & Reporting Schemas
class EncryptedDownloadResponse(BaseModel):
    success: bool = True
    job_id: str
    original_filename: str
    document_hash: str
    file_size: int
    encrypted_payload_b64: str
    doc_key_b64: str
    settings: dict

class ReportPrintRequest(BaseModel):
    station_id: str = "TERM-CYBERHUB-04"
    status: str = Field("PRINT_SUBMITTED", description="PRINT_SUBMITTED, PRINT_SUCCESS, or PRINT_FAILED")
    printer_name: str = "Microsoft Print to PDF"
    details: Optional[str] = "Print submission dispatched to hardware spool"

class ReportPrintResponse(BaseModel):
    success: bool = True
    message: str
    job_id: str
    job_status: str
    timestamp: datetime

# =========================================================================
# Cleanup Workflow Schemas
# =========================================================================
class StationCleanupReportRequest(BaseModel):
    station_id: str = "TERM-CYBERHUB-04"
    decrypted_file_deleted: bool = True
    decrypted_file_path: Optional[str] = None
    temp_files_deleted_count: int = 0
    job_data_cleared: bool = True
    errors: List[str] = []

class CleanupReportResponse(BaseModel):
    success: bool = True
    message: str
    report_id: str
    job_id: str
    status: str  # PENDING, CLEANING, COMPLETED, PARTIALLY_COMPLETED, FAILED
    trigger_reason: str
    initiated_at: datetime
    completed_at: Optional[datetime] = None
    server: dict
    station: dict
    deleted_items_count: int
    failed_items_count: int
    errors: List[str]
    summary: str
    shredding_hash: Optional[str] = None

class TriggerCleanupRequest(BaseModel):
    reason: Optional[str] = "MANUAL_RETRY"

class SweepExpiredResponse(BaseModel):
    success: bool = True
    message: str
    scanned_jobs_count: int
    cleaned_jobs_count: int
    reports: List[dict]



