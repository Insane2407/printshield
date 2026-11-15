import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useJobs } from '../context/JobContext';
import { useAuth } from '../context/AuthContext';
import { CustomerLayout } from '../components/layout/CustomerLayout';
import { OperatorLayout } from '../components/layout/OperatorLayout';
import { Button } from '../components/common/Button';
import { ShieldLogo } from '../components/common/ShieldLogo';
import { formatTimestamp } from '../lib/utils';
import { 
  Printer, 
  Flame, 
  ShieldCheck, 
  Copy, 
  Check, 
  ArrowLeft, 
  Download, 
  CheckCircle2, 
  FileCheck
} from 'lucide-react';

export const ReceiptPage: React.FC = () => {
  const { receiptId } = useParams<{ receiptId: string }>();
  const navigate = useNavigate();
  const { receipts } = useJobs();
  const { role } = useAuth();

  const currentReceipt = receipts.find(r => r.id === receiptId || r.jobCode === receiptId || r.receiptNumber === receiptId) || receipts[0];

  const [copiedHash, setCopiedHash] = useState(false);

  const LayoutComponent = role === 'operator' ? OperatorLayout : CustomerLayout;
  const backRoute = role === 'operator' ? '/operator' : '/customer';

  if (!currentReceipt) {
    return (
      <LayoutComponent>
        <div className="p-12 text-center text-slate-400 font-mono">
          No receipt generated yet.{' '}
          <Link to={backRoute} className="text-cyan-400 hover:underline">
            Return to Dashboard
          </Link>
        </div>
      </LayoutComponent>
    );
  }

  const handleCopyProof = () => {
    navigator.clipboard.writeText(currentReceipt.shreddingProofHash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const handleDownloadReceipt = () => {
    // Standard clean receipt download / print
    window.print();
  };

  return (
    <LayoutComponent>
      {/* Top Bar with Back Link & Download Action */}
      <div className="flex items-center justify-between gap-4">
        <Link
          to={backRoute}
          className="inline-flex items-center gap-2 text-xs font-mono text-slate-400 hover:text-cyan-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>BACK TO DASHBOARD</span>
        </Link>

        {/* Receipt Switcher & Download Button */}
        <div className="flex items-center gap-3">
          <select
            value={currentReceipt.id}
            onChange={(e) => navigate(role === 'operator' ? `/operator/receipt/${e.target.value}` : `/customer/receipt/${e.target.value}`)}
            className="p-1.5 px-3 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
          >
            {receipts.map((r) => (
              <option key={r.id} value={r.id}>
                {r.receiptNumber} ({r.jobCode})
              </option>
            ))}
          </select>

          <Button
            size="sm"
            variant="primary"
            leftIcon={<Download className="w-3.5 h-3.5" />}
            onClick={handleDownloadReceipt}
          >
            Download Receipt
          </Button>
        </div>
      </div>

      {/* Main Cryptographic Receipt Certificate */}
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* Physical-style Certificate Card */}
        <div className="relative p-8 sm:p-12 rounded-3xl bg-[#090F1C] border border-cyan-500/40 shadow-[0_0_35px_rgba(6,182,212,0.15)] text-slate-100 font-mono print:bg-white print:text-black print:border-black">
          
          {/* Subtle Cyber Corner Badges */}
          <div className="absolute top-4 right-4 text-[10px] text-cyan-400 border border-cyan-500/30 bg-cyan-950/60 px-2 py-0.5 rounded print:hidden">
            CRYPTOGRAPHIC PROOF ISSUED
          </div>

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-6 border-b border-slate-800">
            <div>
              <ShieldLogo size="md" subtitle="Zero-Knowledge Cybercafé Printing" />
              <div className="text-xs text-slate-400 mt-3 space-y-0.5">
                <div>{currentReceipt.cybercafeName}</div>
                <div>{currentReceipt.cybercafeAddress}</div>
                <div>Station Terminal: <span className="text-white font-semibold">{currentReceipt.terminalId}</span></div>
              </div>
            </div>

            <div className="sm:text-right space-y-1">
              <div className="text-xs text-slate-500 font-bold uppercase">RECEIPT NO.</div>
              <div className="text-sm font-bold text-cyan-400 font-mono">{currentReceipt.receiptNumber}</div>
              <div className="text-xs text-slate-400">{formatTimestamp(currentReceipt.issuedAt)}</div>
              <div className="text-xs text-slate-400">Operator: {currentReceipt.operatorName}</div>
            </div>
          </div>

          {/* Required: Print Status & Cleanup Status Banner */}
          <div className="py-4 border-b border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-center gap-2 text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <div>
                <span className="text-[10px] text-slate-400 block font-mono uppercase">PRINT STATUS:</span>
                <span className="text-emerald-300 font-bold">{currentReceipt.printStatus}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-500/30 flex items-center gap-2 text-xs">
              <Flame className="w-4 h-4 text-purple-400 flex-shrink-0" />
              <div>
                <span className="text-[10px] text-slate-400 block font-mono uppercase">CLEANUP STATUS:</span>
                <span className="text-purple-300 font-bold">{currentReceipt.cleanupStatus}</span>
              </div>
            </div>
          </div>

          {/* Required: Print Job Details Table */}
          <div className="py-6 border-b border-slate-800 space-y-4">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
              PRINT JOB DETAILS
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-start text-xs">
                <div>
                  <div className="font-bold text-white font-sans text-sm">{currentReceipt.documentName}</div>
                  <div className="text-slate-400 text-[11px]">
                    Reference: {currentReceipt.jobCode} • Format: {currentReceipt.colorMode.replace('_', ' ').toUpperCase()} • {currentReceipt.copies} {currentReceipt.copies > 1 ? 'copies' : 'copy'}
                  </div>
                </div>
                <div className="text-right font-bold text-white font-mono">
                  ${currentReceipt.totalAmount.toFixed(2)}
                </div>
              </div>

              <div className="pt-2 flex justify-between text-xs text-slate-400 border-t border-slate-800/60">
                <span>Page Rate ({currentReceipt.pages} pages @ ${currentReceipt.costPerPage.toFixed(2)}/pg)</span>
                <span>${(currentReceipt.pages * currentReceipt.copies * currentReceipt.costPerPage).toFixed(2)}</span>
              </div>

              <div className="flex justify-between text-xs text-slate-400">
                <span>Cryptographic Transit & RAM-Spool Isolation Fee</span>
                <span className="text-emerald-400 font-bold">WAIVED ($0.00)</span>
              </div>
            </div>

            {/* Total Settled */}
            <div className="pt-4 border-t border-slate-800 flex justify-between items-center text-sm font-bold">
              <span className="text-white">TOTAL SETTLED:</span>
              <span className="text-xl text-cyan-400">${currentReceipt.totalAmount.toFixed(2)} USD</span>
            </div>
          </div>

          {/* Required: Document Hash & DoD 5220.22-M Certificate */}
          <div className="py-6 border-b border-slate-800 space-y-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-purple-950/80 border border-purple-500/40 text-purple-400">
                <Flame className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-purple-300 uppercase tracking-wider">
                CERTIFICATE OF IMMEDIATE SANITIZATION
              </span>
            </div>

            <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/30 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Sanitization Standard:</span>
                <span className="text-white font-bold">DoD 5220.22-M (3-Pass Zero Overwrite)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Buffer Overwritten:</span>
                <span className="text-white font-bold">RAM-Disk Spool Segment & Ephemeral Decryptor</span>
              </div>
              
              <div className="pt-2 border-t border-purple-500/20">
                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                  <span>SHREDDING VERIFICATION HASH:</span>
                  <button
                    onClick={handleCopyProof}
                    className="text-cyan-400 hover:underline flex items-center gap-1 print:hidden"
                  >
                    {copiedHash ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedHash ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <div className="p-2 rounded bg-slate-950/80 border border-purple-500/20 font-mono text-[10px] text-purple-300 break-all select-all">
                  {currentReceipt.shreddingProofHash}
                </div>
              </div>
            </div>
          </div>

          {/* Required: Document Hash Block */}
          <div className="pt-6 space-y-3 text-xs">
            <div className="text-[11px] text-slate-400">
              CLIENT SHA-256 DOCUMENT HASH:
              <div className="text-slate-300 font-mono text-[10px] break-all select-all mt-0.5">
                {currentReceipt.documentHashSha256}
              </div>
            </div>

            <div className="text-[11px] text-slate-400">
              CLIENT KEY FINGERPRINT:
              <div className="text-cyan-400 font-mono text-[10px] break-all select-all mt-0.5">
                {currentReceipt.clientKeyFingerprint}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2.5 print:border-black">
              <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Zero-Retention Guarantee:</strong> No digital copy of this document remains on any hard drive, cloud server, or printer spool memory connected to PrintShield.
              </span>
            </div>
          </div>

        </div>

      </div>
    </LayoutComponent>
  );
};
