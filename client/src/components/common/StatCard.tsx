import React from 'react';
import { LucideIcon } from 'lucide-react';

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
  const getStyles = () => {
    switch (variant) {
      case 'emerald':
        return {
          iconBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          accent: 'border-l-emerald-600'
        };
      case 'amber':
        return {
          iconBg: 'bg-amber-50 text-amber-700 border-amber-200',
          accent: 'border-l-amber-600'
        };
      case 'rose':
        return {
          iconBg: 'bg-rose-50 text-rose-700 border-rose-200',
          accent: 'border-l-rose-600'
        };
      case 'purple':
        return {
          iconBg: 'bg-purple-50 text-purple-700 border-purple-200',
          accent: 'border-l-purple-600'
        };
      default:
        return {
          iconBg: 'bg-blue-50 text-blue-700 border-blue-200',
          accent: 'border-l-blue-600'
        };
    }
  };

  const styles = getStyles();

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-lg p-5 border border-slate-200 shadow-xs border-l-4 ${styles.accent} ${
        onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
        </div>
        <div className={`p-2.5 rounded-lg border ${styles.iconBg}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      {subtext && (
        <p className="text-xs text-slate-500 mt-2 truncate font-normal">{subtext}</p>
      )}
    </div>
  );
};
