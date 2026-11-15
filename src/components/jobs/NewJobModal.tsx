import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useJobs } from '../../context/JobContext';
import { api } from '../../services/api';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { QRCodeCard } from '../common/QRCodeCard';
import { formatBytes } from '../../lib/utils';
import { 
  FileCheck, 
  Lock, 
  ArrowRight,
  UploadCloud,
  AlertCircle,
  CheckCircle2,
  FileText,
  Loader2,
  Trash2
} from 'lucide-react';
import { PrintJob } from '../../types';

export const NewJobModal: React.FC = () => {
  const { isUploadModalOpen, closeUploadModal, refreshData, addToast } = useJobs();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [copies, setCopies] = useState<number>(1);
  const [colorMode, setColorMode] = useState<'black_and_white' | 'color'>('black_and_white');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successJob, setSuccessJob] = useState<PrintJob | null>(null);

  // Drag and drop state
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const handleFileSelect = (file: File) => {
    setErrorMessage(null);

    // Validate PDF
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setErrorMessage('Security validation: Only authentic .pdf files are accepted.');
      return;
    }

    // Validate Size (max 25 MB)
    if (file.size > 25 * 1024 * 1024) {
      setErrorMessage('File size exceeds the 25 MB maximum limit.');
      return;
    }

    if (file.size === 0) {
      setErrorMessage('Selected file is empty (0 bytes).');
      return;
    }

    setSelectedFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMessage('Please select a PDF document to upload.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setErrorMessage(null);

    try {
      const job = await api.jobs.uploadDocument(
        selectedFile,
        {
          customerId: 'usr-cst-9021',
          colorMode,
          copies,
        },
        (progress) => {
          setUploadProgress(progress);
        }
      );

      setIsUploading(false);
      setSuccessJob(job);
      await refreshData();
      addToast('success', 'Document Encrypted', `Job ${job.jobCode} stored in zero-retention vault.`);
    } catch (err: any) {
      setIsUploading(false);
      setErrorMessage(err.message || 'Failed to upload and encrypt document.');
    }
  };

  const resetAndClose = () => {
    setSelectedFile(null);
    setSuccessJob(null);
    setErrorMessage(null);
    setUploadProgress(0);
    closeUploadModal();
  };

  return (
    <Modal
      isOpen={isUploadModalOpen}
      onClose={resetAndClose}
      title={successJob ? "Document Encrypted & Token Generated" : "Upload & Encrypt Document"}
      subtitle={
        successJob 
          ? "Present this QR code or 6-digit release PIN to the kiosk operator" 
          : "AES-256-GCM hardware encryption executed on upload; zero plaintext retention"
      }
      maxWidth="lg"
    >
      {successJob ? (
        <div className="space-y-6 text-center py-2">
          
          <QRCodeCard
            value={successJob.qrPayload}
            pin={successJob.releasePin}
            jobCode={successJob.jobCode}
            documentName={successJob.documentName}
            size={180}
            className="w-full"
          />

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-left space-y-2 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-slate-400">Job Reference:</span>
              <span className="text-cyan-400 font-bold">{successJob.jobCode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Document SHA-256:</span>
              <span className="text-slate-300 truncate max-w-[220px]" title={successJob.clientHashSha256}>
                {successJob.clientHashSha256}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Kiosk Destination:</span>
              <span className="text-white">CyberHub Station Downtown (Terminal 04)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Storage Protocol:</span>
              <span className="text-purple-300 font-bold">AES-256-GCM (Zero-Retention Vault)</span>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={resetAndClose}
            >
              Close
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              rightIcon={<ArrowRight className="w-4 h-4" />}
              onClick={() => {
                const targetId = successJob.id;
                resetAndClose();
                navigate(`/customer/jobs/${targetId}`);
              }}
            >
              View Job Details
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* File Drag-and-Drop Dropzone */}
          <div>
            <label className="block text-xs font-mono font-medium text-slate-300 mb-2">
              SELECT PDF DOCUMENT (MAX 25MB)
            </label>
            
            <input
              type="file"
              ref={fileInputRef}
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileSelect(e.target.files[0]);
                }
              }}
            />

            {!selectedFile ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`p-8 rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center gap-3 text-center ${
                  isDragging
                    ? 'border-cyan-400 bg-cyan-950/30 shadow-[0_0_20px_rgba(6,182,212,0.3)]'
                    : 'border-slate-700 bg-slate-900/40 hover:border-cyan-500/50 hover:bg-slate-900/80'
                }`}
              >
                <div className="p-3.5 rounded-2xl bg-cyan-950/60 border border-cyan-500/30 text-cyan-400">
                  <UploadCloud className="w-7 h-7" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white font-sans">
                    Click to select or drag and drop your PDF here
                  </div>
                  <div className="text-xs text-slate-400 font-mono mt-1">
                    Authentic PDF files only • Magic bytes & size verified before encryption
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-cyan-500/40 bg-cyan-950/20 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2.5 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
                    <FileCheck className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white font-sans truncate">
                      {selectedFile.name}
                    </div>
                    <div className="text-xs text-slate-400 font-mono mt-0.5">
                      {formatBytes(selectedFile.size)} • PDF Ready for AES-256-GCM
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedFile(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                  title="Remove file"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Print Settings Grid */}
          <div className="grid grid-cols-2 gap-4 text-xs font-mono">
            <div>
              <label className="block text-slate-400 mb-1.5 font-medium">COLOR MODE</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setColorMode('black_and_white')}
                  className={`p-2 rounded-xl border text-center transition-all ${
                    colorMode === 'black_and_white'
                      ? 'bg-cyan-950/60 border-cyan-500/50 text-cyan-300 font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  B&W ($0.15)
                </button>
                <button
                  type="button"
                  onClick={() => setColorMode('color')}
                  className={`p-2 rounded-xl border text-center transition-all ${
                    colorMode === 'color'
                      ? 'bg-cyan-950/60 border-cyan-500/50 text-cyan-300 font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  Color ($0.30)
                </button>
              </div>
            </div>

            <div>
              <label className="block text-slate-400 mb-1.5 font-medium">COPIES</label>
              <input
                type="number"
                min={1}
                max={20}
                value={copies}
                onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs font-mono focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Upload Progress Bar (when active) */}
          {isUploading && (
            <div className="space-y-2 p-3.5 rounded-xl bg-slate-900 border border-cyan-500/30">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-cyan-400 flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Encrypting & Streaming to Vault...</span>
                </span>
                <span className="text-white font-bold">{uploadProgress}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 transition-all duration-200"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Error Message Box */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs font-mono flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Cryptographic Protection Note */}
          <div className="p-3 rounded-xl bg-blue-950/20 border border-blue-500/25 flex items-start gap-2.5 text-[11px] text-slate-300 font-mono">
            <Lock className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
            <div>
              <span className="text-cyan-400 font-semibold">Zero-Retention AES-256-GCM:</span>{' '}
              The document is encrypted in private vault storage. Only the single-use kiosk release token can trigger one-time hardware decryption.
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-between border-t border-slate-800">
            <Button type="button" variant="ghost" onClick={resetAndClose} disabled={isUploading}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={isUploading}
              disabled={!selectedFile || isUploading}
              leftIcon={<Lock className="w-4 h-4" />}
            >
              {isUploading ? `Uploading (${uploadProgress}%)` : "Upload & Encrypt Document"}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};
