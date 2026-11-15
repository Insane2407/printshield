# PrintShield – Privacy-First Cybercafé Printing MVP

A full-stack cybersecurity application engineered to protect sensitive documents at public cybercafés, libraries, and untrusted print kiosks through **client-side envelope encryption**, **one-time ephemeral QR tokens**, **authorized hardware spooling via Windows Print to PDF**, **DoD 5220.22-M verified file shredding**, and **Ed25519 digitally-signed verifiable receipts**.

---

## 🛡️ Complete 12-Step Security Workflow

```
[Customer Client] ──(1. Upload PDF)──────────────> [FastAPI Backend]
                                                         │
                                               (2. AES-256-GCM Envelope Encryption)
                                                         │
[Customer Client] <──(3-5. Settings & One-Time QR)───────┘
       │
   (Presents QR / 6-Digit PIN)
       │
       ▼
[Print Station Agent] ──(6. Redeem Token)────────> [FastAPI Backend]
       │                                                 │
       │                                     (Atomic Auth: is_used=True)
       │                                                 │
       │ <──(7. Download Encrypted Payload & DEK)────────┘
       │
(8. AES-256-GCM Decrypt in Restricted Temp)
(8. SHA-256 Bit-for-Bit Integrity Match)
       │
(9. Native Windows Spooler -> Microsoft Print to PDF)
(9. Report PRINT_SUBMITTED & PRINT_SUCCESS)
       │
(10. DoD 5220.22-M Multi-Pass Temp File Wiping)
       │
       └──(11. Submit Cleanup Report)───────────> [FastAPI Backend]
                                                         │
                                              (Zero-Retention Server Shred)
                                              (Ed25519 Digital Receipt Mint)
                                                         │
[Customer Portal] <──(12. Download PDF Receipt)──────────┘
[Public Audit]    <──(12. Cryptographic Verification)────┘
```

1. **Customer PDF Upload**: Validated for authentic `%PDF-` structure.
2. **Backend Encryption**: Ephemeral AES-256-GCM data key encrypts the document; master key wraps the data key in `storage/keys/`.
3. **Print Configuration**: Customer selects copies, page ranges, orientation, color mode, and bound kiosk station.
4. **Queue State**: Job enters `PENDING` status with calculated costs and expiration TTL.
5. **One-Time QR Token**: Mints a 5-minute single-use cryptographic token (`printshield://auth?job=...&token=...`) and 6-digit PIN.
6. **Station Token Redemption**: Kiosk operator redeems QR/PIN via `/api/station/redeem`. Backend sets `is_used=True` and status to `AUTHORIZED`.
7. **Authorized Download**: Station downloads ciphertext and unwrapped key via `/api/station/jobs/{id}/download-encrypted`.
8. **Decryption & Integrity Check**: Station decrypts in `station_agent/restricted_temp/` and validates SHA-256 match. Rejects tampered files immediately.
9. **Windows Print Spooler**: Dispatches PDF stream to `Microsoft Print to PDF` via native `winspool.drv`. Reports `PRINT_SUBMITTED` then `PRINT_SUCCESS`.
10. **Station Cleanup**: DoD 5220.22-M 3-pass overwrite (`\x00`, `\xFF`, random bytes) purges temporary files.
11. **Server Shredding**: Server deletes ciphertext and keys upon station completion, recording a `CleanupReport`.
12. **Verifiable Digital Receipt**: Server signs receipt with Ed25519 root key; customer downloads PDF receipt and verifies signature at `/verify-receipt`.

---

## 💻 Running the Demonstration on a Single Windows Laptop

The application can be demonstrated on a single Windows laptop without special hardware using the built-in `Microsoft Print to PDF` virtual printer.

### Prerequisites
- Windows 10 or Windows 11
- Python 3.10+
- Node.js 18+ & npm
- `Microsoft Print to PDF` installed (standard Windows virtual printer)

---

### Step 1: Install Backend Dependencies
Open PowerShell in the project root (`degenerative`):
```powershell
# Create and activate virtual environment
python -m venv backend/venv
& "backend/venv/Scripts/Activate.ps1"

# Install backend dependencies
pip install fastapi uvicorn sqlalchemy cryptography reportlab pypdf httpx
```

### Step 2: Install Frontend Dependencies
```powershell
npm install
```

---

### Step 3: Start the Backend Server
In PowerShell Window 1:
```powershell
& "backend/venv/Scripts/python.exe" -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload
```
*API Docs available at: `http://127.0.0.1:8000/docs`*

---

### Step 4: Start the Web Application
In PowerShell Window 2:
```powershell
npm run dev
```
*Web App available at: `http://127.0.0.1:5173`*

---

### Step 5: Launch the Print Station Agent
In PowerShell Window 3:
```powershell
& "backend/venv/Scripts/python.exe" -m station_agent.app
```
*Opens the dedicated Print Station Desktop Kiosk UI with connection monitoring, QR/PIN redemption, Windows Spooler status, and DoD 5220.22-M file wiping.*

---

## 🧪 Comprehensive Verification Suite

Run the master end-to-end integration test covering all 12 happy-path steps and all 8 required failure cases:
```powershell
& "backend/venv/Scripts/python.exe" -u test_full_system_integration.py
```

### Verified Test Cases:
| Test Category | Test Case | Expected Behavior | Status |
|---|---|---|---|
| **Workflow** | Steps 1–12 E2E | Upload, Encrypt, Config, QR, Redeem, Decrypt, Hash Match, Spool, Wipe, Receipt | **PASSED (100%)** |
| **Failure Case 1** | Invalid QR Code | Non-existent token rejected with HTTP 404 | **PASSED** |
| **Failure Case 2** | Expired QR Code | Token past 5-minute TTL rejected with HTTP 410 | **PASSED** |
| **Failure Case 3** | Reused QR Code | Replay attack prevented with HTTP 409 Conflict | **PASSED** |
| **Failure Case 4** | Corrupted Document | GCM tag mismatch & SHA-256 mismatch rejected | **PASSED** |
| **Failure Case 5** | Network Disconnection | Station detects offline backend gracefully without crash | **PASSED** |
| **Failure Case 6** | Printing Failure | Spooler error logged, job retained as `AUTHORIZED` for retry | **PASSED** |
| **Failure Case 7** | Cleanup Failure Recovery | Partial failure recorded; operator manual retry succeeds | **PASSED** |
| **Failure Case 8a**| Download Before Auth | Download blocked on `PENDING` job with HTTP 403 Forbidden | **PASSED** |
| **Failure Case 8b**| Station ID Mismatch (Redeem) | Rogue station redeeming token blocked with HTTP 403 Forbidden | **PASSED** |
| **Failure Case 8c**| Station ID Mismatch (Download) | Rogue station downloading ciphertext blocked with HTTP 403 Forbidden | **PASSED** |

---

## 📂 Architecture & Directory Layout

```
degenerative/
├── backend/
│   ├── app/
│   │   ├── config.py              # Storage paths, retention modes, secret keys
│   │   ├── database.py            # SQLite engine, sessions, schema auto-migration
│   │   ├── models.py              # PrintJob, OneTimeToken, CleanupReport, DigitalReceipt
│   │   ├── schemas.py             # Pydantic v2 validation models
│   │   ├── main.py                # FastAPI entry point & CORS configuration
│   │   ├── routers/
│   │   │   ├── jobs.py            # Upload, configuration, QR generation, status
│   │   │   ├── station.py         # Kiosk token redemption, ciphertext download, print reports
│   │   │   ├── cleanup.py         # DoD shredding reports, sweep expired, manual retry
│   │   │   └── receipts.py        # Ed25519 digital receipt minting, verify, PDF export
│   │   ├── security/
│   │   │   ├── encryption.py      # AES-256-GCM Envelope Encryption Engine
│   │   │   ├── signing.py         # Ed25519 Cryptographic Signing & RFC 8785 Canonical JSON
│   │   │   ├── cleanup.py         # Multi-pass secure file shredder
│   │   │   └── validator.py       # SHA-256 stream validator
│   │   └── services/
│   │       ├── pdf_receipt.py     # ReportLab official PDF receipt certificate generator
│   │       └── receipt_service.py # Audit compilation, canonical hashing, integrity verifier
│   └── test_receipt_module.py     # Dedicated receipt verification test suite
│
├── station_agent/                 # Cybercafé Dedicated Desktop Kiosk Agent
│   ├── app.py                     # Native desktop GUI (Tkinter cyber-dark UI)
│   ├── client.py                  # HTTP client communicating with backend
│   ├── config.py                  # Station ID, directory bindings, thresholds
│   ├── printer.py                 # Windows winspool.drv native spooler integration
│   ├── security.py                # Local AES-256-GCM decryption & DoD wiping
│   ├── test_agent_pipeline.py     # Standalone agent verification test
│   ├── restricted_temp/           # Ephemeral decryption vault (auto-sanitized)
│   └── spool_output/              # Output directory for virtual PDF printer
│
├── src/                           # React + TypeScript Frontend
│   ├── components/                # Modular UI components & layouts
│   ├── pages/
│   │   ├── CustomerDashboardPage.tsx  # Customer jobs, QR codes, receipt links
│   │   ├── OperatorDashboardPage.tsx  # Kiosk operator console & shredding controls
│   │   ├── ReceiptPage.tsx            # Digital receipt viewer & PDF downloader
│   │   ├── ReceiptVerificationPage.tsx# Public cryptographic audit verification portal
│   │   └── JobDetailsPage.tsx         # Detailed job timeline & audit log
│   └── services/
│       └── api.ts                 # Full backend REST client
│
├── test_full_system_integration.py# Master E2E & failure case verification script
└── README.md
```

---

## 🔒 Security Principles
- **No Document Storage in Receipts**: Digital receipts contain cryptographic hashes and timestamps only, never raw document bytes.
- **Zero Key Exposure**: Encryption keys are never returned in public APIs, printed receipts, or logged to disk.
- **Explicit Telemetry Labeling**: Events from kiosk terminals are clearly labeled as station-reported telemetry.
- **Realistic Claims**: Software receipts certify cryptographic and software deletion milestones without overclaiming physical hardware spool mechanics.
