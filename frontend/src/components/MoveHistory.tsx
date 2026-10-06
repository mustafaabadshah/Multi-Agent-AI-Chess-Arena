import React, { useRef, useEffect } from 'react';
import { MoveRecord } from '../types';

interface MoveHistoryProps {
  moves: MoveRecord[];
  selectedPly?: number | null;
  onSelectMove: (ply: number) => void;
}

export const MoveHistory: React.FC<MoveHistoryProps> = ({
  moves,
  selectedPly,
  onSelectMove,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selectedPly) {
      bottomRef.current?.scrollIntoView?.({ behavior: 'smooth' });
    }
  }, [moves.length, selectedPly]);

  // Group moves into pairs (1. e4 e5, 2. Nf3 ...)
  const movePairs: { moveNumber: number; white?: MoveRecord; black?: MoveRecord }[] = [];
  for (let i = 0; i < moves.length; i += 2) {
    movePairs.push({
      moveNumber: moves[i].move_number,
      white: moves[i],
      black: moves[i + 1],
    });
  }

  const getQualityBadge = (quality?: string) => {
    if (!quality) return null;
    const styles: Record<string, string> = {
      'Best Move': 'text-emerald-400 bg-emerald-950/60 border-emerald-800',
      'Excellent': 'text-teal-400 bg-teal-950/60 border-teal-800',
      'Good': 'text-cyan-400 bg-cyan-950/60 border-cyan-800',
      'Inaccuracy': 'text-amber-400 bg-amber-950/60 border-amber-800',
      'Mistake': 'text-orange-400 bg-orange-950/60 border-orange-800',
      'Blunder': 'text-rose-400 bg-rose-950/60 border-rose-800 font-bold',
    };
    const style = styles[quality] || 'text-slate-400 bg-slate-900 border-slate-800';
    return (
      <span className={`text-[10px] font-mono px-1 py-0.2 rounded border ${style}`}>
        {quality}
      </span>
    );
  };

  return (
    <div className="flex flex-col h-full bg-arena-panel rounded-xl border border-arena-border overflow-hidden">
      {/* Table Header */}
      <div className="flex items-center justify-between px-3 py-2.5 bg-arena-900 border-b border-arena-border text-xs font-semibold uppercase tracking-wider text-slate-400">
        <span>Move History</span>
        <span className="font-mono text-cyan-400">{moves.length} plies</span>
      </div>

      {/* Moves Scroll Container */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 text-xs">
        {movePairs.length === 0 ? (
          <div className="text-center text-slate-500 py-8 italic font-mono">
            No moves played yet.
          </div>
        ) : (
          movePairs.map((pair) => (
            <div
              key={pair.moveNumber}
              className="grid grid-cols-[38px_1fr_1fr] items-center gap-1.5 py-1 px-1.5 rounded hover:bg-arena-800/40 transition-colors"
            >
              {/* Move Number */}
              <span className="font-mono text-slate-500 text-[11px]">
                {pair.moveNumber}.
              </span>

              {/* White Move */}
              {pair.white ? (
                <button
                  type="button"
                  onClick={() => onSelectMove(pair.white!.ply)}
                  className={`flex items-center justify-between text-left px-2 py-1 rounded border transition-all ${
                    selectedPly === pair.white.ply
                      ? 'bg-cyan-950 border-cyan-500 text-cyan-200 font-bold'
                      : 'bg-arena-card/60 border-arena-border/50 text-slate-200 hover:border-slate-600'
                  }`}
                >
                  <span className="font-mono font-medium">{pair.white.san_move}</span>
                  {getQualityBadge(pair.white.move_quality)}
                </button>
              ) : (
                <span />
              )}

              {/* Black Move */}
              {pair.black ? (
                <button
                  type="button"
                  onClick={() => onSelectMove(pair.black!.ply)}
                  className={`flex items-center justify-between text-left px-2 py-1 rounded border transition-all ${
                    selectedPly === pair.black.ply
                      ? 'bg-cyan-950 border-cyan-500 text-cyan-200 font-bold'
                      : 'bg-arena-card/60 border-arena-border/50 text-slate-200 hover:border-slate-600'
                  }`}
                >
                  <span className="font-mono font-medium">{pair.black.san_move}</span>
                  {getQualityBadge(pair.black.move_quality)}
                </button>
              ) : (
                <span />
              )}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};
