"""
PrintShield Dedicated Print Station Agent Launcher
Usage:
  python run_station_agent.py             # Launches the Desktop GUI Application
  python run_station_agent.py --test      # Runs the End-to-End Test Suite
  python run_station_agent.py --code <code> # CLI mode to redeem and print a job
"""

import sys
import argparse
from pathlib import Path

# Add project root to sys.path
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

def main():
    parser = argparse.ArgumentParser(description="PrintShield Dedicated Print Station Agent")
    parser.add_argument("--test", action="store_true", help="Run automated end-to-end station test suite")
    parser.add_argument("--code", type=str, help="Redeem a specific QR token or 6-digit PIN from CLI")
    parser.add_argument("--printer", type=str, default="Microsoft Print to PDF", help="Target Windows printer")
    args = parser.parse_args()

    if args.test:
        from station_agent.test_agent_pipeline import run_e2e_test
        run_e2e_test()
        return

    if args.code:
        from station_agent.client import station_client
        from station_agent.security import station_security
        from station_agent.printer import printer_service
        from station_agent.config import config

        print(f"[*] PrintShield Station: {config.STATION_ID}")
        print(f"[*] Redeeming Token: '{args.code}'...")
        try:
            res = station_client.redeem_token(args.code)
            job_id = res.get("job_id")
            print(f"[+] Token REDEEMED. Job {job_id} is AUTHORIZED.")
            print(f"    Document: {res.get('document_name')}")
            print(f"    Pages: {res.get('total_pages')}, Copies: {res.get('copies')}")

            print(f"[*] Downloading encrypted payload for {job_id}...")
            dl = station_client.download_encrypted_job(job_id)

            print(f"[*] Decrypting locally in restricted temporary vault...")
            ok, temp_path, calc_hash, msg = station_security.decrypt_payload_to_temp(
                encrypted_payload_b64=dl["encrypted_payload_b64"],
                doc_key_b64=dl["doc_key_b64"],
                job_id=job_id,
                filename=dl["original_filename"],
                expected_hash=dl["document_hash"]
            )
            if not ok:
                print(f"[-] Decryption/Integrity Error: {msg}")
                sys.exit(1)

            print(f"[+] Decrypted successfully. SHA-256 match verified: {calc_hash}")

            # Report submission
            station_client.report_print_status(job_id, "PRINT_SUBMITTED", args.printer)

            # Print
            print(f"[*] Spooling to '{args.printer}'...")
            print_ok, print_msg, out_path = printer_service.print_to_windows_spool(
                pdf_path=temp_path,
                job_id=job_id,
                printer_name=args.printer
            )
            if not print_ok:
                print(f"[-] Print failed: {print_msg}")
                station_client.report_print_status(job_id, "PRINT_FAILED", args.printer, print_msg)
                sys.exit(1)

            print(f"[+] Print submitted successfully: {print_msg}")
            station_client.report_print_status(job_id, "PRINT_SUCCESS", args.printer, f"Output: {out_path.name if out_path else 'Spool complete'}")

            # Wipe temp
            station_security.secure_wipe_file(temp_path)
            print(f"[+] DoD 5220.22-M sanitization complete. Decrypted file wiped from disk.")
            print("[✓] JOB COMPLETED SUCCESSFULLY.")
        except Exception as e:
            print(f"[-] Error: {str(e)}")
            sys.exit(1)
        return

    # Default: Launch Tkinter Desktop Application
    from station_agent.app import main as launch_gui
    launch_gui()

if __name__ == "__main__":
    main()
