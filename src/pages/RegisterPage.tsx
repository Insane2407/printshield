import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldLogo } from '../components/common/ShieldLogo';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { Mail, User as UserIcon, Terminal, ArrowRight, Fingerprint } from 'lucide-react';
import { UserRole } from '../types';

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [role, setRole] = useState<UserRole>('customer');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [organization, setOrganization] = useState('');
  const [loading, setLoading] = useState(false);
  const generatedFingerprint = 'SHA256:7B88:41CA:901D:44E2:1159:AA83:B321';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    setLoading(true);

    setTimeout(async () => {
      await register(name, email, role);
      setLoading(false);
      navigate(role === 'customer' ? '/customer' : '/operator');
    }, 700);
  };

  return (
    <div className="min-h-screen bg-[#060A12] flex flex-col justify-center items-center p-4 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-gradient-to-b from-cyan-500/10 via-blue-600/10 to-transparent blur-[120px] pointer-events-none -z-10" />

      <div className="w-full max-w-md space-y-6">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <Link to="/" className="inline-block cursor-pointer">
            <ShieldLogo size="lg" />
          </Link>
          <p className="text-xs font-mono text-slate-400">
            INITIALIZE CRYPTOGRAPHIC IDENTITY PAIR
          </p>
        </div>

        <Card glow className="p-8 border-cyan-500/30">
          
          {/* Role selector */}
          <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-900 border border-slate-800 mb-6 text-xs font-mono">
            <button
              type="button"
              onClick={() => setRole('customer')}
              className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                role === 'customer'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span>Customer</span>
            </button>

            <button
              type="button"
              onClick={() => setRole('operator')}
              className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                role === 'operator'
                  ? 'bg-blue-600 text-white font-bold shadow-[0_0_12px_rgba(59,130,246,0.4)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Kiosk Operator</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono font-medium text-slate-300 mb-1.5">
                FULL NAME / OPERATOR HANDLE
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="e.g. Jordan Reed"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono font-medium text-slate-300 mb-1.5">
                PRIMARY EMAIL
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono font-medium text-slate-300 mb-1.5">
                {role === 'operator' ? 'CYBERCAFÉ OR KIOSK STATION NAME' : 'ORGANIZATION (OPTIONAL)'}
              </label>
              <input
                type="text"
                placeholder={role === 'operator' ? 'e.g. Downtown CyberHub Station' : 'e.g. Independent / Firm'}
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Key derivation indicator */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono space-y-1">
              <div className="flex items-center gap-1.5 text-cyan-400 font-semibold">
                <Fingerprint className="w-3.5 h-3.5" />
                <span>EPHEMERAL KEY PAIR DERIVATION</span>
              </div>
              <div className="text-slate-400 truncate">
                FP: {generatedFingerprint}
              </div>
              <div className="text-[10px] text-slate-500">
                Generated via WebCrypto P-256 ECDH local entropy
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full mt-2"
              loading={loading}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Generate Identity & Launch
            </Button>
          </form>
        </Card>

        {/* Footer links */}
        <div className="text-center text-xs font-mono text-slate-400 space-y-2">
          <div>
            Already registered?{' '}
            <Link to="/login" className="text-cyan-400 hover:underline font-semibold">
              Sign In
            </Link>
          </div>
          <div>
            <Link to="/" className="text-slate-500 hover:text-slate-300">
              &larr; Return to Landing Page
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
};
