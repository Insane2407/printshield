import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldLogo } from '../components/common/ShieldLogo';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { Lock, Mail, Terminal, User as UserIcon, ArrowRight } from 'lucide-react';
import { UserRole } from '../types';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [selectedRole, setSelectedRole] = useState<UserRole>('customer');
  const [email, setEmail] = useState('alex.vance@cryptomail.io');
  const [password, setPassword] = useState('••••••••••••');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    setTimeout(async () => {
      await login(email, selectedRole);
      setLoading(false);
      navigate(selectedRole === 'customer' ? '/customer' : '/operator');
    }, 600);
  };

  const handleQuickDemo = (role: UserRole) => {
    setSelectedRole(role);
    if (role === 'customer') {
      setEmail('alex.vance@cryptomail.io');
    } else {
      setEmail('m.chen@cyberhub-downtown.net');
    }
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
            AUTHENTICATED CRYPTOGRAPHIC ACCESS GATEWAY
          </p>
        </div>

        {/* Card */}
        <Card glow className="p-8 border-cyan-500/30">
          
          {/* Role selector tabs */}
          <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-900 border border-slate-800 mb-6 text-xs font-mono">
            <button
              type="button"
              onClick={() => handleQuickDemo('customer')}
              className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                selectedRole === 'customer'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span>Customer</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemo('operator')}
              className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                selectedRole === 'operator'
                  ? 'bg-blue-600 text-white font-bold shadow-[0_0_12px_rgba(59,130,246,0.4)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Operator</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono font-medium text-slate-300 mb-1.5">
                {selectedRole === 'operator' ? 'OPERATOR TERMINAL EMAIL' : 'SECURE EMAIL ADDRESS'}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-mono font-medium text-slate-300">
                  PASSPHRASE / HARDWARE KEY PIN
                </label>
                <span className="text-[10px] font-mono text-cyan-400">Zero-Knowledge</span>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full mt-2"
              loading={loading}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Sign In to {selectedRole === 'customer' ? 'Customer Suite' : 'Operator Terminal'}
            </Button>
          </form>

          {/* Quick Demo Switcher */}
          <div className="mt-6 pt-5 border-t border-slate-800/80 text-xs font-mono text-slate-400 text-center space-y-2">
            <div>Fast Demo Profile Load:</div>
            <div className="flex justify-center gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemo('customer')}
                className="px-2.5 py-1 rounded bg-slate-800/80 hover:bg-slate-700 text-cyan-300 text-[11px]"
              >
                Alex Vance (Customer)
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemo('operator')}
                className="px-2.5 py-1 rounded bg-slate-800/80 hover:bg-slate-700 text-blue-300 text-[11px]"
              >
                Marcus Chen (Operator)
              </button>
            </div>
          </div>
        </Card>

        {/* Footer links */}
        <div className="text-center text-xs font-mono text-slate-400 space-y-2">
          <div>
            Don't have an identity pair?{' '}
            <Link to="/register" className="text-cyan-400 hover:underline font-semibold">
              Create Account
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
