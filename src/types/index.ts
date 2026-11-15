export type UserRole = 'customer' | 'operator';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  organization?: string;
  terminalId?: string;
  keyFingerprint?: string;
  createdDate: string;
}

export type JobStatus = 
  | 'encrypted'   // AES-256-GCM encrypted, awaiting customer configuration
  | 'pending'     // Configured & confirmed by customer, ready for kiosk QR scan
  | 'authorized'  // Operator scanned QR/PIN, verified
  | 'ready'       // Ready for release
  | 'queued'      // In printer hardware queue
  | 'printing'    // Active hardware print in progress
  | 'completed'   // Printed physically, awaiting cleanup
  | 'shredded'    // DoD 5220.22-M memory sanitization complete
  | 'expired';    // Token expired before presentation

export type CleanupStatus = 'pending' | 'in_progress' | 'verified_dod' | 'purged';

export interface AuditEvent {
  id: string;
  timestamp: string;
  action: string;
  actor: string;
  actorRole: 'customer' | 'operator' | 'system' | 'printer';
  details: string;
  securityHash: string;
}

export interface PrintJob {
  id: string;
  jobCode: string;               // e.g. "PS-8041"
  releasePin: string;             // e.g. "482-910"
  qrPayload: string;              // Structured one-time QR payload
  documentName: string;
  fileSizeBytes: number;
  pageCount: number;
  copies: number;
  colorMode: 'black_and_white' | 'color';
  paperSize: 'A4' | 'Letter' | 'Legal';
  duplex: boolean;
  pageRange?: string;
  selectedPagesCount?: number;
  totalSheets?: number;
  orientation?: 'portrait' | 'landscape';
  ratePerPage?: number;
  stationId?: string;
  printerId?: string;
  configuredAt?: string;
  totalCost: number;
  status: JobStatus;
  cleanupStatus: CleanupStatus;
  
  // Security & Cryptographic Metadata
  encryptionScheme: 'AES-256-GCM + Client Ephemeral Key';
  clientHashSha256: string;
  serverEnvelopeCipher: string;
  keyFingerprint: string;
  shreddingHash?: string;
  
  // Cybercafé & Operator Info
  cybercafeId: string;
  cybercafeName: string;
  cybercafeLocation: string;
  operatorId?: string;
  operatorName?: string;
  terminalId?: string;
  
  // Timestamps
  createdAt: string;
  expiresAt: string;
  printedAt?: string;
  shreddedAt?: string;
  
  // Audit Trail
  auditTrail: AuditEvent[];
}

export interface Receipt {
  id: string;
  receiptNumber: string;
  jobId: string;
  jobCode: string;
  documentName: string;
  pages: number;
  copies: number;
  colorMode: 'black_and_white' | 'color';
  paperSize: string;
  costPerPage: number;
  totalAmount: number;
  currency: string;
  issuedAt: string;
  cybercafeName: string;
  cybercafeAddress: string;
  operatorName: string;
  terminalId: string;
  clientKeyFingerprint: string;
  documentHashSha256: string;
  shreddingProofHash: string;
  retentionPolicy: string;
  printStatus: 'Completed & Physically Ejected';
  cleanupStatus: 'DoD 5220.22-M Verified Overwrite';
}

export interface PrinterDevice {
  id: string;
  name: string;
  model: string;
  status: 'online' | 'busy' | 'paper_low' | 'offline';
  paperLevel: number;
  tonerBlack: number;
  tonerCyan: number;
  currentJobCode?: string;
  queueLength: number;
  ipAddress: string;
}

export interface StationStatus {
  stationId: string;
  stationName: string;
  isOnline: boolean;
  ramUsageMb: number;
  ramDiskMaxMb: number;
  activeJobsCount: number;
  totalSanitizedCount: number;
  lastSanitizationAt: string;
  firmwareVersion: string;
  complianceRating: string;
}
