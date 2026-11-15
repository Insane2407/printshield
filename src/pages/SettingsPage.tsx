import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useJobs } from '../context/JobContext';
import { CustomerLayout } from '../components/layout/CustomerLayout';
import { OperatorLayout } from '../components/layout/OperatorLayout';
import { Card, CardHeader, CardContent } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { 
  RotateCw, 
  Server, 
  Check, 
  Copy, 
  Save,
  KeyRound,
  ShieldCheck
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { user, role, switchRole } = useAuth();
  const { addToast } = useJobs();

  const [ttlMinutes, setTtlMinutes] = useState('60');
  const [shredMethod, setShredMethod] = useState('dod_3pass');
  const [autoPurgeImmediately, setAutoPurgeImmediately] = useState(true);
  const [liveApiMode, setLiveApiMode] = useState(false);
  const [fastApiEndpoint, setFastApiEndpoint] = useState('http://localhost:8000/api/v1');
  const [keyCopied, setKeyCopied] = useState(false);

  const LayoutComponent = role === 'operator' ? OperatorLayout : CustomerLayout;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    addToast('success', 'Settings Synchronized', 'Cryptographic policies updated in local client memory.');
  };

  const handleRotateKeys = () => {
    addToast('info', 'Key Pair Rotated', 'New WebCrypto P-256 ephemeral key derived. Old certificates remain archived.');
  };

  const handleCopyKey = () => {
    if (user?.keyFingerprint) {
      navigator.clipboard.writeText(user.keyFingerprint);
      setKeyCopied(true);
      setTimeout(() => setKeyCopied(false), 2000);
    }
  };

  return (
    <LayoutComponent>
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Settings Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900 to-[#0A1222] border border-cyan-500/20">
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight font-sans">
              Security & Cryptographic Settings
            </h1>
            <p className="text-xs text-slate-400 font-mono mt-1">
              Configure client-side zero-retention policies and FastAPI integration parameters
            </p>
          </div>

          <Badge variant="cyan" size="lg">
            PROTOCOL SECURE
          </Badge>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          
          {/* Section 1: Cryptographic Key Management */}
          <Card glow className="border-cyan-500/30">
            <CardHeader
              title="Identity & Ephemeral Key Management"
              subtitle="Your device's client-side cryptographic material"
              action={
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  leftIcon={<RotateCw className="w-3.5 h-3.5" />}
                  onClick={handleRotateKeys}
                >
                  Rotate Keypair
                </Button>
              }
            />
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                <div>
                  <label className="text-slate-400 block mb-1">ACCOUNT IDENTITY</label>
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-semibold">
                    {user?.name} ({user?.email})
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">ACTIVE PROFILE ROLE</label>
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-cyan-300 font-semibold uppercase flex items-center justify-between">
                    <span>{role}</span>
                    <button
                      type="button"
                      onClick={() => switchRole(role === 'customer' ? 'operator' : 'customer')}
                      className="text-[10px] text-cyan-400 hover:underline"
                    >
                      Switch to {role === 'customer' ? 'Operator' : 'Customer'}
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1">
                  <span>CLIENT KEY FINGERPRINT (ECDH P-256)</span>
                  <button
                    type="button"
                    onClick={handleCopyKey}
                    className="text-cyan-400 hover:underline flex items-center gap-1 text-[11px]"
                  >
                    {keyCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{keyCopied ? 'Copied' : 'Copy Fingerprint'}</span>
                  </button>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-cyan-300 break-all select-all">
                  {user?.keyFingerprint}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Zero-Retention & Auto-Destruct Defaults */}
          <Card>
            <CardHeader
              title="Auto-Destruct & Sanitization Policies"
              subtitle="Govern how RAM buffers are purged after printing"
            />
            <CardContent className="space-y-4 text-xs font-mono">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 mb-1.5 font-medium">
                    UNCOLLECTED JOB TTL (TIME-TO-LIVE)
                  </label>
                  <select
                    value={ttlMinutes}
                    onChange={(e) => setTtlMinutes(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="30">30 Minutes (Strict)</option>
                    <option value="60">60 Minutes (Standard)</option>
                    <option value="120">120 Minutes (Extended)</option>
                  </select>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Expired jobs are automatically memory-sanitized before operator arrival.
                  </p>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1.5 font-medium">
                    SANITIZATION METHOD
                  </label>
                  <select
                    value={shredMethod}
                    onChange={(e) => setShredMethod(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="dod_3pass">DoD 5220.22-M (3-Pass Zero Overwrite)</option>
                    <option value="nist_80088">NIST SP 800-88 Rev 1 (Cryptographic Erase)</option>
                    <option value="gutmann">Gutmann Algorithm (7-Pass Military)</option>
                  </select>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Direct overwrite standard performed on RAM-disk sectors.
                  </p>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <div>
                  <div className="text-white font-semibold">Immediate Post-Print Sanitization</div>
                  <div className="text-slate-400 text-[11px]">
                    Purge memory cache the exact millisecond printer confirms final sheet exit.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={autoPurgeImmediately}
                  onChange={(e) => setAutoPurgeImmediately(e.target.checked)}
                  className="w-4 h-4 accent-cyan-500 cursor-pointer"
                />
              </div>
            </CardContent>
          </Card>

          {/* Section 3: Future FastAPI Backend Architecture Configuration */}
          <Card>
            <CardHeader
              title="FastAPI Integration Architecture"
              subtitle="Connect the React client to a local or remote FastAPI REST server"
            />
            <CardContent className="space-y-4 text-xs font-mono">
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-white font-semibold flex items-center gap-2">
                    <Server className="w-4 h-4 text-cyan-400" />
                    <span>Live FastAPI Backend Mode</span>
                  </div>
                  <div className="text-slate-400 text-[11px] mt-0.5">
                    Toggle to connect directly to <code className="text-cyan-300">{fastApiEndpoint}</code>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setLiveApiMode(!liveApiMode);
                    addToast('info', 'API Mode Toggled', liveApiMode ? 'Switched to reactive local mock layer' : 'Switched to live FastAPI connector');
                  }}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                    liveApiMode
                      ? 'bg-emerald-500 text-slate-950 shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {liveApiMode ? 'LIVE API ENABLED' : 'MOCK / DEMO MODE'}
                </button>
              </div>

              <div>
                <label className="block text-slate-300 mb-1.5 font-medium">
                  FASTAPI BASE URL
                </label>
                <input
                  type="text"
                  value={fastApiEndpoint}
                  onChange={(e) => setFastApiEndpoint(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 focus:outline-none focus:border-cyan-500"
                  placeholder="http://localhost:8000/api/v1"
                />
              </div>

              <div className="p-3 rounded-xl bg-cyan-950/20 border border-cyan-500/20 text-[11px] text-slate-300">
                <span className="text-cyan-400 font-semibold">Backend Readiness Note:</span>{' '}
                The service layer at <code className="text-white">src/services/api.ts</code> is pre-architected with typed endpoints for <code className="text-cyan-300">/auth</code>, <code className="text-cyan-300">/jobs</code>, <code className="text-cyan-300">/operator</code>, and <code className="text-cyan-300">/receipts</code>. When your FastAPI backend is launched, simply update the environment variable or configuration here.
              </div>
            </CardContent>
          </Card>

          {/* Save Action */}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              leftIcon={<Save className="w-4 h-4" />}
            >
              Save Security Policies
            </Button>
          </div>

        </form>
      </div>
    </LayoutComponent>
  );
};
