import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
  hover?: boolean;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  glow = false,
  hover = false,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={`
        relative rounded-2xl bg-[#0B1220]/80 backdrop-blur-md 
        border border-cyan-500/15 text-slate-100 shadow-glass
        ${glow ? 'shadow-[0_0_20px_-3px_rgba(6,182,212,0.2)] border-cyan-500/30' : ''}
        ${hover ? 'transition-all duration-300 hover:border-cyan-500/40 hover:shadow-[0_0_25px_-5px_rgba(6,182,212,0.3)] hover:-translate-y-0.5 cursor-pointer' : ''}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<{
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}> = ({ title, subtitle, action, className = '' }) => (
  <div className={`p-6 border-b border-slate-800/80 flex items-center justify-between gap-4 ${className}`}>
    <div>
      <h3 className="text-base font-semibold text-white tracking-tight">{title}</h3>
      {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
    </div>
    {action && <div className="flex-shrink-0">{action}</div>}
  </div>
);

export const CardContent: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => (
  <div className={`p-6 ${className}`}>{children}</div>
);
