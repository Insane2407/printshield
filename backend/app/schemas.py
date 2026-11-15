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
