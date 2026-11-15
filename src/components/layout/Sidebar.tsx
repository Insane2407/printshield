import React from 'react';
import { useNavigation, PageType } from '../../context/NavigationContext';
import { useAuth } from '../../context/AuthContext';
import { useJobs } from '../../context/JobContext';
import { ShieldLogo } from '../common/ShieldLogo';
import { 
  LayoutDashboard, 
  Upload, 
  FileText, 
  Receipt as ReceiptIcon, 
  Settings, 
  Terminal, 
  ShieldCheck, 
  Printer, 
  KeyRound, 
  LogOut,
  RefreshCw,
  ExternalLink
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { currentPage, navigate } = useNavigation();
  const { role, switchRole, user, logout } = useAuth();
  const { jobs, openUploadModal } = useJobs();

  const queuedCount = jobs.filter((j) => j.status === 'ready' || j.status === 'queued').length;
  const printingCount = jobs.filter((j) => j.status === 'printing').length;

  return (
    <aside className="w-64 flex-shrink-0 flex flex-col justify-between h-[calc(100vh-5rem)] sticky top-20 border-r border-slate-800/80 bg-[#070D18] select-none">
      <div className="p-4 flex flex-col gap-6 overflow-y-auto">
        
        {/* Workspace Identity Tag */}
        <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span className={`w-2.5 h-2.5 rounded-full ${role === 'operator' ? 'bg-blue-400' : 'bg-cyan-400'} animate-pulse`} />
            <div className="truncate">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                ACTIVE PERSPECTIVE
              </div>
              <div className="text-xs font-bold text-white uppercase font-sans">
                {role === 'operator' ? 'CYBERCAFÉ OPERATOR' : 'SECURE CUSTOMER'}
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              const targetRole = role === 'customer' ? 'operator' : 'customer';
              switchRole(targetRole);
              navigate(targetRole === 'customer' ? 'customer-dashboard' : 'operator-dashboard');
            }}
            title="Toggle perspective"
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-cyan-400 hover:bg-slate-700 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Customer Nav Links */}
        {role === 'customer' && (
          <div className="flex flex-col gap-1">
            <span className="px-3 text-[10px] font-mono font-bold tracking-wider text-slate-500 uppercase">
              CUSTOMER SUITE
            </span>

            <button
              onClick={() => navigate('customer-dashboard')}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-mono transition-all ${
                currentPage === 'customer-dashboard'
                  ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.15)] font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-850 hover:bg-slate-800/40'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <LayoutDashboard className="w-4 h-4 text-cyan-400" />
                <span>Dashboard Overview</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                {jobs.length}
              </span>
            </button>

            <button
              onClick={openUploadModal}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-mono text-cyan-400 bg-cyan-950/30 border border-cyan-500/20 hover:border-cyan-500/50 hover:bg-cyan-950/50 transition-all font-semibold"
            >
              <Upload className="w-4 h-4" />
              <span>New Encrypted Job</span>
            </button>

            <button
              onClick={() => navigate('job-details', { jobId: 'job-8041' })}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-mono transition-all ${
                currentPage === 'job-details'
                  ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-500/40 font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <FileText className="w-4 h-4 text-blue-400" />
              <span>Job Security Audit</span>
            </button>

            <button
              onClick={() => navigate('receipt', { receiptId: 'rcpt-8041' })}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-mono transition-all ${
                currentPage === 'receipt'
                  ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-500/40 font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <ReceiptIcon className="w-4 h-4 text-purple-400" />
              <span>Receipts & Shred Certs</span>
            </button>

            <button
              onClick={() => navigate('settings')}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-mono transition-all ${
                currentPage === 'settings'
                  ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-500/40 font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <Settings className="w-4 h-4 text-slate-400" />
              <span>Cryptographic Settings</span>
            </button>
          </div>
        )}

        {/* Operator Nav Links */}
        {role === 'operator' && (
          <div className="flex flex-col gap-1">
            <span className="px-3 text-[10px] font-mono font-bold tracking-wider text-slate-500 uppercase">
              OPERATOR STATION
            </span>

            <button
              onClick={() => navigate('operator-dashboard')}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-mono transition-all ${
                currentPage === 'operator-dashboard'
                  ? 'bg-blue-950/70 text-blue-300 border border-blue-500/40 shadow-[0_0_15px_rgba(59,130,246,0.15)] font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Terminal className="w-4 h-4 text-blue-400" />
                <span>Station Spool Queue</span>
              </div>
              {queuedCount > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-600 text-white animate-pulse">
                  {queuedCount}
                </span>
              )}
            </button>

            <button
              onClick={() => navigate('job-details', { jobId: 'job-9102' })}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-mono transition-all ${
                currentPage === 'job-details'
                  ? 'bg-blue-950/70 text-blue-300 border border-blue-500/40 font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Printer className="w-4 h-4 text-amber-400" />
                <span>Live Hardware Stream</span>
              </div>
              {printingCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-500/30">
                  {printingCount} BUSY
                </span>
              )}
            </button>

            <button
              onClick={() => navigate('receipt', { receiptId: 'rcpt-8041' })}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-mono transition-all ${
                currentPage === 'receipt'
                  ? 'bg-blue-950/70 text-blue-300 border border-blue-500/40 font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Shredding Verifier</span>
            </button>

            <button
              onClick={() => navigate('settings')}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-mono transition-all ${
                currentPage === 'settings'
                  ? 'bg-blue-950/70 text-blue-300 border border-blue-500/40 font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <KeyRound className="w-4 h-4 text-slate-400" />
              <span>Terminal & Key Config</span>
            </button>
          </div>
        )}

        {/* Fast Landing Switch */}
        <div className="pt-2 border-t border-slate-800/80">
          <button
            onClick={() => navigate('landing')}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-mono text-slate-400 hover:text-cyan-400 hover:bg-slate-800/40 transition-colors"
          >
            <span>Back to Landing</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* User Session Footer */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-900/40">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <div className="text-xs font-semibold text-white truncate font-sans">
              {user?.name}
            </div>
            <div className="text-[10px] text-slate-400 truncate font-mono">
              {user?.email}
            </div>
            <div className="text-[9px] text-cyan-400/80 truncate font-mono mt-0.5">
              FP: {user?.keyFingerprint?.slice(0, 18)}...
            </div>
          </div>
          <button
            onClick={() => {
              logout();
              navigate('login');
            }}
            title="Sign out"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
