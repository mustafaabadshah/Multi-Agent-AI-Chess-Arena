import React from 'react';
import { Play, Pause, StepForward, Square, RotateCcw, Clock, Sparkles } from 'lucide-react';

interface GameControlsProps {
  status: string;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onNextMove: () => void;
  onStop: () => void;
  onFlipBoard: () => void;
  onNewGame?: () => void;
  moveDelayMs: number;
  onChangeDelay: (delay: number) => void;
  disabled?: boolean;
}

export const GameControls: React.FC<GameControlsProps> = ({
  status,
  onStart,
  onPause,
  onResume,
  onNextMove,
  onStop,
  onFlipBoard,
  onNewGame,
  moveDelayMs,
  onChangeDelay,
  disabled = false,
}) => {
  const isRunning = status === 'running';
  const isPaused = status === 'paused';
  const isWaiting = status === 'waiting';
  const isCompleted = status === 'completed' || status === 'aborted' || status === 'error';

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-arena-panel rounded-xl border border-arena-border shadow-md">
      {/* Primary Action Buttons */}
      <div className="flex items-center gap-2">
        {isWaiting && (
          <button
            type="button"
            onClick={onStart}
            disabled={disabled}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-950/40 transition-all hover:scale-102 disabled:opacity-50"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Start Game</span>
          </button>
        )}

        {isRunning && (
          <button
            type="button"
            onClick={onPause}
            disabled={disabled}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-lg shadow-amber-950/40 transition-all disabled:opacity-50"
          >
            <Pause className="w-4 h-4 fill-current" />
            <span>Pause</span>
          </button>
        )}

        {isPaused && (
          <button
            type="button"
            onClick={onResume}
            disabled={disabled}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-950/40 transition-all disabled:opacity-50"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Resume</span>
          </button>
        )}

        {isCompleted && onNewGame && (
          <button
            type="button"
            onClick={onNewGame}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-lg shadow-cyan-950/40 transition-all hover:scale-102"
          >
            <Sparkles className="w-4 h-4" />
            <span>⚡ Start New Full Match (100 Moves)</span>
          </button>
        )}

        {/* Step next move button (available when paused or waiting) */}
        {!isRunning && !isCompleted && (
          <button
            type="button"
            onClick={onNextMove}
            disabled={disabled}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-arena-800 hover:bg-arena-700 text-cyan-300 font-semibold text-xs border border-cyan-800/60 transition-all disabled:opacity-50"
            title="Make the next AI move one step at a time"
          >
            <StepForward className="w-3.5 h-3.5" />
            <span>Step 1 Move</span>
          </button>
        )}

        {/* Stop button */}
        {(isRunning || isPaused) && (
          <button
            type="button"
            onClick={onStop}
            disabled={disabled}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-rose-950/80 hover:bg-rose-900 text-rose-300 font-medium text-xs border border-rose-800 transition-all disabled:opacity-50"
            title="Stop the current match"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            <span>Stop</span>
          </button>
        )}
      </div>

      {/* Speed & Orientation Controls */}
      <div className="flex items-center gap-3">
        {/* Speed chips */}
        <div className="flex items-center gap-1 text-xs text-slate-400">
          <Clock className="w-3.5 h-3.5 text-cyan-400 hidden sm:inline" />
          <span className="hidden sm:inline mr-1 text-[11px]">Speed:</span>
          <div className="flex items-center bg-arena-900 rounded-lg p-0.5 border border-arena-border">
            {[
              { label: '⚡ Fast', val: 500 },
              { label: '⏱ 1s', val: 1000 },
              { label: '🐢 2s', val: 2000 },
            ].map((spd) => (
              <button
                key={spd.val}
                type="button"
                onClick={() => onChangeDelay(spd.val)}
                className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                  moveDelayMs === spd.val
                    ? 'bg-cyan-600 text-white font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {spd.label}
              </button>
            ))}
          </div>
        </div>

        {/* Flip board button */}
        <button
          type="button"
          onClick={onFlipBoard}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-arena-800 hover:bg-arena-700 text-slate-300 border border-arena-border transition-colors text-xs"
          title="Flip Board View (Switch between White and Black perspective)"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline text-[11px]">Flip</span>
        </button>
      </div>
    </div>
  );
};
