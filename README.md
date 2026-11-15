# PrintShield – Privacy-First Cybercafé Printing

A premium cybersecurity SaaS web application engineered to protect sensitive documents at public cybercafés, libraries, and untrusted print kiosks through **zero-knowledge client encryption**, **one-time ephemeral QR tokens**, and **DoD 5220.22-M verified RAM sanitization**.

---

## 🛡️ Core Cybersecurity Architecture

- **Client-Side Envelope Encryption**: Documents are sealed directly inside the browser using WebCrypto `AES-256-GCM` before any byte leaves your device.
- **One-Time Ephemeral QR & PIN**: A scannable dynamic QR token and 6-digit release PIN with a 60-minute TTL allow the kiosk operator to authorize a single hardware spool pass.
- **RAM-Only Direct Spooling**: Files bypass cybercafé hard drive storage and downloads folders completely, streaming straight into printer memory.
- **DoD 5220.22-M Overwrite**: Upon hardware sheet ejection, print memory buffers are overwritten in 3 passes and a cryptographic proof of shredding is generated.
- **Honest Privacy Disclosure**: Transparently informs users that while digital storage is mathematically zero-retention, physical paper inspection by rogue operators requires user vigilance at the printer tray.

---

## ⚡ Tech Stack

- **React 18** with **Vite 6**
- **TypeScript 5.7**
- **React Router v6** (`react-router-dom`)
- **Tailwind CSS 3.4** (Dark navy/black cybersecurity design system, glowing borders, custom glassmorphism)
- **Framer Motion 11** (Smooth spring modals, notification toasts, hover elevations)
- **qrcode.react** (Crisp vector SVG QR code rendering)
- **Lucide React** (Security and dashboard iconography)

---

## 📂 Project Structure

```
degenerative/
├── index.html                   # HTML entry point with dark cyber styling & fonts
├── index.legacy.html            # Preserved backup of legacy static prototype
├── style.legacy.css             # Preserved backup of legacy CSS
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
├── src/
│   ├── main.tsx                 # React DOM mount point
│   ├── App.tsx                  # Declarative React Router setup
│   ├── index.css                # Tailwind base, utilities, cyber glowing text & cards
│   ├── types/
│   │   └── index.ts             # Strict TypeScript models for Jobs, Receipts, Users, Printers, Station
│   ├── lib/
│   │   └── utils.ts             # Formatting helpers (formatBytes, timestamps, hash truncator)
│   ├── data/
│   │   └── sampleData.ts        # Realistic cybersecurity audit logs, print jobs, and receipts
│   ├── services/
│   │   └── api.ts               # FastAPI REST endpoint client abstraction layer
│   ├── context/
│   │   ├── AuthContext.tsx      # Role switcher (Customer vs Operator) & auth state
│   │   └── JobContext.tsx       # Live reactive store for print jobs, toasts, and operator actions
│   ├── components/
│   │   ├── common/              # ShieldLogo, QRCodeCard, Badge, Button, Card, StatCard, Modal, ToastContainer
│   │   ├── layout/              # Navbar, Footer, CustomerLayout, OperatorLayout (strictly separated!)
│   │   └── jobs/                # NewJobModal (dynamic pricing, client encryption, token generator)
│   └── pages/
│       ├── LandingPage.tsx           # Hero, 4 Core Features, Workflow, Privacy Limitations
│       ├── CustomerDashboardPage.tsx # Total/Pending/Completed jobs, Active QR, Recent history
│       ├── OperatorDashboardPage.tsx # Incoming jobs, Station status, Printer fleet, Cleanup reports
│       ├── LoginPage.tsx             # Dual-role cybersecurity login gateway
│       ├── RegisterPage.tsx          # Keypair derivation preview & registration
│       ├── JobDetailsPage.tsx        # Document info, print settings, status timeline, QR display
│       ├── ReceiptPage.tsx           # Document hash, print status, cleanup status, download button
│       └── SettingsPage.tsx          # Keypair rotation, TTL config, FastAPI server toggle
```

---

## 🚀 All Pages & React Router Routes

| Page | Route | Description |
|---|---|---|
| **Landing Page** | `/` | Hero *"Your Documents. Your Control."*, Get Started button, How It Works, Features (*Encrypted Upload*, *One-Time QR*, *Secure Printing*, *Verified Cleanup*), and Privacy Limitations |
| **Customer Dashboard** | `/customer` | Upload Document button, Total/Pending/Completed jobs metric cards, Recent print history, and **Active QR Code** section |
| **Operator Dashboard** | `/operator` | Separate operator station interface: Incoming print jobs, Station status, Printer status, Completed jobs, and **Cleanup reports** |
| **Job Details Page** | `/customer/jobs/:id`<br>`/operator/jobs/:id` | Document information, print settings, job status timeline, and **QR code display** |
| **Receipt Page** | `/customer/receipt/:id`<br>`/operator/receipt/:id` | Print job details, client SHA-256 document hash, print status, cleanup status, and **Download Receipt** button |
| **Login Page** | `/login` | Dual-role authentication with 1-click test profiles |
| **Registration Page** | `/register` | Ephemeral ECDH keypair generation preview |
| **Settings Page** | `/settings` | Key management, TTL auto-destruct defaults, FastAPI backend toggle |

---

## 🔌 FastAPI Integration Guide

The frontend architecture in `src/services/api.ts` maps directly to FastAPI endpoints:

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/v1/auth/login` | `POST` | Authenticate customer or kiosk operator |
| `/api/v1/auth/register` | `POST` | Register identity and ephemeral public key |
| `/api/v1/jobs` | `GET` | Retrieve encrypted job queue |
| `/api/v1/jobs` | `POST` | Upload encrypted ciphertext envelope + specs |
| `/api/v1/jobs/{id}/cancel` | `POST` | Trigger emergency memory purge of job |
| `/api/v1/operator/verify-pin` | `POST` | Validate 6-digit customer token or QR code payload |
| `/api/v1/operator/release-print` | `POST` | Stream decrypted payload directly to printer |
| `/api/v1/operator/shred` | `POST` | Execute DoD 3-pass RAM overwrite & issue receipt |
| `/api/v1/receipts` | `GET` | Retrieve cryptographic proof of shredding |
