import React from 'react';
import { AlertTriangle, CheckCircle, Target, Sparkles, MessageSquare, Compass, Info } from 'lucide-react';
import { MoveRecord } from '../types';

interface MoveDetailsProps {
  move?: MoveRecord | null;
}

const QUALITY_INFO: Record<string, { label: string; badgeClass: string; desc: string }> = {
  'Best Move': {
    label: '⭐ Best Move',
    badgeClass: 'bg-emerald-950/90 text-emerald-300 border-emerald-600',
    desc: 'Stockfish referee agrees: this is the optimal move on the board!',
  },
  'Excellent': {
    label: '✨ Excellent',
    badgeClass: 'bg-teal-950/90 text-teal-300 border-teal-600',
    desc: 'Very strong move that maintains maximum advantage.',
  },
  'Good': {
    label: '👍 Good Move',
    badgeClass: 'bg-cyan-950/90 text-cyan-300 border-cyan-600',
    desc: 'Solid playable move, with minor difference from engine best.',
  },
  'Inaccuracy': {
    label: '⚠️ Inaccuracy',
    badgeClass: 'bg-yellow-950/90 text-yellow-300 border-yellow-600',
    desc: 'Slight mistake that gives away a small amount of advantage.',
  },
  'Mistake': {
    label: '❌ Mistake',
    badgeClass: 'bg-orange-950/90 text-orange-300 border-orange-600',
    desc: 'Noticeable error that changed the position in opponent favor.',
  },
  'Blunder': {
    label: '💥 Blunder',
    badgeClass: 'bg-rose-950/90 text-rose-300 border-rose-600 animate-pulse',
    desc: 'Critical blunder! Greatly damaged the position or lost material.',
  },
};

const STRATEGY_EXPLANATIONS: Record<string, string> = {
  'Center Control': 'Controlling the key central squares (e4, d4, e5, d5)',
  'Piece Development': 'Activating knights and bishops into the game',
  'King Safety': 'Protecting the King through castling or pawn defense',
  'Pawn Structure': 'Strengthening pawn chains and preventing weaknesses',
  'Tactical Strike': 'Launching direct forks, pins, or attacks on loose pieces',
  'Prophylaxis': 'Anticipating and neutralizing the opponent next move',
  'Space Advantage': 'Claiming more squares to restrict opponent mobility',
  'Endgame Technique': 'Simplifying the board towards a winning pawn/piece endgame',
};

export const MoveDetails: React.FC<MoveDetailsProps> = ({ move }) => {
  if (!move) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center text-slate-400 text-xs border border-arena-border rounded-xl bg-arena-panel">
        <Compass className="w-8 h-8 mb-2 opacity-50 text-cyan-400" />
        <p className="font-semibold text-slate-300">Click any move in the history</p>
        <p className="text-slate-500 mt-1 max-w-xs">
          Select any move from the list above to read what the AI was thinking and see Stockfish referee grading.
        </p>
      </div>
    );
  }

  const qualityInfo = QUALITY_INFO[move.move_quality || 'Good'] || {
    label: move.move_quality || 'Evaluated',
    badgeClass: 'bg-slate-800 text-slate-300 border-slate-600',
    desc: 'Move evaluated by Stockfish referee.',
  };

  const isBlunder = move.move_quality === 'Blunder';
  const evalBefore = move.stockfish_eval_before ?? 0;
  const evalAfter = move.stockfish_eval_after ?? 0;
  const evalSwing = Math.abs(evalAfter - evalBefore);
  const strategyExplanation = (move.strategy && STRATEGY_EXPLANATIONS[move.strategy]) || 'Strategic tactical plan';
  const cplPoints = move.centipawn_loss ? (move.centipawn_loss / 100).toFixed(2) : '0.00';

  return (
    <div className="flex flex-col h-full bg-arena-panel rounded-xl border border-arena-border overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-arena-900 border-b border-arena-border">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Decision Inspector
          </span>
          <span className="text-slate-600">•</span>
          <span className="text-xs font-bold text-white">
            Move {move.move_number} ({move.color === 'white' ? 'White' : 'Black'})
          </span>
          <span className="font-mono text-xs font-extrabold text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800">
            {move.san_move}
          </span>
        </div>

        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${qualityInfo.badgeClass}`}>
          {qualityInfo.label}
        </span>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3.5 overflow-y-auto flex-1 text-xs">
        {/* Blunder Alert Banner if applicable */}
        {isBlunder && (
          <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-800 flex items-start gap-2.5 text-rose-200">
            <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-xs uppercase tracking-wide">Major Blunder!</p>
              <p className="text-[11px] text-rose-300 mt-0.5">
                The evaluation dropped by <strong className="font-mono text-white">{evalSwing.toFixed(1)} points</strong>.
                Stockfish preferred <strong className="font-mono text-white">{move.stockfish_best_move}</strong>.
              </p>
            </div>
          </div>
        )}

        {/* 1. AI Decision Summary (Natural English) */}
        <div className="p-3.5 rounded-xl bg-arena-card border border-arena-border/80 space-y-1.5 shadow-sm">
          <div className="flex items-center gap-1.5 text-cyan-300 font-bold text-xs">
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Why the AI played this:</span>
          </div>
          <p className="text-slate-100 text-xs leading-relaxed italic bg-arena-900/80 p-3 rounded-lg border border-arena-border/50">
            "{move.decision_summary || 'No explanation provided.'}"
          </p>
        </div>

        {/* 2. Stockfish Referee Evaluation Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <div className="p-2.5 rounded-lg bg-arena-card border border-arena-border">
            <div className="text-[10px] text-slate-400 font-medium">Played Move</div>
            <div className="text-sm font-bold text-cyan-300 font-mono mt-0.5">{move.san_move}</div>
            <div className="text-[10px] text-slate-500 font-mono">{move.uci_move}</div>
          </div>

          <div className="p-2.5 rounded-lg bg-arena-card border border-arena-border">
            <div className="text-[10px] text-slate-400 font-medium">Referee Best Move</div>
            <div className="text-sm font-bold text-emerald-400 font-mono mt-0.5">
              {move.stockfish_best_move || 'Matching'}
            </div>
            <div className="text-[10px] text-slate-500">Stockfish 19</div>
          </div>

          <div className="p-2.5 rounded-lg bg-arena-card border border-arena-border col-span-2 sm:col-span-1">
            <div className="text-[10px] text-slate-400 font-medium">Points Lost</div>
            <div className="text-sm font-bold text-amber-300 font-mono mt-0.5">
              -{cplPoints} pts
            </div>
            <div className="text-[10px] text-slate-500">({move.centipawn_loss ?? 0} centipawns)</div>
          </div>
        </div>

        {/* 3. Strategy & Concept */}
        <div className="p-3 rounded-xl bg-arena-card border border-arena-border space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-slate-400 font-medium">Strategy:</span>
              <span className="font-bold text-cyan-200">
                {move.strategy || 'General Development'}
              </span>
            </div>

            {move.risk_level && (
              <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                move.risk_level === 'high'
                  ? 'bg-rose-950/80 text-rose-300 border-rose-800'
                  : move.risk_level === 'medium'
                  ? 'bg-amber-950/80 text-amber-300 border-amber-800'
                  : 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
              }`}>
                {move.risk_level} Risk
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 pl-5">
            {strategyExplanation}
          </p>

          {/* Model Confidence Meter */}
          {move.confidence !== undefined && (
            <div className="pt-2 border-t border-arena-border/50">
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-400">AI Confidence Level</span>
                <span className="font-mono font-bold text-purple-300">
                  {Math.round(move.confidence * 100)}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full transition-all duration-300"
                  style={{ width: `${Math.round(move.confidence * 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* 4. Alternative Moves Considered */}
        {move.alternatives && move.alternatives.length > 0 && (
          <div className="p-3 rounded-xl bg-arena-card border border-arena-border space-y-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Other Moves Considered:
            </span>
            <div className="space-y-1.5">
              {move.alternatives.map((alt, idx) => (
                <div key={idx} className="flex items-start gap-2 p-2 rounded-lg bg-arena-900/80 border border-slate-800 text-[11px]">
                  <span className="font-mono font-bold text-cyan-300 bg-slate-800 px-1.5 py-0.5 rounded">
                    {alt.move}
                  </span>
                  <span className="text-slate-300 leading-snug">{alt.reason}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Technical Footer */}
        <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-1">
          <span>AI Response Time: {((move.latency_ms ?? 0) / 1000).toFixed(2)}s</span>
          <span>Source: {move.move_source}</span>
        </div>
      </div>
    </div>
  );
};
