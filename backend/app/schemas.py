from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field

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
    page_count: int
    copies: int
    color_mode: str
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
