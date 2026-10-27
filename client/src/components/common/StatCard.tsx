import React from 'react';
import { LucideIcon, ArrowUpRight } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  subtext?: string;
  variant?: 'blue' | 'emerald' | 'amber' | 'rose' | 'purple' | 'slate';
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  subtext,
  variant = 'blue',
  onClick
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'emerald':
        return {
          iconBg: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25',
          dot: 'bg-emerald-400',
          accent: 'from-emerald-500/10 to-transparent'
        };
      case 'amber':
        return {
          iconBg: 'bg-amber-500/15 text-amber-400 border border-amber-500/25',
          dot: 'bg-amber-400',
          accent: 'from-amber-500/10 to-transparent'
        };
      case 'rose':
        return {
          iconBg: 'bg-rose-500/15 text-rose-400 border border-rose-500/25',
          dot: 'bg-rose-400',
          accent: 'from-rose-500/10 to-transparent'
        };
      case 'purple':
        return {
          iconBg: 'bg-purple-500/15 text-purple-400 border border-purple-500/25',
          dot: 'bg-purple-400',
          accent: 'from-purple-500/10 to-transparent'
        };
      default:
        return {
          iconBg: 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/25',
          dot: 'bg-indigo-400',
          accent: 'from-indigo-500/10 to-transparent'
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div
      onClick={onClick}
      className={`relative bg-[#121528] rounded-2xl p-5 border border-white/5 hover:border-white/15 shadow-xl transition-all duration-200 group overflow-hidden ${
        onClick ? 'cursor-pointer hover:-translate-y-0.5 hover:bg-[#161A32]' : ''
      }`}
    >
      {/* Subtle background glow */}
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${styles.accent} rounded-full blur-2xl pointer-events-none opacity-40`} />

      <div className="relative z-10 flex items-start justify-between">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${styles.iconBg} shadow-inner`}>
          <Icon className="w-5 h-5" />
        </div>
        {onClick && (
          <span className="p-1 rounded-lg text-slate-500 group-hover:text-slate-300 group-hover:bg-white/5 transition-colors">
            <ArrowUpRight className="w-4 h-4" />
          </span>
        )}
      </div>

      <div className="relative z-10 mt-4">
        <h3 className="text-xs font-semibold text-slate-400 tracking-wide uppercase">
          {title}
        </h3>
        <p className="text-2xl sm:text-3xl font-bold text-white tracking-tight mt-1 font-mono">
          {value ?? 0}
        </p>
        {subtext && (
          <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${styles.dot}`} />
            <span className="truncate">{subtext}</span>
          </p>
        )}
      </div>
    </div>
  );
};
