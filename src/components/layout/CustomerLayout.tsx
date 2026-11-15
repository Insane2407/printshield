import React, { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useJobs } from '../../context/JobContext';
import { ShieldLogo } from '../common/ShieldLogo';
import { Button } from '../common/Button';
import { ToastContainer } from '../common/ToastContainer';
import { SecurityIndicator } from '../common/SecurityIndicator';
import { 
  LayoutDashboard, 
  Upload, 
  FileText, 
  Receipt as ReceiptIcon, 
  Settings, 
  LogOut, 
  Terminal, 
  QrCode, 
  Menu, 
  X,
  ExternalLink
} from 'lucide-react';

interface CustomerLayoutProps {
  children: React.ReactNode;
}

export const CustomerLayout: React.FC<CustomerLayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const { openUploadModal, jobs } = useJobs();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const readyJobs = jobs.filter(j => j.status === 'ready' || j.status === 'queued');

  return (
    <div className="min-h-screen bg-[#060A12] flex flex-col text-slate-100">
      
      {/* Customer Top Navigation */}
      <header className="sticky top-0 z-40 w-full border-b border-cyan-500/15 bg-[#060A12]/95 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          
          <Link to="/" className="flex items-center gap-2">
            <ShieldLogo size="md" subtitle="Customer Privacy Portal" />
          </Link>

          {/* Desktop Right Controls */}
          <div className="hidden md:flex items-center gap-3">
            <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-slate-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span>Key: <strong className="text-cyan-300">{user?.keyFingerprint?.slice(0, 15)}...</strong></span>
            </div>

            <Button
              size="sm"
              variant="primary"
              leftIcon={<Upload className="w-4 h-4" />}
              onClick={openUploadModal}
            >
              Upload Document
            </Button>

            <Link
              to="/operator"
              className="px-3 py-1.5 rounded-xl bg-blue-950/40 border border-blue-500/30 text-blue-300 hover:text-white text-xs font-mono flex items-center gap-1.5 transition-colors"
            >
              <Terminal className="w-3.5 h-3.5 text-blue-400" />
              <span>Operator Terminal &rarr;</span>
            </Link>
          </div>

          {/* Mobile menu toggle */}
          <div className="md:hidden flex items-center gap-2">
            <Button size="sm" variant="primary" onClick={openUploadModal}>
              Upload
            </Button>
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
            <Link to="/customer" onClick={() => setMobileMenuOpen(false)} className="p-2 rounded hover:bg-slate-800">
              Customer Dashboard
            </Link>
            <Link to="/operator" onClick={() => setMobileMenuOpen(false)} className="p-2 rounded text-blue-400 hover:bg-slate-800">
              Switch to Operator Terminal
            </Link>
            <Link to="/settings" onClick={() => setMobileMenuOpen(false)} className="p-2 rounded hover:bg-slate-800">
              Security Settings
            </Link>
            <Link to="/" onClick={() => setMobileMenuOpen(false)} className="p-2 rounded text-slate-400 hover:bg-slate-800">
              Landing Page
            </Link>
          </div>
        )}
      </header>

      {/* Body container with dedicated customer sidebar */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <aside className="w-64 flex-shrink-0 hidden md:flex flex-col justify-between h-[calc(100vh-5rem)] sticky top-20 border-r border-slate-800/80 bg-[#070D18] p-4 select-none">
          <div className="space-y-6">
            
            {/* Customer Tag */}
            <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/20 text-xs font-mono">
              <div className="text-[10px] text-cyan-400 uppercase tracking-wider font-bold">CLIENT SUITE</div>
              <div className="text-white font-semibold truncate mt-0.5">{user?.name}</div>
              <div className="text-[11px] text-slate-400 truncate">{user?.email}</div>
            </div>

            {/* Upload Action */}
            <Button
              variant="primary"
              className="w-full text-xs font-mono"
              leftIcon={<Upload className="w-4 h-4" />}
              onClick={openUploadModal}
            >
              Upload Document
            </Button>

            {/* Customer Navigation Links */}
            <nav className="space-y-1 text-xs font-mono">
              <NavLink
                to="/customer"
                end
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2.5 rounded-xl transition-all ${
                    isActive
                      ? 'bg-cyan-950/70 text-cyan-300 border border-cyan-500/40 font-semibold shadow-[0_0_12px_rgba(6,182,212,0.15)]'
                      : 'text-slate-400 hover:text-white hover:bg-slate-850 hover:bg-slate-800/40'
                  }`
                }
              >
                <div className="flex items-center gap-2.5">
                  <LayoutDashboard className="w-4 h-4 text-cyan-400" />
                  <span>Dashboard</span>
                </div>
                {readyJobs.length > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-cyan-500 text-slate-950">
                    {readyJobs.length} Active
                  </span>
                )}
              </NavLink>

              <NavLink
                to="/customer/jobs/job-8041"
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all ${
                    isActive
                      ? 'bg-cyan-950/70 text-cyan-300 border border-cyan-500/40 font-semibold'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                  }`
                }
              >
                <FileText className="w-4 h-4 text-blue-400" />
                <span>Job Security Audit</span>
              </NavLink>

              <NavLink
                to="/customer/receipt/rcpt-8041"
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all ${
                    isActive
                      ? 'bg-cyan-950/70 text-cyan-300 border border-cyan-500/40 font-semibold'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                  }`
                }
              >
                <ReceiptIcon className="w-4 h-4 text-purple-400" />
                <span>Receipts & Shred Certs</span>
              </NavLink>

              <NavLink
                to="/settings"
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all ${
                    isActive
                      ? 'bg-cyan-950/70 text-cyan-300 border border-cyan-500/40 font-semibold'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                  }`
                }
              >
                <Settings className="w-4 h-4 text-slate-400" />
                <span>Security Settings</span>
              </NavLink>
            </nav>
          </div>

          {/* Footer of Sidebar */}
          <div className="pt-4 border-t border-slate-800/80 space-y-2 text-xs font-mono">
            <Link
              to="/"
              className="flex items-center justify-between text-slate-400 hover:text-cyan-400 px-3 py-1.5 rounded-lg transition-colors"
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

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 overflow-y-auto">
          <div className="space-y-6">
            <SecurityIndicator className="hidden sm:flex" />
            {children}
          </div>
        </main>
      </div>

      <ToastContainer />
    </div>
  );
};
