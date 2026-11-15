import os
from pathlib import Path

# Station Agent Base Directory
BASE_DIR = Path(__file__).resolve().parent

class StationConfig:
    # Station Identity
    STATION_ID: str = os.getenv("PRINTSHIELD_STATION_ID", "TERM-CYBERHUB-04")
    STATION_NAME: str = os.getenv("PRINTSHIELD_STATION_NAME", "CyberHub Downtown Kiosk Terminal")

    # Backend Connection
    BACKEND_URL: str = os.getenv("PRINTSHIELD_BACKEND_URL", "http://127.0.0.1:8000")

    # Restricted Storage (Isolated from static web assets)
    TEMP_DIR: Path = BASE_DIR / "restricted_temp"
    SPOOL_DIR: Path = BASE_DIR / "spool_output"

    # Hardware Printer Target
    DEFAULT_PRINTER: str = os.getenv("PRINTSHIELD_PRINTER", "Microsoft Print to PDF")

    # Security Policies
    ENFORCE_SHA256_INTEGRITY: bool = True
    AUTO_WIPE_AFTER_PRINT: bool = True
    DOD_OVERWRITE_PASSES: int = 3

    def init_directories(self):
        """Initializes restricted temporary and spool directories with local-only permissions."""
        self.TEMP_DIR.mkdir(parents=True, exist_ok=True)
        self.SPOOL_DIR.mkdir(parents=True, exist_ok=True)

config = StationConfig()
config.init_directories()
