import React, { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useJobs } from '../../context/JobContext';
import { ShieldLogo } from '../common/ShieldLogo';
import { ToastContainer } from '../common/ToastContainer';
import { 
  Terminal, 
  Printer, 
  KeyRound, 
  ShieldCheck, 
  Flame, 
  Cpu, 
  LogOut, 
  Menu, 
  X,
  ExternalLink,
  UserCheck
} from 'lucide-react';

interface OperatorLayoutProps {
  children: React.ReactNode;
}

export const OperatorLayout: React.FC<OperatorLayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const { jobs } = useJobs();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const activeSpoolCount = jobs.filter(j => j.status === 'ready' || j.status === 'queued').length;
  const printingCount = jobs.filter(j => j.status === 'printing').length;

  return (
    <div className="min-h-screen bg-[#060A12] flex flex-col text-slate-100">
      
      {/* Operator Top Navigation Bar */}
      <header className="sticky top-0 z-40 w-full border-b border-blue-500/25 bg-[#060B18]/95 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          
          <Link to="/" className="flex items-center gap-2">
            <ShieldLogo size="md" subtitle="Kiosk Operator Terminal (Station 04)" />
          </Link>

          {/* Desktop Right Info */}
          <div className="hidden md:flex items-center gap-3">
            <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-blue-500/30 text-xs font-mono text-blue-300 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              <span>TERMINAL: <strong>TERM-CYBERHUB-04</strong></span>
            </div>

            <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-slate-400 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              <span>RAM-Spool: 0 bytes on disk</span>
            </div>

            <Link
              to="/customer"
              className="px-3 py-1.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 hover:text-white text-xs font-mono flex items-center gap-1.5 transition-colors"
            >
              <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
              <span>Customer View &rarr;</span>
            </Link>
          </div>

          {/* Mobile menu trigger */}
          <div className="md:hidden flex items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-300"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-800 bg-[#0B1220] p-4 flex flex-col gap-2 font-mono text-xs">
            <Link to="/operator" onClick={() => setMobileMenuOpen(false)} className="p-2 rounded text-blue-400 hover:bg-slate-800">
              Operator Dashboard
            </Link>
            <Link to="/customer" onClick={() => setMobileMenuOpen(false)} className="p-2 rounded hover:bg-slate-800">
              Switch to Customer View
            </Link>
            <Link to="/settings" onClick={() => setMobileMenuOpen(false)} className="p-2 rounded hover:bg-slate-800">
              Terminal Settings
            </Link>
            <Link to="/" onClick={() => setMobileMenuOpen(false)} className="p-2 rounded text-slate-400 hover:bg-slate-800">
              Landing Page
            </Link>
          </div>
        )}
      </header>

      {/* Body with dedicated Operator Sidebar */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <aside className="w-64 flex-shrink-0 hidden md:flex flex-col justify-between h-[calc(100vh-5rem)] sticky top-20 border-r border-slate-800/80 bg-[#070D1A] p-4 select-none">
          <div className="space-y-6">
            
            {/* Operator Identification */}
            <div className="p-3 rounded-xl bg-blue-950/30 border border-blue-500/25 text-xs font-mono">
              <div className="text-[10px] text-blue-400 uppercase tracking-wider font-bold">OPERATOR STATION</div>
              <div className="text-white font-semibold truncate mt-0.5">{user?.name}</div>
              <div className="text-[11px] text-slate-400 truncate">Station 04 • Downtown</div>
            </div>

            {/* Operator Nav Links */}
            <nav className="space-y-1 text-xs font-mono">
              <NavLink
                to="/operator"
                end
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2.5 rounded-xl transition-all ${
                    isActive
                      ? 'bg-blue-950/70 text-blue-300 border border-blue-500/40 font-semibold shadow-[0_0_12px_rgba(59,130,246,0.2)]'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                  }`
                }
              >
                <div className="flex items-center gap-2.5">
                  <Terminal className="w-4 h-4 text-blue-400" />
                  <span>Incoming Spool Queue</span>
                </div>
                {activeSpoolCount > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-600 text-white">
                    {activeSpoolCount}
                  </span>
                )}
              </NavLink>

              <NavLink
                to="/operator/jobs/job-9102"
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2.5 rounded-xl transition-all ${
                    isActive
                      ? 'bg-blue-950/70 text-blue-300 border border-blue-500/40 font-semibold'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                  }`
                }
              >
                <div className="flex items-center gap-2.5">
                  <Printer className="w-4 h-4 text-amber-400" />
                  <span>Hardware Print Stream</span>
                </div>
                {printingCount > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-500/30">
                    BUSY
                  </span>
                )}
              </NavLink>

              <NavLink
                to="/operator/receipt/rcpt-8041"
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all ${
                    isActive
                      ? 'bg-blue-950/70 text-blue-300 border border-blue-500/40 font-semibold'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                  }`
                }
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>DoD Cleanup Reports</span>
              </NavLink>

              <NavLink
                to="/settings"
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all ${
                    isActive
                      ? 'bg-blue-950/70 text-blue-300 border border-blue-500/40 font-semibold'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                  }`
                }
              >
                <KeyRound className="w-4 h-4 text-slate-400" />
                <span>Station Config</span>
              </NavLink>
            </nav>
          </div>

          {/* Footer of Sidebar */}
          <div className="pt-4 border-t border-slate-800/80 space-y-2 text-xs font-mono">
            <Link
              to="/"
              className="flex items-center justify-between text-slate-400 hover:text-blue-400 px-3 py-1.5 rounded-lg transition-colors"
            >
              <span>Back to Landing</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
            <button
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="w-full flex items-center gap-2 text-slate-400 hover:text-rose-400 px-3 py-1.5 rounded-lg transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 overflow-y-auto">
          <div className="space-y-6">
            {children}
          </div>
        </main>
      </div>

      <ToastContainer />
    </div>
  );
};
