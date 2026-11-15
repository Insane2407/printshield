import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldLogo } from '../common/ShieldLogo';
import { ShieldAlert, Lock, Cpu, FileCheck2, Terminal } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-slate-800/80 bg-[#040810] text-slate-400 text-xs font-mono">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          
          {/* Brand Info */}
          <div className="md:col-span-1 space-y-3">
            <ShieldLogo size="sm" />
            <p className="text-slate-400 text-xs font-sans leading-relaxed">
              Privacy-first zero-retention printing infrastructure designed for cybercafés, libraries, and untrusted print kiosks.
            </p>
            <div className="flex items-center gap-2 text-[11px] text-cyan-400">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span>TLS 1.3 + WebCrypto AES-256</span>
            </div>
          </div>

          {/* Quick Navigation */}
          <div>
            <h4 className="text-white text-xs font-bold uppercase tracking-wider mb-3">
              Application Views
            </h4>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="hover:text-cyan-400 transition-colors">
                  Landing Page
                </Link>
              </li>
              <li>
                <Link to="/customer" className="hover:text-cyan-400 transition-colors">
                  Customer Dashboard
                </Link>
              </li>
              <li>
                <Link to="/operator" className="hover:text-blue-400 transition-colors">
                  Operator Kiosk Terminal
                </Link>
              </li>
              <li>
                <Link to="/customer/jobs/job-8041" className="hover:text-cyan-400 transition-colors">
                  Job Security Details & Audit
                </Link>
              </li>
              <li>
                <Link to="/customer/receipt/rcpt-8041" className="hover:text-purple-400 transition-colors">
                  Cryptographic Receipt & Proof
                </Link>
              </li>
            </ul>
          </div>

          {/* Security Protocols */}
          <div>
            <h4 className="text-white text-xs font-bold uppercase tracking-wider mb-3">
              Security Architecture
            </h4>
            <ul className="space-y-2 text-slate-400">
              <li className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-cyan-400" />
                <span>Client Envelope Encryption</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-blue-400" />
                <span>RAM-Only Direct Spooling</span>
              </li>
              <li className="flex items-center gap-1.5">
                <FileCheck2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>One-Time Ephemeral QR</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-purple-400" />
                <span>DoD 5220.22-M Overwrite</span>
              </li>
            </ul>
          </div>

          {/* Important Privacy Limitation Callout */}
          <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 text-amber-200/90 text-[11px] leading-relaxed">
            <div className="flex items-center gap-1.5 font-bold text-amber-400 mb-1.5">
              <ShieldAlert className="w-4 h-4" />
              <span>HONEST SECURITY NOTICE</span>
            </div>
            PrintShield protects your digital files from disk retention, cloud leaks, and persistent storage. However, no software can prevent a dishonest operator from visually inspecting physical printed paper. Always collect your physical pages immediately.
          </div>
        </div>

        <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <div>
            &copy; 2026 PrintShield Cybersecurity System. Architecture designed for zero-trust public printing.
          </div>
          <div className="flex items-center gap-4">
            <span className="text-slate-400">FastAPI Ready Architecture</span>
            <span>•</span>
            <span className="text-cyan-400">v1.0.0-PROD</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
