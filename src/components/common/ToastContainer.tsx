import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useJobs } from '../../context/JobContext';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useJobs();

  const iconMap = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />,
    info: <Info className="w-5 h-5 text-cyan-400 flex-shrink-0" />,
  };

  const borderMap = {
    success: 'border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.2)]',
    error: 'border-rose-500/40 shadow-[0_0_20px_rgba(244,63,94,0.2)]',
    warning: 'border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.2)]',
    info: 'border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.2)]',
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`pointer-events-auto p-4 rounded-xl bg-[#0B1220]/95 backdrop-blur-md border ${borderMap[toast.type]} flex items-start gap-3`}
          >
            {iconMap[toast.type]}
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-semibold text-white font-sans">{toast.title}</h4>
              <p className="text-xs text-slate-300 mt-0.5 leading-relaxed font-mono">{toast.message}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-white p-0.5 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
