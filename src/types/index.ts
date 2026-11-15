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

export type CleanupStatus = 
  | 'pending'
  | 'cleaning'
  | 'in_progress'
  | 'completed'
  | 'partially_completed'
  | 'failed'
  | 'verified_dod'
  | 'purged';

export interface CleanupReport {
  success: boolean;
  message: string;
  report_id: string;
  job_id: string;
  status: 'pending' | 'cleaning' | 'completed' | 'partially_completed' | 'failed';
  trigger_reason: string;
  initiated_at: string;
  completed_at?: string;
  server: {
    encrypted_file_deleted: boolean;
    encrypted_file_path?: string;
    key_file_deleted: boolean;
    key_file_path?: string;
    tokens_invalidated_count: number;
  };
  station: {
    decrypted_file_deleted: boolean;
    decrypted_file_path?: string;
    temp_files_deleted_count: number;
    job_data_cleared: boolean;
  };
  deleted_items_count: number;
  failed_items_count: number;
  errors: string[];
  summary: string;
  shredding_hash?: string;
}

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
  cleanupTimestamp?: string;
  cleanupDetails?: string;
  
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
  printStatus: string;
  cleanupStatus: string;
}

export interface DigitalReceipt {
  receipt_id: string;
  job_id: string;
  customer_id: string;
  original_filename: string;
  document_hash: string;
  station_id: string;
  upload_timestamp: string;
  qr_redemption_timestamp?: string | null;
  print_submission_status: string;
  server_cleanup_status: string;
  station_cleanup_status: string;
  cleanup_status: string;
  document_integrity_status: string;
  job_parameters: {
    total_pages: number;
    copies: number;
    total_sheets: number;
    color_mode: string;
    total_cost: number;
  };
  canonical_data: string;
  receipt_hash: string;
  signature: string;
  signer_public_key: string;
  created_at: string;
}

export interface ReceiptVerificationResult {
  is_valid: boolean;
  receipt_id?: string;
  job_id?: string;
  document_integrity: 'VERIFIED' | 'FAILED' | 'UNKNOWN';
  document_hash?: string;
  hash_valid: boolean;
  signature_valid: boolean;
  print_submission_status?: string;
  server_cleanup_status?: string;
  station_cleanup_status?: string;
  cleanup_status?: string;
  signer_public_key?: string;
  message: string;
  disclaimer: string;
  receipt?: DigitalReceipt | null;
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
