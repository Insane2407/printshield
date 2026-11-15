import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useJobs } from '../../context/JobContext';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { QRCodeCard } from '../common/QRCodeCard';
import { 
  FileCheck, 
  Lock, 
  ShieldCheck, 
  ArrowRight,
} from 'lucide-react';

export const NewJobModal: React.FC = () => {
  const { isUploadModalOpen, closeUploadModal, createJob } = useJobs();
  const navigate = useNavigate();

  // Form states
  const [docName, setDocName] = useState('Quarterly_Audit_Report.pdf');
  const [pages, setPages] = useState<number>(6);
  const [copies, setCopies] = useState<number>(1);
  const [colorMode, setColorMode] = useState<'black_and_white' | 'color'>('color');
  const [paperSize, setPaperSize] = useState<'A4' | 'Letter' | 'Legal'>('A4');
  const [duplex, setDuplex] = useState<boolean>(true);
  const [isEncrypting, setIsEncrypting] = useState<boolean>(false);
  const [createdJobData, setCreatedJobData] = useState<{ jobCode: string; pin: string; id: string; qrPayload: string } | null>(null);

  // Dynamic cost calculation
  const pricePerPage = colorMode === 'color' ? 0.30 : 0.15;
  const totalCost = (pages * copies * pricePerPage).toFixed(2);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsEncrypting(true);

    // Simulate client-side encryption step
    setTimeout(async () => {
      try {
        const fakeSha = Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
        const newJob = await createJob({
          documentName: docName.trim() || 'Encrypted_Document.pdf',
          fileSizeBytes: 2450000,
          pageCount: pages,
          copies: copies,
          colorMode,
          paperSize,
          duplex,
          cybercafeId: 'cafe-01',
          clientHashSha256: fakeSha,
          keyFingerprint: 'SHA256:9A4E:7F82:B01C:53ED:9821:4B2C:77AF:D012',
        });

        setIsEncrypting(false);
        setCreatedJobData({
          jobCode: newJob.jobCode,
          pin: newJob.releasePin,
          id: newJob.id,
          qrPayload: newJob.qrPayload,
        });
      } catch (err) {
        setIsEncrypting(false);
      }
    }, 900);
  };

  const resetAndClose = () => {
    setCreatedJobData(null);
    closeUploadModal();
  };

  return (
    <Modal
      isOpen={isUploadModalOpen}
      onClose={resetAndClose}
      title={createdJobData ? "Security QR & Token Generated" : "Encrypt Document for Cybercafé Printing"}
      subtitle={createdJobData ? "Present this QR code to the kiosk operator" : "Zero-knowledge encryption happens in your browser before upload"}
      maxWidth="lg"
    >
      {createdJobData ? (
        <div className="space-y-6 text-center py-2">
          
          <QRCodeCard
            value={createdJobData.qrPayload}
            pin={createdJobData.pin}
            jobCode={createdJobData.jobCode}
            documentName={docName}
            size={180}
            className="w-full"
          />

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-left space-y-2 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-slate-400">Job Reference:</span>
              <span className="text-cyan-400 font-bold">{createdJobData.jobCode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Kiosk Destination:</span>
              <span className="text-white">CyberHub Station Downtown (Terminal 04)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Retention Policy:</span>
              <span className="text-purple-300">RAM-Spool Only & Immediate DoD Shred</span>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={resetAndClose}
            >
              Done
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              rightIcon={<ArrowRight className="w-4 h-4" />}
              onClick={() => {
                const targetId = createdJobData.id;
                resetAndClose();
                navigate(`/customer/jobs/${targetId}`);
              }}
            >
              Inspect Security Trail
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleCreate} className="space-y-5">
          {/* File selector */}
          <div>
            <label className="block text-xs font-mono font-medium text-slate-300 mb-2">
              DOCUMENT SELECTION
            </label>
            <div className="p-4 rounded-xl border border-dashed border-cyan-500/40 bg-cyan-950/10 hover:bg-cyan-950/20 transition-colors flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  <FileCheck className="w-6 h-6" />
                </div>
                <div>
                  <input
                    type="text"
                    value={docName}
                    onChange={(e) => setDocName(e.target.value)}
                    className="bg-transparent text-sm font-semibold text-white focus:outline-none border-b border-transparent focus:border-cyan-400 font-sans"
                    placeholder="Document_Name.pdf"
                    required
                  />
                  <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                    2.45 MB • SHA-256 hash verified locally
                  </div>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-400 text-[10px] font-mono">
                LOCAL AES
              </span>
            </div>
          </div>

          {/* Print Parameters Grid */}
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
              <label className="block text-slate-400 mb-1.5 font-medium">PAPER SIZE</label>
              <select
                value={paperSize}
                onChange={(e) => setPaperSize(e.target.value as any)}
                className="w-full p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs font-mono focus:border-cyan-500 focus:outline-none"
              >
                <option value="A4">A4 (Standard)</option>
                <option value="Letter">US Letter</option>
                <option value="Legal">Legal</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1.5 font-medium">PAGE COUNT</label>
              <input
                type="number"
                min={1}
                max={500}
                value={pages}
                onChange={(e) => setPages(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs font-mono focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1.5 font-medium">COPIES</label>
              <input
                type="number"
                min={1}
                max={20}
                value={copies}
                onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs font-mono focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Cybercafé Kiosk Selection */}
          <div>
            <label className="block text-xs font-mono font-medium text-slate-300 mb-1.5">
              TARGET CYBERCAFÉ KIOSK
            </label>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs font-mono flex items-center justify-between">
              <div>
                <div className="font-semibold text-white">CyberHub Station Downtown (Terminal 04)</div>
                <div className="text-[11px] text-slate-400">742 Market St • RAM Spool Engine Active</div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-950/70 border border-emerald-500/30 text-emerald-400 text-[10px]">
                ONLINE
              </span>
            </div>
          </div>

          {/* Cryptographic Guarantee Notice */}
          <div className="p-3 rounded-xl bg-blue-950/20 border border-blue-500/30 flex items-start gap-2.5 text-[11px] text-slate-300 font-mono">
            <Lock className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
            <div>
              <span className="text-cyan-400 font-semibold">Zero-Knowledge Guarantee:</span>{' '}
              A 256-bit ephemeral symmetric key encrypts this file on your device. The kiosk server receives only ciphertext. The decryption key is passed only once when your QR is scanned.
            </div>
          </div>

          {/* Total & Action */}
          <div className="pt-2 flex items-center justify-between border-t border-slate-800">
            <div>
              <span className="text-xs text-slate-400 font-mono">ESTIMATED COST:</span>
              <div className="text-xl font-bold font-mono text-cyan-400">${totalCost}</div>
            </div>

            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={resetAndClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={isEncrypting}
                leftIcon={<Lock className="w-4 h-4" />}
              >
                {isEncrypting ? "Encrypting Locally..." : "Encrypt & Generate QR Token"}
              </Button>
            </div>
          </div>
        </form>
      )}
    </Modal>
  );
};
