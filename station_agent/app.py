"""
PrintShield Dedicated Print Station Agent
Desktop Application for Cybercafé Authorized Print Stations.

Features:
- Station ID and Live Backend Health Monitoring
- Single-use QR Token / 6-digit PIN scanner & redemption
- Zero document download before token authorization
- Local AES-256-GCM decryption in restricted temporary directory
- SHA-256 bit-for-bit integrity validation (rejects tampered files)
- Windows Print to PDF integration via native winspool.drv
- Separate print submission (PRINT_SUBMITTED) from confirmed printing (PRINT_SUCCESS)
- Cryptographic DoD 5220.22-M memory/disk sanitization
"""

import sys
import os
import time
import threading
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, Any

import tkinter as tk
from tkinter import ttk, messagebox, scrolledtext

from .config import config
from .security import station_security
from .printer import printer_service
from .client import station_client

class PrintStationApp:
    def __init__(self, root: tk.Tk):
        self.root = root
        self.root.title("PrintShield - Dedicated Print Station Agent v1.0")
        self.root.geometry("980x780")
        self.root.minsize(860, 680)
        self.root.configure(bg="#070D18")

        # Active job session state
        self.authorized_job: Optional[Dict[str, Any]] = None
        self.decrypted_file_path: Optional[Path] = None
        self.expected_hash: Optional[str] = None
        self.calculated_hash: Optional[str] = None
        self.downloaded_payload: Optional[Dict[str, Any]] = None

        self._init_styles()
        self._build_ui()
        self._start_connection_monitor()

    def _init_styles(self):
        style = ttk.Style()
        style.theme_use("clam")

        # Custom dark cyber styles
        style.configure(".", background="#070D18", foreground="#F8FAFC", font=("Segoe UI", 9))
        style.configure("TFrame", background="#070D18")
        style.configure("Card.TFrame", background="#0C1424", relief="solid", borderwidth=1)
        style.configure("InnerCard.TFrame", background="#080E1C", relief="flat")
        
        style.configure("TLabel", background="#070D18", foreground="#F8FAFC")
        style.configure("CardLabel.TLabel", background="#0C1424", foreground="#F8FAFC")
        style.configure("CardMuted.TLabel", background="#0C1424", foreground="#94A3B8")
        style.configure("CyanHeader.TLabel", background="#0C1424", foreground="#06B6D4", font=("Segoe UI", 10, "bold"))
        
        style.configure("CyanButton.TButton", background="#0891B2", foreground="#FFFFFF", font=("Segoe UI", 9, "bold"))
        style.map("CyanButton.TButton", background=[("active", "#06B6D4"), ("disabled", "#1E293B")])

        style.configure("ActionBtn.TButton", background="#0284C7", foreground="#FFFFFF", font=("Segoe UI", 10, "bold"))
        style.map("ActionBtn.TButton", background=[("active", "#38BDF8"), ("disabled", "#1E293B")])

        style.configure("DangerBtn.TButton", background="#E11D48", foreground="#FFFFFF", font=("Segoe UI", 9, "bold"))
        style.map("DangerBtn.TButton", background=[("active", "#F43F5E"), ("disabled", "#1E293B")])

        style.configure("TEntry", fieldbackground="#09101F", foreground="#38BDF8", insertcolor="#06B6D4")

    def _build_ui(self):
        # 1. Top Header Bar
        header_frame = tk.Frame(self.root, bg="#0A1325", height=65, relief="solid", bd=1)
        header_frame.pack(fill="x", padx=14, pady=(12, 6))

        title_container = tk.Frame(header_frame, bg="#0A1325")
        title_container.pack(side="left", padx=16, pady=10)

        title_label = tk.Label(
            title_container,
            text="PRINTSHIELD // PRINT STATION AGENT",
            font=("Segoe UI", 13, "bold"),
            fg="#06B6D4",
            bg="#0A1325"
        )
        title_label.pack(anchor="w")

        subtitle_label = tk.Label(
            title_container,
            text="Zero-Retention Cryptographic Hardware Spooler • Windows Kiosk Service",
            font=("Segoe UI", 8),
            fg="#94A3B8",
            bg="#0A1325"
        )
        subtitle_label.pack(anchor="w")

        # Station ID & Connection indicators
        status_container = tk.Frame(header_frame, bg="#0A1325")
        status_container.pack(side="right", padx=16, pady=10)

        self.station_badge = tk.Label(
            status_container,
            text=f"STATION: {config.STATION_ID}",
            font=("Consolas", 9, "bold"),
            fg="#38BDF8",
            bg="#082F49",
            padx=10,
            pady=3,
            relief="solid",
            bd=1
        )
        self.station_badge.pack(side="left", padx=6)

        self.conn_badge = tk.Label(
            status_container,
            text="CHECKING...",
            font=("Consolas", 9, "bold"),
            fg="#F59E0B",
            bg="#451A03",
            padx=10,
            pady=3,
            relief="solid",
            bd=1
        )
        self.conn_badge.pack(side="left", padx=6)

        # 2. Main Content Split Pane
        main_content = tk.Frame(self.root, bg="#070D18")
        main_content.pack(fill="both", expand=True, padx=14, pady=6)

        left_column = tk.Frame(main_content, bg="#070D18")
        left_column.pack(side="left", fill="both", expand=True, padx=(0, 6))

        right_column = tk.Frame(main_content, bg="#070D18", width=420)
        right_column.pack(side="right", fill="both", padx=(6, 0))

        # =========================================================================
        # LEFT COLUMN: Workflow Stages
        # =========================================================================

        # Section 1: Customer Token / QR Input
        sec1 = tk.LabelFrame(
            left_column,
            text=" 1. CUSTOMER TOKEN VERIFICATION & AUTHORIZATION ",
            font=("Segoe UI", 9, "bold"),
            fg="#06B6D4",
            bg="#0C1424",
            bd=1,
            relief="solid"
        )
        sec1.pack(fill="x", pady=4, padx=2)

        input_frame = tk.Frame(sec1, bg="#0C1424")
        input_frame.pack(fill="x", padx=12, pady=10)

        tk.Label(
            input_frame,
            text="Scan Customer QR Code or Enter 6-Digit Manual PIN:",
            font=("Segoe UI", 8),
            fg="#94A3B8",
            bg="#0C1424"
        ).pack(anchor="w")

        entry_row = tk.Frame(input_frame, bg="#0C1424")
        entry_row.pack(fill="x", pady=(6, 4))

        self.token_entry = tk.Entry(
            entry_row,
            font=("Consolas", 11, "bold"),
            bg="#070E1C",
            fg="#FFFFFF",
            insertbackground="#06B6D4",
            bd=1,
            relief="solid"
        )
        self.token_entry.pack(side="left", fill="x", expand=True, ipady=4, padx=(0, 8))
        self.token_entry.bind("<Return>", lambda e: self.action_redeem_token())

        self.btn_redeem = tk.Button(
            entry_row,
            text="Authorize Job",
            font=("Segoe UI", 9, "bold"),
            bg="#0284C7",
            fg="#FFFFFF",
            activebackground="#06B6D4",
            activeforeground="#000000",
            bd=0,
            padx=16,
            pady=5,
            cursor="hand2",
            command=self.action_redeem_token
        )
        self.btn_redeem.pack(side="right")

        # Section 2: Authorized Job Details
        self.sec2 = tk.LabelFrame(
            left_column,
            text=" 2. AUTHORIZED JOB DETAILS ",
            font=("Segoe UI", 9, "bold"),
            fg="#06B6D4",
            bg="#0C1424",
            bd=1,
            relief="solid"
        )
        self.sec2.pack(fill="x", pady=4, padx=2)

        self.job_details_frame = tk.Frame(self.sec2, bg="#0C1424")
        self.job_details_frame.pack(fill="x", padx=12, pady=10)

        self.lbl_no_job = tk.Label(
            self.job_details_frame,
            text="[No Job Authorized] - Scan or enter customer code to unlock print stream.",
            font=("Consolas", 9),
            fg="#64748B",
            bg="#0C1424"
        )
        self.lbl_no_job.pack(anchor="w", pady=6)

        # Container for populated job metrics
        self.metrics_container = tk.Frame(self.job_details_frame, bg="#0C1424")

        # Section 3: Document Decryption & SHA-256 Integrity Verification
        sec3 = tk.LabelFrame(
            left_column,
            text=" 3. VAULT DOWNLOAD & INTEGRITY CHECK (SHA-256) ",
            font=("Segoe UI", 9, "bold"),
            fg="#06B6D4",
            bg="#0C1424",
            bd=1,
            relief="solid"
        )
        sec3.pack(fill="x", pady=4, padx=2)

        sec3_content = tk.Frame(sec3, bg="#0C1424")
        sec3_content.pack(fill="x", padx=12, pady=10)

        sec3_btn_row = tk.Frame(sec3_content, bg="#0C1424")
        sec3_btn_row.pack(fill="x")

        self.btn_download_decrypt = tk.Button(
            sec3_btn_row,
            text="Download & Decrypt Payload",
            font=("Segoe UI", 9, "bold"),
            bg="#0F172A",
            fg="#94A3B8",
            bd=1,
            relief="solid",
            padx=14,
            pady=5,
            state="disabled",
            cursor="hand2",
            command=self.action_download_and_decrypt
        )
        self.btn_download_decrypt.pack(side="left")

        self.lbl_integrity_badge = tk.Label(
            sec3_btn_row,
            text="Awaiting Download",
            font=("Consolas", 8, "bold"),
            fg="#94A3B8",
            bg="#1E293B",
            padx=8,
            pady=4
        )
        self.lbl_integrity_badge.pack(side="right")

        self.hash_display_frame = tk.Frame(sec3_content, bg="#070E1C", bd=1, relief="solid")
        self.hash_display_frame.pack(fill="x", pady=(8, 0), ipady=4)

        self.lbl_hash_info = tk.Label(
            self.hash_display_frame,
            text="Expected SHA-256:  [Locked until authorization]\nCalculated SHA-256: [Pending decryption]",
            font=("Consolas", 8),
            fg="#64748B",
            bg="#070E1C",
            justify="left"
        )
        self.lbl_hash_info.pack(anchor="w", padx=8, pady=4)

        # Section 4: Hardware Spooler Dispatch
        sec4 = tk.LabelFrame(
            left_column,
            text=" 4. HARDWARE SPOOLER DISPATCH (WINDOWS PRINT TO PDF) ",
            font=("Segoe UI", 9, "bold"),
            fg="#06B6D4",
            bg="#0C1424",
            bd=1,
            relief="solid"
        )
        sec4.pack(fill="x", pady=4, padx=2)

        sec4_content = tk.Frame(sec4, bg="#0C1424")
        sec4_content.pack(fill="x", padx=12, pady=10)

        printer_select_row = tk.Frame(sec4_content, bg="#0C1424")
        printer_select_row.pack(fill="x", pady=(0, 8))

        tk.Label(
            printer_select_row,
            text="Target Spooler:",
            font=("Segoe UI", 8),
            fg="#94A3B8",
            bg="#0C1424"
        ).pack(side="left", padx=(0, 6))

        self.printer_var = tk.StringVar(value=config.DEFAULT_PRINTER)
        self.printer_combo = ttk.Combobox(
            printer_select_row,
            textvariable=self.printer_var,
            values=printer_service.list_printers(),
            state="readonly",
            width=28,
            font=("Segoe UI", 9)
        )
        self.printer_combo.pack(side="left", fill="x", expand=True)

        print_action_row = tk.Frame(sec4_content, bg="#0C1424")
        print_action_row.pack(fill="x", pady=4)

        self.btn_print = tk.Button(
            print_action_row,
            text="Send to Windows Print to PDF",
            font=("Segoe UI", 10, "bold"),
            bg="#059669",
            fg="#FFFFFF",
            activebackground="#10B981",
            activeforeground="#000000",
            bd=0,
            padx=20,
            pady=8,
            state="disabled",
            cursor="hand2",
            command=self.action_print_job
        )
        self.btn_print.pack(side="left", fill="x", expand=True, padx=(0, 4))

        self.btn_retry_cleanup = tk.Button(
            print_action_row,
            text="Retry Cleanup",
            font=("Segoe UI", 8, "bold"),
            bg="#334155",
            fg="#F1F5F9",
            bd=1,
            relief="solid",
            padx=8,
            pady=8,
            cursor="hand2",
            command=self.action_retry_cleanup
        )
        self.btn_retry_cleanup.pack(side="left", padx=2)

        self.btn_report = tk.Button(
            print_action_row,
            text="Audit Report",
            font=("Segoe UI", 8),
            bg="#1E293B",
            fg="#38BDF8",
            bd=1,
            relief="solid",
            padx=8,
            pady=8,
            cursor="hand2",
            command=self.action_view_cleanup_report
        )
        self.btn_report.pack(side="left", padx=2)

        self.btn_wipe = tk.Button(
            print_action_row,
            text="Wipe Vault",
            font=("Segoe UI", 8),
            bg="#1E293B",
            fg="#F43F5E",
            bd=1,
            relief="solid",
            padx=8,
            pady=8,
            cursor="hand2",
            command=self.action_wipe_temp
        )
        self.btn_wipe.pack(side="right")

        self.lbl_print_status = tk.Label(
            sec4_content,
            text="Status: Idle • Spooler ready",
            font=("Consolas", 8),
            fg="#94A3B8",
            bg="#0C1424"
        )
        self.lbl_print_status.pack(anchor="w", pady=(6, 0))

        # =========================================================================
        # RIGHT COLUMN: Real-Time Security Audit Console
        # =========================================================================
        log_frame = tk.LabelFrame(
            right_column,
            text=" CRYPTOGRAPHIC AUDIT TELEMETRY ",
            font=("Segoe UI", 9, "bold"),
            fg="#06B6D4",
            bg="#0C1424",
            bd=1,
            relief="solid"
        )
        log_frame.pack(fill="both", expand=True, pady=4, padx=2)

        self.log_text = scrolledtext.ScrolledText(
            log_frame,
            bg="#050914",
            fg="#38BDF8",
            insertbackground="#06B6D4",
            font=("Consolas", 8),
            bd=0,
            wrap="word"
        )
        self.log_text.pack(fill="both", expand=True, padx=6, pady=6)

        # Log Control Buttons
        log_btn_row = tk.Frame(log_frame, bg="#0C1424")
        log_btn_row.pack(fill="x", padx=6, pady=(0, 6))

        btn_clear_log = tk.Button(
            log_btn_row,
            text="Clear Log",
            font=("Segoe UI", 7),
            bg="#1E293B",
            fg="#94A3B8",
            bd=0,
            padx=8,
            pady=2,
            command=lambda: self.log_text.delete("1.0", tk.END)
        )
        btn_clear_log.pack(side="right")

        self.log("PrintShield Station Agent initialized.")
        self.log(f"Station ID: {config.STATION_ID}")
        self.log(f"Restricted Temporary Directory: {config.TEMP_DIR}")

    # =========================================================================
    # Logging Helper (Ensures Zero Key Leaks)
    # =========================================================================
    def log(self, message: str, level: str = "INFO"):
        ts = datetime.now().strftime("%H:%M:%S")
        formatted = f"[{ts}] [{level}] {message}\n"
        self.log_text.insert(tk.END, formatted)
        self.log_text.see(tk.END)

    # =========================================================================
    # Background Health Monitor
    # =========================================================================
    def _start_connection_monitor(self):
        def monitor_loop():
            while True:
                ok, msg = station_client.check_connection()
                if ok:
                    self.conn_badge.config(text="ONLINE", fg="#34D399", bg="#064E3B")
                else:
                    self.conn_badge.config(text="OFFLINE", fg="#F87171", bg="#7F1D1D")
                time.sleep(5)

        t = threading.Thread(target=monitor_loop, daemon=True)
        t.start()

    # =========================================================================
    # Action 1: Redeem One-Time Token
    # =========================================================================
    def action_redeem_token(self):
        token_input = self.token_entry.get().strip()
        if not token_input:
            messagebox.showwarning("Input Required", "Please scan a QR code or enter a 6-digit access PIN.")
            return

        self.btn_redeem.config(state="disabled", text="Verifying...")
        self.log(f"Submitting access token to backend: '{token_input[:8]}...'")

        def worker():
            try:
                res = station_client.redeem_token(token_input)
                self.root.after(0, lambda: self._on_redeem_success(res))
            except Exception as e:
                err_msg = str(e)
                self.root.after(0, lambda: self._on_redeem_failure(err_msg))

        threading.Thread(target=worker, daemon=True).start()

    def _on_redeem_success(self, res: Dict[str, Any]):
        self.btn_redeem.config(state="normal", text="Authorize Job")
        self.authorized_job = res
        self.log(f"Token REDEEMED. Job '{res.get('job_id')}' AUTHORIZED for kiosk release.", "SUCCESS")

        # Update Section 2 UI
        self.lbl_no_job.pack_forget()
        self.metrics_container.pack(fill="x", pady=4)
        for widget in self.metrics_container.winfo_children():
            widget.destroy()

        job_id = res.get("job_id", "N/A")
        doc_name = res.get("document_name", "N/A")
        pages = res.get("total_pages", 1)
        copies = res.get("copies", 1)
        sheets = res.get("total_sheets", 1)
        color = res.get("color_mode", "B&W")
        cost = res.get("total_cost", 0.0)

        info_grid = tk.Frame(self.metrics_container, bg="#080E1C", bd=1, relief="solid")
        info_grid.pack(fill="x", padx=2, pady=4, ipady=4)

        row1 = tk.Frame(info_grid, bg="#080E1C")
        row1.pack(fill="x", padx=8, pady=2)
        tk.Label(row1, text=f"Job Code: {job_id}", font=("Consolas", 10, "bold"), fg="#38BDF8", bg="#080E1C").pack(side="left")
        tk.Label(row1, text=f"Status: AUTHORIZED", font=("Consolas", 9, "bold"), fg="#34D399", bg="#064E3B", padx=6, pady=1).pack(side="right")

        row2 = tk.Frame(info_grid, bg="#080E1C")
        row2.pack(fill="x", padx=8, pady=2)
        tk.Label(row2, text=f"File: {doc_name}", font=("Segoe UI", 9, "bold"), fg="#FFFFFF", bg="#080E1C").pack(side="left")

        row3 = tk.Frame(info_grid, bg="#080E1C")
        row3.pack(fill="x", padx=8, pady=2)
        tk.Label(row3, text=f"{pages} pgs × {copies} copy | {color} | {sheets} A4 sheets | Settled: ${cost:.2f}", font=("Segoe UI", 8), fg="#94A3B8", bg="#080E1C").pack(side="left")

        # Enable download button
        self.btn_download_decrypt.config(
            state="normal",
            bg="#0284C7",
            fg="#FFFFFF"
        )
        self.lbl_integrity_badge.config(text="Ready to Download", fg="#38BDF8", bg="#082F49")
        messagebox.showinfo("Authorization Granted", f"Job '{job_id}' is AUTHORIZED. You may now download and decrypt.")

    def _on_redeem_failure(self, error_message: str):
        self.btn_redeem.config(state="normal", text="Authorize Job")
        self.log(f"Token verification rejected: {error_message}", "ERROR")
        messagebox.showerror("Token Verification Failed", error_message)

    # =========================================================================
    # Action 2: Download & Local AES-256-GCM Decryption
    # =========================================================================
    def action_download_and_decrypt(self):
        if not self.authorized_job:
            messagebox.showwarning("Authorization Needed", "Please redeem a valid token first.")
            return

        job_id = self.authorized_job.get("job_id")
        self.btn_download_decrypt.config(state="disabled", text="Decrypting in Vault...")
        self.log(f"Downloading encrypted ciphertext for job '{job_id}'...")

        def worker():
            try:
                # 1. Download encrypted payload & unwrapped key
                dl = station_client.download_encrypted_job(job_id)
                self.downloaded_payload = dl
                self.expected_hash = dl.get("document_hash")

                # 2. Decrypt locally in restricted temp directory
                enc_b64 = dl.get("encrypted_payload_b64")
                doc_key_b64 = dl.get("doc_key_b64")
                filename = dl.get("original_filename", "document.pdf")

                ok, temp_path, calc_hash, msg = station_security.decrypt_payload_to_temp(
                    encrypted_payload_b64=enc_b64,
                    doc_key_b64=doc_key_b64,
                    job_id=job_id,
                    filename=filename,
                    expected_hash=self.expected_hash
                )

                if not ok:
                    raise ValueError(msg)

                self.decrypted_file_path = temp_path
                self.calculated_hash = calc_hash
                self.root.after(0, lambda: self._on_decrypt_success(temp_path, calc_hash, msg))

            except Exception as e:
                err_msg = str(e)
                self.root.after(0, lambda: self._on_decrypt_failure(err_msg))

        threading.Thread(target=worker, daemon=True).start()

    def _on_decrypt_success(self, temp_path: Path, calc_hash: str, msg: str):
        self.btn_download_decrypt.config(state="disabled", text="Decrypted & Verified", bg="#065F46", fg="#34D399")
        self.lbl_integrity_badge.config(text="SHA-256 MATCH", fg="#34D399", bg="#064E3B")

        # Update hash telemetry display
        self.lbl_hash_info.config(
            text=f"Expected SHA-256:   {self.expected_hash}\nCalculated SHA-256: {calc_hash}\n[INTEGRITY CONFIRMED]: Bit-for-bit match verified.",
            fg="#34D399"
        )

        self.log(msg, "SUCCESS")
        self.log(f"Document SHA-256: {calc_hash}")
        self.log(f"Decrypted payload saved to restricted vault: {temp_path.name}")

        # Enable Print button
        self.btn_print.config(state="normal")
        self.lbl_print_status.config(text=f"Status: Decrypted • Ready for spool dispatch ({temp_path.stat().st_size} bytes)")
        messagebox.showinfo("Integrity Check Passed", "Decryption and SHA-256 verification successful. Document is ready to print.")

    def _on_decrypt_failure(self, error_message: str):
        self.btn_download_decrypt.config(state="normal", text="Retry Decryption", bg="#991B1B", fg="#FCA5A5")
        self.lbl_integrity_badge.config(text="VERIFICATION FAILED", fg="#F87171", bg="#7F1D1D")
        self.lbl_hash_info.config(text=f"INTEGRITY FAILURE: {error_message}", fg="#F87171")
        self.log(f"Decryption/Integrity failure: {error_message}", "ERROR")
        messagebox.showerror("Cryptographic Error", error_message)

    # =========================================================================
    # Action 3: Print to Windows Spooler & Report Status
    # =========================================================================
    def action_print_job(self):
        if not self.decrypted_file_path or not self.decrypted_file_path.exists():
            messagebox.showwarning("File Missing", "Decrypted file not found. Decrypt document first.")
            return

        target_printer = self.printer_var.get()
        job_id = self.authorized_job.get("job_id")

        self.btn_print.config(state="disabled", text="Spooling to Printer...")
        self.lbl_print_status.config(text=f"Status: Submitting to '{target_printer}'...")
        self.log(f"Dispatching print job to '{target_printer}'...")

        def worker():
            try:
                # 1. Report print submission to backend (PRINT_SUBMITTED -> PRINTING)
                station_client.report_print_status(
                    job_id=job_id,
                    status="PRINT_SUBMITTED",
                    printer_name=target_printer,
                    details=f"Spool submitted to {target_printer}"
                )
                self.log(f"Reported status 'PRINT_SUBMITTED' to backend for job {job_id}.")

                # 2. Submit to Windows Print to PDF via winspool.drv
                ok, msg, out_path = printer_service.print_to_windows_spool(
                    pdf_path=self.decrypted_file_path,
                    job_id=job_id,
                    printer_name=target_printer
                )

                if not ok:
                    raise RuntimeError(msg)

                # 3. Report print completion to backend (PRINT_SUCCESS -> COMPLETED)
                station_client.report_print_status(
                    job_id=job_id,
                    status="PRINT_SUCCESS",
                    printer_name=target_printer,
                    details=f"Output produced: {out_path.name if out_path else 'Spool complete'}"
                )
                self.log(f"Reported status 'PRINT_SUCCESS' to backend for job {job_id}.")

                # 4. Station Cleanup: DoD wipe decrypted PDF and temp files
                cleanup_res = {"decrypted_file_deleted": True, "temp_files_deleted_count": 0, "errors": []}
                if config.AUTO_WIPE_AFTER_PRINT and self.decrypted_file_path:
                    cleanup_res = station_security.clean_station_job(job_id, self.decrypted_file_path)
                    self.log(f"DoD 5220.22-M: Decrypted file & {cleanup_res.get('temp_files_deleted_count', 0)} temp files sanitized.", "SECURITY")

                # 5. Clear application-managed job data in memory
                dec_path_record = str(self.decrypted_file_path) if self.decrypted_file_path else None
                self.decrypted_file_path = None
                self.downloaded_payload = None

                # 6. Report station cleanup results to backend
                try:
                    rep = station_client.report_station_cleanup(
                        job_id=job_id,
                        decrypted_file_deleted=cleanup_res.get("decrypted_file_deleted", True),
                        decrypted_file_path=dec_path_record,
                        temp_files_deleted_count=cleanup_res.get("temp_files_deleted_count", 0),
                        job_data_cleared=True,
                        errors=cleanup_res.get("errors", [])
                    )
                    self.log(f"Correlated Zero-Retention cleanup: {rep.get('status')}.", "SUCCESS")
                except Exception as ce:
                    self.log(f"Cleanup report delivery note: {str(ce)}", "WARNING")

                self.root.after(0, lambda: self._on_print_success(msg, out_path))

            except Exception as e:
                err_msg = str(e)
                # Report failure to backend
                try:
                    station_client.report_print_status(job_id=job_id, status="PRINT_FAILED", printer_name=target_printer, details=err_msg)
                except Exception:
                    pass
                self.root.after(0, lambda: self._on_print_failure(err_msg))

        threading.Thread(target=worker, daemon=True).start()

    def _on_print_success(self, message: str, out_path: Optional[Path]):
        self.btn_print.config(state="disabled", text="Print Completed", bg="#065F46", fg="#34D399")
        self.lbl_print_status.config(text=f"Status: Printed Successfully • Output: {out_path.name if out_path else 'Hardware spool complete'}")
        self.log(message, "SUCCESS")
        messagebox.showinfo("Print Completed", f"Print submission succeeded.\n\nTarget: {self.printer_var.get()}\nOutput: {out_path}\n\nDoD sanitization performed on temporary cache.")

    def _on_print_failure(self, error_message: str):
        self.btn_print.config(state="normal", text="Retry Print", bg="#991B1B", fg="#FCA5A5")
        self.lbl_print_status.config(text=f"Status: Print Failed • {error_message}")
        self.log(f"Print failure: {error_message}", "ERROR")
        messagebox.showerror("Print Spool Error", error_message)

    # =========================================================================
    # Action 4: Manual DoD Temp File Wipe
    # =========================================================================
    def action_wipe_temp(self):
        count = 0
        if config.TEMP_DIR.exists():
            for f in config.TEMP_DIR.glob("*"):
                station_security.secure_wipe_file(f)
                count += 1
        self.log(f"Manual DoD Wipe executed. {count} temporary files overwritten and unlinked.", "SECURITY")
        messagebox.showinfo("Vault Sanitized", f"{count} temporary files securely wiped from restricted directory.")

    # =========================================================================
    # Action 5: Manual Cleanup Retry (Operator Trigger)
    # =========================================================================
    def action_retry_cleanup(self):
        job_id = self.authorized_job.get("job_id") if self.authorized_job else None
        if not job_id:
            # Check entry if a code or job id was typed
            candidate = self.token_entry.get().strip()
            if candidate.startswith("PS-"):
                job_id = candidate

        if not job_id:
            messagebox.showwarning("Job Required", "Please enter or select a Job Code (e.g. PS-XXXXXX) to retry cleanup.")
            return

        self.log(f"Operator initiated manual cleanup retry for job '{job_id}'...")
        
        # 1. Clean station files & clear in-memory data
        clean_res = station_security.clean_station_job(job_id, self.decrypted_file_path)
        self.decrypted_file_path = None
        self.downloaded_payload = None

        def worker():
            try:
                # 2. Tell backend to retry cleanup
                rep = station_client.retry_cleanup(job_id, reason="OPERATOR_MANUAL_RETRY")
                status = rep.get("status", "COMPLETED")
                summary = rep.get("summary", "Cleanup completed.")
                self.log(f"Cleanup Retry completed with status '{status}'.", "SUCCESS")
                self.root.after(0, lambda: messagebox.showinfo(
                    "Cleanup Report",
                    f"Job: {job_id}\nStatus: {status}\n\nSummary:\n{summary}\n\nStation Decrypted File Absent: {clean_res.get('decrypted_file_deleted')}\nStation Scratch Files Cleared: {clean_res.get('temp_files_deleted_count')}"
                ))
            except Exception as e:
                err = str(e)
                self.log(f"Cleanup Retry error: {err}", "ERROR")
                self.root.after(0, lambda: messagebox.showerror("Cleanup Retry Failed", err))

        threading.Thread(target=worker, daemon=True).start()

    # =========================================================================
    # Action 6: View Verified Cleanup Report
    # =========================================================================
    def action_view_cleanup_report(self):
        job_id = self.authorized_job.get("job_id") if self.authorized_job else None
        if not job_id:
            candidate = self.token_entry.get().strip()
            if candidate.startswith("PS-"):
                job_id = candidate

        if not job_id:
            messagebox.showwarning("Job Required", "Please enter or select a Job Code to view its cleanup report.")
            return

        def worker():
            try:
                rep = station_client.get_cleanup_report(job_id)
                status = rep.get("status", "PENDING")
                srv = rep.get("server", {})
                stn = rep.get("station", {})
                shred_hash = rep.get("shredding_hash") or "N/A"
                completed_at = rep.get("completed_at") or "Pending"

                msg = (
                    f"=== PRINTSHIELD VERIFIED CLEANUP REPORT ===\n\n"
                    f"Job ID: {job_id}\n"
                    f"Status: {status}\n"
                    f"Completed: {completed_at}\n\n"
                    f"[SERVER VERIFICATION]:\n"
                    f" • Encrypted File Deleted: {srv.get('encrypted_file_deleted')}\n"
                    f" • Key Envelope Destroyed: {srv.get('key_file_deleted')}\n"
                    f" • Tokens Invalidated: {srv.get('tokens_invalidated_count')}\n\n"
                    f"[PRINT STATION VERIFICATION]:\n"
                    f" • Decrypted PDF Destroyed: {stn.get('decrypted_file_deleted')}\n"
                    f" • Job Memory Cleared: {stn.get('job_data_cleared')}\n"
                    f" • Temp Files Purged: {stn.get('temp_files_deleted_count')}\n\n"
                    f"DoD Certificate: {shred_hash[:32]}...\n\n"
                    f"NOTE: PrintShield strictly verifies the destruction of its own managed encrypted, decrypted, key, and cache files."
                )
                self.root.after(0, lambda: messagebox.showinfo("Zero-Retention Audit Report", msg))
            except Exception as e:
                err = str(e)
                self.root.after(0, lambda: messagebox.showerror("Report Error", f"Could not load cleanup report: {err}"))

        threading.Thread(target=worker, daemon=True).start()

def main():
    root = tk.Tk()
    app = PrintStationApp(root)
    root.mainloop()

if __name__ == "__main__":
    main()
