import React, { createContext, useContext, useState, useEffect } from 'react';
import { PrintJob, Receipt, PrinterDevice } from '../types';
import { api, CreateJobPayload } from '../services/api';

interface ToastNotification {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message: string;
}

interface JobContextType {
  jobs: PrintJob[];
  receipts: Receipt[];
  printers: PrinterDevice[];
  loading: boolean;
  toasts: ToastNotification[];
  isUploadModalOpen: boolean;
  openUploadModal: () => void;
  closeUploadModal: () => void;
  addToast: (type: ToastNotification['type'], title: string, message: string) => void;
  removeToast: (id: string) => void;
  createJob: (payload: CreateJobPayload) => Promise<PrintJob>;
  cancelJob: (id: string) => Promise<void>;
  operatorVerifyPin: (pin: string) => Promise<{ valid: boolean; job?: PrintJob; message?: string }>;
  operatorReleaseJob: (jobId: string, printerId?: string) => Promise<PrintJob>;
  operatorShredJob: (jobId: string) => Promise<{ job: PrintJob; receipt: Receipt }>;
  refreshData: () => Promise<void>;
}

const JobContext = createContext<JobContextType | undefined>(undefined);

export const JobProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [printers, setPrinters] = useState<PrinterDevice[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  const addToast = (type: ToastNotification['type'], title: string, message: string) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const refreshData = async () => {
    setLoading(true);
    try {
      const [jobsData, receiptsData, printersData] = await Promise.all([
        api.jobs.list(),
        api.receipts.list(),
        api.operator.getPrinters(),
      ]);
      setJobs(jobsData);
      setReceipts(receiptsData);
      setPrinters(printersData);
    } catch (err) {
      console.error('Failed to load initial data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const createJob = async (payload: CreateJobPayload): Promise<PrintJob> => {
    const created = await api.jobs.create(payload);
    setJobs((prev) => [created, ...prev]);
    addToast('success', 'Job Encrypted & Queued', `Job ${created.jobCode} created with PIN: ${created.releasePin}`);
    return created;
  };

  const cancelJob = async (id: string) => {
    const updated = await api.jobs.cancel(id);
    if (updated) {
      setJobs((prev) => prev.map((j) => (j.id === id ? updated : j)));
      addToast('info', 'Job Cancelled', `Payload for job ${updated.jobCode} securely purged.`);
    }
  };

  const operatorVerifyPin = async (pin: string) => {
    return await api.operator.verifyPin(pin);
  };

  const operatorReleaseJob = async (jobId: string, printerId?: string) => {
    const updated = await api.operator.releaseAndPrint(jobId, printerId);
    setJobs((prev) => prev.map((j) => (j.id === jobId ? updated : j)));
    addToast('info', 'Hardware Print Initiated', `Streaming payload to spooler. Zero disk retention active.`);
    return updated;
  };

  const operatorShredJob = async (jobId: string) => {
    const res = await api.operator.markCompletedAndShred(jobId);
    setJobs((prev) => prev.map((j) => (j.id === jobId ? res.job : j)));
    setReceipts((prev) => [res.receipt, ...prev]);
    addToast('success', 'Shredding Complete', `DoD 5220.22-M sanitization verified. Receipt ${res.receipt.receiptNumber} generated.`);
    return res;
  };

  return (
    <JobContext.Provider
      value={{
        jobs,
        receipts,
        printers,
        loading,
        toasts,
        isUploadModalOpen,
        openUploadModal: () => setIsUploadModalOpen(true),
        closeUploadModal: () => setIsUploadModalOpen(false),
        addToast,
        removeToast,
        createJob,
        cancelJob,
        operatorVerifyPin,
        operatorReleaseJob,
        operatorShredJob,
        refreshData,
      }}
    >
      {children}
    </JobContext.Provider>
  );
};

export const useJobs = () => {
  const context = useContext(JobContext);
  if (!context) {
    throw new Error('useJobs must be used within a JobProvider');
  }
  return context;
};
