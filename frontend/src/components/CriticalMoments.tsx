import React from 'react';
import { AlertCircle, ArrowRight, Zap, Target } from 'lucide-react';
import { CriticalMomentItem } from '../types';

interface CriticalMomentsProps {
  moments: CriticalMomentItem[];
  onSelectPly: (ply: number) => void;
}

export const CriticalMoments: React.FC<CriticalMomentsProps> = ({
  moments,
  onSelectPly,
}) => {
  if (!moments || moments.length === 0) {
    return (
      <div className="p-4 rounded-xl border border-arena-border bg-arena-panel text-center text-slate-500 font-mono text-xs">
        No critical swings or major blunders identified in this encounter.
      </div>
    );
  }

  return (
    <div className="p-4 rounded-xl border border-arena-border bg-arena-panel space-y-3">
      <div className="flex items-center justify-between border-b border-arena-border pb-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Critical Turning Points ({moments.length})
        </span>
        <span className="text-[10px] font-mono text-slate-500">
          Swings ≥ 1.5 pawns or tactical blunders
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {moments.map((m, idx) => {
          const isBlunder = m.quality === 'Blunder';
          return (
            <button
              key={idx}
              type="button"
              onClick={() => onSelectPly(m.ply)}
              className="flex items-start justify-between gap-3 p-3 rounded-lg bg-arena-card hover:bg-arena-800/80 border border-arena-border hover:border-cyan-500/50 text-left transition-all group"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                    isBlunder
                      ? 'bg-rose-950 text-rose-300 border-rose-800'
                      : 'bg-amber-950 text-amber-300 border-amber-800'
                  }`}>
                    {m.quality}
                  </span>
                  <span className="font-mono text-xs font-bold text-slate-200">
                    Move {m.move_number} ({m.color} {m.san_move})
                  </span>
                </div>

                <p className="text-[11px] text-slate-400 line-clamp-2">
                  {m.description}
                </p>

                <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500 pt-0.5">
                  <span>Swing: {m.eval_swing.toFixed(2)}</span>
                  {m.stockfish_best_move && (
                    <span className="text-emerald-400">Best: {m.stockfish_best_move}</span>
                  )}
                </div>
              </div>

              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 flex-shrink-0 mt-1 transition-colors" />
            </button>
          );
        })}
      </div>
    </div>
  );
};
