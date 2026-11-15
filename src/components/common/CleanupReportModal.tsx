import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Badge } from './Badge';
import { Button } from './Button';
import { api } from '../../services/api';
import { CleanupReport } from '../../types';
import { formatTimestamp } from '../../lib/utils';
import { 
  ShieldCheck, 
  Trash2, 
  Flame, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  Server, 
  Monitor, 
  FileCheck,
  Lock,
  Clock
} from 'lucide-react';

interface CleanupReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: string;
  documentName?: string;
  onCleanupUpdated?: () => void;
}

export const CleanupReportModal: React.FC<CleanupReportModalProps> = ({
  isOpen,
  onClose,
  jobId,
  documentName,
  onCleanupUpdated,
}) => {
  const [report, setReport] = useState<CleanupReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = async () => {
    if (!jobId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.jobs.getCleanupReport(jobId);
      setReport(data);
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve cleanup report.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && jobId) {
      fetchReport();
    }
  }, [isOpen, jobId]);

  const handleRetryCleanup = async () => {
    if (!jobId) return;
    setRetrying(true);
    setError(null);
    try {
      const updated = await api.jobs.retryCleanup(jobId, 'MANUAL_RETRY');
      setReport(updated);
      if (onCleanupUpdated) onCleanupUpdated();
    } catch (err: any) {
      setError(err.message || 'Cleanup retry failed.');
    } finally {
      setRetrying(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Trash2 className="w-5 h-5 text-purple-400" />
          <span>Zero-Retention Cleanup Audit Report</span>
        </div>
      }
      subtitle={`Job Code: ${jobId} ${documentName ? `• ${documentName}` : ''}`}
      maxWidth="lg"
    >
      <div className="space-y-5">
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-3 font-mono text-xs text-slate-400">
            <RefreshCw className="w-6 h-6 text-cyan-400 animate-spin" />
            <span>Fetching verified destruction telemetry from vault...</span>
          </div>
        ) : error && !report ? (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs font-mono space-y-3">
            <div className="flex items-center gap-2 font-bold">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>Failed to load cleanup report</span>
            </div>
            <p>{error}</p>
            <Button size="sm" variant="outline" onClick={fetchReport}>
              Retry Fetch
            </Button>
          </div>
        ) : report ? (
          <>
            {/* Header Status Card */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-mono text-slate-500 block uppercase">CLEANUP STATUS:</span>
                <div className="mt-1">
                  <Badge cleanupStatus={report.status as any} size="lg" />
                </div>
              </div>

              <div className="text-right text-xs font-mono text-slate-400">
                <div>Trigger: <strong className="text-white">{report.trigger_reason}</strong></div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Completed: {report.completed_at ? formatTimestamp(report.completed_at) : 'Pending execution'}
                </div>
              </div>
            </div>

            {/* Two-Column Verification Grid: Server vs Print Station */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* SERVER AUDIT */}
              <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-cyan-300 border-b border-slate-800 pb-2">
                  <Server className="w-4 h-4 text-cyan-400" />
                  <span>SERVER VAULT CLEANUP</span>
                </div>

                <div className="space-y-2 text-xs font-mono">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
                    <span className="text-slate-400">Encrypted Document</span>
                    {report.server.encrypted_file_deleted ? (
                      <span className="inline-flex items-center gap-1 text-emerald-400 font-bold text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        ABSENT / OVERWRITTEN
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-amber-400 font-bold text-[11px]">
                        <Clock className="w-3.5 h-3.5" />
                        PENDING
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
                    <span className="text-slate-400">Master-Wrapped Key</span>
                    {report.server.key_file_deleted ? (
                      <span className="inline-flex items-center gap-1 text-emerald-400 font-bold text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        PURGED / DESTROYED
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-amber-400 font-bold text-[11px]">
                        <Clock className="w-3.5 h-3.5" />
                        PENDING
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
                    <span className="text-slate-400">Access Tokens</span>
                    <span className="text-cyan-300 font-bold">
                      {report.server.tokens_invalidated_count} Invalidated
                    </span>
                  </div>
                </div>
              </div>

              {/* PRINT STATION AUDIT */}
              <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-purple-300 border-b border-slate-800 pb-2">
                  <Monitor className="w-4 h-4 text-purple-400" />
                  <span>PRINT STATION CLEANUP</span>
                </div>

                <div className="space-y-2 text-xs font-mono">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
                    <span className="text-slate-400">Decrypted PDF File</span>
                    {report.station.decrypted_file_deleted ? (
                      <span className="inline-flex items-center gap-1 text-emerald-400 font-bold text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        DoD 3-PASS WIPED
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-amber-400 font-bold text-[11px]">
                        <Clock className="w-3.5 h-3.5" />
                        PENDING / IN-MEMORY
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
                    <span className="text-slate-400">Restricted Scratch Files</span>
                    <span className="text-purple-300 font-bold">
                      {report.station.temp_files_deleted_count} Files Overwritten
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
                    <span className="text-slate-400">Application Memory</span>
                    {report.station.job_data_cleared ? (
                      <span className="inline-flex items-center gap-1 text-emerald-400 font-bold text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        PURGED FROM RAM
                      </span>
                    ) : (
                      <span className="text-slate-500">Not active</span>
                    )}
                  </div>
                </div>
              </div>

            </div>

            {/* Cryptographic Certificate */}
            {report.shredding_hash && (
              <div className="p-3.5 rounded-xl bg-purple-950/30 border border-purple-500/30 font-mono text-xs text-purple-300 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-[11px]">
                  <Flame className="w-3.5 h-3.5 text-purple-400" />
                  <span>DOD 5220.22-M CERTIFICATE HASH:</span>
                </div>
                <code className="text-purple-200 text-[10px] break-all block">
                  {report.shredding_hash}
                </code>
              </div>
            )}

            {/* Errors / Transparent Failure Reporting */}
            {report.errors && report.errors.length > 0 && (
              <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 font-mono text-xs space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-rose-400">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Cleanup Warnings / Non-Critical Exceptions:</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-[11px] text-rose-200">
                  {report.errors.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Strict Regulatory Disclaimer */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-400 leading-relaxed flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-300">Privacy & Scope Boundary:</strong> PrintShield reports and guarantees the physical destruction of only its own managed files (encrypted server blobs, wrapped master keys, temporary station decrypt streams, and one-time tokens) and verifies their absence on the filesystem. No unmanaged OS operating files or external printer spool hardware are affected.
              </div>
            </div>

            {/* Actions: Manual Retry & Close */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-800 font-mono text-xs">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetryCleanup}
                loading={retrying}
                leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${retrying ? 'animate-spin' : ''}`} />}
              >
                Manual Cleanup Retry
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={onClose}
              >
                Done
              </Button>
            </div>
          </>
        ) : null}
      </div>
    </Modal>
  );
};
