import os
import re
import hashlib
from typing import Tuple
from fastapi import HTTPException, status, UploadFile
from ..config import settings

def sanitize_filename(filename: str) -> str:
    """
    Sanitize filename to prevent path traversal and shell injection.
    Only allows alphanumeric, hyphens, underscores, and dots.
    """
    if not filename:
        return "unnamed_document.pdf"

    # Strip directory path
    base = os.path.basename(filename)
    
    # Remove null bytes and path traversal patterns
    base = base.replace("\x00", "").replace("..", "")
    
    # Retain safe characters
    clean = re.sub(r"[^a-zA-Z0-9_\-\.]", "_", base)
    
    # Enforce pdf extension
    if not clean.lower().endswith(".pdf"):
        clean += ".pdf"
        
    return clean[:200]

def calculate_sha256(data: bytes) -> str:
    """Compute SHA-256 hex digest of file bytes."""
    hasher = hashlib.sha256()
    hasher.update(data)
    return hasher.hexdigest()

def validate_pdf_content(file_bytes: bytes, filename: str) -> Tuple[bool, str]:
    """
    Validate that the file is an authentic PDF and within size bounds.
    """
    # 1. Size Check
    size = len(file_bytes)
    if size == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File is empty (0 bytes). Upload aborted."
        )

    if size > settings.MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum allowed size of {settings.MAX_FILE_SIZE_BYTES // (1024 * 1024)} MB."
        )

    # 2. Magic Number Check: Authentic PDF header begins with %PDF-
    if not file_bytes.startswith(b"%PDF-"):
        # Some scanners allow whitespace/BOM before %PDF- in first 1024 bytes
        header_sample = file_bytes[:1024]
        if b"%PDF-" not in header_sample:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Security validation failed: File does not have a valid PDF header (%PDF-). Polyglot/non-PDF rejected."
            )

    # 3. Filename extension check
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file extension. Only .pdf files are accepted."
        )

    return True, "Valid authentic PDF"
