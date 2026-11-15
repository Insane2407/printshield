import { PrintJob, Receipt, User, PrinterDevice, AuditEvent } from '../types';
import { 
  currentUserCustomer, 
  currentUserOperator, 
  samplePrintJobs, 
  sampleReceipts, 
  samplePrinters 
} from '../data/sampleData';

/**
 * FastAPI Backend Integration Architecture
 * 
 * When the FastAPI backend is running:
 * Set VITE_USE_LIVE_API=true and VITE_API_BASE_URL=http://localhost:8000/api/v1
 * All endpoints below map 1:1 to FastAPI APIRouters:
 *   - /auth (login, register, me, keys)
 *   - /jobs (upload encrypted envelope, list, get, update status, cancel)
 *   - /operator (verify-pin, release-job, shred-job, queue, printer status)
 *   - /receipts (generate, get, verify-shred)
 */

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
}

export interface CreateJobPayload {
  documentName: string;
  fileSizeBytes: number;
  pageCount: number;
  copies: number;
  colorMode: 'black_and_white' | 'color';
  paperSize: 'A4' | 'Letter' | 'Legal';
  duplex: boolean;
  cybercafeId: string;
  clientHashSha256: string;
  keyFingerprint: string;
}

// Local reactive storage for seamless demo interaction before FastAPI is connected
let activeJobs: PrintJob[] = [...samplePrintJobs];
let activeReceipts: Receipt[] = [...sampleReceipts];
let activePrinters: PrinterDevice[] = [...samplePrinters];

export const api = {
  // Authentication & Profile Endpoints
  auth: {
    async getCurrentUser(role: 'customer' | 'operator' = 'customer'): Promise<User> {
      return role === 'operator' ? currentUserOperator : currentUserCustomer;
    },
    async login(email: string, _role: 'customer' | 'operator'): Promise<{ token: string; user: User }> {
      const user = email.includes('operator') || _role === 'operator' ? currentUserOperator : currentUserCustomer;
      return {
        token: `jwt_ps_${Date.now()}_${user.id}`,
        user,
      };
    },
    async register(data: { name: string; email: string; role: 'customer' | 'operator' }): Promise<{ token: string; user: User }> {
      const newUser: User = {
        id: `usr-${Date.now()}`,
        name: data.name,
        email: data.email,
        role: data.role,
        keyFingerprint: `SHA256:${Array.from({ length: 8 }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0').toUpperCase()).join(':')}`,
        createdDate: new Date().toISOString().split('T')[0],
      };
      return {
        token: `jwt_ps_${Date.now()}_${newUser.id}`,
        user: newUser,
      };
    }
  },

  // Jobs Endpoints (maps to /api/v1/jobs)
  jobs: {
    async list(): Promise<PrintJob[]> {
      return [...activeJobs];
    },
    async getById(id: string): Promise<PrintJob | null> {
      const found = activeJobs.find(j => j.id === id || j.jobCode === id);
      return found ? { ...found } : null;
    },
    async create(payload: CreateJobPayload): Promise<PrintJob> {
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      const pinPart1 = Math.floor(100 + Math.random() * 900);
      const pinPart2 = Math.floor(100 + Math.random() * 900);
      const jobCode = `PS-${randomNum}`;
      const releasePin = `${pinPart1}-${pinPart2}`;
      const costRate = payload.colorMode === 'color' ? 0.30 : 0.15;
      const totalCost = Number((payload.pageCount * payload.copies * costRate).toFixed(2));

      const now = new Date();
      const expires = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour TTL
      const qrPayload = `printshield://release?job=${jobCode}&token=${releasePin}&key=9A4E7F82B01C&exp=${Math.floor(expires.getTime() / 1000)}`;

      const initialAudit: AuditEvent = {
        id: `aud-${Date.now()}`,
        timestamp: now.toISOString(),
        action: 'Client-Side Envelope Encryption & QR Generated',
        actor: `${currentUserCustomer.name} (Customer Client)`,
        actorRole: 'customer',
        details: 'Encrypted payload created in browser sandbox with ephemeral key.',
        securityHash: payload.clientHashSha256 || '9f83c6b12a81389c968f9b977c0fc4410a08e1a89b09a9386348ef5370f7f012',
      };

      const newJob: PrintJob = {
        id: `job-${randomNum}`,
        jobCode,
        releasePin,
        qrPayload,
        documentName: payload.documentName,
        fileSizeBytes: payload.fileSizeBytes,
        pageCount: payload.pageCount,
        copies: payload.copies,
        colorMode: payload.colorMode,
        paperSize: payload.paperSize,
        duplex: payload.duplex,
        totalCost,
        status: 'ready',
        cleanupStatus: 'pending',
        encryptionScheme: 'AES-256-GCM + Client Ephemeral Key',
        clientHashSha256: payload.clientHashSha256 || '9f83c6b12a81389c968f9b977c0fc4410a08e1a89b09a9386348ef5370f7f012',
        serverEnvelopeCipher: `ECDH-P256-AES256GCM-${randomNum}`,
        keyFingerprint: payload.keyFingerprint || currentUserCustomer.keyFingerprint || 'SHA256:9A4E:7F82:B01C',
        cybercafeId: payload.cybercafeId,
        cybercafeName: 'CyberHub Station Downtown',
        cybercafeLocation: '742 Market St, Floor 1, San Francisco, CA',
        createdAt: now.toISOString(),
        expiresAt: expires.toISOString(),
        auditTrail: [initialAudit],
      };

      activeJobs = [newJob, ...activeJobs];
      return newJob;
    },
    async cancel(id: string): Promise<PrintJob | null> {
      const idx = activeJobs.findIndex(j => j.id === id);
      if (idx === -1) return null;
      activeJobs[idx] = {
        ...activeJobs[idx],
        status: 'expired',
        cleanupStatus: 'purged',
        shreddedAt: new Date().toISOString(),
        shreddingHash: `CANCEL-PURGE-${Date.now()}`,
      };
      return activeJobs[idx];
    }
  },

  // Operator Actions (maps to /api/v1/operator)
  operator: {
    async verifyPin(pin: string): Promise<{ valid: boolean; job?: PrintJob; message?: string }> {
      const normalized = pin.trim().replace(/\s+/g, '');
      const job = activeJobs.find(j => 
        j.releasePin.replace('-', '') === normalized.replace('-', '') ||
        j.jobCode.toLowerCase() === normalized.toLowerCase() ||
        j.qrPayload.includes(normalized)
      );
      if (!job) {
        return { valid: false, message: 'Invalid or expired Release Token. Verification failed.' };
      }
      return { valid: true, job };
    },
    async releaseAndPrint(jobId: string, printerId?: string): Promise<PrintJob> {
      const idx = activeJobs.findIndex(j => j.id === jobId);
      if (idx === -1) throw new Error('Job not found');
      
      const now = new Date();
      const updated: PrintJob = {
        ...activeJobs[idx],
        status: 'printing',
        cleanupStatus: 'in_progress',
        operatorId: currentUserOperator.id,
        operatorName: currentUserOperator.name,
        terminalId: currentUserOperator.terminalId,
        auditTrail: [
          ...activeJobs[idx].auditTrail,
          {
            id: `aud-${Date.now()}`,
            timestamp: now.toISOString(),
            action: 'One-Time Decrypt Stream Dispatched to Hardware Spool',
            actor: `${currentUserOperator.name} (Terminal 04)`,
            actorRole: 'operator',
            details: `Job dispatched directly to printer [${printerId || 'Secure Laser Pro 400'}]. Zero local disk cache retained.`,
            securityHash: '8b919a712c98d716245e90ab12f45c8109283746eabc110294857162534'
          }
        ]
      };
      activeJobs[idx] = updated;
      return updated;
    },
    async markCompletedAndShred(jobId: string): Promise<{ job: PrintJob; receipt: Receipt }> {
      const idx = activeJobs.findIndex(j => j.id === jobId);
      if (idx === -1) throw new Error('Job not found');

      const job = activeJobs[idx];
      const now = new Date();
      const shredHash = `SHRED-CERT-${Array.from({ length: 48 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;

      const updatedJob: PrintJob = {
        ...job,
        status: 'shredded',
        cleanupStatus: 'verified_dod',
        printedAt: job.printedAt || now.toISOString(),
        shreddedAt: now.toISOString(),
        shreddingHash: shredHash,
        auditTrail: [
          ...job.auditTrail,
          {
            id: `aud-${Date.now()}-print`,
            timestamp: now.toISOString(),
            action: 'Hardware Print Output Completed & Sheet Ejected',
            actor: 'Canon Color SafeRunner DX',
            actorRole: 'printer',
            details: 'Physical sheet ejection confirmed by hardware sensor #04.',
            securityHash: '1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b'
          },
          {
            id: `aud-${Date.now()}-shred`,
            timestamp: new Date(now.getTime() + 1000).toISOString(),
            action: 'DoD 5220.22-M Cryptographic Sanitization & RAM Wiping',
            actor: 'PrintShield Cleanup Daemon',
            actorRole: 'system',
            details: '3-pass zero overwrite completed on RAM spool buffer. Temporary keys destroyed.',
            securityHash: shredHash
          }
        ]
      };
      activeJobs[idx] = updatedJob;

      const newReceipt: Receipt = {
        id: `rcpt-${job.id.replace('job-', '')}`,
        receiptNumber: `RCPT-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}-${job.jobCode.replace('PS-', '')}`,
        jobId: job.id,
        jobCode: job.jobCode,
        documentName: job.documentName,
        pages: job.pageCount,
        copies: job.copies,
        colorMode: job.colorMode,
        paperSize: job.paperSize,
        costPerPage: job.colorMode === 'color' ? 0.30 : 0.15,
        totalAmount: job.totalCost,
        currency: 'USD',
        issuedAt: now.toISOString(),
        cybercafeName: job.cybercafeName,
        cybercafeAddress: job.cybercafeLocation,
        operatorName: currentUserOperator.name,
        terminalId: currentUserOperator.terminalId || 'TERM-CYBERHUB-04',
        clientKeyFingerprint: job.keyFingerprint,
        documentHashSha256: job.clientHashSha256,
        shreddingProofHash: shredHash,
        retentionPolicy: 'Zero-Retention: Ephemeral RAM purged upon hardware feed confirmation',
        printStatus: 'Completed & Physically Ejected',
        cleanupStatus: 'DoD 5220.22-M Verified Overwrite'
      };

      activeReceipts = [newReceipt, ...activeReceipts];

      return { job: updatedJob, receipt: newReceipt };
    },
    async getPrinters(): Promise<PrinterDevice[]> {
      return [...activePrinters];
    }
  },

  // Receipts Endpoints (maps to /api/v1/receipts)
  receipts: {
    async list(): Promise<Receipt[]> {
      return [...activeReceipts];
    },
    async getByJobId(jobId: string): Promise<Receipt | null> {
      const found = activeReceipts.find(r => r.jobId === jobId || r.jobCode === jobId || r.id === jobId);
      return found ? { ...found } : null;
    }
  }
};
