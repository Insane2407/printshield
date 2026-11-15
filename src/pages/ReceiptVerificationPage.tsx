import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { ReceiptVerificationResult } from '../types';
import { Button } from '../components/common/Button';
import { ShieldLogo } from '../components/common/ShieldLogo';
import { Badge } from '../components/common/Badge';
import { formatTimestamp } from '../lib/utils';
import { 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Search, 
  Download, 
  ArrowLeft, 
  Lock, 
  FileCheck, 
  Server, 
  Monitor, 
  RefreshCw,
  Copy,
  Check
} from 'lucide-react';

export const ReceiptVerificationPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const initialReceiptId = searchParams.get('receiptId') || '';
  const [receiptIdInput, setReceiptIdInput] = useState(initialReceiptId);
  const [verifying, setVerifying] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [result, setResult] = useState<ReceiptVerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  // Independent manual signature verify mode
  const [manualMode, setManualMode] = useState(false);
  const [canonicalJsonInput, setCanonicalJsonInput] = useState('');
  const [signatureInput, setSignatureInput] = useState('');
  const [publicKeyInput, setPublicKeyInput] = useState('');

  const runVerification = async (targetId: string) => {
    if (!targetId.trim()) return;
    setVerifying(true);
    setError(null);
    try {
      const res = await api.receipts.verify({ receipt_id: targetId.trim() });
      setResult(res);
      if (res.receipt && res.receipt.canonical_data) {
        setCanonicalJsonInput(res.receipt.canonical_data);
        setSignatureInput(res.receipt.signature);
        setPublicKeyInput(res.signer_public_key || '');
      }
    } catch (err: any) {
      setError(err.message || 'Verification request failed.');
      setResult(null);
    } finally {
      setVerifying(false);
    }
  };

  const handleManualVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canonicalJsonInput.trim() || !signatureInput.trim()) {
      setError('Please provide both canonical JSON data and signature string.');
      return;
    }
    setVerifying(true);
    setError(null);
    try {
      const res = await api.receipts.verify({
        canonical_data: canonicalJsonInput.trim(),
        signature: signatureInput.trim(),
        public_key: publicKeyInput.trim() || undefined
      });
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'Manual cryptographic verification failed.');
      setResult(null);
    } finally {
      setVerifying(false);
    }
  };

  useEffect(() => {
    if (initialReceiptId) {
      runVerification(initialReceiptId);
    }
  }, [initialReceiptId]);

  const handleDownloadPdf = async (id: string) => {
    setDownloadingPdf(true);
    try {
      const blob = await api.receipts.downloadPdf(id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `PrintShield_Receipt_${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to download PDF receipt from server.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070D18] text-slate-100 flex flex-col font-sans">
      
      {/* Top Navigation */}
      <header className="border-b border-slate-800 bg-[#090F1C]/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/customer" className="text-slate-400 hover:text-cyan-400 transition-colors p-1">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <ShieldLogo size="sm" subtitle="Public Audit Verifier" />
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/customer"
              className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-slate-300 hover:text-white"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-6">
        
        {/* Title Header */}
        <div className="text-center space-y-2 py-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 font-mono text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span>ED25519 CRYPTOGRAPHIC PROOF VERIFIER</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Verify Digital Receipt & Audit Trail
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto font-mono">
            Verify the mathematical integrity, document hash, and server root signature of any PrintShield digital receipt.
          </p>
        </div>

        {/* Verification Input Box */}
        <div className="p-6 rounded-2xl bg-[#090F1C] border border-cyan-500/30 shadow-[0_0_25px_rgba(6,182,212,0.1)] space-y-4 font-mono">
          
          <div className="flex justify-between items-center pb-3 border-b border-slate-800 text-xs">
            <span className="font-bold text-white uppercase">VERIFICATION INPUT</span>
            <button
              onClick={() => setManualMode(!manualMode)}
              className="text-cyan-400 hover:underline text-[11px]"
            >
              {manualMode ? '← Search by Receipt ID' : 'Advanced: Paste Raw Signature & Canonical Data →'}
            </button>
          </div>

          {!manualMode ? (
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="e.g. RCPT-20261115-A884BB or Job ID PS-A884BB"
                  value={receiptIdInput}
                  onChange={(e) => setReceiptIdInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && runVerification(receiptIdInput)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                />
              </div>
              <Button
                variant="primary"
                onClick={() => runVerification(receiptIdInput)}
                loading={verifying}
                leftIcon={<ShieldCheck className="w-4 h-4" />}
              >
                Verify Receipt
              </Button>
            </div>
          ) : (
            <form onSubmit={handleManualVerify} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">CANONICAL JSON PAYLOAD</label>
                <textarea
                  rows={3}
                  value={canonicalJsonInput}
                  onChange={(e) => setCanonicalJsonInput(e.target.value)}
                  placeholder='{"cleanup_status":"COMPLETED","customer_id":"...","document_hash":"..."}'
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 font-mono text-xs text-slate-300 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">ED25519 SIGNATURE (HEX)</label>
                <input
                  type="text"
                  value={signatureInput}
                  onChange={(e) => setSignatureInput(e.target.value)}
                  placeholder="64-byte hex string (128 characters)"
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 font-mono text-xs text-slate-300 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">PUBLIC KEY (OPTIONAL - DEFAULTS TO PRINTSHIELD ROOT)</label>
                <input
                  type="text"
                  value={publicKeyInput}
                  onChange={(e) => setPublicKeyInput(e.target.value)}
                  placeholder="32-byte public key hex"
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 font-mono text-xs text-slate-300 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                loading={verifying}
                leftIcon={<ShieldCheck className="w-4 h-4" />}
              >
                Verify Cryptographic Signature
              </Button>
            </form>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

        </div>

        {/* Verification Result Card */}
        {result && (
          <div className="p-6 sm:p-8 rounded-3xl bg-[#090F1C] border border-cyan-500/40 shadow-2xl space-y-6 font-mono">
            
            {/* Top Verdict Banner */}
            <div className={`p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 border ${
              result.is_valid
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
            }`}>
              <div className="flex items-center gap-3">
                {result.is_valid ? (
                  <div className="p-2.5 rounded-xl bg-emerald-900/60 text-emerald-400">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                ) : (
                  <div className="p-2.5 rounded-xl bg-rose-900/60 text-rose-400">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                )}
                <div>
                  <div className="font-bold text-base font-sans text-white">
                    {result.is_valid ? 'RECEIPT SIGNATURE & INTEGRITY VERIFIED' : 'VERIFICATION FAILED'}
                  </div>
                  <div className="text-xs text-slate-300 mt-0.5">
                    {result.message}
                  </div>
                </div>
              </div>

              {result.receipt_id && (
                <Button
                  size="sm"
                  variant="primary"
                  leftIcon={<Download className="w-3.5 h-3.5" />}
                  loading={downloadingPdf}
                  onClick={() => handleDownloadPdf(result.receipt_id!)}
                >
                  Download PDF
                </Button>
              )}
            </div>

            {/* Prompt Required UI Status Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              
              {/* Receipt ID */}
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 block uppercase">RECEIPT ID:</span>
                <span className="font-bold text-cyan-300 text-[11px] truncate block">
                  {result.receipt_id || 'N/A'}
                </span>
                <span className="text-[9px] text-slate-500 block">Job: {result.job_id || 'N/A'}</span>
              </div>

              {/* Document Integrity */}
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 block uppercase">DOC INTEGRITY:</span>
                <span className={`inline-flex items-center gap-1 font-bold ${
                  result.document_integrity === 'VERIFIED' ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {result.document_integrity}
                </span>
                <span className="text-[9px] text-slate-500 block">SHA-256 Checksum</span>
              </div>

              {/* Print Status */}
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 block uppercase">PRINT STATUS:</span>
                <span className="font-bold text-white truncate block">
                  {result.print_submission_status || 'PRINT_SUCCESS'}
                </span>
                <span className="text-[9px] text-slate-500 block">Station-Reported</span>
              </div>

              {/* Server & Station Cleanup */}
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 block uppercase">CLEANUP STATUS:</span>
                <span className="font-bold text-purple-300 truncate block">
                  {result.cleanup_status || 'COMPLETED'}
                </span>
                <span className="text-[9px] text-slate-500 block">Zero-Retention</span>
              </div>

            </div>

            {/* Cryptographic Breakdown Details */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 text-xs">
              <div className="font-bold text-white text-xs border-b border-slate-800 pb-2 flex items-center justify-between">
                <span>MATHEMATICAL AUDIT VERIFICATION</span>
                <span className="text-[10px] text-emerald-400 font-mono">ED25519 + SHA-256</span>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400">Canonical Hash Match:</span>
                  <span className={result.hash_valid ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                    {result.hash_valid ? 'EXACT MATCH (RFC 8785 SHA-256)' : 'MISMATCH'}
                  </span>
                </div>

                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400">Digital Signature Match:</span>
                  <span className={result.signature_valid ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                    {result.signature_valid ? 'VALID (Verified Against Root Public Key)' : 'INVALID SIGNATURE'}
                  </span>
                </div>

                {result.document_hash && (
                  <div>
                    <span className="text-[10px] text-slate-500 block mt-2">ORIGINAL DOCUMENT SHA-256 CHECKSUM:</span>
                    <span className="text-[10px] text-slate-300 break-all select-all block">{result.document_hash}</span>
                  </div>
                )}

                {result.signer_public_key && (
                  <div>
                    <span className="text-[10px] text-slate-500 block mt-2">PRINTSHIELD ROOT PUBLIC KEY:</span>
                    <span className="text-[10px] text-cyan-300 break-all select-all block">{result.signer_public_key}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Strict Regulatory Disclaimers */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 leading-relaxed space-y-2">
              <div className="flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                <div>
                  <strong>Zero-Retention Guarantee:</strong> In accordance with cryptographic privacy standards, this receipt stores only hash proofs and timestamps. Original document bytes and encryption keys are destroyed upon completion.
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Monitor className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                <div>
                  <strong>Scope Boundary:</strong> Milestones labeled as station-reported reflect cryptographically signed transmissions received from the authorized print station agent. This receipt certifies software workflow execution and does not represent an absolute guarantee of physical paper feed or external printer hardware state.
                </div>
              </div>
            </div>

          </div>
        )}

      </main>
    </div>
  );
};
