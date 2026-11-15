import React from 'react';
import { ShieldCheck, Lock, Cpu, Trash2 } from 'lucide-react';

interface SecurityIndicatorProps {
  level?: 'standard' | 'high' | 'maximum';
  className?: string;
}

export const SecurityIndicator: React.FC<SecurityIndicatorProps> = ({
  className = '',
}) => {
  return (
    <div className={`flex flex-wrap items-center gap-3 p-3 rounded-xl bg-cyan-950/20 border border-cyan-500/20 text-xs font-mono ${className}`}>
      <div className="flex items-center gap-1.5 text-cyan-400">
        <Lock className="w-3.5 h-3.5 text-cyan-400" />
        <span className="font-semibold">AES-256-GCM</span>
      </div>

      <div className="hidden sm:block text-slate-600">•</div>

      <div className="flex items-center gap-1.5 text-slate-300">
        <Cpu className="w-3.5 h-3.5 text-blue-400" />
        <span>RAM-Only Spooling</span>
      </div>

      <div className="hidden sm:block text-slate-600">•</div>

      <div className="flex items-center gap-1.5 text-purple-300">
        <Trash2 className="w-3.5 h-3.5 text-purple-400" />
        <span>DoD 5220.22-M Overwrite</span>
      </div>

      <div className="ml-auto flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30">
        <ShieldCheck className="w-3 h-3" />
        <span>Hardware Verified</span>
      </div>
    </div>
  );
};
