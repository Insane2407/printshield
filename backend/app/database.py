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
                ("shredding_hash", "VARCHAR(128)")
            ]
            
            for col_name, col_def in columns_to_add:
                if col_name not in existing_cols:
                    conn.execute(text(f"ALTER TABLE print_jobs ADD COLUMN {col_name} {col_def};"))
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
