import React, { useState, useEffect } from 'react';
import { Cpu, Trophy, Zap, AlertTriangle, Target, BookOpen } from 'lucide-react';
import { ModelComparisonMetric } from '../types';
import { api } from '../services/api';

export const ModelComparisonPage: React.FC = () => {
  const [metrics, setMetrics] = useState<ModelComparisonMetric[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    setLoading(true);
    try {
      const data = await api.getModelComparison();
      setMetrics(data);
    } catch (e) {
      console.error('Failed to load model comparison:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <Cpu className="w-5 h-5 text-cyan-400" />
          Model Cross-Comparison Benchmark
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Historical head-to-head performance across all recorded games evaluated by Stockfish.
        </p>
      </div>

      {loading ? (
        <div className="p-16 text-center text-slate-500 font-mono text-xs bg-arena-panel rounded-2xl border border-arena-border">
          Aggregating model telemetry benchmarks...
        </div>
      ) : metrics.length === 0 ? (
        <div className="p-12 text-center text-slate-500 font-mono text-xs bg-arena-panel rounded-2xl border border-arena-border">
          No historical games recorded yet. Play a match to populate cross-model evaluation benchmarks!
        </div>
      ) : (
        <>
          {/* Comparative Table */}
          <div className="bg-arena-panel border border-arena-border rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-arena-900 border-b border-arena-border text-slate-400 uppercase tracking-wider font-semibold">
                    <th className="py-3 px-4">Model ID</th>
                    <th className="py-3 px-4">Games</th>
                    <th className="py-3 px-4">Record (W-L-D)</th>
                    <th className="py-3 px-4">Win Rate</th>
                    <th className="py-3 px-4">Avg CPL</th>
                    <th className="py-3 px-4">Blunder Rate</th>
                    <th className="py-3 px-4">Mistake Rate</th>
                    <th className="py-3 px-4">Avg Confidence</th>
                    <th className="py-3 px-4">Avg Latency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-arena-border/50 text-slate-200 font-mono text-xs">
                  {metrics.map((m) => (
                    <tr key={m.model} className="hover:bg-arena-850/60 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-cyan-300">
                        {m.model}
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">
                        {m.games_played}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-emerald-400 font-bold">{m.wins}W</span>{' '}
                        <span className="text-rose-400">{m.losses}L</span>{' '}
                        <span className="text-slate-400">{m.draws}D</span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-100">
                        {m.win_rate}%
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`font-bold ${m.average_cpl < 40 ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {m.average_cpl} cp
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-rose-400 font-semibold">
                        {m.blunder_rate}%
                      </td>
                      <td className="py-3.5 px-4 text-orange-400">
                        {m.mistake_rate}%
                      </td>
                      <td className="py-3.5 px-4 text-purple-300">
                        {Math.round(m.average_confidence * 100)}%
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">
                        {m.average_latency_ms} ms
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Model Breakdown Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {metrics.map((m) => (
              <div
                key={m.model}
                className="p-5 rounded-xl border border-arena-border bg-arena-panel space-y-4"
              >
                <div className="flex items-center justify-between border-b border-arena-border pb-3">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-cyan-400" />
                    <h3 className="font-bold text-slate-100 font-mono text-sm">{m.model}</h3>
                  </div>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                    {m.win_rate}% Win Rate
                  </span>
                </div>

                {/* Favorite Openings */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                    <BookOpen className="w-3.5 h-3.5 text-purple-400" />
                    Favorite Openings
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {m.favorite_openings.length > 0 ? (
                      m.favorite_openings.map((op, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 rounded text-[11px] bg-arena-card border border-arena-border text-slate-300"
                        >
                          {op.opening} <strong className="text-cyan-400 font-mono">({op.count})</strong>
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-500 text-xs italic">Standard openings</span>
                    )}
                  </div>
                </div>

                {/* Strategy Tendencies */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                    <Target className="w-3.5 h-3.5 text-cyan-400" />
                    Reported Strategy Frequency
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {Object.entries(m.strategy_distribution)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 5)
                      .map(([strat, count]) => (
                        <span
                          key={strat}
                          className="px-2 py-1 rounded text-[11px] bg-arena-card border border-arena-border text-slate-300"
                        >
                          {strat}: <strong className="text-purple-300 font-mono">{count}</strong>
                        </span>
                      ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
