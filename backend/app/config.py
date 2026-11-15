import os
from pathlib import Path
from dotenv import load_dotenv

# Base backend directory
BASE_DIR = Path(__file__).resolve().parent.parent

# Load environment variables
load_dotenv(BASE_DIR / ".env")

class Settings:
    PROJECT_NAME: str = "PrintShield Backend"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = os.getenv("PRINTSHIELD_ENV", "development")
    API_HOST: str = os.getenv("API_HOST", "127.0.0.1")
    API_PORT: int = int(os.getenv("API_PORT", "8000"))

    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR / 'printshield.db'}")

    # File and Key Storage (Private, isolated from static web assets)
    STORAGE_DIR: Path = Path(os.getenv("STORAGE_DIR", str(BASE_DIR / "storage" / "encrypted_jobs"))).resolve()
    KEYS_DIR: Path = Path(os.getenv("KEYS_DIR", str(BASE_DIR / "storage" / "secure_keys"))).resolve()

    # Constraints
    MAX_FILE_SIZE_BYTES: int = int(os.getenv("MAX_FILE_SIZE_BYTES", str(25 * 1024 * 1024))) # 25 MB
    ALLOWED_EXTENSIONS: set = {"pdf"}

    # Retention Policy
    RETENTION_MODE: str = os.getenv("RETENTION_MODE", "ZERO_RETENTION_IMMEDIATE") # IMMEDIATE | EXPIRE_ONLY
    JOB_EXPIRATION_DEFAULT_MINUTES: int = int(os.getenv("JOB_EXPIRATION_DEFAULT_MINUTES", "60"))
    CLEANUP_DOD_WIPE: bool = True

    # Master Key (for encrypting keys in key store)
    MASTER_KEY_HEX: str = os.getenv(
        "MASTER_KEY_HEX",
        "c54f8e9102ab84d63e9f012845acde7193b4a2e587123490fdba123456789abc"
    )

    def init_storage(self):
        """Ensure secure private directories exist with restricted permissions."""
        self.STORAGE_DIR.mkdir(parents=True, exist_ok=True)
        self.KEYS_DIR.mkdir(parents=True, exist_ok=True)

settings = Settings()
settings.init_storage()
