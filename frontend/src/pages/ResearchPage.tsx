import React, { useState, useEffect } from 'react';
import { FlaskConical, Play, CheckCircle2, RotateCw, Trophy, Cpu } from 'lucide-react';
import { ResearchExperiment, GroqModelInfo, AgentPersonality } from '../types';
import { api } from '../services/api';

export const ResearchPage: React.FC = () => {
  const [experiments, setExperiments] = useState<ResearchExperiment[]>([]);
  const [models, setModels] = useState<GroqModelInfo[]>([]);
  const [personalities, setPersonalities] = useState<AgentPersonality[]>([]);

  // Form State
  const [expName, setExpName] = useState<string>('LLM Reasoning Benchmark Series');
  const [numGames, setNumGames] = useState<number>(10);
  const [modelA, setModelA] = useState<string>('');
  const [modelB, setModelB] = useState<string>('');
  const [personalityA, setPersonalityA] = useState<string>('Strategic Aggressor');
  const [personalityB, setPersonalityB] = useState<string>('Positional Defender');
  const [randomizeColors, setRandomizeColors] = useState<boolean>(true);
  const [stockfishDepth, setStockfishDepth] = useState<number>(12);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [exps, mList, pList] = await Promise.all([
        api.listExperiments(),
        api.getModels(),
        api.getPersonalities(),
      ]);
      setExperiments(exps);
      setModels(mList);
      setPersonalities(pList);

      if (mList.length > 0) {
        if (!modelA) setModelA(mList[0].id);
        if (!modelB) setModelB(mList.length > 1 ? mList[1].id : mList[0].id);
      }
    } catch (e) {
      console.error('Failed to load research data:', e);
    }
  };

  const handleStartExperiment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.createExperiment({
        name: expName,
        num_games: numGames,
        model_a: modelA,
        model_b: modelB,
        personality_a: personalityA,
        personality_b: personalityB,
        randomize_colors: randomizeColors,
        stockfish_depth: stockfishDepth,
        move_delay_ms: 100, // fast processing for experiments
      });
      // Refresh list
      const exps = await api.listExperiments();
      setExperiments(exps);
    } catch (e) {
      console.error('Failed to start experiment:', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <FlaskConical className="w-5 h-5 text-purple-400" />
          Autonomous Multi-Game Research Laboratory
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Execute multi-game benchmark experiments with alternating colors, deterministic evaluation, and aggregate analytics.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Experiment Configuration Form (5 cols) */}
        <div className="lg:col-span-5 bg-arena-panel border border-arena-border rounded-2xl p-5 shadow-xl space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 border-b border-arena-border pb-3">
            New Experiment Configuration
          </h2>

          <form onSubmit={handleStartExperiment} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-400 font-medium mb-1">Experiment Name</label>
              <input
                type="text"
                value={expName}
                onChange={(e) => setExpName(e.target.value)}
                className="w-full bg-arena-800 border border-arena-border rounded-lg px-3 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Model A</label>
                <select
                  value={modelA}
                  onChange={(e) => setModelA(e.target.value)}
                  className="w-full bg-arena-800 border border-arena-border rounded-lg px-2.5 py-1.5 text-slate-200 font-mono text-xs focus:outline-none focus:border-cyan-500"
                >
                  {models.map((m) => (
                    <option key={m.id} value={m.id}>{m.name || m.id}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Model B</label>
                <select
                  value={modelB}
                  onChange={(e) => setModelB(e.target.value)}
                  className="w-full bg-arena-800 border border-arena-border rounded-lg px-2.5 py-1.5 text-slate-200 font-mono text-xs focus:outline-none focus:border-cyan-500"
                >
                  {models.map((m) => (
                    <option key={m.id} value={m.id}>{m.name || m.id}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Number of Games</label>
                <select
                  value={numGames}
                  onChange={(e) => setNumGames(Number(e.target.value))}
                  className="w-full bg-arena-800 border border-arena-border rounded-lg px-2.5 py-1.5 text-slate-200 font-mono text-xs focus:outline-none focus:border-cyan-500"
                >
                  <option value={4}>4 Games (Rapid)</option>
                  <option value={10}>10 Games (Benchmark)</option>
                  <option value={20}>20 Games (Extended)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Stockfish Depth</label>
                <select
                  value={stockfishDepth}
                  onChange={(e) => setStockfishDepth(Number(e.target.value))}
                  className="w-full bg-arena-800 border border-arena-border rounded-lg px-2.5 py-1.5 text-slate-200 font-mono text-xs focus:outline-none focus:border-cyan-500"
                >
                  <option value={10}>10</option>
                  <option value={12}>12</option>
                  <option value={15}>15</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="randomizeColors"
                checked={randomizeColors}
                onChange={(e) => setRandomizeColors(e.target.checked)}
                className="rounded bg-arena-800 border-arena-border text-cyan-500"
              />
              <label htmlFor="randomizeColors" className="text-slate-300 font-medium cursor-pointer">
                Alternate colors equally (A White / B Black &harr; B White / A Black)
              </label>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg transition-all disabled:opacity-50"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Launch Research Experiment</span>
            </button>
          </form>
        </div>

        {/* Experiment Results List (7 cols) */}
        <div className="lg:col-span-7 bg-arena-panel border border-arena-border rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-arena-border pb-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
              Experiment Trials & Aggregates ({experiments.length})
            </h2>
            <button
              type="button"
              onClick={loadData}
              className="p-1 rounded hover:bg-arena-800 text-slate-400 hover:text-slate-200 transition-colors"
              title="Refresh"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3 overflow-y-auto max-h-[500px]">
            {experiments.length === 0 ? (
              <div className="p-12 text-center text-slate-500 font-mono text-xs italic">
                No research experiments created yet. Configure and launch a trial!
              </div>
            ) : (
              experiments.map((exp) => {
                const pct = Math.round((exp.games_completed / exp.num_games) * 100);
                const isFinished = exp.status === 'completed';

                return (
                  <div
                    key={exp.id}
                    className="p-4 rounded-xl border border-arena-border bg-arena-card space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-slate-200 text-sm">{exp.name}</h3>
                        <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                          <span className="text-cyan-300">{exp.model_a}</span> vs{' '}
                          <span className="text-purple-300">{exp.model_b}</span>
                        </p>
                      </div>

                      <span
                        className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${
                          isFinished
                            ? 'bg-emerald-950/70 text-emerald-300 border-emerald-800'
                            : 'bg-cyan-950/70 text-cyan-300 border-cyan-800 animate-pulse'
                        }`}
                      >
                        {exp.status}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-mono text-slate-400">
                        <span>Trial Progress:</span>
                        <span>{exp.games_completed} / {exp.num_games} Games ({pct}%)</span>
                      </div>
                      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    {/* Score Tally */}
                    <div className="grid grid-cols-3 gap-2 p-2.5 rounded-lg bg-arena-900 border border-slate-800 font-mono text-xs text-center">
                      <div>
                        <span className="text-[10px] text-slate-500 block truncate">{exp.model_a}</span>
                        <span className="text-sm font-bold text-cyan-300">{exp.model_a_wins} Wins</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">Draws</span>
                        <span className="text-sm font-bold text-slate-300">{exp.draws}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block truncate">{exp.model_b}</span>
                        <span className="text-sm font-bold text-purple-300">{exp.model_b_wins} Wins</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
