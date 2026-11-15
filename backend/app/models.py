from datetime import datetime, timedelta
from sqlalchemy import Column, String, Integer, Float, DateTime, Boolean
from .database import Base

class PrintJob(Base):
    __tablename__ = "print_jobs"

    job_id = Column(String(64), primary_key=True, index=True)
    customer_id = Column(String(64), index=True, nullable=False)
    original_filename = Column(String(255), nullable=False)
    encrypted_file_path = Column(String(512), nullable=False)
    document_hash = Column(String(64), nullable=False, index=True)  # SHA-256
    file_size = Column(Integer, nullable=False)  # in bytes
    upload_timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    job_status = Column(String(32), default="ENCRYPTED", nullable=False)
    # Statuses: ENCRYPTED -> PENDING -> AUTHORIZED -> QUEUED -> PRINTING -> COMPLETED -> SHREDDED / EXPIRED

    # Cryptographic & Security Keys
    encryption_scheme = Column(String(32), default="AES-256-GCM", nullable=False)
    key_id = Column(String(64), nullable=False)
    release_pin = Column(String(16), nullable=False, index=True)

    # Document Geometry & Actual Detected Pages
    page_count = Column(Integer, default=1, nullable=False)
    total_document_pages = Column(Integer, default=1, nullable=False)

    # Print Configuration Settings
    copies = Column(Integer, default=1, nullable=False)
    page_range = Column(String(128), default="all", nullable=False)
    paper_size = Column(String(32), default="A4", nullable=False)  # Enforced A4
    orientation = Column(String(32), default="portrait", nullable=False)  # portrait | landscape
    color_mode = Column(String(32), default="black_and_white", nullable=False)  # color | black_and_white
    duplex = Column(String(32), default="single_sided", nullable=False)  # single_sided | double_sided
    
    # Financial & Operational Metrics
    selected_pages_count = Column(Integer, default=1, nullable=False)
    total_sheets = Column(Integer, default=1, nullable=False)
    rate_per_page = Column(Float, default=0.15, nullable=False)
    total_cost = Column(Float, default=0.15, nullable=False)

    # Expiration & Station Routing
    expires_at = Column(DateTime, nullable=True)
    configured_at = Column(DateTime, nullable=True)
    station_id = Column(String(64), default="TERM-CYBERHUB-04", nullable=False)
    printer_id = Column(String(64), default="prt-01", nullable=True)

    # Sanitization & Cleanup Audit
    shredded_at = Column(DateTime, nullable=True)
    shredding_hash = Column(String(128), nullable=True)
    cleanup_status = Column(String(32), default="PENDING", nullable=False) # PENDING | CLEANING | COMPLETED | PARTIALLY_COMPLETED | FAILED
    cleanup_timestamp = Column(DateTime, nullable=True)
    cleanup_details = Column(String, nullable=True)

    def calculate_cost(self) -> float:
        """Calculates price based on color mode, copies, and page count."""
        rate = 0.30 if self.color_mode == "color" else 0.15
        self.rate_per_page = rate
        
        # Calculate physical sheets
        pages_per_copy = self.selected_pages_count
        if self.duplex == "double_sided":
            sheets_per_copy = (pages_per_copy + 1) // 2
        else:
            sheets_per_copy = pages_per_copy
            
        self.total_sheets = sheets_per_copy * self.copies
        self.total_cost = round(self.selected_pages_count * self.copies * rate, 2)
        return self.total_cost

    def to_dict(self):
        return {
            "job_id": self.job_id,
            "customer_id": self.customer_id,
            "original_filename": self.original_filename,
            "document_hash": self.document_hash,
            "file_size": self.file_size,
            "upload_timestamp": self.upload_timestamp.isoformat() if self.upload_timestamp else None,
            "job_status": self.job_status,
            "encryption_scheme": self.encryption_scheme,
            "release_pin": self.release_pin,
            "total_document_pages": self.total_document_pages,
            "settings": {
                "copies": self.copies,
                "page_range": self.page_range,
                "paper_size": self.paper_size,
                "orientation": self.orientation,
                "color_mode": self.color_mode,
                "duplex": self.duplex,
                "selected_pages_count": self.selected_pages_count,
                "total_sheets": self.total_sheets,
                "rate_per_page": self.rate_per_page,
                "total_cost": self.total_cost,
                "station_id": self.station_id,
                "printer_id": self.printer_id,
                "configured_at": self.configured_at.isoformat() if self.configured_at else None,
                "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            },
            "shredded_at": self.shredded_at.isoformat() if self.shredded_at else None,
            "shredding_hash": self.shredding_hash,
            "cleanup_status": self.cleanup_status or "PENDING",
            "cleanup_timestamp": self.cleanup_timestamp.isoformat() if self.cleanup_timestamp else None,
            "cleanup_details": self.cleanup_details,
        }

class OneTimeToken(Base):
    __tablename__ = "one_time_tokens"

    token_id = Column(String(64), primary_key=True, index=True)
    token_hash = Column(String(64), unique=True, index=True, nullable=False)   # SHA-256 of raw secret token
    manual_code_hash = Column(String(64), index=True, nullable=False)         # SHA-256 of normalized 6-digit PIN
    manual_code = Column(String(16), nullable=False)                          # Display PIN, e.g. "482-910"
    job_id = Column(String(64), index=True, nullable=False)
    station_id = Column(String(64), default="TERM-CYBERHUB-04", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    redeemed_at = Column(DateTime, nullable=True)
    is_used = Column(Boolean, default=False, nullable=False)

    def to_dict(self):
        return {
            "token_id": self.token_id,
            "token_hash": self.token_hash,
            "manual_code": self.manual_code,
            "job_id": self.job_id,
            "station_id": self.station_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "redeemed_at": self.redeemed_at.isoformat() if self.redeemed_at else None,
            "is_used": self.is_used,
        }

class CleanupReport(Base):
    __tablename__ = "cleanup_reports"

    report_id = Column(String(64), primary_key=True, index=True)
    job_id = Column(String(64), index=True, nullable=False)
    status = Column(String(32), default="PENDING", nullable=False)  # PENDING, CLEANING, COMPLETED, PARTIALLY_COMPLETED, FAILED
    trigger_reason = Column(String(64), default="PRINT_COMPLETED", nullable=False)  # PRINT_COMPLETED, JOB_EXPIRED, MANUAL_RETRY, RETENTION_POLICY
    initiated_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    completed_at = Column(DateTime, nullable=True)

    # Server-Side Removal Verifications
    server_encrypted_file_deleted = Column(Boolean, default=False, nullable=False)
    server_encrypted_file_path = Column(String(512), nullable=True)
    server_key_file_deleted = Column(Boolean, default=False, nullable=False)
    server_key_file_path = Column(String(512), nullable=True)
    server_tokens_invalidated_count = Column(Integer, default=0, nullable=False)

    # Print Station Removal Verifications
    station_decrypted_file_deleted = Column(Boolean, default=False, nullable=False)
    station_decrypted_file_path = Column(String(512), nullable=True)
    station_temp_files_deleted_count = Column(Integer, default=0, nullable=False)
    station_job_data_cleared = Column(Boolean, default=False, nullable=False)

    # Aggregates & Transparency
    deleted_items_count = Column(Integer, default=0, nullable=False)
    failed_items_count = Column(Integer, default=0, nullable=False)
    errors_json = Column(String, nullable=True)
    summary = Column(String, nullable=True)

    def to_dict(self):
        return {
            "report_id": self.report_id,
            "job_id": self.job_id,
            "status": self.status,
            "trigger_reason": self.trigger_reason,
            "initiated_at": self.initiated_at.isoformat() if self.initiated_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "server": {
                "encrypted_file_deleted": self.server_encrypted_file_deleted,
                "encrypted_file_path": self.server_encrypted_file_path,
                "key_file_deleted": self.server_key_file_deleted,
                "key_file_path": self.server_key_file_path,
                "tokens_invalidated_count": self.server_tokens_invalidated_count,
            },
            "station": {
                "decrypted_file_deleted": self.station_decrypted_file_deleted,
                "decrypted_file_path": self.station_decrypted_file_path,
                "temp_files_deleted_count": self.station_temp_files_deleted_count,
                "job_data_cleared": self.station_job_data_cleared,
            },
            "deleted_items_count": self.deleted_items_count,
            "failed_items_count": self.failed_items_count,
            "errors_json": self.errors_json,
            "summary": self.summary,
        }


