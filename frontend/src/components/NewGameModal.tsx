import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Play, Sparkles, Sliders, ChevronDown, ChevronUp, Zap, Swords } from 'lucide-react';
import { GroqModelInfo, AgentPersonality } from '../types';

interface NewGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (params: {
    white_model: string;
    black_model: string;
    white_personality: string;
    black_personality: string;
    initial_fen?: string;
    stockfish_depth: number;
    move_delay_ms: number;
    max_moves: number;
    auto_start: boolean;
  }) => void;
  models: GroqModelInfo[];
  personalities: AgentPersonality[];
}

export const NewGameModal: React.FC<NewGameModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  models,
  personalities,
}) => {
  const [whiteModel, setWhiteModel] = useState<string>('');
  const [blackModel, setBlackModel] = useState<string>('');
  const [whitePersonality, setWhitePersonality] = useState<string>('Strategic Aggressor');
  const [blackPersonality, setBlackPersonality] = useState<string>('Positional Defender');
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [isCustomFen, setIsCustomFen] = useState<boolean>(false);
  const [customFen, setCustomFen] = useState<string>('');
  const [fenError, setFenError] = useState<string>('');
  const [stockfishDepth, setStockfishDepth] = useState<number>(15);
  const [moveDelayMs, setMoveDelayMs] = useState<number>(1000);
  const [maxMoves, setMaxMoves] = useState<number>(150);
  const [autoStart, setAutoStart] = useState<boolean>(true);

  // Initialize defaults when models load - prioritize premier chess reasoning models
  useEffect(() => {
    if (models.length > 0) {
      if (!whiteModel) {
        const prefWhite = models.find((m) => m.id.includes('qwen')) || models[0];
        setWhiteModel(prefWhite.id);
      }
      if (!blackModel) {
        const prefBlack = models.find((m) => m.id.includes('120b')) 
          || models.find((m) => m.id.includes('20b')) 
          || (models.length > 1 ? models[1] : models[0]);
        setBlackModel(prefBlack.id);
      }
    }
  }, [models]);

  if (!isOpen) return null;

  const isSameModel = whiteModel && blackModel && whiteModel === blackModel;

  const handlePresetSelect = (preset: 'premier' | 'speed' | 'mock') => {
    if (preset === 'premier') {
      const qwen = models.find((m) => m.id.includes('qwen')) || models[0];
      const gpt = models.find((m) => m.id.includes('120b') || m.id.includes('gpt-oss')) || (models[1] || models[0]);
      if (qwen) setWhiteModel(qwen.id);
      if (gpt) setBlackModel(gpt.id);
      setWhitePersonality('Strategic Aggressor');
      setBlackPersonality('Positional Defender');
      setMoveDelayMs(1000);
    } else if (preset === 'speed') {
      const qwen = models.find((m) => m.id.includes('qwen')) || models[0];
      const second = models.find((m) => m.id.includes('20b')) || (models[1] || models[0]);
      if (qwen) setWhiteModel(qwen.id);
      if (second) setBlackModel(second.id);
      setWhitePersonality('Tactical Opportunist');
      setBlackPersonality('Dynamic Attacker');
      setMoveDelayMs(500);
    } else if (preset === 'mock') {
      const mock = models.find((m) => m.id.includes('mock')) || models[0];
      if (mock) {
        setWhiteModel(mock.id);
        setBlackModel(mock.id);
      }
      setWhitePersonality('Balanced Classical');
      setBlackPersonality('Strategic Aggressor');
      setMoveDelayMs(500);
    }
  };

  const handleFenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomFen(val);
    if (!val.trim()) {
      setFenError('');
      return;
    }
    const parts = val.trim().split(/\s+/);
    if (parts.length !== 6) {
      setFenError(`Invalid FEN: Expected 6 space-separated fields, got ${parts.length}.`);
    } else {
      setFenError('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isCustomFen && fenError) return;

    onSubmit({
      white_model: whiteModel,
      black_model: blackModel,
      white_personality: whitePersonality,
      black_personality: blackPersonality,
      initial_fen: isCustomFen && customFen.trim() ? customFen.trim() : undefined,
      stockfish_depth: stockfishDepth,
      move_delay_ms: moveDelayMs,
      max_moves: maxMoves,
      auto_start: autoStart,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-arena-panel border border-arena-border rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-arena-border bg-arena-900">
          <div className="flex items-center gap-2.5">
            <Swords className="w-5 h-5 text-cyan-400" />
            <div>
              <h2 className="text-base font-bold text-white">Start New AI Match</h2>
              <p className="text-[11px] text-slate-400">Choose two AI models and watch them battle in real-time</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors p-1.5 rounded-lg hover:bg-arena-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* 1. Quick Presets Bar */}
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
              ⚡ Quick Match Presets
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handlePresetSelect('premier')}
                className="p-2.5 rounded-xl bg-arena-card hover:bg-arena-800 border border-cyan-800/60 hover:border-cyan-500 text-left transition-all group"
              >
                <div className="font-bold text-cyan-300 flex items-center gap-1 group-hover:text-cyan-200">
                  🥊 Premier Battle
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5 leading-tight">
                  Qwen 27B vs GPT-120B
                </div>
              </button>

              <button
                type="button"
                onClick={() => handlePresetSelect('speed')}
                className="p-2.5 rounded-xl bg-arena-card hover:bg-arena-800 border border-purple-800/60 hover:border-purple-500 text-left transition-all group"
              >
                <div className="font-bold text-purple-300 flex items-center gap-1 group-hover:text-purple-200">
                  ⚡ Fast Action
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5 leading-tight">
                  Tactical & Attacking (0.5s)
                </div>
              </button>

              <button
                type="button"
                onClick={() => handlePresetSelect('mock')}
                className="p-2.5 rounded-xl bg-arena-card hover:bg-arena-800 border border-emerald-800/60 hover:border-emerald-500 text-left transition-all group"
              >
                <div className="font-bold text-emerald-300 flex items-center gap-1 group-hover:text-emerald-200">
                  🧪 Test Demo
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5 leading-tight">
                  Zero-cost fast demo
                </div>
              </button>
            </div>
          </div>

          {/* Same Model Tip */}
          {isSameModel && (
            <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-800/60 flex items-start gap-2 text-amber-300">
              <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-[11px]">
                Both players have the same model. Tip: Pick two different models for an interesting match!
              </p>
            </div>
          )}

          {/* White & Black Agent Configurations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* White Agent */}
            <div className="p-3.5 rounded-xl border border-arena-border bg-arena-card space-y-2.5">
              <div className="flex items-center gap-2 font-bold text-slate-200 text-xs">
                <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-900 flex items-center justify-center text-xs font-bold shadow">
                  ♔
                </span>
                <span>White AI (Moves First)</span>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  AI Model
                </label>
                <select
                  value={whiteModel}
                  onChange={(e) => setWhiteModel(e.target.value)}
                  className="w-full bg-arena-800 border border-arena-border rounded-lg px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-cyan-500 font-mono"
                >
                  {models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name || m.id}
                    </option>
                  ))}
                </select>
                {models.find((m) => m.id === whiteModel)?.description && (
                  <p className="text-[10px] text-cyan-400/90 mt-1">
                    ✓ {models.find((m) => m.id === whiteModel)?.description}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Playing Style
                </label>
                <select
                  value={whitePersonality}
                  onChange={(e) => setWhitePersonality(e.target.value)}
                  className="w-full bg-arena-800 border border-arena-border rounded-lg px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
                >
                  {personalities.map((p) => (
                    <option key={p.name} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Black Agent */}
            <div className="p-3.5 rounded-xl border border-arena-border bg-arena-card space-y-2.5">
              <div className="flex items-center gap-2 font-bold text-slate-200 text-xs">
                <span className="w-5 h-5 rounded-full bg-slate-900 text-slate-100 flex items-center justify-center text-xs font-bold border border-slate-700 shadow">
                  ♚
                </span>
                <span>Black AI</span>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  AI Model
                </label>
                <select
                  value={blackModel}
                  onChange={(e) => setBlackModel(e.target.value)}
                  className="w-full bg-arena-800 border border-arena-border rounded-lg px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-cyan-500 font-mono"
                >
                  {models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name || m.id}
                    </option>
                  ))}
                </select>
                {models.find((m) => m.id === blackModel)?.description && (
                  <p className="text-[10px] text-cyan-400/90 mt-1">
                    ✓ {models.find((m) => m.id === blackModel)?.description}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Playing Style
                </label>
                <select
                  value={blackPersonality}
                  onChange={(e) => setBlackPersonality(e.target.value)}
                  className="w-full bg-arena-800 border border-arena-border rounded-lg px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
                >
                  {personalities.map((p) => (
                    <option key={p.name} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Move Speed & Auto Start */}
          <div className="p-3.5 rounded-xl border border-arena-border bg-arena-card flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-[11px] font-medium text-slate-300 block mb-1">Move Speed</span>
              <div className="flex items-center gap-1.5">
                {[
                  { label: '⚡ Fast (0.5s)', val: 500 },
                  { label: '⏱ Normal (1s)', val: 1000 },
                  { label: '🐢 Relaxed (2s)', val: 2000 },
                ].map((spd) => (
                  <button
                    key={spd.val}
                    type="button"
                    onClick={() => setMoveDelayMs(spd.val)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                      moveDelayMs === spd.val
                        ? 'bg-cyan-600 text-white shadow-sm'
                        : 'bg-arena-800 text-slate-300 hover:bg-arena-700'
                    }`}
                  >
                    {spd.label}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer pt-2">
              <input
                type="checkbox"
                checked={autoStart}
                onChange={(e) => setAutoStart(e.target.checked)}
                className="w-4 h-4 rounded text-cyan-600 focus:ring-0 bg-arena-800 border-arena-border"
              />
              <span className="text-slate-300 text-xs font-medium">
                Auto-start match immediately
              </span>
            </label>
          </div>

          {/* Collapsible Advanced Engine Settings */}
          <div className="border border-arena-border/80 rounded-xl overflow-hidden bg-arena-900/40">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full flex items-center justify-between px-4 py-2.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
            >
              <span className="flex items-center gap-1.5 font-semibold">
                <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                Advanced Settings (FEN, Stockfish Depth, Move Limits)
              </span>
              {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showAdvanced && (
              <div className="p-4 border-t border-arena-border space-y-3 bg-arena-950/40 text-xs">
                {/* Starting Position */}
                <div>
                  <span className="font-semibold text-slate-300 block mb-1">Starting Board Setup</span>
                  <div className="flex items-center gap-4 mb-2">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="fenType"
                        checked={!isCustomFen}
                        onChange={() => setIsCustomFen(false)}
                      />
                      <span className="text-slate-300">Standard Board</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="fenType"
                        checked={isCustomFen}
                        onChange={() => setIsCustomFen(true)}
                      />
                      <span className="text-slate-300">Custom FEN Position</span>
                    </label>
                  </div>

                  {isCustomFen && (
                    <div>
                      <input
                        type="text"
                        value={customFen}
                        onChange={handleFenChange}
                        placeholder="e.g. rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1"
                        className="w-full bg-arena-800 border border-arena-border rounded-lg px-3 py-1.5 text-slate-200 font-mono text-[11px] focus:outline-none focus:border-cyan-500"
                      />
                      {fenError && <p className="text-rose-400 text-[10px] mt-1">{fenError}</p>}
                    </div>
                  )}
                </div>

                {/* Stockfish Depth & Max Moves */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Stockfish Referee Depth: <strong className="text-cyan-300">{stockfishDepth}</strong>
                    </label>
                    <input
                      type="range"
                      min={8}
                      max={20}
                      value={stockfishDepth}
                      onChange={(e) => setStockfishDepth(Number(e.target.value))}
                      className="w-full accent-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Max Plies Limit: <strong className="text-cyan-300">{maxMoves}</strong>
                    </label>
                    <input
                      type="number"
                      min={20}
                      max={300}
                      value={maxMoves}
                      onChange={(e) => setMaxMoves(Number(e.target.value))}
                      className="w-full bg-arena-800 border border-arena-border rounded-lg px-2.5 py-1 text-slate-200 font-mono text-xs"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Submit Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-slate-200 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCustomFen && !!fenError}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-lg shadow-cyan-950/50 transition-all hover:scale-102 disabled:opacity-50"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Launch Match Now</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
