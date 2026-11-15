import httpx
from typing import Tuple, Dict, Any, Optional
from .config import config

class StationBackendClient:
    """
    HTTP Client communicating with the PrintShield FastAPI Backend:
    - Verifies connectivity.
    - Submits one-time QR tokens and manual PINs for redemption.
    - Downloads encrypted payloads (enforcing token authorization checks).
    - Reports print submission and completion status.
    """

    def __init__(self, base_url: Optional[str] = None, station_id: Optional[str] = None):
        self.base_url = (base_url or config.BACKEND_URL).rstrip("/")
        self.station_id = station_id or config.STATION_ID

    def check_connection(self) -> Tuple[bool, str]:
        """Checks if the PrintShield FastAPI backend is reachable and healthy."""
        try:
            with httpx.Client(timeout=4.0) as client:
                res = client.get(f"{self.base_url}/")
                if res.status_code == 200:
                    data = res.json()
                    service = data.get("service", "PrintShield Backend")
                    enc = data.get("encryption", "AES-256-GCM")
                    return True, f"Connected to {service} ({enc})"
                return False, f"Backend returned HTTP {res.status_code}"
        except httpx.ConnectError:
            return False, f"Cannot connect to {self.base_url}. Ensure FastAPI is running."
        except Exception as e:
            return False, f"Connection error: {str(e)}"

    def redeem_token(self, token_or_code: str) -> Dict[str, Any]:
        """
        Sends the scanned QR payload, token, or manual 6-digit PIN to the backend.
        Returns authorization response dict or raises ValueError on rejection.
        """
        payload = {
            "station_id": self.station_id,
        }

        clean = token_or_code.strip()
        if clean.startswith("printshield://"):
            payload["qr_payload"] = clean
        elif len(clean.replace("-", "").replace(" ", "")) == 6 and clean.replace("-", "").isdigit():
            payload["manual_code"] = clean
        else:
            payload["token"] = clean

        with httpx.Client(timeout=10.0) as client:
            res = client.post(f"{self.base_url}/api/station/redeem", json=payload)
            if res.status_code == 200:
                return res.json()

            # Extract detailed backend error message
            error_detail = f"HTTP {res.status_code}"
            try:
                err_json = res.json()
                if "detail" in err_json:
                    error_detail = err_json["detail"]
            except Exception:
                pass

            raise ValueError(error_detail)

    def download_encrypted_job(self, job_id: str) -> Dict[str, Any]:
        """
        Downloads encrypted PDF ciphertext and unwrapped document key from backend.
        Only succeeds if job has already been AUTHORIZED via token redemption.
        """
        with httpx.Client(timeout=15.0) as client:
            res = client.get(
                f"{self.base_url}/api/station/jobs/{job_id}/download-encrypted",
                params={"station_id": self.station_id}
            )
            if res.status_code == 200:
                return res.json()

            error_detail = f"HTTP {res.status_code}"
            try:
                err_json = res.json()
                if "detail" in err_json:
                    error_detail = err_json["detail"]
            except Exception:
                pass

            raise PermissionError(error_detail)

    def report_print_status(
        self,
        job_id: str,
        status: str,
        printer_name: str = "Microsoft Print to PDF",
        details: str = "Dispatched via Windows Spooler"
    ) -> Dict[str, Any]:
        """
        Reports print submission status ('PRINT_SUBMITTED', 'PRINT_SUCCESS', 'PRINT_FAILED').
        """
        payload = {
            "station_id": self.station_id,
            "status": status,
            "printer_name": printer_name,
            "details": details
        }
        with httpx.Client(timeout=8.0) as client:
            res = client.post(f"{self.base_url}/api/station/jobs/{job_id}/report-print", json=payload)
            if res.status_code == 200:
                return res.json()

            error_detail = f"HTTP {res.status_code}"
            try:
                err_json = res.json()
                if "detail" in err_json:
                    error_detail = err_json["detail"]
            except Exception:
                pass
            raise RuntimeError(error_detail)

    def report_station_cleanup(
        self,
        job_id: str,
        decrypted_file_deleted: bool,
        decrypted_file_path: Optional[str] = None,
        temp_files_deleted_count: int = 0,
        job_data_cleared: bool = True,
        errors: Optional[list] = None
    ) -> Dict[str, Any]:
        """
        Sends station-side cleanup results to the backend.
        Backend correlates station file deletion with server encrypted file & key deletion.
        """
        payload = {
            "station_id": self.station_id,
            "decrypted_file_deleted": decrypted_file_deleted,
            "decrypted_file_path": decrypted_file_path,
            "temp_files_deleted_count": temp_files_deleted_count,
            "job_data_cleared": job_data_cleared,
            "errors": errors or []
        }
        with httpx.Client(timeout=8.0) as client:
            res = client.post(f"{self.base_url}/api/station/jobs/{job_id}/report-cleanup", json=payload)
            if res.status_code == 200:
                return res.json()

            error_detail = f"HTTP {res.status_code}"
            try:
                err_json = res.json()
                if "detail" in err_json:
                    error_detail = err_json["detail"]
            except Exception:
                pass
            raise RuntimeError(error_detail)

    def get_cleanup_report(self, job_id: str) -> Dict[str, Any]:
        """Fetches the latest verified cleanup report from backend."""
        with httpx.Client(timeout=8.0) as client:
            res = client.get(f"{self.base_url}/api/jobs/{job_id}/cleanup-report")
            if res.status_code == 200:
                return res.json()
            raise RuntimeError(f"HTTP {res.status_code}")

    def retry_cleanup(self, job_id: str, reason: str = "MANUAL_RETRY") -> Dict[str, Any]:
        """Triggers manual cleanup retry on the backend."""
        with httpx.Client(timeout=10.0) as client:
            res = client.post(
                f"{self.base_url}/api/jobs/{job_id}/cleanup",
                json={"reason": reason}
            )
            if res.status_code == 200:
                return res.json()
            raise RuntimeError(f"HTTP {res.status_code}")

station_client = StationBackendClient()
