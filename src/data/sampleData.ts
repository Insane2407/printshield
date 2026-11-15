import { PrintJob, Receipt, User, PrinterDevice, AuditEvent, StationStatus } from '../types';

export const currentUserCustomer: User = {
  id: 'usr-cst-9021',
  name: 'Alex Vance',
  email: 'alex.vance@cryptomail.io',
  role: 'customer',
  organization: 'Aegis Security Labs',
  keyFingerprint: 'SHA256:9A4E:7F82:B01C:53ED:9821:4B2C:77AF:D012',
  createdDate: '2026-03-14',
};

export const currentUserOperator: User = {
  id: 'usr-opr-4402',
  name: 'Marcus Chen',
  email: 'm.chen@cyberhub-downtown.net',
  role: 'operator',
  terminalId: 'TERM-CYBERHUB-04',
  organization: 'CyberHub Kiosk Station Downtown',
  keyFingerprint: 'SHA256:3B11:88CE:A902:44F1:55D8:0933:EEA4:71C0',
  createdDate: '2025-11-01',
};

export const sampleStationStatus: StationStatus = {
  stationId: 'TERM-CYBERHUB-04',
  stationName: 'CyberHub Station Downtown (Station 04)',
  isOnline: true,
  ramUsageMb: 128,
  ramDiskMaxMb: 2048,
  activeJobsCount: 2,
  totalSanitizedCount: 149,
  lastSanitizationAt: '2026-11-15T11:43:45Z',
  firmwareVersion: 'PrintShield-Kiosk-v2.4.1-Hardened',
  complianceRating: 'NIST SP 800-88 & DoD 5220.22-M Compliant',
};

export const sampleAuditTrailPS8041: AuditEvent[] = [
  {
    id: 'aud-101',
    timestamp: '2026-11-15T11:20:14Z',
    action: 'Client-Side Envelope Encryption Generated',
    actor: 'Alex Vance (Customer Client)',
    actorRole: 'customer',
    details: 'File encrypted in browser via WebCrypto AES-256-GCM. Ephemeral key held in memory.',
    securityHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
  },
  {
    id: 'aud-102',
    timestamp: '2026-11-15T11:21:05Z',
    action: 'Secure Token & One-Time QR Dispatched',
    actor: 'PrintShield Relay Node 02',
    actorRole: 'system',
    details: 'Encrypted ciphertext payload stored in RAM-disk cache. TTL countdown initiated (60m).',
    securityHash: '8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4'
  },
  {
    id: 'aud-103',
    timestamp: '2026-11-15T11:42:30Z',
    action: 'QR Scan / Release PIN Verified at Terminal 04',
    actor: 'Marcus Chen (Cybercafé Operator)',
    actorRole: 'operator',
    details: 'Customer presented QR/PIN [482-910]. One-time ephemeral decryption key exchanged over TLS 1.3.',
    securityHash: '7d793037a0760186574b0282f2f435e70d73a44d80a475143003056a2bbfa4ad'
  },
  {
    id: 'aud-104',
    timestamp: '2026-11-15T11:43:10Z',
    action: 'Direct-to-Spool Hardware Print Executed',
    actor: 'Canon imageRUNNER ADV DX',
    actorRole: 'printer',
    details: '14 pages transferred straight to hardware buffer bypass disk. Job status marked complete.',
    securityHash: '3f6c8d7b9e0a1b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef012345'
  },
  {
    id: 'aud-105',
    timestamp: '2026-11-15T11:43:45Z',
    action: 'DoD 5220.22-M RAM & Cache Sanitization',
    actor: 'PrintShield Cleanup Daemon',
    actorRole: 'system',
    details: '3-pass zero overwrite completed on RAM-disk segment. Ephemeral decryptor wiped from memory.',
    securityHash: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
  }
];

export const samplePrintJobs: PrintJob[] = [
  {
    id: 'job-8041',
    jobCode: 'PS-8041',
    releasePin: '482-910',
    qrPayload: 'printshield://release?job=PS-8041&token=482-910&key=9A4E7F82B01C&exp=1763212814',
    documentName: 'Q3_Financial_Audit_Encrypted.pdf',
    fileSizeBytes: 4280192,
    pageCount: 14,
    copies: 1,
    colorMode: 'color',
    paperSize: 'A4',
    duplex: true,
    totalCost: 4.20,
    status: 'shredded',
    cleanupStatus: 'verified_dod',
    encryptionScheme: 'AES-256-GCM + Client Ephemeral Key',
    clientHashSha256: '9f83c6b12a81389c968f9b977c0fc4410a08e1a89b09a9386348ef5370f7f012',
    serverEnvelopeCipher: 'ECDH-P256-AES256GCM-ENC-90412',
    keyFingerprint: 'SHA256:9A4E:7F82:B01C:53ED:9821:4B2C:77AF:D012',
    shreddingHash: 'SHRED-CERT-ba7816bf8f01cfea414140de5dae2223b00361a3',
    cybercafeId: 'cafe-01',
    cybercafeName: 'CyberHub Station Downtown',
    cybercafeLocation: '742 Market St, Floor 1, San Francisco, CA',
    operatorId: 'usr-opr-4402',
    operatorName: 'Marcus Chen',
    terminalId: 'TERM-CYBERHUB-04',
    createdAt: '2026-11-15T11:20:14Z',
    expiresAt: '2026-11-15T12:20:14Z',
    printedAt: '2026-11-15T11:43:10Z',
    shreddedAt: '2026-11-15T11:43:45Z',
    auditTrail: sampleAuditTrailPS8041
  },
  {
    id: 'job-9611',
    jobCode: 'PS-9611',
    releasePin: '915-407',
    qrPayload: 'printshield://release?job=PS-9611&token=915-407&key=9A4E7F82B01C&exp=1763217030',
    documentName: 'Patent_Application_HardwareSec_Draft.pdf',
    fileSizeBytes: 5490000,
    pageCount: 32,
    copies: 1,
    colorMode: 'black_and_white',
    paperSize: 'A4',
    duplex: true,
    totalCost: 4.80,
    status: 'ready',
    cleanupStatus: 'pending',
    encryptionScheme: 'AES-256-GCM + Client Ephemeral Key',
    clientHashSha256: '7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d',
    serverEnvelopeCipher: 'ECDH-P256-AES256GCM-ENC-96110',
    keyFingerprint: 'SHA256:9A4E:7F82:B01C:53ED:9821:4B2C:77AF:D012',
    cybercafeId: 'cafe-01',
    cybercafeName: 'CyberHub Station Downtown',
    cybercafeLocation: '742 Market St, Floor 1, San Francisco, CA',
    createdAt: '2026-11-15T12:50:30Z',
    expiresAt: '2026-11-15T13:50:30Z',
    auditTrail: [
      {
        id: 'aud-501',
        timestamp: '2026-11-15T12:50:30Z',
        action: 'Zero-Knowledge Payload Created',
        actor: 'Alex Vance',
        actorRole: 'customer',
        details: 'Client encryption key generated. Document ready for kiosk QR scan.',
        securityHash: '7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d'
      }
    ]
  },
  {
    id: 'job-9450',
    jobCode: 'PS-9450',
    releasePin: '658-230',
    qrPayload: 'printshield://release?job=PS-9450&token=658-230&key=9A4E7F82B01C&exp=1763216700',
    documentName: 'Medical_Diagnostics_Summary.pdf',
    fileSizeBytes: 2450000,
    pageCount: 8,
    copies: 1,
    colorMode: 'color',
    paperSize: 'Letter',
    duplex: true,
    totalCost: 3.50,
    status: 'queued',
    cleanupStatus: 'pending',
    encryptionScheme: 'AES-256-GCM + Client Ephemeral Key',
    clientHashSha256: '3d5e7f9a1b3c5e7f9a1b3c5e7f9a1b3c5e7f9a1b3c5e7f9a1b3c5e7f9a1b3c5e',
    serverEnvelopeCipher: 'ECDH-P256-AES256GCM-ENC-94500',
    keyFingerprint: 'SHA256:9A4E:7F82:B01C:53ED:9821:4B2C:77AF:D012',
    cybercafeId: 'cafe-01',
    cybercafeName: 'CyberHub Station Downtown',
    cybercafeLocation: '742 Market St, Floor 1, San Francisco, CA',
    createdAt: '2026-11-15T12:45:00Z',
    expiresAt: '2026-11-15T13:45:00Z',
    auditTrail: [
      {
        id: 'aud-401',
        timestamp: '2026-11-15T12:45:00Z',
        action: 'Job Initialized & QR Generated',
        actor: 'Alex Vance',
        actorRole: 'customer',
        details: 'Encrypted document queued for terminal unlock.',
        securityHash: '3d5e7f9a1b3c5e7f9a1b3c5e7f9a1b3c5e7f9a1b3c5e7f9a1b3c5e7f9a1b3c5e'
      }
    ]
  },
  {
    id: 'job-9102',
    jobCode: 'PS-9102',
    releasePin: '319-804',
    qrPayload: 'printshield://release?job=PS-9102&token=319-804&key=9A4E7F82B01C&exp=1763216410',
    documentName: 'Identity_Verification_GovtID_Exp.pdf',
    fileSizeBytes: 890450,
    pageCount: 2,
    copies: 1,
    colorMode: 'color',
    paperSize: 'A4',
    duplex: false,
    totalCost: 1.20,
    status: 'printing',
    cleanupStatus: 'in_progress',
    encryptionScheme: 'AES-256-GCM + Client Ephemeral Key',
    clientHashSha256: '8e12f04b2c8a1928374e6f5d0123b45a6c7d8e9f0123456789abcdef45678901',
    serverEnvelopeCipher: 'ECDH-P256-AES256GCM-ENC-91020',
    keyFingerprint: 'SHA256:9A4E:7F82:B01C:53ED:9821:4B2C:77AF:D012',
    cybercafeId: 'cafe-01',
    cybercafeName: 'CyberHub Station Downtown',
    cybercafeLocation: '742 Market St, Floor 1, San Francisco, CA',
    operatorId: 'usr-opr-4402',
    operatorName: 'Marcus Chen',
    terminalId: 'TERM-CYBERHUB-04',
    createdAt: '2026-11-15T12:40:10Z',
    expiresAt: '2026-11-15T13:40:10Z',
    auditTrail: [
      {
        id: 'aud-301',
        timestamp: '2026-11-15T12:40:10Z',
        action: 'Job Payload Dispatched',
        actor: 'Alex Vance',
        actorRole: 'customer',
        details: 'Uploaded with client-side isolation envelope.',
        securityHash: '8e12f04b2c8a1928374e6f5d0123b45a6c7d8e9f0123456789abcdef45678901'
      },
      {
        id: 'aud-302',
        timestamp: '2026-11-15T12:54:15Z',
        action: 'Decrypt Stream Started',
        actor: 'Marcus Chen (Operator)',
        actorRole: 'operator',
        details: 'QR/PIN validated. Spooling to Canon imageRUNNER.',
        securityHash: '1928374650abcdeffedcba098765432112345678abcdef0987654321fedcba09'
      }
    ]
  },
  {
    id: 'job-8924',
    jobCode: 'PS-8924',
    releasePin: '721-654',
    qrPayload: 'printshield://release?job=PS-8924&token=721-654&key=9A4E7F82B01C&exp=1763214300',
    documentName: 'Contract_NonDisclosure_Signed.pdf',
    fileSizeBytes: 1845120,
    pageCount: 6,
    copies: 2,
    colorMode: 'black_and_white',
    paperSize: 'A4',
    duplex: true,
    totalCost: 1.80,
    status: 'completed',
    cleanupStatus: 'pending',
    encryptionScheme: 'AES-256-GCM + Client Ephemeral Key',
    clientHashSha256: '4a32b91873c56ef98d2417a80b39c011f074a2e5d9c84b1279a1f4675e8d3210',
    serverEnvelopeCipher: 'ECDH-P256-AES256GCM-ENC-88123',
    keyFingerprint: 'SHA256:9A4E:7F82:B01C:53ED:9821:4B2C:77AF:D012',
    cybercafeId: 'cafe-01',
    cybercafeName: 'CyberHub Station Downtown',
    cybercafeLocation: '742 Market St, Floor 1, San Francisco, CA',
    operatorId: 'usr-opr-4402',
    operatorName: 'Marcus Chen',
    terminalId: 'TERM-CYBERHUB-04',
    createdAt: '2026-11-15T12:05:00Z',
    expiresAt: '2026-11-15T13:05:00Z',
    printedAt: '2026-11-15T12:48:30Z',
    auditTrail: [
      {
        id: 'aud-201',
        timestamp: '2026-11-15T12:05:00Z',
        action: 'Client-Side Envelope Encryption Generated',
        actor: 'Alex Vance (Customer Client)',
        actorRole: 'customer',
        details: 'Encrypted with 256-bit AES GCM key.',
        securityHash: '4a32b91873c56ef98d2417a80b39c011f074a2e5d9c84b1279a1f4675e8d3210'
      },
      {
        id: 'aud-202',
        timestamp: '2026-11-15T12:48:30Z',
        action: 'Printed to Laser Printer Pro 400',
        actor: 'CyberHub Station Downtown',
        actorRole: 'operator',
        details: 'Print completed. Shredding countdown active (300s).',
        securityHash: '5c829e01fb4a62d87e1438992a0dcb456e719283f0194857201abce24810293e'
      }
    ]
  }
];

export const sampleReceipts: Receipt[] = [
  {
    id: 'rcpt-8041',
    receiptNumber: 'RCPT-2026-1115-8041',
    jobId: 'job-8041',
    jobCode: 'PS-8041',
    documentName: 'Q3_Financial_Audit_Encrypted.pdf',
    pages: 14,
    copies: 1,
    colorMode: 'color',
    paperSize: 'A4',
    costPerPage: 0.30,
    totalAmount: 4.20,
    currency: 'USD',
    issuedAt: '2026-11-15T11:44:00Z',
    cybercafeName: 'CyberHub Station Downtown',
    cybercafeAddress: '742 Market St, Floor 1, San Francisco, CA',
    operatorName: 'Marcus Chen',
    terminalId: 'TERM-CYBERHUB-04',
    clientKeyFingerprint: 'SHA256:9A4E:7F82:B01C:53ED:9821:4B2C:77AF:D012',
    documentHashSha256: '9f83c6b12a81389c968f9b977c0fc4410a08e1a89b09a9386348ef5370f7f012',
    shreddingProofHash: 'SHRED-CERT-ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    retentionPolicy: 'Zero-Retention: Ephemeral RAM purged upon hardware feed confirmation',
    printStatus: 'Completed & Physically Ejected',
    cleanupStatus: 'DoD 5220.22-M Verified Overwrite'
  },
  {
    id: 'rcpt-8924',
    receiptNumber: 'RCPT-2026-1115-8924',
    jobId: 'job-8924',
    jobCode: 'PS-8924',
    documentName: 'Contract_NonDisclosure_Signed.pdf',
    pages: 6,
    copies: 2,
    colorMode: 'black_and_white',
    paperSize: 'A4',
    costPerPage: 0.15,
    totalAmount: 1.80,
    currency: 'USD',
    issuedAt: '2026-11-15T12:49:00Z',
    cybercafeName: 'CyberHub Station Downtown',
    cybercafeAddress: '742 Market St, Floor 1, San Francisco, CA',
    operatorName: 'Marcus Chen',
    terminalId: 'TERM-CYBERHUB-04',
    clientKeyFingerprint: 'SHA256:9A4E:7F82:B01C:53ED:9821:4B2C:77AF:D012',
    documentHashSha256: '4a32b91873c56ef98d2417a80b39c011f074a2e5d9c84b1279a1f4675e8d3210',
    shreddingProofHash: 'SHRED-CERT-pending-spool-active',
    retentionPolicy: 'Zero-Retention: Automatic sanitization scheduled after print completion',
    printStatus: 'Completed & Physically Ejected',
    cleanupStatus: 'DoD 5220.22-M Verified Overwrite'
  }
];

export const samplePrinters: PrinterDevice[] = [
  {
    id: 'prt-01',
    name: 'Secure Laser Pro 400 (Terminal Direct)',
    model: 'HP LaserJet Enterprise M507x',
    status: 'online',
    paperLevel: 88,
    tonerBlack: 94,
    tonerCyan: 100,
    queueLength: 1,
    ipAddress: '10.14.0.12 (Direct TLS)'
  },
  {
    id: 'prt-02',
    name: 'Canon Color SafeRunner DX (RAM Buffer)',
    model: 'imageRUNNER ADV DX C3835i',
    status: 'busy',
    paperLevel: 45,
    tonerBlack: 72,
    tonerCyan: 68,
    currentJobCode: 'PS-9102',
    queueLength: 2,
    ipAddress: '10.14.0.15 (Direct IPP)'
  },
  {
    id: 'prt-03',
    name: 'AirGapped Kiosk Feeder (No Hard Drive)',
    model: 'Brother HL-L6400DW RAM-Only Edition',
    status: 'online',
    paperLevel: 95,
    tonerBlack: 81,
    tonerCyan: 0,
    queueLength: 0,
    ipAddress: '10.14.0.18 (Isolated LAN)'
  }
];
