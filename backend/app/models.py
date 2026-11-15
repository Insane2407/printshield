from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime
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

    # Cryptographic & Operational Metadata
    encryption_scheme = Column(String(32), default="AES-256-GCM", nullable=False)
    key_id = Column(String(64), nullable=False)
    release_pin = Column(String(16), nullable=False, index=True)
    page_count = Column(Integer, default=1, nullable=False)
    copies = Column(Integer, default=1, nullable=False)
    color_mode = Column(String(32), default="black_and_white", nullable=False)
    
    # Sanitization Audit
    shredded_at = Column(DateTime, nullable=True)
    shredding_hash = Column(String(128), nullable=True)

    def to_dict(self):
        return {
            "job_id": self.job_id,
            "customer_id": self.customer_id,
            "original_filename": self.original_filename,
            "encrypted_file_path": self.encrypted_file_path,
            "document_hash": self.document_hash,
            "file_size": self.file_size,
            "upload_timestamp": self.upload_timestamp.isoformat() if self.upload_timestamp else None,
            "job_status": self.job_status,
            "encryption_scheme": self.encryption_scheme,
            "release_pin": self.release_pin,
            "page_count": self.page_count,
            "copies": self.copies,
            "color_mode": self.color_mode,
            "shredded_at": self.shredded_at.isoformat() if self.shredded_at else None,
            "shredding_hash": self.shredding_hash,
        }
