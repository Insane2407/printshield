from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .config import settings
from .database import engine, Base, get_db, ensure_schema_migrations
from .models import PrintJob
from .routers import jobs, station, cleanup
from .security.encryption import encryption_manager
from .security.validator import calculate_sha256

# Initialize SQLite database schema and migrate missing columns
Base.metadata.create_all(bind=engine)
ensure_schema_migrations(engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Privacy-First Cybercafé Printing API with AES-256-GCM Zero-Retention Storage",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS configuration to allow local Vite frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(jobs.router)
app.include_router(station.router)
app.include_router(cleanup.router)

@app.get("/")
def root():
    return {
        "service": "PrintShield Backend API",
        "status": "online",
        "encryption": "AES-256-GCM Authenticated",
        "docs": "/docs"
    }

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "database": "sqlite_connected",
        "storage": "isolated_private_vault",
        "master_key": "configured"
    }

@app.get("/api/jobs/{job_id}/verify-decryption")
def verify_job_decryption(job_id: str, db: Session = Depends(get_db)):
    """
    Cryptographic Integrity Verification Test Endpoint:
    Decrypts the stored AES-256-GCM ciphertext in memory and verifies that
    the decrypted file's SHA-256 hash matches the recorded document_hash bit-for-bit.
    Never writes plaintext to disk.
    """
    job = db.query(PrintJob).filter(PrintJob.job_id == job_id).first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job {job_id} not found."
        )

    try:
        decrypted_bytes = encryption_manager.decrypt_document(job.job_id, job.key_id)
        decrypted_hash = calculate_sha256(decrypted_bytes)
        
        matches = (decrypted_hash == job.document_hash)
        
        return {
            "job_id": job.job_id,
            "filename": job.original_filename,
            "recorded_sha256": job.document_hash,
            "decrypted_sha256": decrypted_hash,
            "integrity_verified": matches,
            "decrypted_size_bytes": len(decrypted_bytes),
            "is_valid_pdf_magic": decrypted_bytes.startswith(b"%PDF-"),
            "status": "PASSED" if matches else "FAILED"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Decryption verification failed: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.API_HOST, port=settings.API_PORT, reload=True)
