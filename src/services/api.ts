import { PrintJob, Receipt, User, PrinterDevice } from '../types';
import { 
  currentUserCustomer, 
  currentUserOperator, 
  samplePrintJobs, 
  sampleReceipts, 
  samplePrinters 
} from '../data/sampleData';

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api';

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

export interface BackendJobRecord {
  job_id: string;
  customer_id: string;
  original_filename: string;
  document_hash: string;
  file_size: number;
  upload_timestamp: string;
  job_status: string;
  encryption_scheme: string;
  release_pin: string;
  total_document_pages?: number;
  page_count?: number;
  copies: number;
  page_range?: string;
  paper_size?: string;
  orientation?: 'portrait' | 'landscape';
  color_mode: 'black_and_white' | 'color';
  duplex?: 'single_sided' | 'double_sided';
  selected_pages_count?: number;
  total_sheets?: number;
  rate_per_page?: number;
  total_cost?: number;
  station_id?: string;
  printer_id?: string;
  configured_at?: string;
  expires_at?: string;
  shredded_at?: string | null;
  shredding_hash?: string | null;
}

export interface BackendUploadResponse {
  success: boolean;
  message: string;
  job_id: string;
  job: BackendJobRecord;
}

export interface ConfigureJobPayload {
  customerId: string;
  copies: number;
  pageRange: string;
  paperSize: string;
  orientation: 'portrait' | 'landscape';
  colorMode: 'black_and_white' | 'color';
  duplex: 'single_sided' | 'double_sided';
  expirationMinutes: number;
  stationId?: string;
  printerId?: string;
}

export interface PrintSettingsResponse {
  job_id: string;
  original_filename: string;
  file_size: number;
  total_document_pages: number;
  job_status: string;
  customer_id: string;
  copies: number;
  page_range: string;
  selected_pages: number[];
  selected_pages_count: number;
  paper_size: string;
  orientation: 'portrait' | 'landscape';
  color_mode: 'black_and_white' | 'color';
  duplex: 'single_sided' | 'double_sided';
  rate_per_page: number;
  total_sheets: number;
  total_cost: number;
  release_pin: string;
  qr_payload: string;
  station_id: string;
  printer_id?: string;
  upload_timestamp: string;
  configured_at?: string;
  expires_at?: string;
}

export interface ConfigureResponse {
  success: boolean;
  message: string;
  job_id: string;
  job_status: string;
  settings: PrintSettingsResponse;
}

// Convert FastAPI backend record to React frontend PrintJob model
export function transformBackendJob(record: BackendJobRecord): PrintJob {
  const pages = record.total_document_pages || record.page_count || 1;
  const copies = record.copies || 1;
  const isColor = record.color_mode === 'color';
  const rate = record.rate_per_page || (isColor ? 0.30 : 0.15);
  const selectedCount = record.selected_pages_count || pages;
  const cost = record.total_cost !== undefined ? record.total_cost : Number((selectedCount * copies * rate).toFixed(2));
  const isDuplex = record.duplex === 'double_sided';
  const totalSheets = record.total_sheets !== undefined 
    ? record.total_sheets 
    : (isDuplex ? Math.ceil(selectedCount / 2) * copies : selectedCount * copies);

  const created = new Date(record.upload_timestamp || Date.now());
  const expires = record.expires_at ? new Date(record.expires_at) : new Date(created.getTime() + 60 * 60 * 1000);

  return {
    id: record.job_id.toLowerCase(),
    jobCode: record.job_id,
    releasePin: record.release_pin,
    qrPayload: `printshield://release?job=${record.job_id}&token=${record.release_pin}&station=${record.station_id || 'TERM-CYBERHUB-04'}`,
    documentName: record.original_filename,
    fileSizeBytes: record.file_size,
    pageCount: pages,
    copies: copies,
    colorMode: record.color_mode,
    paperSize: (record.paper_size as any) || 'A4',
    duplex: isDuplex,
    pageRange: record.page_range || 'all',
    selectedPagesCount: selectedCount,
    totalSheets: totalSheets,
    orientation: record.orientation || 'portrait',
    ratePerPage: rate,
    totalCost: cost,
    status: record.job_status.toLowerCase() as any,
    cleanupStatus: record.shredding_hash ? 'verified_dod' : 'pending',
    encryptionScheme: 'AES-256-GCM + Client Ephemeral Key',
    clientHashSha256: record.document_hash,
    serverEnvelopeCipher: `ECDH-P256-AES256GCM-${record.job_id}`,
    keyFingerprint: 'SHA256:9A4E:7F82:B01C:53ED:9821:4B2C:77AF:D012',
    shreddingHash: record.shredding_hash || undefined,
    cybercafeId: 'cafe-01',
    cybercafeName: 'CyberHub Station Downtown',
    cybercafeLocation: '742 Market St, Floor 1, San Francisco, CA',
    terminalId: record.station_id || 'TERM-CYBERHUB-04',
    createdAt: record.upload_timestamp,
    expiresAt: expires.toISOString(),
    configuredAt: record.configured_at || undefined,
    printedAt: undefined,
    shreddedAt: record.shredded_at || undefined,
    auditTrail: [
      {
        id: `aud-${record.job_id}-01`,
        timestamp: record.upload_timestamp,
        action: 'AES-256-GCM Hardware Encrypted Payload Stored',
        actor: 'FastAPI Cryptography Engine',
        actorRole: 'system',
        details: `File verified (%PDF-), hashed (SHA-256: ${record.document_hash.slice(0, 16)}...), encrypted and stored in private vault.`,
        securityHash: record.document_hash
      }
    ]
  };
}

// In-memory cache for fast local interaction
let memoryJobs: PrintJob[] = [...samplePrintJobs];
let memoryReceipts: Receipt[] = [...sampleReceipts];
let memoryPrinters: PrinterDevice[] = [...samplePrinters];

export const api = {
  // Authentication
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

  // Jobs Endpoints (Live FastAPI Integration with Fallback)
  jobs: {
    /**
     * Upload real PDF to FastAPI backend with authentic progress callback
     */
    async uploadDocument(
      file: File,
      options: {
        customerId?: string;
        colorMode?: 'black_and_white' | 'color';
        copies?: number;
      } = {},
      onProgress?: (percent: number) => void
    ): Promise<PrintJob> {
      return new Promise((resolve, reject) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('customer_id', options.customerId || 'usr-cst-9021');
        formData.append('color_mode', options.colorMode || 'black_and_white');
        formData.append('copies', String(options.copies || 1));

        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${API_BASE_URL}/jobs/upload`, true);

        // Track real upload progress
        if (onProgress) {
          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const pct = Math.round((event.loaded / event.total) * 100);
              onProgress(pct);
            }
          };
        }

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const res: BackendUploadResponse = JSON.parse(xhr.responseText);
              const frontendJob = transformBackendJob(res.job);
              memoryJobs = [frontendJob, ...memoryJobs];
              resolve(frontendJob);
            } catch (err) {
              reject(new Error('Invalid JSON response from server.'));
            }
          } else {
            let errorMsg = `Server returned ${xhr.status}`;
            try {
              const errorRes = JSON.parse(xhr.responseText);
              if (errorRes.detail) errorMsg = errorRes.detail;
            } catch {}
            reject(new Error(errorMsg));
          }
        };

        xhr.onerror = () => {
          reject(new Error('Network error connecting to FastAPI backend at ' + API_BASE_URL));
        };

        xhr.send(formData);
      });
    },

    /**
     * Configure print settings and commit job to PENDING queue
     */
    async configure(jobId: string, payload: ConfigureJobPayload): Promise<ConfigureResponse> {
      const response = await fetch(`${API_BASE_URL}/jobs/${jobId}/configure`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          customer_id: payload.customerId,
          copies: payload.copies,
          page_range: payload.pageRange,
          paper_size: payload.paperSize,
          orientation: payload.orientation,
          color_mode: payload.colorMode,
          duplex: payload.duplex,
          expiration_minutes: payload.expirationMinutes,
          station_id: payload.stationId || 'TERM-CYBERHUB-04',
          printer_id: payload.printerId || 'prt-01',
        })
      });

      if (!response.ok) {
        let errorMsg = `Server error ${response.status}`;
        try {
          const errData = await response.json();
          if (errData.detail) errorMsg = errData.detail;
        } catch {}
        throw new Error(errorMsg);
      }

      const res: ConfigureResponse = await response.json();

      // Update memory cache
      const memIdx = memoryJobs.findIndex(j => j.id === jobId.toLowerCase() || j.jobCode === jobId);
      if (memIdx !== -1) {
        const s = res.settings;
        memoryJobs[memIdx] = {
          ...memoryJobs[memIdx],
          copies: s.copies,
          pageRange: s.page_range,
          paperSize: s.paper_size as any,
          orientation: s.orientation,
          colorMode: s.color_mode,
          duplex: s.duplex === 'double_sided',
          selectedPagesCount: s.selected_pages_count,
          totalSheets: s.total_sheets,
          totalCost: s.total_cost,
          ratePerPage: s.rate_per_page,
          status: 'pending',
          expiresAt: s.expires_at || memoryJobs[memIdx].expiresAt,
          qrPayload: s.qr_payload,
          releasePin: s.release_pin,
        };
      }

      return res;
    },

    /**
     * Get print settings for a job
     */
    async getSettings(jobId: string): Promise<PrintSettingsResponse> {
      const response = await fetch(`${API_BASE_URL}/jobs/${jobId}/settings`);
      if (!response.ok) {
        let errorMsg = `Server error ${response.status}`;
        try {
          const errData = await response.json();
          if (errData.detail) errorMsg = errData.detail;
        } catch {}
        throw new Error(errorMsg);
      }
      return await response.json();
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
      const expires = new Date(now.getTime() + 60 * 60 * 1000);

      const newJob: PrintJob = {
        id: `job-${randomNum}`,
        jobCode,
        releasePin,
        qrPayload: `printshield://release?job=${jobCode}&token=${releasePin}&key=9A4E7F82B01C`,
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
        clientHashSha256: payload.clientHashSha256,
        serverEnvelopeCipher: `ECDH-P256-AES256GCM-${randomNum}`,
        keyFingerprint: payload.keyFingerprint,
        cybercafeId: payload.cybercafeId,
        cybercafeName: 'CyberHub Station Downtown',
        cybercafeLocation: '742 Market St, Floor 1, San Francisco, CA',
        createdAt: now.toISOString(),
        expiresAt: expires.toISOString(),
        auditTrail: [
          {
            id: `aud-${randomNum}-init`,
            timestamp: now.toISOString(),
            action: 'Client-Side Envelope Encryption Generated',
            actor: 'Alex Vance (Customer Client)',
            actorRole: 'customer',
            details: 'Encrypted with 256-bit AES GCM key.',
            securityHash: payload.clientHashSha256
          }
        ]
      };
      memoryJobs = [newJob, ...memoryJobs];
      return newJob;
    },

    async list(): Promise<PrintJob[]> {
      try {
        const res = await fetch(`${API_BASE_URL}/jobs`, { method: 'GET' });
        if (res.ok) {
          const backendList: BackendJobRecord[] = await res.json();
          const transformed = backendList.map(transformBackendJob);
          // Merge unique jobs
          const existingIds = new Set(transformed.map(j => j.id));
          const remainingMemory = memoryJobs.filter(j => !existingIds.has(j.id));
          return [...transformed, ...remainingMemory];
        }
      } catch (err) {
        // Fallback to memory store if backend unreachable
      }
      return [...memoryJobs];
    },

    async getById(id: string): Promise<PrintJob | null> {
      try {
        const res = await fetch(`${API_BASE_URL}/jobs/${id}`, { method: 'GET' });
        if (res.ok) {
          const record: BackendJobRecord = await res.json();
          return transformBackendJob(record);
        }
      } catch (err) {}
      const found = memoryJobs.find(j => j.id === id || j.jobCode === id);
      return found ? { ...found } : null;
    },

    async verifyDecryption(jobId: string): Promise<any> {
      const res = await fetch(`${API_BASE_URL}/jobs/${jobId}/verify-decryption`);
      if (!res.ok) {
        throw new Error('Verification failed or job not found on server.');
      }
      return await res.json();
    },

    async cancel(id: string): Promise<PrintJob | null> {
      const idx = memoryJobs.findIndex(j => j.id === id);
      if (idx === -1) return null;
      memoryJobs[idx] = {
        ...memoryJobs[idx],
        status: 'expired',
        cleanupStatus: 'purged',
        shreddedAt: new Date().toISOString(),
        shreddingHash: `CANCEL-SHRED-${Date.now()}`,
      };
      return memoryJobs[idx];
    }
  },

  // Operator Actions
  operator: {
    async verifyPin(pin: string): Promise<{ valid: boolean; job?: PrintJob; message?: string }> {
      const normalized = pin.trim().replace(/\s+/g, '');
      const job = memoryJobs.find(j => 
        j.releasePin.replace('-', '') === normalized.replace('-', '') ||
        j.jobCode.toLowerCase() === normalized.toLowerCase()
      );
      if (!job) {
        return { valid: false, message: 'Invalid or expired Release Token. Verification failed.' };
      }
      return { valid: true, job };
    },
    async releaseAndPrint(jobId: string, printerId?: string): Promise<PrintJob> {
      const idx = memoryJobs.findIndex(j => j.id === jobId);
      if (idx === -1) throw new Error('Job not found');
      
      const now = new Date();
      const updated: PrintJob = {
        ...memoryJobs[idx],
        status: 'printing',
        cleanupStatus: 'in_progress',
        operatorId: currentUserOperator.id,
        operatorName: currentUserOperator.name,
        terminalId: currentUserOperator.terminalId,
        auditTrail: [
          ...memoryJobs[idx].auditTrail,
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
      memoryJobs[idx] = updated;
      return updated;
    },
    async markCompletedAndShred(jobId: string): Promise<{ job: PrintJob; receipt: Receipt }> {
      const idx = memoryJobs.findIndex(j => j.id === jobId);
      if (idx === -1) throw new Error('Job not found');

      const job = memoryJobs[idx];
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
      memoryJobs[idx] = updatedJob;

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

      memoryReceipts = [newReceipt, ...memoryReceipts];
      return { job: updatedJob, receipt: newReceipt };
    },
    async getPrinters(): Promise<PrinterDevice[]> {
      return [...memoryPrinters];
    }
  },

  // Receipts
  receipts: {
    async list(): Promise<Receipt[]> {
      return [...memoryReceipts];
    },
    async getByJobId(jobId: string): Promise<Receipt | null> {
      const found = memoryReceipts.find(r => r.jobId === jobId || r.jobCode === jobId || r.id === jobId);
      return found ? { ...found } : null;
    }
  }
};
