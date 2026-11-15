import React from 'react';
import { Card } from './Card';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral' | 'security';
  icon: React.ReactNode;
  subtext?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  change,
  changeType = 'neutral',
  icon,
  subtext,
}) => {
  const changeStyles = {
    positive: 'text-emerald-400 bg-emerald-950/50 border-emerald-500/30',
    negative: 'text-rose-400 bg-rose-950/50 border-rose-500/30',
    neutral: 'text-slate-400 bg-slate-800/50 border-slate-700/40',
    security: 'text-cyan-400 bg-cyan-950/50 border-cyan-500/30',
  };

  return (
    <Card hover className="p-5 flex flex-col justify-between">
      <div className="flex items-start justify-between">
        <div>
          <span className="text-xs font-medium uppercase tracking-wider text-slate-400 font-mono">
            {title}
          </span>
          <div className="mt-2 text-2xl lg:text-3xl font-extrabold text-white tracking-tight font-sans">
            {value}
          </div>
        </div>
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500/10 to-blue-600/10 border border-cyan-500/20 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
          {icon}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between text-xs">
        {change && (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-md border font-mono text-[11px] ${changeStyles[changeType]}`}>
            {change}
          </span>
        )}
        {subtext && (
          <span className="text-slate-500 font-mono text-[11px] truncate ml-2">
            {subtext}
          </span>
        )}
      </div>
    </Card>
  );
};
