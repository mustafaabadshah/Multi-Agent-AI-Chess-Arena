import React from 'react';

interface StatusBadgeProps {
  status: string;
  isCheck?: boolean;
  isCheckmate?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, isCheck, isCheckmate }) => {
  if (isCheckmate) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-900/60 text-rose-300 border border-rose-700/50">
        Checkmate
      </span>
    );
  }

  if (isCheck) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-900/60 text-amber-300 border border-amber-700/50 animate-pulse">
        Check
      </span>
    );
  }

  const styles: Record<string, string> = {
    running: 'bg-emerald-950/70 text-emerald-400 border-emerald-800/60',
    paused: 'bg-amber-950/70 text-amber-400 border-amber-800/60',
    completed: 'bg-blue-950/70 text-blue-400 border-blue-800/60',
    waiting: 'bg-slate-800/80 text-slate-300 border-slate-700',
    aborted: 'bg-rose-950/70 text-rose-400 border-rose-800/60',
    error: 'bg-rose-950 text-rose-300 border-rose-800',
  };

  const style = styles[status.toLowerCase()] || styles.waiting;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${style}`}>
      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${status === 'running' ? 'bg-emerald-400 animate-ping' : 'bg-current'}`} />
      {status}
    </span>
  );
};
