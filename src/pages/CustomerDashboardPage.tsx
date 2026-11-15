import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useJobs } from '../context/JobContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { CustomerLayout } from '../components/layout/CustomerLayout';
import { StatCard } from '../components/common/StatCard';
import { Card, CardHeader, CardContent } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { QRCodeCard } from '../components/common/QRCodeCard';
import { CleanupReportModal } from '../components/common/CleanupReportModal';
import { formatTimestamp } from '../lib/utils';
import { 
  FileText, 
  Upload, 
  CheckCircle2, 
  Clock, 
  Search, 
  ExternalLink, 
  KeyRound, 
  ShieldCheck, 
  QrCode,
  RefreshCw,
  Copy,
  Check,
  Trash2,
  Receipt
} from 'lucide-react';

export const CustomerDashboardPage: React.FC = () => {
  const { jobs, openUploadModal, refreshData, addToast } = useJobs();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [copiedPin, setCopiedPin] = useState<string | null>(null);
  const [selectedCleanupJob, setSelectedCleanupJob] = useState<{ id: string; name: string } | null>(null);

  // Active QR Token state
  const [activeTokenData, setActiveTokenData] = useState<{
    qrPayload: string;
    pin: string;
    expiresAt: string;
    isUsed: boolean;
    secondsRemaining: number;
  } | null>(null);

  // Computed status metrics matching prompt requirements:
  // - Total print jobs
  // - Pending jobs
  // - Completed jobs
  const totalJobsCount = jobs.length;
  const pendingJobs = jobs.filter(j => j.status === 'pending' || j.status === 'ready' || j.status === 'queued' || j.status === 'printing');
  const completedJobs = jobs.filter(j => j.status === 'completed' || j.status === 'shredded');

  // Most relevant active job for the Active QR Code section
  const activeQrJob = pendingJobs.find(j => j.status === 'pending' || j.status === 'ready') || pendingJobs[0] || jobs[0];

  // Generate / Refresh active QR token
  const handleRegenerateQR = async (jobCode: string) => {
    try {
      const res = await api.jobs.generateQR(jobCode, { expirySeconds: 300 });
      setActiveTokenData({
        qrPayload: res.qr_payload,
        pin: res.manual_code,
        expiresAt: res.expires_at,
        isUsed: false,
        secondsRemaining: res.expiry_seconds
      });
      addToast('success', 'Fresh QR Code Generated', 'Valid for 5 minutes at CyberHub Kiosk.');
    } catch (err: any) {
      addToast('error', 'Token Generation Failed', err.message || 'Could not generate QR token.');
    }
  };

  // Poll for redemption when an active QR code is showing
  useEffect(() => {
    if (!activeQrJob || activeQrJob.status === 'completed' || activeQrJob.status === 'shredded') return;

    const pollStatus = async () => {
      try {
        const status = await api.jobs.getQRStatus(activeQrJob.jobCode);
        if (status.is_used && !activeTokenData?.isUsed) {
          setActiveTokenData(prev => prev ? { ...prev, isUsed: true } : null);
          refreshData();
          addToast('success', 'Token Redeemed!', `Job ${activeQrJob.jobCode} authorized by kiosk operator.`);
        }
      } catch (err) {}
    };

    const interval = setInterval(pollStatus, 3500);
    return () => clearInterval(interval);
  }, [activeQrJob?.jobCode, activeTokenData?.isUsed]);

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch = 
      job.documentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.jobCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.releasePin.includes(searchQuery);
    
    if (statusFilter === 'all') return matchesSearch;
    return matchesSearch && job.status === statusFilter;
  });

  const handleCopyPin = (pin: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(pin);
    setCopiedPin(pin);
    setTimeout(() => setCopiedPin(null), 2000);
  };

  return (
    <CustomerLayout>
      {/* Top Welcome & Upload Document Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-slate-900/60 to-blue-950/40 border border-cyan-500/20 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-white tracking-tight font-sans">
              Customer Privacy Dashboard
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950 border border-cyan-500/40 text-cyan-400">
              CLIENT ENCRYPTED
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Identity: <span className="text-white font-semibold">{user?.name}</span> • Connected Key Fingerprint: <span className="text-cyan-300 font-bold">{user?.keyFingerprint || 'SHA256:9A4E:7F82:B01C'}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="secondary"
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            onClick={() => refreshData()}
          >
            Sync Mesh
          </Button>
          <Button
            size="md"
            variant="primary"
            leftIcon={<Upload className="w-4 h-4" />}
            onClick={openUploadModal}
          >
            Upload Document
          </Button>
        </div>
      </div>

      {/* Required Status Cards: Total print jobs, Pending jobs, Completed jobs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Print Jobs"
          value={totalJobsCount}
          change="All Client Spools"
          changeType="neutral"
          icon={<FileText className="w-6 h-6 text-cyan-400" />}
          subtext="Encrypted & Processed"
        />

        <StatCard
          title="Pending Jobs"
          value={pendingJobs.length}
          change={pendingJobs.length > 0 ? "Awaiting Kiosk QR Scan" : "Queue Empty"}
          changeType="security"
          icon={<Clock className="w-6 h-6 text-amber-400" />}
          subtext="RAM buffered only"
        />

        <StatCard
          title="Completed Jobs"
          value={completedJobs.length}
          change="DoD 5220.22-M Clean"
          changeType="positive"
          icon={<CheckCircle2 className="w-6 h-6 text-emerald-400" />}
          subtext="Cryptographic Receipts"
        />
      </div>

      {/* Main Grid: Recent Print History (2 cols) + Active QR Code Section (1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Recent Print History */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader
              title={
                <div className="flex items-center gap-2">
                  <span>Recent Print History</span>
                  <span className="text-xs font-mono font-normal text-slate-400">({filteredJobs.length} records)</span>
                </div>
              }
              subtitle="All document records protected with zero-knowledge envelope encryption"
              action={
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search jobs..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700/80 text-xs text-white placeholder-slate-500 font-mono focus:border-cyan-500 focus:outline-none w-36 sm:w-48"
                    />
                  </div>
                </div>
              }
            />

            {/* Filter Tabs */}
            <div className="px-6 py-2 border-b border-slate-800/80 flex items-center gap-2 overflow-x-auto text-xs font-mono">
              {[
                { id: 'all', label: 'All Jobs' },
                { id: 'ready', label: 'Ready for QR Scan' },
                { id: 'printing', label: 'Printing' },
                { id: 'completed', label: 'Completed' },
                { id: 'shredded', label: 'Sanitized' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-3 py-1 rounded-lg transition-all whitespace-nowrap ${
                    statusFilter === tab.id
                      ? 'bg-cyan-950/70 text-cyan-300 border border-cyan-500/40 font-semibold'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Print Jobs List */}
            <div className="divide-y divide-slate-800/60">
              {filteredJobs.length === 0 ? (
                <div className="p-8 text-center text-slate-400 font-mono text-xs">
                  No encrypted print jobs found matching filters.
                </div>
              ) : (
                filteredJobs.map((job) => (
                  <div
                    key={job.id}
                    onClick={() => navigate(`/customer/jobs/${job.id}`)}
                    className="p-5 hover:bg-slate-900/40 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-cyan-400 flex-shrink-0 mt-0.5">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white text-sm truncate font-sans">
                            {job.documentName}
                          </span>
                          <span className="text-[11px] font-mono text-cyan-400 font-bold bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-500/30">
                            {job.jobCode}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 font-mono mt-1">
                          <span>{job.pageCount} pgs ({job.copies} {job.copies > 1 ? 'copies' : 'copy'})</span>
                          <span>•</span>
                          <span className="capitalize">{job.colorMode.replace('_', ' ')}</span>
                          <span>•</span>
                          <span>${job.totalCost.toFixed(2)}</span>
                          <span>•</span>
                          <span className="truncate max-w-[150px]">{job.cybercafeName}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 sm:flex-shrink-0 justify-between sm:justify-end">
                      {job.status === 'ready' && (
                        <div 
                          onClick={(e) => handleCopyPin(job.releasePin, e)}
                          title="Click to copy PIN"
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-cyan-500/30 text-cyan-300 font-mono text-xs hover:border-cyan-400 transition-colors"
                        >
                          <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
                          <span className="font-bold tracking-wider">{job.releasePin}</span>
                          {copiedPin === job.releasePin ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 text-slate-400" />
                          )}
                        </div>
                      )}

                      <Badge status={job.status} />

                      {/* Cleanup Status Badge & Report Trigger */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCleanupJob({ id: job.jobCode, name: job.documentName });
                        }}
                        title="View Zero-Retention Cleanup Audit Report"
                        className="p-1 rounded-lg bg-slate-900 border border-slate-700/80 text-purple-400 hover:text-purple-300 hover:border-purple-500/50 transition-colors flex items-center gap-1.5 text-[11px] font-mono"
                      >
                        <Badge cleanupStatus={job.cleanupStatus} size="sm" icon={false} />
                        <Trash2 className="w-3 h-3 text-purple-400" />
                      </button>

                      {/* View Verifiable Receipt */}
                      {(job.status === 'completed' || job.status === 'shredded') && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/customer/receipt/${job.id}`);
                          }}
                          title="View Verifiable Cryptographic Receipt"
                          className="px-2 py-1 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 hover:text-emerald-300 hover:border-emerald-400/60 transition-colors flex items-center gap-1 text-[11px] font-mono"
                        >
                          <Receipt className="w-3 h-3 text-emerald-400" />
                          <span className="hidden sm:inline">Receipt</span>
                        </button>
                      )}

                      <div className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 transition-colors">
                        <ExternalLink className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Required Active QR Code Section */}
        <div className="space-y-4">
          <Card glow className="border-cyan-500/30">
            <CardHeader
              title={
                <div className="flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-cyan-400" />
                  <span>Active Kiosk QR Code</span>
                </div>
              }
              subtitle="Present this QR at the cybercafé terminal scanner"
            />
            <CardContent className="flex flex-col items-center">
              {activeQrJob ? (
                <div className="w-full flex flex-col items-center">
                  <QRCodeCard
                    value={activeTokenData?.qrPayload || activeQrJob.qrPayload}
                    pin={activeTokenData?.pin || activeQrJob.releasePin}
                    jobCode={activeQrJob.jobCode}
                    documentName={activeQrJob.documentName}
                    expiresAt={activeTokenData?.expiresAt || activeQrJob.expiresAt}
                    initialSecondsRemaining={activeTokenData?.secondsRemaining || 300}
                    isUsed={activeTokenData?.isUsed || activeQrJob.status === 'authorized' || activeQrJob.status === 'printing'}
                    onRegenerate={() => handleRegenerateQR(activeQrJob.jobCode)}
                    size={170}
                    className="w-full"
                  />

                  <div className="mt-4 w-full p-3 rounded-xl bg-cyan-950/20 border border-cyan-500/20 text-xs font-mono text-slate-300 space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Destination:</span>
                      <span className="text-white font-semibold">{activeQrJob.cybercafeName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Kiosk Terminal:</span>
                      <span className="text-cyan-300 font-semibold">{activeQrJob.terminalId || 'Station 04'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Retention:</span>
                      <span className="text-purple-300 font-semibold">DoD 5220.22-M Sanitized</span>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full mt-3 text-xs font-mono"
                    onClick={() => navigate(`/customer/jobs/${activeQrJob.id}`)}
                  >
                    Inspect Security Audit Trail &rarr;
                  </Button>
                </div>
              ) : (
                <div className="py-8 text-center text-xs font-mono text-slate-400 space-y-3">
                  <QrCode className="w-10 h-10 text-slate-600 mx-auto" />
                  <p>No pending jobs awaiting QR release.</p>
                  <Button size="sm" variant="primary" onClick={openUploadModal}>
                    Upload New Document
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Zero-Disk Security Box */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-xs font-mono text-slate-400 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong className="text-white">Zero Disk Footprint:</strong> When the kiosk operator scans this QR, your encrypted payload decrypts in isolated printer RAM and vanishes immediately upon paper ejection.
            </div>
          </div>
        </div>

      </div>

      {/* Zero-Retention Cleanup Audit Report Modal */}
      {selectedCleanupJob && (
        <CleanupReportModal
          isOpen={!!selectedCleanupJob}
          onClose={() => setSelectedCleanupJob(null)}
          jobId={selectedCleanupJob.id}
          documentName={selectedCleanupJob.name}
          onCleanupUpdated={refreshData}
        />
      )}
    </CustomerLayout>
  );
};
