import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, Clock, ShieldCheck, QrCode } from 'lucide-react';

interface QRCodeCardProps {
  value: string;
  pin: string;
  jobCode: string;
  documentName?: string;
  expiresAt?: string;
  size?: number;
  className?: string;
}

export const QRCodeCard: React.FC<QRCodeCardProps> = ({
  value,
  pin,
  jobCode,
  documentName,
  expiresAt,
  size = 180,
  className = '',
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(pin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`p-6 rounded-2xl bg-[#090F1C] border border-cyan-500/30 shadow-[0_0_25px_rgba(6,182,212,0.15)] flex flex-col items-center text-center ${className}`}>
      
      {/* Header Tag */}
      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/70 border border-cyan-500/40 text-cyan-300 font-mono text-[11px] mb-4">
        <QrCode className="w-3.5 h-3.5 text-cyan-400" />
        <span>ONE-TIME KIOSK RELEASE QR</span>
      </div>

      {/* QR Code Container with Glowing Frame */}
      <div className="relative p-4 rounded-2xl bg-white/95 border-2 border-cyan-400/80 shadow-[0_0_20px_rgba(6,182,212,0.4)] group">
        <QRCodeSVG
          value={value || `printshield://release?job=${jobCode}&pin=${pin}`}
          size={size}
          level="H"
          includeMargin={false}
          bgColor="#FFFFFF"
          fgColor="#060A12"
        />

        {/* Center Shield Decal */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-9 h-9 rounded-lg bg-[#060A12] border border-cyan-400 flex items-center justify-center text-cyan-400 shadow-md">
            <span className="font-extrabold text-[10px] font-mono tracking-tighter">PS</span>
          </div>
        </div>
      </div>

      {/* PIN Code Box */}
      <div className="mt-5 w-full">
        <div className="text-[10px] font-mono uppercase text-slate-400 tracking-wider">
          OR VERBAL 6-DIGIT RELEASE PIN
        </div>
        <div className="mt-1 flex items-center justify-center gap-2">
          <span className="text-2xl font-extrabold font-mono tracking-widest text-white text-glow-cyan bg-slate-900/90 py-1.5 px-4 rounded-xl border border-cyan-500/30">
            {pin}
          </span>
          <button
            onClick={handleCopy}
            title="Copy PIN"
            className="p-2 rounded-xl bg-slate-900 border border-slate-700/80 text-slate-400 hover:text-cyan-400 transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expiration Note */}
      {expiresAt && (
        <div className="mt-4 flex items-center gap-1.5 text-xs font-mono text-amber-400/90">
          <Clock className="w-3.5 h-3.5" />
          <span>Single-use token • Ephemeral 60m TTL</span>
        </div>
      )}

      {documentName && (
        <div className="mt-2 text-xs font-sans text-slate-400 truncate max-w-[220px]">
          Target: <strong className="text-slate-200">{documentName}</strong> ({jobCode})
        </div>
      )}
    </div>
  );
};
