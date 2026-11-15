import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Copy, 
  Check, 
  Clock, 
  QrCode, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2,
  Share2
} from 'lucide-react';
import { Button } from './Button';

interface QRCodeCardProps {
  value: string;
  pin: string;
  jobCode: string;
  documentName?: string;
  expiresAt?: string;
  initialSecondsRemaining?: number;
  size?: number;
  isUsed?: boolean;
  onRegenerate?: () => Promise<void> | void;
  className?: string;
}

export const QRCodeCard: React.FC<QRCodeCardProps> = ({
  value,
  pin,
  jobCode,
  documentName,
  expiresAt,
  initialSecondsRemaining = 300,
  size = 180,
  isUsed = false,
  onRegenerate,
  className = '',
}) => {
  const [copiedPin, setCopiedPin] = useState(false);
  const [copiedPayload, setCopiedPayload] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  // Calculate remaining seconds
  const calculateInitialSeconds = () => {
    if (expiresAt) {
      const diff = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000);
      return Math.max(0, diff);
    }
    return initialSecondsRemaining;
  };

  const [secondsRemaining, setSecondsRemaining] = useState<number>(calculateInitialSeconds);

  // Sync when expiresAt changes
  useEffect(() => {
    setSecondsRemaining(calculateInitialSeconds());
  }, [expiresAt, initialSecondsRemaining]);

  // Live Countdown Timer
  useEffect(() => {
    if (isUsed || secondsRemaining <= 0) return;

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsRemaining, isUsed]);

  const isExpired = !isUsed && secondsRemaining <= 0;

  const formatCountdown = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleCopyPin = () => {
    navigator.clipboard.writeText(pin);
    setCopiedPin(true);
    setTimeout(() => setCopiedPin(false), 2000);
  };

  const handleCopyPayload = () => {
    navigator.clipboard.writeText(value);
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 2000);
  };

  const handleRegenerateClick = async () => {
    if (!onRegenerate) return;
    setIsRegenerating(true);
    try {
      await onRegenerate();
    } finally {
      setIsRegenerating(false);
    }
  };

  // Progress percentage (out of 300 seconds default, or current relative max)
  const maxSeconds = 300;
  const progressPercent = Math.min(100, Math.max(0, (secondsRemaining / maxSeconds) * 100));

  return (
    <div className={`p-6 rounded-2xl bg-[#090F1C] border border-cyan-500/30 shadow-[0_0_25px_rgba(6,182,212,0.15)] flex flex-col items-center text-center ${className}`}>
      
      {/* Header Tag with Status Pill */}
      <div className="flex items-center justify-between w-full mb-4">
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/70 border border-cyan-500/40 text-cyan-300 font-mono text-[11px]">
          <QrCode className="w-3.5 h-3.5 text-cyan-400" />
          <span>ONE-TIME AUTHENTICATION QR</span>
        </div>

        {isUsed ? (
          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-mono text-[10px] font-bold">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            REDEEMED
          </span>
        ) : isExpired ? (
          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-950/80 border border-rose-500/40 text-rose-300 font-mono text-[10px] font-bold animate-pulse">
            <AlertTriangle className="w-3 h-3 text-rose-400" />
            EXPIRED
          </span>
        ) : (
          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 font-mono text-[10px] font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            ACTIVE (5M TTL)
          </span>
        )}
      </div>

      {/* QR Code Container with Glowing Frame */}
      <div className="relative p-4 rounded-2xl bg-white/95 border-2 border-cyan-400/80 shadow-[0_0_20px_rgba(6,182,212,0.4)] group">
        <div className={isExpired ? 'opacity-25 filter blur-[1px] transition-all' : 'transition-all'}>
          <QRCodeSVG
            value={value || `printshield://auth?job=${jobCode}&pin=${pin}`}
            size={size}
            level="H"
            includeMargin={false}
            bgColor="#FFFFFF"
            fgColor="#060A12"
          />
        </div>

        {/* Center Shield Decal */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-9 h-9 rounded-lg bg-[#060A12] border border-cyan-400 flex items-center justify-center text-cyan-400 shadow-md">
            <span className="font-extrabold text-[10px] font-mono tracking-tighter">PS</span>
          </div>
        </div>

        {/* Expired Overlay */}
        {isExpired && (
          <div className="absolute inset-0 rounded-2xl bg-slate-950/80 flex flex-col items-center justify-center p-3 text-center">
            <AlertTriangle className="w-7 h-7 text-rose-400 mb-1" />
            <span className="text-white font-mono font-bold text-xs">Token Expired</span>
            <span className="text-slate-400 font-mono text-[10px] mt-0.5">5m single-use window closed</span>
            {onRegenerate && (
              <button
                type="button"
                onClick={handleRegenerateClick}
                disabled={isRegenerating}
                className="mt-2.5 px-3 py-1 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-mono font-bold rounded-lg flex items-center gap-1.5 transition-all shadow-md"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
                <span>Refresh QR</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Countdown Timer Display */}
      {!isUsed && (
        <div className="mt-4 w-full space-y-1.5">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Time Remaining:</span>
            </span>
            <span className={`font-bold ${isExpired ? 'text-rose-400' : 'text-cyan-300'}`}>
              {isExpired ? '00:00 (Expired)' : formatCountdown(secondsRemaining)}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
            <div
              className={`h-full transition-all duration-1000 ${
                secondsRemaining < 60
                  ? 'bg-rose-500'
                  : secondsRemaining < 120
                  ? 'bg-amber-400'
                  : 'bg-gradient-to-r from-cyan-500 to-blue-500'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Manual PIN Code Box */}
      <div className="mt-4 w-full">
        <div className="text-[10px] font-mono uppercase text-slate-400 tracking-wider">
          OR 6-DIGIT MANUAL STATION ACCESS CODE
        </div>
        <div className="mt-1 flex items-center justify-center gap-2">
          <span className="text-2xl font-extrabold font-mono tracking-widest text-white text-glow-cyan bg-slate-900/90 py-1.5 px-4 rounded-xl border border-cyan-500/30">
            {pin}
          </span>
          <button
            onClick={handleCopyPin}
            title="Copy PIN Code"
            className="p-2 rounded-xl bg-slate-900 border border-slate-700/80 text-slate-400 hover:text-cyan-400 transition-colors"
          >
            {copiedPin ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Copy Raw Scannable URI */}
      <div className="mt-3 w-full flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs font-mono">
        <span className="text-slate-500 truncate text-[11px] max-w-[200px]" title={value}>
          {value.replace('printshield://auth?', '')}
        </span>
        <button
          onClick={handleCopyPayload}
          className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 text-[11px] flex-shrink-0"
          title="Copy Scannable Token URI"
        >
          {copiedPayload ? <Check className="w-3 h-3 text-emerald-400" /> : <Share2 className="w-3 h-3" />}
          <span>{copiedPayload ? 'Copied' : 'Copy URI'}</span>
        </button>
      </div>

      {/* Action Buttons: Regenerate */}
      {onRegenerate && (
        <div className="mt-3 w-full">
          <Button
            size="sm"
            variant="ghost"
            className="w-full text-xs font-mono text-slate-400 hover:text-cyan-300"
            onClick={handleRegenerateClick}
            loading={isRegenerating}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Regenerate New 5-Min Token
          </Button>
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
