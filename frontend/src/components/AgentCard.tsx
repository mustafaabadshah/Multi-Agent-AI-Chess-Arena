import React from 'react';
import { Cpu, ShieldAlert, Brain, Sparkles } from 'lucide-react';

interface AgentCardProps {
  color: 'white' | 'black';
  model: string;
  personality: string;
  isThinking?: boolean;
  confidence?: number;
  lastMoveSan?: string;
  materialDiff?: number;
  isTurn?: boolean;
  warningSameModel?: boolean;
}

const STYLE_DESCRIPTIONS: Record<string, string> = {
  'Strategic Aggressor': 'Aggressive attacker • Focuses on bold piece placement and central control',
  'Positional Defender': 'Fortress builder • Patient, solid pawn structures and deep defense',
  'Tactical Opportunist': 'Tactics hunter • Looks for surprise attacks, pins, and forks',
  'Solid / Prophylactic': 'Safety first • Stops opponent plans before making their own',
  'Dynamic Attacker': 'Direct attacking style • Prioritizes king safety pressure',
  'Endgame Grinder': 'Patient technician • Converts small positional advantages',
  'Balanced Classical': 'Standard grandmaster play • Balanced defense and offense',
  'Chaos Agent': 'Unpredictable • Prefers wild, complicated positions',
};

export const AgentCard: React.FC<AgentCardProps> = ({
  color,
  model,
  personality,
  isThinking = false,
  confidence,
  lastMoveSan,
  materialDiff = 0,
  isTurn = false,
  warningSameModel = false,
}) => {
  const isWhite = color === 'white';
  const cleanModelName = model.split('/').pop() || model;
  const styleHint = STYLE_DESCRIPTIONS[personality] || 'Custom AI playing style';

  return (
    <div
      className={`relative p-3.5 rounded-xl border transition-all duration-300 ${
        isThinking
          ? 'border-cyan-400 bg-cyan-950/20 shadow-[0_0_25px_rgba(6,182,212,0.25)] ring-2 ring-cyan-500/40'
          : isTurn
          ? 'border-cyan-700/60 bg-arena-900/90 shadow-md'
          : 'border-arena-border bg-arena-card/70 opacity-90'
      }`}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Piece Color Marker with Chess Icon */}
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-base shadow-md border ${
              isWhite
                ? 'bg-slate-100 text-slate-900 border-white ring-1 ring-slate-300'
                : 'bg-slate-900 text-slate-100 border-slate-700 ring-1 ring-slate-800'
            }`}
            title={isWhite ? 'White Player (Moves First)' : 'Black Player'}
          >
            {isWhite ? '♔' : '♚'}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] uppercase tracking-wider font-extrabold text-slate-300">
                {isWhite ? 'White Agent' : 'Black Agent'}
              </span>
              {materialDiff !== 0 && (
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                  {materialDiff > 0 ? `+${materialDiff} pts` : `${materialDiff} pts`}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-wide">
                {cleanModelName}
              </h3>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-cyan-950/70 border border-cyan-800/50 text-cyan-300">
                {personality}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 hidden sm:block">
              {styleHint}
            </p>
          </div>
        </div>

        {/* Status / Thinking Indicator */}
        <div>
          {isThinking ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-400 text-cyan-300 text-xs font-semibold shadow-sm animate-pulse">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
              <span>Thinking...</span>
            </div>
          ) : isTurn ? (
            <span className="text-xs font-semibold text-emerald-300 bg-emerald-950/80 px-2.5 py-1 rounded-full border border-emerald-700 shadow-sm flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Your Turn
            </span>
          ) : (
            <span className="text-[11px] text-slate-500 font-mono">
              Waiting
            </span>
          )}
        </div>
      </div>

      {/* Model Detail Footer */}
      <div className="mt-2.5 pt-2 border-t border-arena-border/50 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5 text-slate-400 font-mono text-[11px]">
          <Cpu className="w-3.5 h-3.5 text-cyan-400" />
          <span>Groq Model:</span>
          <span className="text-slate-300 font-semibold">{model}</span>
        </div>

        {confidence !== undefined && (
          <div className="flex items-center gap-1.5 font-mono text-[11px]">
            <Brain className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-slate-400">Confidence:</span>
            <span className={`font-bold ${confidence >= 0.8 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {Math.round(confidence * 100)}%
            </span>
          </div>
        )}
      </div>

      {/* Same Model Warning if applicable */}
      {warningSameModel && (
        <div className="mt-2 p-1.5 rounded bg-amber-950/40 border border-amber-800/50 flex items-start gap-1.5 text-[11px] text-amber-300">
          <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-amber-400" />
          <span>Both agents are using the same model. Select different models for a true comparison.</span>
        </div>
      )}
    </div>
  );
};
