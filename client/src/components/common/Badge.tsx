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
          return 'bg-rose-100 text-rose-800 border-rose-300';
        case 'HIGH':
          return 'bg-orange-100 text-orange-800 border-orange-300';
        case 'MEDIUM':
          return 'bg-amber-100 text-amber-800 border-amber-300';
        default:
          return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      }
    }

    if (type === 'priority') {
      switch (val) {
        case 'CRITICAL':
          return 'bg-rose-100 text-rose-800 border-rose-300 font-bold';
        case 'URGENT':
          return 'bg-orange-100 text-orange-800 border-orange-300 font-bold';
        case 'NORMAL':
          return 'bg-blue-100 text-blue-800 border-blue-300';
        default:
          return 'bg-slate-100 text-slate-700 border-slate-300';
      }
    }

    if (type === 'verification') {
      switch (val) {
        case 'DEMO_VERIFIED':
        case 'PASS':
          return 'bg-emerald-100 text-emerald-800 border-emerald-300';
        case 'DEMO_MISMATCH':
        case 'FAIL':
          return 'bg-rose-100 text-rose-800 border-rose-300';
        case 'WARNING':
          return 'bg-amber-100 text-amber-800 border-amber-300';
        default:
          return 'bg-slate-100 text-slate-700 border-slate-300';
      }
    }

    if (type === 'readiness') {
      switch (val) {
        case 'READY':
          return 'bg-emerald-100 text-emerald-800 border-emerald-300';
        case 'AT_RISK':
          return 'bg-amber-100 text-amber-800 border-amber-300';
        case 'NOT_READY':
          return 'bg-rose-100 text-rose-800 border-rose-300';
        default:
          return 'bg-slate-100 text-slate-700 border-slate-300';
      }
    }

    // Default: 'status'
    switch (val) {
      case 'VERIFIED':
      case 'ACCEPTED':
      case 'AUTHORIZED':
      case 'RELEASED':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'DEFICIENT':
      case 'REJECTED':
      case 'SUSPENDED':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      case 'MATURED':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'REPLACED':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'PENDING_VERIFICATION':
      case 'UNDER_REVIEW':
      case 'AWAITING_COMPETENT_AUTHORITY':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'SUBMITTED':
      case 'RELEASE_REQUESTED':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-sm text-[11px] font-medium border ${getBadgeStyle()}`}>
      {value?.replace(/_/g, ' ')}
    </span>
  );
};
