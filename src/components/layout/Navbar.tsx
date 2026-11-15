import React, { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useJobs } from '../../context/JobContext';
import { ShieldLogo } from '../common/ShieldLogo';
import { Button } from '../common/Button';
import { 
  Terminal, 
  User as UserIcon, 
  Upload, 
  Menu, 
  X,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { role, switchRole, isAuthenticated, user } = useAuth();
  const { openUploadModal } = useJobs();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-cyan-500/15 bg-[#060A12]/90 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
        
        {/* Brand Logo */}
        <Link to="/" className="cursor-pointer">
          <ShieldLogo size="md" subtitle="Privacy-First Cybercafé Printing" />
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1.5 lg:gap-2">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                isActive
                  ? 'text-cyan-400 bg-cyan-950/40 border border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.15)]'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
              }`
            }
          >
            HOME
          </NavLink>

          <NavLink
            to="/customer"
            className={({ isActive }) =>
              `px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all flex items-center gap-1.5 ${
                isActive
                  ? 'text-cyan-400 bg-cyan-950/40 border border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.15)]'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
              }`
            }
          >
            <UserIcon className="w-3.5 h-3.5" />
            CUSTOMER DASHBOARD
          </NavLink>

          <NavLink
            to="/operator"
            className={({ isActive }) =>
              `px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all flex items-center gap-1.5 ${
                isActive
                  ? 'text-blue-400 bg-blue-950/40 border border-blue-500/30 shadow-[0_0_10px_rgba(59,130,246,0.15)]'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
              }`
            }
          >
            <Terminal className="w-3.5 h-3.5 text-blue-400" />
            OPERATOR KIOSK
          </NavLink>

          <NavLink
            to="/customer/jobs/job-8041"
            className={({ isActive }) =>
              `px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                isActive
                  ? 'text-cyan-400 bg-cyan-950/40 border border-cyan-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
              }`
            }
          >
            JOB AUDIT
          </NavLink>

          <NavLink
            to="/customer/receipt/rcpt-8041"
            className={({ isActive }) =>
              `px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                isActive
                  ? 'text-cyan-400 bg-cyan-950/40 border border-cyan-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
              }`
            }
          >
            RECEIPT
          </NavLink>
        </nav>

        {/* Right Action Hub */}
        <div className="hidden lg:flex items-center gap-3">
          {/* Quick Role Toggle Switcher */}
          <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-slate-700/60 text-xs font-mono">
            <Link
              to="/customer"
              onClick={() => switchRole('customer')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                role === 'customer'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Customer
            </Link>
            <Link
              to="/operator"
              onClick={() => switchRole('operator')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                role === 'operator'
                  ? 'bg-blue-600 text-white font-bold shadow-[0_0_12px_rgba(59,130,246,0.4)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Operator
            </Link>
          </div>

          {/* Upload Job Action */}
          <Button
            size="sm"
            variant="primary"
            leftIcon={<Upload className="w-3.5 h-3.5" />}
            onClick={openUploadModal}
          >
            Upload Document
          </Button>

          {/* User profile / Auth link */}
          {isAuthenticated ? (
            <Link
              to="/settings"
              className="flex items-center gap-2 p-1.5 px-3 rounded-xl bg-slate-900/60 border border-slate-700/60 hover:border-cyan-500/40 text-xs text-slate-200 transition-all font-mono"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="truncate max-w-[100px]">{user?.name}</span>
            </Link>
          ) : (
            <Link to="/login">
              <Button size="sm" variant="outline">
                Sign In
              </Button>
            </Link>
          )}
        </div>

        {/* Mobile menu trigger */}
        <div className="md:hidden flex items-center gap-2">
          <Button
            size="sm"
            variant="primary"
            onClick={openUploadModal}
          >
            Upload
          </Button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-300"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile drop menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-800 bg-[#0B1220] p-4 flex flex-col gap-3 font-mono text-sm">
          <Link
            to="/customer"
            onClick={() => setMobileMenuOpen(false)}
            className="text-left px-3 py-2 rounded-lg hover:bg-slate-800 text-cyan-300"
          >
            Customer Dashboard
          </Link>
          <Link
            to="/operator"
            onClick={() => setMobileMenuOpen(false)}
            className="text-left px-3 py-2 rounded-lg hover:bg-slate-800 text-blue-300"
          >
            Operator Terminal
          </Link>
          <Link
            to="/customer/jobs/job-8041"
            onClick={() => setMobileMenuOpen(false)}
            className="text-left px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-200"
          >
            Job Details (PS-8041)
          </Link>
          <Link
            to="/customer/receipt/rcpt-8041"
            onClick={() => setMobileMenuOpen(false)}
            className="text-left px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-200"
          >
            Receipt & Shred Certificate
          </Link>
          <Link
            to="/settings"
            onClick={() => setMobileMenuOpen(false)}
            className="text-left px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-200"
          >
            Settings
          </Link>
        </div>
      )}
    </header>
  );
};
