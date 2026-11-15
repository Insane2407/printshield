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

    # Sanitization Audit
    shredded_at = Column(DateTime, nullable=True)
    shredding_hash = Column(String(128), nullable=True)

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
        }
