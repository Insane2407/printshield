import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useJobs } from '../context/JobContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { CustomerLayout } from '../components/layout/CustomerLayout';
import { OperatorLayout } from '../components/layout/OperatorLayout';
import { Card, CardHeader, CardContent } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { QRCodeCard } from '../components/common/QRCodeCard';
import { CleanupReportModal } from '../components/common/CleanupReportModal';
import { formatBytes, formatTimestamp, truncateHash } from '../lib/utils';
import { 
  FileText, 
  Lock, 
  Flame, 
  Copy, 
  Check, 
  ArrowLeft, 
  Receipt as ReceiptIcon, 
  ShieldCheck,
  QrCode,
  Trash2,
  RefreshCw,
  CheckCircle2,
  Server,
  Monitor
} from 'lucide-react';

export const JobDetailsPage: React.FC = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { jobs, cancelJob, addToast } = useJobs();
  const { role } = useAuth();

  const currentJob = jobs.find(j => j.id === jobId || j.jobCode === jobId) || jobs[0];

  const [copiedHash, setCopiedHash] = useState(false);
  const [isCleanupModalOpen, setIsCleanupModalOpen] = useState(false);
  const [isRetryingCleanup, setIsRetryingCleanup] = useState(false);
  const [tokenData, setTokenData] = useState<{
    qrPayload?: string;
    pin?: string;
    expiresAt?: string;
    isUsed?: boolean;
    secondsRemaining?: number;
  }>({});

  const handleManualCleanupRetry = async () => {
    if (!currentJob) return;
    setIsRetryingCleanup(true);
    try {
      const rep = await api.jobs.retryCleanup(currentJob.jobCode, 'MANUAL_RETRY');
      addToast('success', 'Cleanup Executed', `Zero-Retention cleanup status: ${rep.status}`);
      setIsCleanupModalOpen(true);
    } catch (err: any) {
      addToast('error', 'Cleanup Retry Failed', err.message);
    } finally {
      setIsRetryingCleanup(false);
    }
  };

  const handleRegenerate = async () => {
    if (!currentJob) return;
    try {
      const res = await api.jobs.generateQR(currentJob.jobCode, { expirySeconds: 300 });
      setTokenData({
        qrPayload: res.qr_payload,
        pin: res.manual_code,
        expiresAt: res.expires_at,
        isUsed: false,
        secondsRemaining: res.expiry_seconds
      });
      addToast('success', 'Token Refreshed', 'Fresh 5-minute QR code generated.');
    } catch (err: any) {
      addToast('error', 'Token Generation Failed', err.message);
    }
  };

  const LayoutComponent = role === 'operator' ? OperatorLayout : CustomerLayout;
  const backRoute = role === 'operator' ? '/operator' : '/customer';
  const receiptRoute = role === 'operator' 
    ? `/operator/receipt/rcpt-${currentJob?.id.replace('job-', '')}`
    : `/customer/receipt/rcpt-${currentJob?.id.replace('job-', '')}`;

  if (!currentJob) {
    return (
      <LayoutComponent>
        <div className="p-12 text-center text-slate-400 font-mono">
          Job record not found.{' '}
          <Link to={backRoute} className="text-cyan-400 hover:underline">
            Return to Dashboard
          </Link>
        </div>
      </LayoutComponent>
    );
  }

  const handleCopyHash = () => {
    navigator.clipboard.writeText(currentJob.clientHashSha256);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  return (
    <LayoutComponent>
      {/* Back button & Action Bar */}
      <div className="flex items-center justify-between gap-4">
        <Link
          to={backRoute}
          className="inline-flex items-center gap-2 text-xs font-mono text-slate-400 hover:text-cyan-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>BACK TO DASHBOARD</span>
        </Link>

        <div className="flex items-center gap-2">
          {currentJob.status === 'shredded' && (
            <Button
              size="sm"
              variant="secondary"
              leftIcon={<ReceiptIcon className="w-3.5 h-3.5 text-purple-400" />}
              onClick={() => navigate(receiptRoute)}
            >
              View Cryptographic Receipt
            </Button>
          )}

          {currentJob.status === 'ready' && role === 'customer' && (
            <Button
              size="sm"
              variant="danger"
              onClick={() => cancelJob(currentJob.id)}
            >
              Purge / Cancel Spool
            </Button>
          )}
        </div>
      </div>

      {/* Main Header Card */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-[#0B1426] to-slate-900 border border-cyan-500/30 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-glow-sm">
        <div className="flex items-start gap-4">
          <div className="p-3.5 rounded-2xl bg-cyan-950/70 border border-cyan-500/40 text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.25)]">
            <FileText className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-extrabold text-white tracking-tight font-sans">
                {currentJob.documentName}
              </h1>
              <span className="px-2 py-0.5 rounded text-xs font-mono font-bold text-cyan-400 bg-cyan-950 border border-cyan-500/40">
                {currentJob.jobCode}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-1">
              Created {formatTimestamp(currentJob.createdAt)} • Target Kiosk: {currentJob.cybercafeName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Badge status={currentJob.status} size="lg" />
          <Badge cleanupStatus={currentJob.cleanupStatus} size="lg" />
        </div>
      </div>

      {/* Grid: Document Information & Print Settings (Left) + QR Code Display (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Document Info & Print Settings */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Document Information & Print Settings */}
          <Card>
            <CardHeader
              title="Document Information & Print Settings"
              subtitle="Negotiated job parameters and station hardware configuration"
            />
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                  <span className="text-slate-500">PAGE SELECTION</span>
                  <div className="text-white text-base font-bold mt-1">
                    {currentJob.selectedPagesCount || currentJob.pageCount} / {currentJob.pageCount} Pages
                  </div>
                  <div className="text-[10px] text-cyan-400 font-mono mt-0.5">
                    Range: {currentJob.pageRange || 'all'}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                  <span className="text-slate-500">COPIES</span>
                  <div className="text-white text-base font-bold mt-1">
                    {currentJob.copies} {currentJob.copies > 1 ? 'Copies' : 'Copy'}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                    {currentJob.totalSheets || currentJob.pageCount} Sheets Total
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                  <span className="text-slate-500">COLOR MODE</span>
                  <div className="text-cyan-300 text-base font-bold mt-1 capitalize">
                    {currentJob.colorMode.replace('_', ' ')}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                    ${currentJob.colorMode === 'color' ? '0.30' : '0.15'}/page
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                  <span className="text-slate-500">PAPER SIZE</span>
                  <div className="text-white text-base font-bold mt-1">
                    {currentJob.paperSize}
                  </div>
                  <div className="text-[10px] text-emerald-400 font-mono mt-0.5">
                    Standard 80 GSM
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                  <span className="text-slate-500">ORIENTATION</span>
                  <div className="text-white text-base font-bold mt-1 capitalize">
                    {currentJob.orientation || 'Portrait'}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                  <span className="text-slate-500">DUPLEX MODE</span>
                  <div className="text-white text-base font-bold mt-1">
                    {currentJob.duplex ? 'Double-sided' : 'Single-sided'}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                  <span className="text-slate-500">FILE SIZE</span>
                  <div className="text-white text-base font-bold mt-1">{formatBytes(currentJob.fileSizeBytes)}</div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/60 border border-cyan-500/30">
                  <span className="text-slate-500">TOTAL COST</span>
                  <div className="text-emerald-400 text-base font-bold mt-1">${currentJob.totalCost.toFixed(2)}</div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800 text-xs font-mono text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span>Station Terminal: <strong className="text-white">{currentJob.cybercafeName} ({currentJob.terminalId || 'TERM-CYBERHUB-04'})</strong></span>
                <span className="text-amber-400 font-semibold">Expires at {formatTimestamp(currentJob.expiresAt)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Cryptographic Specifications */}
          <Card glow className="border-cyan-500/30">
            <CardHeader
              title="Cryptographic Architecture"
              subtitle="Client-side zero-knowledge isolation parameters"
            />
            <CardContent className="space-y-4">
              <div>
                <div className="text-[11px] font-mono text-slate-400 mb-1">ENCRYPTION SCHEME</div>
                <div className="p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-xs font-mono text-cyan-300 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                  <span>{currentJob.encryptionScheme}</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1">
                  <span>CLIENT SHA-256 CHECKSUM</span>
                  <button
                    onClick={handleCopyHash}
                    className="text-cyan-400 hover:underline flex items-center gap-1"
                  >
                    {copiedHash ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedHash ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 font-mono text-xs text-slate-300 break-all select-all">
                  {currentJob.clientHashSha256}
                </div>
              </div>

              {currentJob.shreddingHash && (
                <div>
                  <div className="text-[11px] font-mono text-purple-400 mb-1 flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 text-purple-400" />
                    <span>DOD 5220.22-M SHREDDING CERTIFICATE</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-purple-950/40 border border-purple-500/30 font-mono text-xs text-purple-300 break-all">
                    {currentJob.shreddingHash}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Zero-Retention Cleanup Audit & Destruction Report */}
          <Card glow className="border-purple-500/30">
            <CardHeader
              title={
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <Trash2 className="w-4 h-4 text-purple-400" />
                    <span>Zero-Retention File Cleanup Audit</span>
                  </div>
                  <Badge cleanupStatus={currentJob.cleanupStatus} size="sm" />
                </div>
              }
              subtitle="Verifiable destruction of PrintShield-managed encrypted files, keys, and tokens"
            />
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800">
                  <div className="flex items-center gap-1.5 text-cyan-300 font-bold mb-1">
                    <Server className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Server Storage Vault</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Encrypted ciphertext blob and master-wrapped AES-256 key envelope.
                  </p>
                  <div className="mt-2 text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>{currentJob.cleanupStatus === 'completed' || currentJob.cleanupStatus === 'verified_dod' ? 'Verified Absent & Overwritten' : 'Awaiting Purge Trigger'}</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800">
                  <div className="flex items-center gap-1.5 text-purple-300 font-bold mb-1">
                    <Monitor className="w-3.5 h-3.5 text-purple-400" />
                    <span>Print Station Cache</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Temporary decrypted PDF and in-memory spooler stream.
                  </p>
                  <div className="mt-2 text-[10px] text-purple-400 font-bold flex items-center gap-1">
                    <Flame className="w-3 h-3" />
                    <span>{currentJob.cleanupStatus === 'completed' || currentJob.cleanupStatus === 'verified_dod' ? 'DoD 5220.22-M 3-Pass Overwritten' : 'Protected in RAM'}</span>
                  </div>
                </div>
              </div>

              {currentJob.cleanupTimestamp && (
                <div className="text-[11px] font-mono text-slate-400 flex justify-between items-center px-1">
                  <span>Sanitization Timestamp:</span>
                  <span className="text-white font-bold">{formatTimestamp(currentJob.cleanupTimestamp)}</span>
                </div>
              )}

              {/* Action Buttons: View Full Report & Manual Retry */}
              <div className="pt-2 flex flex-wrap items-center gap-2 border-t border-slate-800/80">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs font-mono"
                  onClick={() => setIsCleanupModalOpen(true)}
                  leftIcon={<Trash2 className="w-3.5 h-3.5 text-purple-400" />}
                >
                  View Full Cleanup Report
                </Button>

                <Button
                  size="sm"
                  variant="secondary"
                  className="text-xs font-mono"
                  onClick={handleManualCleanupRetry}
                  loading={isRetryingCleanup}
                  leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isRetryingCleanup ? 'animate-spin' : ''}`} />}
                >
                  Manual Cleanup Retry
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Required: Job Status Timeline */}
          <Card>
            <CardHeader
              title="Job Status Timeline"
              subtitle="Verifiable event progression for this individual job"
            />
            <CardContent className="space-y-6">
              <div className="relative pl-6 space-y-8 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
                {currentJob.auditTrail.map((ev, index) => (
                  <div key={ev.id || index} className="relative group">
                    <div className="absolute -left-6 top-1.5 w-3 h-3 rounded-full bg-cyan-400 ring-4 ring-[#0B1220] group-hover:scale-125 transition-transform" />

                    <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-cyan-500/30 transition-all">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs font-mono">
                        <span className="font-bold text-white text-sm font-sans">{ev.action}</span>
                        <span className="text-slate-500">{formatTimestamp(ev.timestamp)}</span>
                      </div>

                      <p className="text-xs text-slate-300 mt-1 font-mono">{ev.details}</p>

                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800 text-[10px] font-mono">
                        <span className="text-slate-400">
                          Actor: <strong className="text-cyan-400">{ev.actor}</strong>
                        </span>
                        <span className="text-slate-500 truncate max-w-xs">
                          Hash: {truncateHash(ev.securityHash, 10, 8)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right 1 Col: Required QR Code Display */}
        <div className="space-y-6">
          <QRCodeCard
            value={tokenData.qrPayload || currentJob.qrPayload}
            pin={tokenData.pin || currentJob.releasePin}
            jobCode={currentJob.jobCode}
            documentName={currentJob.documentName}
            expiresAt={tokenData.expiresAt || currentJob.expiresAt}
            initialSecondsRemaining={tokenData.secondsRemaining || 300}
            isUsed={tokenData.isUsed || currentJob.status === 'completed' || currentJob.status === 'shredded'}
            onRegenerate={handleRegenerate}
            size={180}
            className="w-full"
          />

          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-xs font-mono text-slate-400 space-y-2">
            <div className="flex items-center gap-2 text-white font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>SCANNER INSTRUCTIONS:</span>
            </div>
            <p className="text-slate-300 text-xs font-sans leading-relaxed">
              Show this QR code to the station operator or hold it up to the kiosk optical reader. The terminal will verify the cryptographic checksum and trigger one direct hardware print pass.
            </p>
          </div>
        </div>

      </div>

      {/* Verified Zero-Retention Cleanup Report Modal */}
      {currentJob && (
        <CleanupReportModal
          isOpen={isCleanupModalOpen}
          onClose={() => setIsCleanupModalOpen(false)}
          jobId={currentJob.jobCode}
          documentName={currentJob.documentName}
        />
      )}
    </LayoutComponent>
  );
};
