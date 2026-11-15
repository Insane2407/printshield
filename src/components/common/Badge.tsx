import React from 'react';
import { JobStatus, CleanupStatus } from '../../types';
import { ShieldCheck, Flame, RefreshCw, Clock, CheckCircle2, AlertTriangle, Lock, Trash2 } from 'lucide-react';

interface BadgeProps {
  status?: JobStatus;
  cleanupStatus?: CleanupStatus;
  variant?: 'cyan' | 'blue' | 'emerald' | 'amber' | 'rose' | 'purple' | 'slate';
  children?: React.ReactNode;
  icon?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  status,
  cleanupStatus,
  variant,
  children,
  icon = true,
  size = 'md',
  className = '',
}) => {
  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2',
  };

  // If cleanupStatus is provided, format cleanup badge
  if (cleanupStatus) {
    switch (cleanupStatus) {
      case 'completed':
        return (
          <span className={`inline-flex items-center font-mono font-medium rounded-full bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.15)] ${sizeClasses[size]} ${className}`}>
            {icon && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
            ZERO-RETENTION CLEANED
          </span>
        );
      case 'cleaning':
        return (
          <span className={`inline-flex items-center font-mono font-medium rounded-full bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.15)] ${sizeClasses[size]} ${className}`}>
            {icon && <RefreshCw className="w-3 h-3 text-cyan-400 animate-spin" />}
            CLEANING IN PROGRESS
          </span>
        );
      case 'partially_completed':
        return (
          <span className={`inline-flex items-center font-mono font-medium rounded-full bg-amber-950/60 border border-amber-500/40 text-amber-300 ${sizeClasses[size]} ${className}`}>
            {icon && <AlertTriangle className="w-3 h-3 text-amber-400" />}
            PARTIALLY CLEANED
          </span>
        );
      case 'failed':
        return (
          <span className={`inline-flex items-center font-mono font-medium rounded-full bg-rose-950/60 border border-rose-500/40 text-rose-300 ${sizeClasses[size]} ${className}`}>
            {icon && <AlertTriangle className="w-3 h-3 text-rose-400" />}
            CLEANUP FAILED (RETRY)
          </span>
        );
      case 'verified_dod':
        return (
          <span className={`inline-flex items-center font-mono font-medium rounded-full bg-purple-950/70 border border-purple-500/50 text-purple-300 ${sizeClasses[size]} ${className}`}>
            {icon && <Flame className="w-3 h-3 text-purple-400" />}
            DOD 5220.22-M WIPE
          </span>
        );
      case 'purged':
        return (
          <span className={`inline-flex items-center font-mono font-medium rounded-full bg-slate-900 border border-slate-700 text-slate-400 ${sizeClasses[size]} ${className}`}>
            {icon && <Trash2 className="w-3 h-3 text-slate-500" />}
            PURGED
          </span>
        );
      case 'pending':
      default:
        return (
          <span className={`inline-flex items-center font-mono font-medium rounded-full bg-slate-900 border border-slate-700 text-slate-400 ${sizeClasses[size]} ${className}`}>
            {icon && <Clock className="w-3 h-3 text-slate-500" />}
            CLEANUP PENDING
          </span>
        );
    }
  }

  // If status is provided, map to security styling
  if (status) {
    switch (status) {
      case 'encrypted':
        return (
          <span className={`inline-flex items-center font-mono font-medium rounded-full bg-indigo-950/60 border border-indigo-500/40 text-indigo-300 shadow-[0_0_10px_rgba(99,102,241,0.15)] ${sizeClasses[size]} ${className}`}>
            {icon && <Lock className="w-3 h-3 text-indigo-400" />}
            ENCRYPTED (AWAITING CONFIG)
          </span>
        );
      case 'pending':
        return (
          <span className={`inline-flex items-center font-mono font-medium rounded-full bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.15)] ${sizeClasses[size]} ${className}`}>
            {icon && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />}
            PENDING (CONFIRMED)
          </span>
        );
      case 'authorized':
        return (
          <span className={`inline-flex items-center font-mono font-medium rounded-full bg-teal-950/60 border border-teal-500/40 text-teal-300 shadow-[0_0_10px_rgba(20,184,166,0.15)] ${sizeClasses[size]} ${className}`}>
            {icon && <ShieldCheck className="w-3 h-3 text-teal-400" />}
            AUTHORIZED (AT KIOSK)
          </span>
        );
      case 'ready':
        return (
          <span className={`inline-flex items-center font-mono font-medium rounded-full bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.15)] ${sizeClasses[size]} ${className}`}>
            {icon && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />}
            READY FOR KIOSK
          </span>
        );
      case 'queued':
        return (
          <span className={`inline-flex items-center font-mono font-medium rounded-full bg-blue-950/60 border border-blue-500/40 text-blue-300 shadow-[0_0_10px_rgba(59,130,246,0.15)] ${sizeClasses[size]} ${className}`}>
            {icon && <Clock className="w-3 h-3 text-blue-400" />}
            QUEUED IN SPOOL
          </span>
        );
      case 'printing':
        return (
          <span className={`inline-flex items-center font-mono font-medium rounded-full bg-amber-950/60 border border-amber-500/40 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.2)] ${sizeClasses[size]} ${className}`}>
            {icon && <RefreshCw className="w-3 h-3 text-amber-400 animate-spin" />}
            PRINTING (ACTIVE)
          </span>
        );
      case 'completed':
        return (
          <span className={`inline-flex items-center font-mono font-medium rounded-full bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.15)] ${sizeClasses[size]} ${className}`}>
            {icon && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
            PRINTED (AWAITING SHRED)
          </span>
        );
      case 'shredded':
        return (
          <span className={`inline-flex items-center font-mono font-medium rounded-full bg-purple-950/70 border border-purple-500/50 text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.25)] ${sizeClasses[size]} ${className}`}>
            {icon && <Flame className="w-3 h-3 text-purple-400" />}
            SHREDDED & VERIFIED
          </span>
        );
      case 'expired':
        return (
          <span className={`inline-flex items-center font-mono font-medium rounded-full bg-slate-900 border border-slate-700 text-slate-400 ${sizeClasses[size]} ${className}`}>
            {icon && <AlertTriangle className="w-3 h-3 text-slate-500" />}
            EXPIRED (PURGED)
          </span>
        );
    }
  }

  // Variant mappings
  const variantClasses = {
    cyan: 'bg-cyan-950/60 border-cyan-500/40 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.15)]',
    blue: 'bg-blue-950/60 border-blue-500/40 text-blue-300 shadow-[0_0_10px_rgba(59,130,246,0.15)]',
    emerald: 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.15)]',
    amber: 'bg-amber-950/60 border-amber-500/40 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.15)]',
    rose: 'bg-rose-950/60 border-rose-500/40 text-rose-300 shadow-[0_0_10px_rgba(244,63,94,0.15)]',
    purple: 'bg-purple-950/60 border-purple-500/40 text-purple-300 shadow-[0_0_10px_rgba(168,85,247,0.15)]',
    slate: 'bg-slate-900 border-slate-700 text-slate-300',
  };

  return (
    <span className={`inline-flex items-center font-mono font-medium rounded-full border ${variant ? variantClasses[variant] : variantClasses.cyan} ${sizeClasses[size]} ${className}`}>
      {children}
    </span>
  );
};
