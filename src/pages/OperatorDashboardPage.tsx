import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useJobs } from '../context/JobContext';
import { useAuth } from '../context/AuthContext';
import { OperatorLayout } from '../components/layout/OperatorLayout';
import { Card, CardHeader, CardContent } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { StatCard } from '../components/common/StatCard';
import { sampleStationStatus } from '../data/sampleData';
import { formatTimestamp, truncateHash } from '../lib/utils';
import { 
  Terminal, 
  Printer, 
  KeyRound, 
  ShieldCheck, 
  Flame, 
  Play, 
  AlertTriangle, 
  Cpu, 
  FileCheck2, 
  FileText,
  Activity,
  HardDrive
} from 'lucide-react';
import { PrintJob } from '../types';

export const OperatorDashboardPage: React.FC = () => {
  const { jobs, printers, operatorVerifyPin, operatorReleaseJob, operatorShredJob, addToast } = useJobs();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Verification state
  const [pinInput, setPinInput] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifiedJob, setVerifiedJob] = useState<PrintJob | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // Computed collections matching prompt:
  // - Incoming print jobs
  // - Completed jobs
  // - Cleanup reports
  const incomingJobs = jobs.filter(j => j.status === 'ready' || j.status === 'queued');
  const activePrintingJobs = jobs.filter(j => j.status === 'printing');
  const completedJobs = jobs.filter(j => j.status === 'completed' || j.status === 'shredded');
  const cleanupReports = jobs.filter(j => j.shreddingHash || j.status === 'shredded');

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinInput.trim()) return;
    setVerifying(true);
    setVerifyError(null);

    try {
      const res = await operatorVerifyPin(pinInput);
      if (res.valid && res.job) {
        setVerifiedJob(res.job);
        addToast('success', 'Token Authenticated', `Customer token for job ${res.job.jobCode} validated.`);
      } else {
        setVerifyError(res.message || 'Invalid or expired Release Token.');
        setVerifiedJob(null);
      }
    } catch (err) {
      setVerifyError('Verification failed. Check local terminal bridge.');
    } finally {
      setVerifying(false);
    }
  };

  const handleRelease = async (jobId: string) => {
    setActionInProgress(jobId);
    try {
      await operatorReleaseJob(jobId, 'prt-01');
      if (verifiedJob?.id === jobId) {
        setVerifiedJob(prev => prev ? { ...prev, status: 'printing' } : null);
      }
    } finally {
      setActionInProgress(null);
    }
  };

  const handleShred = async (jobId: string) => {
    setActionInProgress(jobId);
    try {
      const res = await operatorShredJob(jobId);
      if (verifiedJob?.id === jobId) {
        setVerifiedJob(null);
        setPinInput('');
      }
      navigate(`/operator/receipt/${res.receipt.id}`);
    } finally {
      setActionInProgress(null);
    }
  };

  return (
    <OperatorLayout>
      {/* Required Station Status Card & Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-blue-950/40 via-slate-900/60 to-purple-950/40 border border-blue-500/25 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse" />
            <h1 className="text-2xl font-extrabold text-white tracking-tight font-sans">
              Station Operator Kiosk Terminal
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-950 border border-blue-500/40 text-blue-300">
              {sampleStationStatus.stationId} • LIVE
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Station: <span className="text-white font-semibold">{sampleStationStatus.stationName}</span> • Operator on Duty: <span className="text-cyan-300 font-semibold">{user?.name}</span>
          </p>
        </div>

        {/* Live Station Diagnostics pill */}
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          <div className="p-2.5 px-3 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-300 flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span>RAM Disk: <strong>{sampleStationStatus.ramUsageMb}MB / {sampleStationStatus.ramDiskMaxMb}MB</strong></span>
          </div>
          <div className="p-2.5 px-3 rounded-xl bg-purple-950/60 border border-purple-500/30 text-purple-300 flex items-center gap-2">
            <Flame className="w-3.5 h-3.5 text-purple-400" />
            <span>Sanitized: <strong>{sampleStationStatus.totalSanitizedCount} Docs</strong></span>
          </div>
        </div>
      </div>

      {/* Operator KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Incoming Jobs"
          value={incomingJobs.length}
          change="Awaiting QR / PIN"
          changeType="security"
          icon={<Terminal className="w-6 h-6 text-blue-400" />}
          subtext="RAM buffered only"
        />

        <StatCard
          title="Hardware Active"
          value={activePrintingJobs.length}
          change={activePrintingJobs.length > 0 ? "Spooling direct" : "Spoolers idle"}
          changeType={activePrintingJobs.length > 0 ? "security" : "neutral"}
          icon={<Printer className="w-6 h-6 text-amber-400" />}
          subtext="Direct printer RAM"
        />

        <StatCard
          title="Completed Jobs"
          value={completedJobs.length}
          change="Physical ejection verified"
          changeType="positive"
          icon={<FileCheck2 className="w-6 h-6 text-emerald-400" />}
          subtext="DoD overwrite ready"
        />

        <StatCard
          title="Station Fleet Status"
          value={`${printers.filter(p => p.status !== 'offline').length} / ${printers.length}`}
          change="All Secure IPP/TLS"
          changeType="security"
          icon={<ShieldCheck className="w-6 h-6 text-cyan-400" />}
          subtext="Encrypted spool cables"
        />
      </div>

      {/* Main Grid: PIN Verification Station & Spool Queue (2 cols) + Station & Printer Status (1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Incoming Print Jobs & Completed Queue */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Required: Incoming Print Jobs */}
          <Card>
            <CardHeader
              title={
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-blue-400" />
                  <span>Incoming Print Jobs (Spool Queue)</span>
                  <span className="text-xs font-mono font-normal text-slate-400">({incomingJobs.length} pending)</span>
                </div>
              }
              subtitle="Encrypted customer payloads ready for terminal release"
            />

            <div className="divide-y divide-slate-800/60">
              {incomingJobs.length === 0 ? (
                <div className="p-8 text-center text-slate-400 font-mono text-xs">
                  No incoming print jobs waiting in terminal spool.
                </div>
              ) : (
                incomingJobs.map((job) => (
                  <div
                    key={job.id}
                    className="p-5 hover:bg-slate-900/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-blue-400 flex-shrink-0 mt-0.5">
                        <Printer className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white text-sm truncate font-sans">
                            {job.documentName}
                          </span>
                          <span className="text-[11px] font-mono text-blue-400 font-bold bg-blue-950/60 px-1.5 py-0.5 rounded border border-blue-500/30">
                            {job.jobCode}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 font-mono mt-1">
                          <span>PIN: <strong className="text-white">{job.releasePin}</strong></span>
                          <span>•</span>
                          <span>{job.pageCount} pgs × {job.copies}</span>
                          <span>•</span>
                          <span className="capitalize">{job.colorMode.replace('_', ' ')}</span>
                          <span>•</span>
                          <span>${job.totalCost.toFixed(2)}</span>
                          <span>•</span>
                          <span>Created {formatTimestamp(job.createdAt)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 sm:flex-shrink-0">
                      <Badge status={job.status} size="sm" />
                      <Button
                        size="sm"
                        variant="primary"
                        leftIcon={<Play className="w-3.5 h-3.5" />}
                        onClick={() => handleRelease(job.id)}
                        loading={actionInProgress === job.id}
                      >
                        Print
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => navigate(`/operator/jobs/${job.id}`)}
                      >
                        Audit
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Required: Completed Jobs Table */}
          <Card>
            <CardHeader
              title={
                <div className="flex items-center gap-2">
                  <FileCheck2 className="w-4 h-4 text-emerald-400" />
                  <span>Completed Jobs & Ejections</span>
                  <span className="text-xs font-mono font-normal text-slate-400">({completedJobs.length} processed)</span>
                </div>
              }
              subtitle="Jobs successfully outputted; confirm DoD RAM wipe"
            />

            <div className="divide-y divide-slate-800/60">
              {completedJobs.map((job) => (
                <div
                  key={job.id}
                  className="p-4 hover:bg-slate-900/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono"
                >
                  <div>
                    <div className="font-semibold text-white font-sans text-sm">{job.documentName}</div>
                    <div className="text-slate-400 mt-0.5">
                      Code: {job.jobCode} • {job.pageCount} pgs • Output: {formatTimestamp(job.printedAt || job.createdAt)}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge status={job.status} size="sm" />
                    {job.status === 'printing' || job.status === 'completed' ? (
                      <Button
                        size="sm"
                        variant="danger"
                        leftIcon={<Flame className="w-3.5 h-3.5" />}
                        onClick={() => handleShred(job.id)}
                        loading={actionInProgress === job.id}
                      >
                        Execute DoD Shred
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => navigate(`/operator/receipt/rcpt-${job.id.replace('job-', '')}`)}
                      >
                        Receipt Slip
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Required: Cleanup Reports */}
          <Card>
            <CardHeader
              title={
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-purple-400" />
                  <span>DoD 5220.22-M Cleanup Reports</span>
                </div>
              }
              subtitle="Tamper-proof certificates confirming 3-pass zero overwrite of printer RAM"
            />
            <CardContent className="space-y-3">
              {cleanupReports.map((job) => (
                <div key={job.id} className="p-3.5 rounded-xl bg-purple-950/20 border border-purple-500/30 text-xs font-mono space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-white font-sans">{job.documentName} ({job.jobCode})</div>
                    <span className="text-purple-300 font-bold bg-purple-950 px-2 py-0.5 rounded border border-purple-500/40 text-[10px]">
                      SANID: 3-PASS ZERO
                    </span>
                  </div>
                  <div className="text-slate-400 text-[11px]">
                    Shred Certificate Hash: <code className="text-purple-300 font-mono break-all">{job.shreddingHash || 'SHRED-CERT-ba7816bf8f01cfea414140de5dae2223b00361a3'}</code>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-slate-500 pt-1 border-t border-purple-500/20">
                    <span>Sanitized At: {formatTimestamp(job.shreddedAt || job.createdAt)}</span>
                    <button
                      onClick={() => navigate(`/operator/receipt/rcpt-${job.id.replace('job-', '')}`)}
                      className="text-cyan-400 hover:underline"
                    >
                      View Signed Receipt &rarr;
                    </button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right 1 Col: Station Scanner/PIN Entry + Printer Status */}
        <div className="space-y-6">
          
          {/* Quick PIN / QR Token Release Station */}
          <Card glow className="border-cyan-500/30">
            <CardHeader
              title="Station Release Scanner"
              subtitle="Enter 6-digit PIN or scan customer QR"
            />
            <CardContent>
              <form onSubmit={handleVerify} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono font-medium text-slate-300 mb-1.5">
                    CUSTOMER TOKEN INPUT
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-cyan-400" />
                    <input
                      type="text"
                      placeholder="e.g. 721-654 or 915-407"
                      value={pinInput}
                      onChange={(e) => setPinInput(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-900 border border-cyan-500/40 text-sm font-mono tracking-widest text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div className="flex justify-between items-center mt-1.5 text-[11px] font-mono text-slate-400">
                    <span>Sample: 721-654</span>
                    <button
                      type="button"
                      onClick={() => setPinInput('721-654')}
                      className="text-cyan-400 hover:underline"
                    >
                      Fill
                    </button>
                  </div>
                </div>

                {verifyError && (
                  <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs font-mono flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>{verifyError}</span>
                  </div>
                )}

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full text-xs font-mono"
                  loading={verifying}
                >
                  Verify Customer QR / PIN
                </Button>
              </form>

              {verifiedJob && (
                <div className="mt-4 p-3.5 rounded-xl bg-slate-900 border border-cyan-500/40 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-bold text-emerald-400 uppercase font-mono">TOKEN VALID</span>
                      <h4 className="text-xs font-bold text-white font-sans truncate max-w-[180px]">{verifiedJob.documentName}</h4>
                    </div>
                    <Badge status={verifiedJob.status} size="sm" />
                  </div>

                  <div className="text-[11px] font-mono text-slate-400 space-y-1 bg-slate-950 p-2 rounded">
                    <div>Pages: <strong className="text-white">{verifiedJob.pageCount} ({verifiedJob.colorMode})</strong></div>
                    <div>Cost: <strong className="text-emerald-400">${verifiedJob.totalCost.toFixed(2)}</strong></div>
                  </div>

                  {verifiedJob.status === 'ready' || verifiedJob.status === 'queued' ? (
                    <Button
                      size="sm"
                      variant="primary"
                      className="w-full text-xs font-mono"
                      leftIcon={<Play className="w-3.5 h-3.5" />}
                      onClick={() => handleRelease(verifiedJob.id)}
                    >
                      Release to Printer Spool
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="danger"
                      className="w-full text-xs font-mono"
                      leftIcon={<Flame className="w-3.5 h-3.5" />}
                      onClick={() => handleShred(verifiedJob.id)}
                    >
                      Execute DoD Shred
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Required: Printer Status */}
          <Card>
            <CardHeader
              title="Printer Status & Hardware Fleet"
              subtitle="Attached direct-spool printers"
            />
            <CardContent className="space-y-4">
              {printers.map((prt) => (
                <div key={prt.id} className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="font-semibold text-white font-sans truncate">{prt.name}</div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase ${
                      prt.status === 'online' ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30' :
                      prt.status === 'busy' ? 'bg-amber-950/60 text-amber-400 border border-amber-500/30' :
                      'bg-slate-800 text-slate-400'
                    }`}>
                      {prt.status}
                    </span>
                  </div>

                  <div className="text-[10px] font-mono text-slate-400">
                    Model: {prt.model} • Network: {prt.ipAddress}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-400 bg-slate-950/80 p-2 rounded-lg border border-slate-800/80">
                    <div>
                      <span>Paper Tray: </span>
                      <strong className="text-white">{prt.paperLevel}%</strong>
                    </div>
                    <div>
                      <span>Toner Level: </span>
                      <strong className="text-white">{prt.tonerBlack}%</strong>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Station Diagnostics Card */}
          <Card>
            <CardHeader
              title="Station Hardware Integrity"
              subtitle="Hardware isolation verification"
            />
            <CardContent className="space-y-2 text-xs font-mono text-slate-400">
              <div className="flex justify-between">
                <span>Compliance:</span>
                <span className="text-emerald-400 font-bold">NIST SP 800-88</span>
              </div>
              <div className="flex justify-between">
                <span>Firmware:</span>
                <span className="text-white">v2.4.1-Hardened</span>
              </div>
              <div className="flex justify-between">
                <span>Direct IPP/TLS:</span>
                <span className="text-cyan-400 font-bold">Active (Port 631)</span>
              </div>
            </CardContent>
          </Card>

        </div>

      </div>
    </OperatorLayout>
  );
};
