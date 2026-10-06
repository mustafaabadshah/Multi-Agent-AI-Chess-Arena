import React from 'react';
import { BrainCircuit, Sparkles, Clock } from 'lucide-react';

interface AgentThinkingProps {
  color?: 'white' | 'black';
  model?: string;
  personality?: string;
  moveNumber?: number;
  isAnalyzing: boolean;
  decisionReady?: {
    move: string;
    strategy: string;
    confidence: number;
    decision_summary: string;
  } | null;
}

export const AgentThinking: React.FC<AgentThinkingProps> = ({
  color,
  model,
  personality,
  moveNumber,
  isAnalyzing,
  decisionReady
}) => {
  if (!isAnalyzing && !decisionReady) {
    return null;
  }

  return (
    <div className="p-3.5 rounded-xl border border-cyan-500/40 bg-arena-900/90 shadow-lg backdrop-blur-sm transition-all duration-300">
      <div className="flex items-center justify-between border-b border-arena-border/70 pb-2 mb-2.5">
        <div className="flex items-center gap-2">
          <BrainCircuit className="w-4 h-4 text-cyan-400 animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-wider text-cyan-300">
            {color} AGENT REASONING ENGINE
          </span>
        </div>
        {moveNumber && (
          <span className="text-xs font-mono text-slate-400">
            Move {moveNumber}
          </span>
        )}
      </div>

      {isAnalyzing && (
        <div className="flex items-center gap-3 py-2">
          <div className="relative flex items-center justify-center">
            <span className="w-3 h-3 rounded-full bg-cyan-400 animate-ping absolute" />
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 relative" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-200">
              Analyzing position & candidate moves...
            </p>
            <p className="text-xs font-mono text-slate-400">
              Model: <span className="text-cyan-300">{model}</span> | Style: {personality}
            </p>
          </div>
        </div>
      )}

      {decisionReady && !isAnalyzing && (
        <div className="space-y-2 pt-1 animate-fadeIn">
          <div className="flex items-center justify-between text-xs font-semibold text-emerald-400">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              Decision Ready
            </span>
            <span className="font-mono text-purple-300">
              Confidence: {Math.round(decisionReady.confidence * 100)}%
            </span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-xs text-slate-400 font-mono">Move:</span>
            <span className="text-base font-mono font-bold text-white px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
              {decisionReady.move}
            </span>
            <span className="text-xs text-cyan-300 font-medium px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/60">
              {decisionReady.strategy}
            </span>
          </div>

          <p className="text-xs text-slate-300 italic border-l-2 border-cyan-500 pl-2 mt-1">
            "{decisionReady.decision_summary}"
          </p>
        </div>
      )}
    </div>
  );
};
