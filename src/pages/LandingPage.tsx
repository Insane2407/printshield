import React from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useJobs } from '../context/JobContext';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { 
  ShieldCheck, 
  Lock, 
  QrCode, 
  Trash2, 
  ArrowRight, 
  ChevronRight, 
  FileLock2, 
  Terminal, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Cpu, 
  Printer, 
  Flame,
  FileCheck
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { openUploadModal } = useJobs();

  const scrollToWorkflow = () => {
    document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#060A12] text-slate-100 flex flex-col selection:bg-cyan-500 selection:text-black">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-16 pb-24 lg:pt-28 lg:pb-32 overflow-hidden border-b border-slate-800/80">
        {/* Cyber Neon Ambient Glows */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[850px] h-[450px] bg-gradient-to-b from-cyan-500/15 via-blue-600/10 to-transparent blur-[120px] pointer-events-none -z-10" />
        <div className="absolute top-1/4 right-10 w-72 h-72 bg-blue-600/10 blur-[100px] pointer-events-none -z-10" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          
          {/* Eyebrow Pill */}
          <motion.div
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 text-xs font-mono mb-8 shadow-[0_0_15px_rgba(6,182,212,0.2)]"
          >
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>ZERO-RETENTION CYBERCAFÉ PRINTING PROTOCOL</span>
          </motion.div>

          {/* Required Hero Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight font-sans text-white max-w-5xl mx-auto leading-[1.1]"
          >
            Your Documents.{' '}
            <span className="cyber-gradient-text text-glow-cyan">
              Your Control.
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-6 text-lg sm:text-xl text-slate-300 max-w-3xl mx-auto font-sans leading-relaxed"
          >
            Print confidential contracts, tax returns, and identity documents at public cybercafés without leaving digital traces. Client-side encryption ensures no operator ever retains your file.
          </motion.p>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-10 flex flex-wrap items-center justify-center gap-4"
          >
            <Button
              size="lg"
              variant="primary"
              rightIcon={<ArrowRight className="w-5 h-5" />}
              onClick={openUploadModal}
            >
              Get Started – Encrypt & Print
            </Button>

            <Button
              size="lg"
              variant="secondary"
              onClick={scrollToWorkflow}
            >
              How It Works
            </Button>

            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate('/operator')}
            >
              Operator Kiosk Terminal
            </Button>
          </motion.div>

          {/* Trust badges */}
          <div className="mt-14 pt-8 border-t border-slate-800/80 max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono text-slate-400">
            <div className="flex items-center justify-center gap-2">
              <Lock className="w-4 h-4 text-cyan-400" />
              <span>WebCrypto AES-256</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <QrCode className="w-4 h-4 text-blue-400" />
              <span>One-Time Scannable QR</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <span>RAM-Only Spooling</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Flame className="w-4 h-4 text-purple-400" />
              <span>Cryptographic Shredding</span>
            </div>
          </div>
        </div>
      </section>

      {/* Required Features: Encrypted Upload, One-Time QR, Secure Printing, Verified Cleanup */}
      <section className="py-20 bg-[#070D18] relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-mono font-bold tracking-widest text-cyan-400 uppercase">
              CORE CYBERSECURITY PILLARS
            </h2>
            <p className="mt-2 text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Four Verifiable Lines of Defense
            </p>
            <p className="mt-3 text-sm text-slate-400 font-sans">
              Traditional cybercafés store unencrypted downloads and persistent print queues on public hard drives. PrintShield secures every step mathematically.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Feature 1: Encrypted Upload */}
            <Card hover className="p-6 flex flex-col justify-between border-cyan-500/25">
              <div>
                <div className="w-12 h-12 rounded-xl bg-cyan-950/70 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.25)] mb-5">
                  <FileLock2 className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white tracking-tight font-sans">
                  Encrypted Upload
                </h3>
                <p className="mt-2.5 text-xs text-slate-300 leading-relaxed font-sans">
                  Files are sealed locally with <span className="text-cyan-400 font-mono">AES-256-GCM</span> directly in your browser. Raw plaintext never hits the wire or public servers.
                </p>
              </div>

              <div className="mt-6 pt-3 border-t border-slate-800 flex items-center gap-1.5 text-[11px] font-mono text-cyan-400">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Zero-knowledge client encryption</span>
              </div>
            </Card>

            {/* Feature 2: One-Time QR */}
            <Card hover className="p-6 flex flex-col justify-between border-blue-500/25">
              <div>
                <div className="w-12 h-12 rounded-xl bg-blue-950/70 border border-blue-500/30 text-blue-400 flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.25)] mb-5">
                  <QrCode className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white tracking-tight font-sans">
                  One-Time QR
                </h3>
                <p className="mt-2.5 text-xs text-slate-300 leading-relaxed font-sans">
                  Generate a dynamic, scannable QR token with a strict 60-minute TTL. The kiosk terminal scans it to authorize a single hardware spool pass.
                </p>
              </div>

              <div className="mt-6 pt-3 border-t border-slate-800 flex items-center gap-1.5 text-[11px] font-mono text-blue-400">
                <Terminal className="w-3.5 h-3.5" />
                <span>Single-use authorization token</span>
              </div>
            </Card>

            {/* Feature 3: Secure Printing */}
            <Card hover className="p-6 flex flex-col justify-between border-amber-500/25">
              <div>
                <div className="w-12 h-12 rounded-xl bg-amber-950/70 border border-amber-500/30 text-amber-400 flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.25)] mb-5">
                  <Printer className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white tracking-tight font-sans">
                  Secure Printing
                </h3>
                <p className="mt-2.5 text-xs text-slate-300 leading-relaxed font-sans">
                  Payloads stream directly into the printer's isolated RAM buffer bypass kiosk hard drives, preventing shared PC temp file leaks.
                </p>
              </div>

              <div className="mt-6 pt-3 border-t border-slate-800 flex items-center gap-1.5 text-[11px] font-mono text-amber-400">
                <Cpu className="w-3.5 h-3.5" />
                <span>RAM-only hardware spooling</span>
              </div>
            </Card>

            {/* Feature 4: Verified Cleanup */}
            <Card hover className="p-6 flex flex-col justify-between border-purple-500/25">
              <div>
                <div className="w-12 h-12 rounded-xl bg-purple-950/70 border border-purple-500/30 text-purple-400 flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.25)] mb-5">
                  <Flame className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white tracking-tight font-sans">
                  Verified Cleanup
                </h3>
                <p className="mt-2.5 text-xs text-slate-300 leading-relaxed font-sans">
                  Upon physical sheet exit, print memory buffers are overwritten via DoD 5220.22-M 3-pass protocol, backed by a cryptographic receipt.
                </p>
              </div>

              <div className="mt-6 pt-3 border-t border-slate-800 flex items-center gap-1.5 text-[11px] font-mono text-purple-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Cryptographic proof of shredding</span>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-24 bg-[#060A12] border-t border-slate-800/80 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-mono font-bold tracking-widest text-cyan-400 uppercase">
              WORKFLOW WALKTHROUGH
            </h2>
            <p className="mt-2 text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              How PrintShield Works End-to-End
            </p>
            <p className="mt-3 text-sm text-slate-400 font-sans">
              From your personal device to the physical paper tray: four verifiable steps to total document privacy.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
            <div className="relative p-6 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <span className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-mono font-bold text-sm flex items-center justify-center">
                  01
                </span>
                <span className="text-[10px] font-mono text-slate-500">CLIENT ENCRYPT</span>
              </div>
              <h4 className="text-base font-semibold text-white mb-2 font-sans">
                Local Client Seal
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                You select your PDF. Your browser generates a local AES-256 key, calculates SHA-256 checksum, and encrypts the document in sandbox memory.
              </p>
            </div>

            <div className="relative p-6 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <span className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400 font-mono font-bold text-sm flex items-center justify-center">
                  02
                </span>
                <span className="text-[10px] font-mono text-slate-500">ONE-TIME QR</span>
              </div>
              <h4 className="text-base font-semibold text-white mb-2 font-sans">
                Token Issuance
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                Only the ciphertext reaches the staging relay. You are issued a dynamic scannable QR and 6-digit release PIN with a 60-minute expiration timer.
              </p>
            </div>

            <div className="relative p-6 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <span className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono font-bold text-sm flex items-center justify-center">
                  03
                </span>
                <span className="text-[10px] font-mono text-slate-500">RAM SPOOL</span>
              </div>
              <h4 className="text-base font-semibold text-white mb-2 font-sans">
                Hardware Spooling
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                At the cybercafé, the operator scans your QR. The payload streams decrypted straight into printer RAM, bypassing operator disk storage completely.
              </p>
            </div>

            <div className="relative p-6 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <span className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-400 font-mono font-bold text-sm flex items-center justify-center">
                  04
                </span>
                <span className="text-[10px] font-mono text-slate-500">DOD CLEANUP</span>
              </div>
              <h4 className="text-base font-semibold text-white mb-2 font-sans">
                Verified Cleanup
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                RAM buffers are zero-overwritten. A signed cryptographic receipt and certificate of shredding are saved to your customer audit dashboard.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Transparency & Privacy Limitations */}
      <section className="py-20 bg-[#090F1C] border-t border-b border-amber-500/20 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-8 sm:p-10 rounded-3xl bg-amber-950/15 border border-amber-500/30 backdrop-blur-md">
            
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  <AlertTriangle className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white tracking-tight font-sans">
                    Transparency & Privacy Limitations
                  </h3>
                  <p className="text-xs font-mono text-amber-400/90 mt-0.5">
                    HONEST THREAT MODEL & PHYSICAL ANALOG BOUNDARIES
                  </p>
                </div>
              </div>
              <Badge variant="amber" size="lg">
                HONEST SECURITY POLICY
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
              <div className="p-6 rounded-2xl bg-slate-900/70 border border-emerald-500/20 space-y-4">
                <div className="flex items-center gap-2 font-bold text-emerald-400 font-mono text-xs uppercase tracking-wider">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Guaranteed Digital Protections</span>
                </div>
                <ul className="space-y-3 text-slate-300 text-xs sm:text-sm font-sans">
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span><strong>No Hard Drive Residue:</strong> Zero temp files or unencrypted print queues written to cybercafé PC hard drives.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span><strong>No Network Interception:</strong> Encrypted with WebCrypto AES-256 before leaving your personal smartphone or laptop.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span><strong>Cryptographic Destruction:</strong> Memory cache purged via 3-pass DoD 5220.22-M overwrite upon hardware sheet ejection.</span>
                  </li>
                </ul>
              </div>

              <div className="p-6 rounded-2xl bg-slate-900/70 border border-rose-500/20 space-y-4">
                <div className="flex items-center gap-2 font-bold text-rose-400 font-mono text-xs uppercase tracking-wider">
                  <XCircle className="w-4 h-4" />
                  <span>Physical World Limitations</span>
                </div>
                <ul className="space-y-3 text-slate-300 text-xs sm:text-sm font-sans">
                  <li className="flex items-start gap-2.5">
                    <XCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                    <span><strong>Physical Duplication:</strong> PrintShield cannot prevent a malicious cybercafé operator from physically photographing or photocopying paper sheets once they land in the printer tray.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <XCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                    <span><strong>Hardware Tap Vulnerabilities:</strong> Compromised printer firmware or physical hardware taps cannot be detected over purely software protocols.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <XCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                    <span><strong>User Advisory:</strong> Always stand near the printer tray during physical output and retrieve your pages the moment printing finishes.</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-amber-500/20 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-amber-200/80">
              <div>
                We believe security begins with honest disclosure rather than false marketing claims.
              </div>
              <Link
                to="/settings"
                className="text-cyan-400 hover:underline flex items-center gap-1 font-semibold"
              >
                Inspect Cryptographic Specs <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 bg-gradient-to-b from-[#060A12] to-[#0B1220] text-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <Badge variant="cyan" size="lg">READY TO PRINT SECURELY?</Badge>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight font-sans">
            Take Control of Your Public Cybercafé Printing
          </h2>
          <p className="text-slate-400 text-base max-w-2xl mx-auto font-sans">
            Zero setup required. Upload your document now, encrypt it locally, and scan your QR at any verified PrintShield cybercafé station.
          </p>
          <div className="flex flex-wrap justify-center gap-4 pt-4">
            <Button
              size="lg"
              variant="primary"
              rightIcon={<ArrowRight className="w-5 h-5" />}
              onClick={openUploadModal}
            >
              Start Secure Print Job
            </Button>
            <Button
              size="lg"
              variant="secondary"
              onClick={() => navigate('/customer')}
            >
              Explore Customer Dashboard
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};
