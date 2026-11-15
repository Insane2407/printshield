from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker
from .config import settings

# SQLite connection args
connect_args = {"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {}

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    echo=False
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def ensure_schema_migrations(engine):
    """Auto-migrate columns for SQLite tables if schema evolves."""
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='print_jobs';"))
            if not result.fetchone():
                return
            
            cols_info = conn.execute(text("PRAGMA table_info(print_jobs);")).fetchall()
            existing_cols = {row[1] for row in cols_info}
            
            columns_to_add = [
                ("total_document_pages", "INTEGER DEFAULT 1 NOT NULL"),
                ("copies", "INTEGER DEFAULT 1 NOT NULL"),
                ("page_range", "VARCHAR(128) DEFAULT 'all' NOT NULL"),
                ("paper_size", "VARCHAR(32) DEFAULT 'A4' NOT NULL"),
                ("orientation", "VARCHAR(32) DEFAULT 'portrait' NOT NULL"),
                ("color_mode", "VARCHAR(32) DEFAULT 'black_and_white' NOT NULL"),
                ("duplex", "VARCHAR(32) DEFAULT 'single_sided' NOT NULL"),
                ("selected_pages_count", "INTEGER DEFAULT 1 NOT NULL"),
                ("total_sheets", "INTEGER DEFAULT 1 NOT NULL"),
                ("rate_per_page", "FLOAT DEFAULT 0.15 NOT NULL"),
                ("total_cost", "FLOAT DEFAULT 0.15 NOT NULL"),
                ("expires_at", "DATETIME"),
                ("configured_at", "DATETIME"),
                ("station_id", "VARCHAR(64) DEFAULT 'TERM-CYBERHUB-04' NOT NULL"),
                ("printer_id", "VARCHAR(64) DEFAULT 'prt-01'"),
                ("shredded_at", "DATETIME"),
                ("shredding_hash", "VARCHAR(128)"),
                ("cleanup_status", "VARCHAR(32) DEFAULT 'PENDING' NOT NULL"),
                ("cleanup_timestamp", "DATETIME"),
                ("cleanup_details", "TEXT")
            ]
            
            for col_name, col_def in columns_to_add:
                if col_name not in existing_cols:
                    conn.execute(text(f"ALTER TABLE print_jobs ADD COLUMN {col_name} {col_def};"))

            # Ensure one_time_tokens table exists
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS one_time_tokens (
                    token_id VARCHAR(64) PRIMARY KEY,
                    token_hash VARCHAR(64) UNIQUE NOT NULL,
                    manual_code_hash VARCHAR(64) NOT NULL,
                    manual_code VARCHAR(16) NOT NULL,
                    job_id VARCHAR(64) NOT NULL,
                    station_id VARCHAR(64) NOT NULL,
                    created_at DATETIME NOT NULL,
                    expires_at DATETIME NOT NULL,
                    redeemed_at DATETIME,
                    is_used BOOLEAN NOT NULL DEFAULT 0
                );
            """))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_one_time_tokens_token_hash ON one_time_tokens (token_hash);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_one_time_tokens_manual_code_hash ON one_time_tokens (manual_code_hash);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_one_time_tokens_job_id ON one_time_tokens (job_id);"))

            # Ensure cleanup_reports table exists
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS cleanup_reports (
                    report_id VARCHAR(64) PRIMARY KEY,
                    job_id VARCHAR(64) NOT NULL,
                    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
                    trigger_reason VARCHAR(64) NOT NULL DEFAULT 'PRINT_COMPLETED',
                    initiated_at DATETIME NOT NULL,
                    completed_at DATETIME,
                    server_encrypted_file_deleted BOOLEAN NOT NULL DEFAULT 0,
                    server_encrypted_file_path VARCHAR(512),
                    server_key_file_deleted BOOLEAN NOT NULL DEFAULT 0,
                    server_key_file_path VARCHAR(512),
                    server_tokens_invalidated_count INTEGER NOT NULL DEFAULT 0,
                    station_decrypted_file_deleted BOOLEAN NOT NULL DEFAULT 0,
                    station_decrypted_file_path VARCHAR(512),
                    station_temp_files_deleted_count INTEGER NOT NULL DEFAULT 0,
                    station_job_data_cleared BOOLEAN NOT NULL DEFAULT 0,
                    deleted_items_count INTEGER NOT NULL DEFAULT 0,
                    failed_items_count INTEGER NOT NULL DEFAULT 0,
                    errors_json TEXT,
                    summary TEXT
                );
            """))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_cleanup_reports_job_id ON cleanup_reports (job_id);"))

            # Ensure digital_receipts table exists
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS digital_receipts (
                    receipt_id VARCHAR(64) PRIMARY KEY,
                    job_id VARCHAR(64) NOT NULL,
                    customer_id VARCHAR(64) NOT NULL,
                    original_filename VARCHAR(255) NOT NULL,
                    document_hash VARCHAR(64) NOT NULL,
                    station_id VARCHAR(64) NOT NULL,
                    upload_timestamp DATETIME NOT NULL,
                    qr_redemption_timestamp DATETIME,
                    print_submission_status VARCHAR(32) NOT NULL DEFAULT 'PRINT_SUCCESS',
                    server_cleanup_status VARCHAR(32) NOT NULL DEFAULT 'COMPLETED',
                    station_cleanup_status VARCHAR(32) NOT NULL DEFAULT 'COMPLETED',
                    cleanup_status VARCHAR(32) NOT NULL DEFAULT 'COMPLETED',
                    document_integrity_status VARCHAR(32) NOT NULL DEFAULT 'VERIFIED',
                    total_pages INTEGER NOT NULL DEFAULT 1,
                    copies INTEGER NOT NULL DEFAULT 1,
                    total_sheets INTEGER NOT NULL DEFAULT 1,
                    color_mode VARCHAR(32) NOT NULL DEFAULT 'black_and_white',
                    total_cost FLOAT NOT NULL DEFAULT 0.15,
                    canonical_data TEXT NOT NULL,
                    receipt_hash VARCHAR(64) NOT NULL,
                    signature VARCHAR(256) NOT NULL,
                    signer_public_key VARCHAR(128) NOT NULL,
                    created_at DATETIME NOT NULL
                );
            """))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_digital_receipts_job_id ON digital_receipts (job_id);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_digital_receipts_customer_id ON digital_receipts (customer_id);"))

            conn.commit()
    except Exception as e:
        print(f"[Warning] Auto-migration check: {e}")

def get_db():
    """Dependency yielding a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
