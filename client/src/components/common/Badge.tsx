import React from 'react';

interface BadgeProps {
  type: 'status' | 'risk' | 'priority' | 'verification' | 'readiness';
  value: string;
}

export const Badge: React.FC<BadgeProps> = ({ type, value }) => {
  const getBadgeStyle = () => {
    const val = (value || '').toUpperCase();

    if (type === 'risk') {
      switch (val) {
        case 'CRITICAL':
          return {
            classes: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
            dot: 'bg-rose-500'
          };
        case 'HIGH':
          return {
            classes: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
            dot: 'bg-orange-500'
          };
        case 'MEDIUM':
          return {
            classes: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
            dot: 'bg-amber-400'
          };
        default:
          return {
            classes: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
            dot: 'bg-emerald-400'
          };
      }
    }

    if (type === 'priority') {
      switch (val) {
        case 'CRITICAL':
          return {
            classes: 'bg-rose-500/20 text-rose-300 border-rose-500/40 font-bold',
            dot: 'bg-rose-400'
          };
        case 'URGENT':
          return {
            classes: 'bg-orange-500/20 text-orange-300 border-orange-500/40 font-bold',
            dot: 'bg-orange-400'
          };
        case 'NORMAL':
          return {
            classes: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
            dot: 'bg-blue-400'
          };
        default:
          return {
            classes: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
            dot: 'bg-slate-400'
          };
      }
    }

    if (type === 'verification') {
      switch (val) {
        case 'DEMO_VERIFIED':
        case 'PASS':
          return {
            classes: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
            dot: 'bg-emerald-400'
          };
        case 'DEMO_MISMATCH':
        case 'FAIL':
          return {
            classes: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
            dot: 'bg-rose-500'
          };
        case 'WARNING':
          return {
            classes: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
            dot: 'bg-amber-400'
          };
        default:
          return {
            classes: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
            dot: 'bg-slate-400'
          };
      }
    }

    if (type === 'readiness') {
      switch (val) {
        case 'READY':
          return {
            classes: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
            dot: 'bg-emerald-400'
          };
        case 'AT_RISK':
          return {
            classes: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
            dot: 'bg-amber-400'
          };
        case 'NOT_READY':
          return {
            classes: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
            dot: 'bg-rose-500'
          };
        default:
          return {
            classes: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
            dot: 'bg-slate-400'
          };
      }
    }

    // Default: 'status'
    switch (val) {
      case 'VERIFIED':
      case 'ACCEPTED':
      case 'AUTHORIZED':
      case 'RELEASED':
      case 'REVIEWED_LEGITIMATE':
      case 'RESOLVED_PERMITTED':
        return {
          classes: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
          dot: 'bg-emerald-400'
        };
      case 'DEFICIENT':
      case 'REJECTED':
      case 'SUSPENDED':
      case 'CONFIRMED_DUPLICATE':
      case 'EXACT_DUPLICATE':
        return {
          classes: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
          dot: 'bg-rose-500'
        };
      case 'MATURED':
        return {
          classes: 'bg-red-500/15 text-red-400 border-red-500/30',
          dot: 'bg-red-500'
        };
      case 'REPLACED':
        return {
          classes: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
          dot: 'bg-purple-400'
        };
      case 'PENDING_VERIFICATION':
      case 'UNDER_REVIEW':
      case 'AWAITING_COMPETENT_AUTHORITY':
      case 'OPEN':
      case 'STRONG_POTENTIAL_MATCH':
        return {
          classes: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
          dot: 'bg-amber-400'
        };
      case 'SUBMITTED':
      case 'RELEASE_REQUESTED':
        return {
          classes: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
          dot: 'bg-blue-400'
        };
      case 'DISMISSED':
      case 'FALSE_POSITIVE':
      case 'WEAK_SIMILARITY':
        return {
          classes: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
          dot: 'bg-slate-400'
        };
      default:
        return {
          classes: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
          dot: 'bg-slate-400'
        };
    }
  };

  const { classes, dot } = getBadgeStyle();

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${classes}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      <span>{value?.replace(/_/g, ' ')}</span>
    </span>
  );
};
