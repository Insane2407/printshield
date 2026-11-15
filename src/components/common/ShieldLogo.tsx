import React from 'react';

interface ShieldLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  withText?: boolean;
  subtitle?: string;
}

export const ShieldLogo: React.FC<ShieldLogoProps> = ({
  className = '',
  size = 'md',
  withText = true,
  subtitle
}) => {
  const sizeMap = {
    sm: 'w-7 h-8',
    md: 'w-9 h-10',
    lg: 'w-12 h-14',
    xl: 'w-16 h-20',
  };

  const textMap = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-2xl',
    xl: 'text-3xl',
  };

  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      <div className={`relative ${sizeMap[size]} flex-shrink-0 group`}>
        {/* Ambient background glow */}
        <div className="absolute inset-0 bg-cyan-500/20 blur-md rounded-full group-hover:bg-cyan-400/35 transition-all duration-300" />
        
        <svg 
          viewBox="0 0 64 72" 
          className="relative w-full h-full drop-shadow-[0_0_12px_rgba(0,240,255,0.4)]"
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="shieldGrad" x1="0" y1="0" x2="64" y2="72" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#00F0FF" />
              <stop offset="100%" stopColor="#0066FF" />
            </linearGradient>
            <linearGradient id="shieldFill" x1="32" y1="4" x2="32" y2="69" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#0C1B33" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#060C18" stopOpacity="0.98" />
            </linearGradient>
            <radialGradient id="cyberDot" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#00F0FF" />
              <stop offset="100%" stopColor="#0088FF" />
            </radialGradient>
          </defs>

          {/* Outer Shield Shell */}
          <path
            d="M32 4 L56 14 V34 C56 50 46 61 32 69 C18 61 8 50 8 34 V14 L32 4 Z"
            fill="url(#shieldFill)"
            stroke="url(#shieldGrad)"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />

          {/* Inner Protective Core */}
          <path
            d="M32 10 L50 18 V33 C50 46 42 55 32 62 C22 55 14 46 14 33 V18 L32 10 Z"
            fill="#08101E"
            opacity="0.8"
          />

          {/* Stylized Printer Body */}
          <path
            d="M23 21 H41 V31 H23 Z"
            fill="#1E293B"
            stroke="#38BDF8"
            strokeWidth="1.75"
          />
          <path
            d="M18 31 H46 A3 3 0 0 1 49 34 V44 H42 V50 H22 V44 H15 V34 A3 3 0 0 1 18 31 Z"
            fill="#0F172A"
            stroke="url(#shieldGrad)"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />

          {/* Document Feed with Cryptographic Glowing Strip */}
          <rect x="24" y="39" width="16" height="9" rx="1.5" fill="#00F0FF" fillOpacity="0.9" />
          <line x1="26" y1="42" x2="38" y2="42" stroke="#041226" strokeWidth="1.2" strokeLinecap="round" />
          <line x1="26" y1="45" x2="35" y2="45" stroke="#041226" strokeWidth="1.2" strokeLinecap="round" />

          {/* Keyhole / Sensor indicator */}
          <circle cx="21" cy="36" r="1.5" fill="url(#cyberDot)" />
        </svg>
      </div>

      {withText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className={`font-extrabold tracking-tight font-sans text-white ${textMap[size]}`}>
              Print<span className="text-cyan-400">Shield</span>
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold tracking-widest bg-cyan-950/70 border border-cyan-500/30 text-cyan-400 shadow-[0_0_8px_rgba(0,240,255,0.2)]">
              ZERO-K
            </span>
          </div>
          {subtitle && (
            <span className="text-[11px] text-slate-400 tracking-wider font-mono">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
