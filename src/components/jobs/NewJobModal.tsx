import React, { useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useJobs } from '../../context/JobContext';
import { api, PrintSettingsResponse } from '../../services/api';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { QRCodeCard } from '../common/QRCodeCard';
import { formatBytes, truncateHash } from '../../lib/utils';
import { 
  FileCheck, 
  Lock, 
  ArrowRight,
  UploadCloud,
  AlertCircle,
  CheckCircle2,
  FileText,
  Loader2,
  Trash2,
  Copy,
  Check,
  Printer,
  Sliders,
  Layers,
  Sparkles,
  Clock,
  RotateCw,
  FileDown
} from 'lucide-react';
import { PrintJob } from '../../types';

type ModalStep = 'UPLOAD' | 'CONFIGURE' | 'CONFIRMED';

export const NewJobModal: React.FC = () => {
  const { isUploadModalOpen, closeUploadModal, refreshData, addToast } = useJobs();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Workflow step
  const [step, setStep] = useState<ModalStep>('UPLOAD');

  // Upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [copiedHash, setCopiedHash] = useState<boolean>(false);

  // Uploaded intermediate job state (from POST /api/jobs/upload)
  const [uploadedJob, setUploadedJob] = useState<PrintJob | null>(null);

  // Print Configuration form state
  const [copies, setCopies] = useState<number>(1);
  const [pageRange, setPageRange] = useState<string>('all');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [colorMode, setColorMode] = useState<'black_and_white' | 'color'>('black_and_white');
  const [duplex, setDuplex] = useState<'single_sided' | 'double_sided'>('single_sided');
  const [expirationMinutes, setExpirationMinutes] = useState<number>(60);
  const [isSubmittingConfig, setIsSubmittingConfig] = useState<boolean>(false);

  // Final confirmed settings (from POST /api/jobs/{job_id}/configure)
  const [confirmedSettings, setConfirmedSettings] = useState<PrintSettingsResponse | null>(null);

  // Client-side Page Range parsing & validation for instant feedback
  const pageRangeValidation = useMemo(() => {
    const totalPages = uploadedJob?.pageCount || 1;
    const clean = pageRange.trim().toLowerCase();

    if (!clean || clean === 'all') {
      return {
        valid: true,
        pages: Array.from({ length: totalPages }, (_, i) => i + 1),
        count: totalPages,
        displayText: `All ${totalPages} page${totalPages > 1 ? 's' : ''}`
      };
    }

    const pagesSet = new Set<number>();
    const parts = clean.split(',');

    for (const part of parts) {
      const item = part.trim();
      if (!item) continue;

      if (item.includes('-')) {
        const sub = item.split('-');
        if (sub.length !== 2) {
          return { valid: false, pages: [], count: 0, error: `Invalid range format: '${item}'` };
        }
        const start = parseInt(sub[0].trim(), 10);
        const end = parseInt(sub[1].trim(), 10);
        if (isNaN(start) || isNaN(end)) {
          return { valid: false, pages: [], count: 0, error: `Non-numeric range: '${item}'` };
        }
        if (start <= 0 || end <= 0) {
          return { valid: false, pages: [], count: 0, error: "Page numbers must be 1 or greater" };
        }
        if (start > end) {
          return { valid: false, pages: [], count: 0, error: `Inverted range: '${start}-${end}'` };
        }
        if (end > totalPages) {
          return { valid: false, pages: [], count: 0, error: `Page ${end} exceeds total of ${totalPages} pages` };
        }
        for (let p = start; p <= end; p++) pagesSet.add(p);
      } else {
        const p = parseInt(item, 10);
        if (isNaN(p)) {
          return { valid: false, pages: [], count: 0, error: `Invalid page number: '${item}'` };
        }
        if (p <= 0) {
          return { valid: false, pages: [], count: 0, error: "Page numbers must be 1 or greater" };
        }
        if (p > totalPages) {
          return { valid: false, pages: [], count: 0, error: `Page ${p} exceeds total of ${totalPages} pages` };
        }
        pagesSet.add(p);
      }
    }

    const sorted = Array.from(pagesSet).sort((a, b) => a - b);
    if (sorted.length === 0) {
      return { valid: false, pages: [], count: 0, error: "No valid pages specified" };
    }

    return {
      valid: true,
      pages: sorted,
      count: sorted.length,
      displayText: `${sorted.length} page${sorted.length > 1 ? 's' : ''} selected (${sorted.length <= 8 ? sorted.join(', ') : sorted.slice(0, 6).join(', ') + '...'})`
    };
  }, [pageRange, uploadedJob?.pageCount]);

  // Live Summary Calculations
  const calculatedSheets = useMemo(() => {
    const pagesCount = pageRangeValidation.valid ? pageRangeValidation.count : (uploadedJob?.pageCount || 1);
    const sheetsPerCopy = duplex === 'double_sided' ? Math.ceil(pagesCount / 2) : pagesCount;
    return sheetsPerCopy * copies;
  }, [pageRangeValidation, duplex, copies, uploadedJob?.pageCount]);

  const calculatedCost = useMemo(() => {
    const pagesCount = pageRangeValidation.valid ? pageRangeValidation.count : (uploadedJob?.pageCount || 1);
    const rate = colorMode === 'color' ? 0.30 : 0.15;
    return Number((pagesCount * copies * rate).toFixed(2));
  }, [pageRangeValidation, colorMode, copies, uploadedJob?.pageCount]);

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

  // Step 1: Upload & Encrypt
  const handleUploadSubmit = async (e: React.FormEvent) => {
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
          colorMode: 'black_and_white',
          copies: 1,
        },
        (progress) => {
          setUploadProgress(progress);
        }
      );

      setIsUploading(false);
      setUploadedJob(job);
      setPageRange('all');
      setCopies(1);
      setStep('CONFIGURE');
      await refreshData();
      addToast('success', 'Document Encrypted', `AES-256-GCM cipher stored. Now configure print settings.`);
    } catch (err: any) {
      setIsUploading(false);
      setErrorMessage(err.message || 'Failed to upload and encrypt document.');
    }
  };

  // Step 2: Configure Settings & Confirm Print Job
  const handleConfirmPrintJob = async () => {
    if (!uploadedJob) return;

    if (!pageRangeValidation.valid) {
      setErrorMessage(pageRangeValidation.error || 'Please provide a valid page range.');
      return;
    }

    setIsSubmittingConfig(true);
    setErrorMessage(null);

    try {
      const res = await api.jobs.configure(uploadedJob.jobCode, {
        customerId: 'usr-cst-9021',
        copies,
        pageRange: pageRange.trim(),
        paperSize: 'A4',
        orientation,
        colorMode,
        duplex,
        expirationMinutes,
        stationId: 'TERM-CYBERHUB-04',
        printerId: 'prt-01',
      });

      setIsSubmittingConfig(false);
      setConfirmedSettings(res.settings);
      setStep('CONFIRMED');
      await refreshData();
      addToast(
        'success', 
        'Print Job Confirmed (PENDING)', 
        `Token ${res.settings.release_pin} activated for CyberHub Station.`
      );
    } catch (err: any) {
      setIsSubmittingConfig(false);
      setErrorMessage(err.message || 'Failed to configure and confirm print job.');
    }
  };

  const copyHashToClipboard = () => {
    if (!uploadedJob?.clientHashSha256) return;
    navigator.clipboard.writeText(uploadedJob.clientHashSha256);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const resetAndClose = () => {
    setSelectedFile(null);
    setUploadedJob(null);
    setConfirmedSettings(null);
    setErrorMessage(null);
    setUploadProgress(0);
    setStep('UPLOAD');
    closeUploadModal();
  };

  // Modal Titles and Subtitles based on Step
  const getModalHeader = () => {
    switch (step) {
      case 'UPLOAD':
        return {
          title: "Upload & Encrypt PDF Document",
          subtitle: "AES-256-GCM authenticated cipher executed immediately; zero plaintext retention"
        };
      case 'CONFIGURE':
        return {
          title: "Configure Print Settings",
          subtitle: `Document encrypted in vault (${uploadedJob?.jobCode}). Customize print parameters and review summary.`
        };
      case 'CONFIRMED':
        return {
          title: "Print Job Confirmed & Queued (PENDING)",
          subtitle: "Present this single-use QR token or 6-digit release PIN to the cybercafé operator"
        };
    }
  };

  const header = getModalHeader();

  return (
    <Modal
      isOpen={isUploadModalOpen}
      onClose={resetAndClose}
      title={header.title}
      subtitle={header.subtitle}
      maxWidth={step === 'CONFIGURE' ? 'xl' : 'lg'}
    >
      {/* ========================================================================= */}
      {/* STEP 1: UPLOAD & ENCRYPT PDF                                             */}
      {/* ========================================================================= */}
      {step === 'UPLOAD' && (
        <form onSubmit={handleUploadSubmit} className="space-y-5">
          {/* File Drag-and-Drop Dropzone */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-mono font-medium text-slate-300">
                SELECT PDF DOCUMENT (MAX 25MB)
              </label>
              <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/30">
                PDF Only
              </span>
            </div>
            
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
                <div className="p-3.5 rounded-2xl bg-cyan-950/60 border border-cyan-500/30 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                  <UploadCloud className="w-8 h-8" />
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
              <div className="p-4 rounded-xl border border-cyan-500/40 bg-cyan-950/20 flex items-center justify-between gap-4 shadow-[0_0_15px_rgba(6,182,212,0.1)]">
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

          {/* Upload Progress Bar (when streaming to vault) */}
          {isUploading && (
            <div className="space-y-2 p-3.5 rounded-xl bg-slate-900 border border-cyan-500/30">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-cyan-400 flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Encrypting & Streaming to Zero-Retention Vault...</span>
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
              Upon upload, the PDF is encrypted on-the-fly and only the ciphertext is saved.
              After encryption, you will configure copies, page range, duplex, and color mode before confirming.
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

      {/* ========================================================================= */}
      {/* STEP 2: CONFIGURE PRINT SETTINGS & CONFIRM JOB                            */}
      {/* ========================================================================= */}
      {step === 'CONFIGURE' && uploadedJob && (
        <div className="space-y-6">
          {/* Uploaded Document Details Banner */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-cyan-500/30 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 rounded-lg bg-cyan-950/80 border border-cyan-500/40 text-cyan-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-white font-sans truncate">
                    {uploadedJob.documentName}
                  </div>
                  <div className="text-xs text-slate-400 font-mono">
                    {formatBytes(uploadedJob.fileSizeBytes)} • {uploadedJob.jobCode}
                  </div>
                </div>
              </div>

              {/* Detected Pages Badge */}
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-cyan-950 border border-cyan-500/50 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.2)]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                  {uploadedJob.pageCount} {uploadedJob.pageCount === 1 ? 'Page' : 'Pages'} Detected
                </span>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-mono text-purple-300 bg-purple-950/60 border border-purple-500/40">
                  AES-256-GCM Vault
                </span>
              </div>
            </div>

            {/* Document SHA-256 Checksum */}
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono text-slate-400">
              <span className="text-slate-500">Document SHA-256:</span>
              <div className="flex items-center gap-2">
                <span className="text-slate-300 font-mono truncate max-w-[280px]" title={uploadedJob.clientHashSha256}>
                  {truncateHash(uploadedJob.clientHashSha256, 12, 10)}
                </span>
                <button
                  type="button"
                  onClick={copyHashToClipboard}
                  className="text-cyan-400 hover:text-cyan-300 p-1 rounded hover:bg-slate-800 transition-colors"
                  title="Copy SHA-256 hash"
                >
                  {copiedHash ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Clean Print Settings Panel */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 font-semibold tracking-wide">
              <Sliders className="w-4 h-4" />
              <span>PRINT HARDWARE SETTINGS</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Number of Copies */}
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
                <label className="block text-xs font-mono text-slate-400 mb-2 font-medium">
                  NUMBER OF COPIES
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setCopies(Math.max(1, copies - 1))}
                    disabled={copies <= 1}
                    className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-mono font-bold flex items-center justify-center transition-all"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={copies}
                    onChange={(e) => setCopies(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                    className="flex-1 text-center py-1.5 px-3 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono font-bold text-base focus:border-cyan-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setCopies(Math.min(20, copies + 1))}
                    disabled={copies >= 20}
                    className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-mono font-bold flex items-center justify-center transition-all"
                  >
                    +
                  </button>
                </div>
                <div className="text-[11px] text-slate-500 font-mono mt-1.5 text-center">
                  Maximum 20 copies per order
                </div>
              </div>

              {/* Paper Size: Enforced A4 */}
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-mono text-slate-400 font-medium">
                    PAPER SIZE
                  </label>
                  <span className="text-[10px] font-mono text-amber-400 bg-amber-950/40 border border-amber-500/30 px-1.5 py-0.5 rounded">
                    ENFORCED
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-cyan-950/40 border border-cyan-500/40 flex items-center justify-between text-xs font-mono">
                  <span className="text-cyan-300 font-bold">A4 Standard (210 × 297 mm)</span>
                  <span className="text-slate-400 text-[11px]">80 GSM</span>
                </div>
                <div className="text-[11px] text-slate-500 font-mono mt-1.5">
                  Station hardware strictly requires A4 standard sheets.
                </div>
              </div>

              {/* Page Range */}
              <div className="sm:col-span-2 p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-mono text-slate-400 font-medium">
                    PAGE RANGE
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setPageRange('all')}
                      className={`text-[11px] font-mono px-2 py-0.5 rounded transition-all ${
                        pageRange.toLowerCase() === 'all'
                          ? 'bg-cyan-500 text-slate-950 font-bold'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      All Pages
                    </button>
                    <button
                      type="button"
                      onClick={() => setPageRange('1')}
                      className={`text-[11px] font-mono px-2 py-0.5 rounded transition-all ${
                        pageRange === '1'
                          ? 'bg-cyan-500 text-slate-950 font-bold'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      First Page (1)
                    </button>
                  </div>
                </div>

                <input
                  type="text"
                  value={pageRange}
                  onChange={(e) => setPageRange(e.target.value)}
                  placeholder="e.g. all, 1-3, 1,3,5"
                  className={`w-full p-2.5 rounded-lg bg-slate-950 border text-xs font-mono focus:outline-none transition-colors ${
                    pageRangeValidation.valid
                      ? 'border-slate-700 text-slate-200 focus:border-cyan-500'
                      : 'border-rose-500/60 text-rose-300 focus:border-rose-500'
                  }`}
                />

                <div className="mt-2 flex items-center justify-between text-[11px] font-mono">
                  {pageRangeValidation.valid ? (
                    <span className="text-emerald-400 flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5" />
                      <span>{pageRangeValidation.displayText}</span>
                    </span>
                  ) : (
                    <span className="text-rose-400 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{pageRangeValidation.error}</span>
                    </span>
                  )}
                  <span className="text-slate-500">
                    Max: {uploadedJob.pageCount} pages
                  </span>
                </div>
              </div>

              {/* Orientation */}
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
                <label className="block text-xs font-mono text-slate-400 mb-2 font-medium">
                  ORIENTATION
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <button
                    type="button"
                    onClick={() => setOrientation('portrait')}
                    className={`p-2.5 rounded-lg border text-center transition-all flex items-center justify-center gap-1.5 ${
                      orientation === 'portrait'
                        ? 'bg-cyan-950/60 border-cyan-500/60 text-cyan-300 font-bold shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    <span>Portrait</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrientation('landscape')}
                    className={`p-2.5 rounded-lg border text-center transition-all flex items-center justify-center gap-1.5 ${
                      orientation === 'landscape'
                        ? 'bg-cyan-950/60 border-cyan-500/60 text-cyan-300 font-bold shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <RotateCw className="w-4 h-4" />
                    <span>Landscape</span>
                  </button>
                </div>
              </div>

              {/* Color Mode */}
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
                <label className="block text-xs font-mono text-slate-400 mb-2 font-medium">
                  COLOR MODE
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <button
                    type="button"
                    onClick={() => setColorMode('black_and_white')}
                    className={`p-2.5 rounded-lg border text-center transition-all ${
                      colorMode === 'black_and_white'
                        ? 'bg-cyan-950/60 border-cyan-500/60 text-cyan-300 font-bold shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div>B&W</div>
                    <div className="text-[10px] text-slate-400 font-normal">$0.15/pg</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setColorMode('color')}
                    className={`p-2.5 rounded-lg border text-center transition-all ${
                      colorMode === 'color'
                        ? 'bg-cyan-950/60 border-cyan-500/60 text-cyan-300 font-bold shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>Color</span>
                      <Sparkles className="w-3 h-3 text-cyan-400" />
                    </div>
                    <div className="text-[10px] text-slate-400 font-normal">$0.30/pg</div>
                  </button>
                </div>
              </div>

              {/* Duplex (Single-sided vs Double-sided) */}
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
                <label className="block text-xs font-mono text-slate-400 mb-2 font-medium">
                  DUPLEX PRINTING
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <button
                    type="button"
                    onClick={() => setDuplex('single_sided')}
                    className={`p-2.5 rounded-lg border text-center transition-all ${
                      duplex === 'single_sided'
                        ? 'bg-cyan-950/60 border-cyan-500/60 text-cyan-300 font-bold shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    Single-sided
                  </button>
                  <button
                    type="button"
                    onClick={() => setDuplex('double_sided')}
                    className={`p-2.5 rounded-lg border text-center transition-all ${
                      duplex === 'double_sided'
                        ? 'bg-cyan-950/60 border-cyan-500/60 text-cyan-300 font-bold shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    Double-sided
                  </button>
                </div>
              </div>

              {/* Expiration TTL */}
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
                <label className="block text-xs font-mono text-slate-400 mb-2 font-medium">
                  EXPIRATION WINDOW
                </label>
                <div className="grid grid-cols-3 gap-1.5 text-xs font-mono">
                  {[30, 60, 120].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setExpirationMinutes(mins)}
                      className={`p-2 rounded-lg border text-center transition-all ${
                        expirationMinutes === mins
                          ? 'bg-cyan-950/60 border-cyan-500/60 text-cyan-300 font-bold shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {mins} min
                    </button>
                  ))}
                </div>
                <div className="text-[11px] text-slate-500 font-mono mt-1.5 text-center">
                  Auto-purged if unclaimed after window
                </div>
              </div>

            </div>
          </div>

          {/* Print Summary Card */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-slate-900 via-[#0B1528] to-slate-900 border border-cyan-500/40 shadow-glow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-cyan-400 font-semibold tracking-wide flex items-center gap-1.5">
                <Layers className="w-4 h-4" />
                <span>PRINT ORDER SUMMARY</span>
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                CyberHub Station (Downtown Kiosk)
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono pt-1">
              <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">SELECTED PAGES</span>
                <span className="text-white font-bold text-sm">
                  {pageRangeValidation.valid ? pageRangeValidation.count : 0} of {uploadedJob.pageCount}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">TOTAL COPIES</span>
                <span className="text-white font-bold text-sm">× {copies}</span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">PHYSICAL SHEETS</span>
                <span className="text-cyan-300 font-bold text-sm">{calculatedSheets} A4</span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950/60 border border-cyan-500/30">
                <span className="text-slate-500 block text-[10px]">TOTAL COST</span>
                <span className="text-emerald-400 font-bold text-base">${calculatedCost.toFixed(2)}</span>
              </div>
            </div>

            <div className="text-[11px] font-mono text-slate-400 pt-1 flex items-center justify-between border-t border-slate-800">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Expires in {expirationMinutes} minutes after confirmation</span>
              </span>
              <span className="text-slate-500">
                Rate: ${colorMode === 'color' ? '0.30' : '0.15'}/page
              </span>
            </div>
          </div>

          {/* Error Message Box */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs font-mono flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-between border-t border-slate-800">
            <Button
              type="button"
              variant="ghost"
              onClick={resetAndClose}
              disabled={isSubmittingConfig}
            >
              Discard & Close
            </Button>

            <Button
              type="button"
              variant="primary"
              loading={isSubmittingConfig}
              disabled={!pageRangeValidation.valid || isSubmittingConfig}
              onClick={handleConfirmPrintJob}
              leftIcon={<CheckCircle2 className="w-4 h-4" />}
            >
              {isSubmittingConfig ? "Queueing Print Job..." : "Confirm Print Job"}
            </Button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 3: CONFIRMED & QUEUED (PENDING)                                      */}
      {/* ========================================================================= */}
      {step === 'CONFIRMED' && confirmedSettings && (
        <div className="space-y-6 text-center py-2">
          
          <QRCodeCard
            value={confirmedSettings.qr_payload}
            pin={confirmedSettings.release_pin}
            jobCode={confirmedSettings.job_id}
            documentName={confirmedSettings.original_filename}
            size={180}
            className="w-full"
          />

          {/* Confirmed Settings Summary */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-left space-y-2.5 text-xs font-mono">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <span className="text-slate-400">Queue Status:</span>
              <span className="px-2 py-0.5 rounded text-[11px] font-bold text-cyan-300 bg-cyan-950 border border-cyan-500/40 animate-pulse">
                PENDING (READY AT KIOSK)
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Job Reference:</span>
              <span className="text-cyan-400 font-bold">{confirmedSettings.job_id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Print Parameters:</span>
              <span className="text-white">
                {confirmedSettings.copies} {confirmedSettings.copies > 1 ? 'copies' : 'copy'} • {confirmedSettings.paper_size} ({confirmedSettings.orientation})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Pages & Sheets:</span>
              <span className="text-white">
                {confirmedSettings.selected_pages_count} pages ({confirmedSettings.total_sheets} sheets, {confirmedSettings.duplex.replace('_', '-')})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Total Settled Cost:</span>
              <span className="text-emerald-400 font-bold">${confirmedSettings.total_cost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Assigned Station:</span>
              <span className="text-white">CyberHub Station ({confirmedSettings.station_id})</span>
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
                const targetId = confirmedSettings.job_id.toLowerCase();
                resetAndClose();
                navigate(`/customer/jobs/${targetId}`);
              }}
            >
              View Job Details
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};
