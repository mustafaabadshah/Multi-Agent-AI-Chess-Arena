import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Download,
  Play,
  RotateCw,
  Trophy,
  Brain,
  Zap,
  Target,
  FileText,
  FileSpreadsheet,
} from 'lucide-react';

import { GameAnalysis, Game } from '../types';
import { api } from '../services/api';
import { EvaluationChart } from '../components/EvaluationChart';
import { StrategyChart } from '../components/StrategyChart';
import { StyleRadarChart } from '../components/StyleRadarChart';
import { CriticalMoments } from '../components/CriticalMoments';

export const AnalysisPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [analysis, setAnalysis] = useState<GameAnalysis | null>(null);
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (id) {
      loadAnalysis(id);
    }
  }, [id]);

  const loadAnalysis = async (gameId: string) => {
    setLoading(true);
    try {
      const g = await api.getGame(gameId);
      setGame(g);
      const a = await api.getGameAnalysis(gameId);
      setAnalysis(a);
    } catch (e) {
      console.error('Failed to load analysis:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleRecompute = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const a = await api.recomputeAnalysis(id);
      setAnalysis(a);
    } catch (e) {
      console.error('Error recomputing analysis:', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !analysis || !game) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center text-slate-500 font-mono text-sm">
        Computing comprehensive Stockfish analysis...
      </div>
    );
  }

  const white = analysis.white;
  const black = analysis.black;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header & Match Result Card */}
      <div className="p-6 rounded-2xl bg-arena-panel border border-arena-border shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-arena-border pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              <h1 className="text-xl font-bold text-slate-100">Post-Game Analysis & Evaluation</h1>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {analysis.opening || 'Open Game'} &bull; {analysis.total_moves} plies &bull; Game ID: <span className="font-mono text-cyan-300">{game.id.slice(0, 8)}</span>
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => navigate(`/games/${game.id}`)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition-colors shadow-md"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Replay Match
            </button>

            <button
              type="button"
              onClick={handleRecompute}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-arena-800 hover:bg-arena-700 text-slate-300 font-medium text-xs border border-arena-border transition-colors"
              title="Recalculate Stockfish evaluation metrics"
            >
              <RotateCw className="w-3.5 h-3.5" />
              Recalculate
            </button>

            <a
              href={api.getReportUrl(game.id)}
              download
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs transition-colors shadow-md"
            >
              <FileText className="w-3.5 h-3.5" />
              Markdown Report
            </a>

            <a
              href={api.getCsvExportUrl(game.id)}
              download
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-arena-800 hover:bg-arena-700 text-slate-300 font-medium text-xs border border-arena-border transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              CSV
            </a>

            <a
              href={api.getPgnUrl(game.id)}
              download
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-arena-800 hover:bg-arena-700 text-slate-300 font-medium text-xs border border-arena-border transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              PGN
            </a>
          </div>
        </div>

        {/* Result Callout */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-arena-card border border-arena-border">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shadow-md ${
              analysis.winner === 'white'
                ? 'bg-slate-100 text-slate-900'
                : analysis.winner === 'black'
                ? 'bg-slate-900 text-slate-100 border border-slate-700'
                : 'bg-cyan-950 text-cyan-300 border border-cyan-800'
            }`}>
              {analysis.winner === 'white' ? '1-0' : analysis.winner === 'black' ? '0-1' : '½-½'}
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                Outcome
              </div>
              <div className="text-sm font-bold text-slate-100">
                {analysis.winner ? `${analysis.winner.toUpperCase()} VICTORY` : 'DRAW'}
              </div>
              <div className="text-xs text-slate-400">
                {analysis.termination_reason || 'Game terminated'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6 text-xs font-mono">
            <div>
              <span className="text-slate-500 block text-[10px]">White Accuracy</span>
              <span className="text-base font-bold text-cyan-300">{white.accuracy_percentage}%</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">Black Accuracy</span>
              <span className="text-base font-bold text-purple-300">{black.accuracy_percentage}%</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">White Avg CPL</span>
              <span className="text-base font-bold text-slate-200">{white.average_cpl} cp</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">Black Avg CPL</span>
              <span className="text-base font-bold text-slate-200">{black.average_cpl} cp</span>
            </div>
          </div>
        </div>
      </div>

      {/* Head-to-Head Comparative Metric Matrix */}
      <div className="bg-arena-panel border border-arena-border rounded-2xl overflow-hidden shadow-lg p-5 space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
          Agent Performance Matrix
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-arena-border text-slate-400 uppercase tracking-wider font-semibold">
                <th className="py-2.5 px-3">Metric</th>
                <th className="py-2.5 px-3 text-cyan-400">White Agent ({white.model})</th>
                <th className="py-2.5 px-3 text-purple-400">Black Agent ({black.model})</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-arena-border/40 font-mono text-slate-200 text-xs">
              <tr>
                <td className="py-2.5 px-3 font-sans text-slate-400">Personality Style</td>
                <td className="py-2.5 px-3 font-bold text-cyan-300">{white.personality}</td>
                <td className="py-2.5 px-3 font-bold text-purple-300">{black.personality}</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-sans text-slate-400">Stockfish Accuracy</td>
                <td className="py-2.5 px-3 font-bold text-cyan-300">{white.accuracy_percentage}%</td>
                <td className="py-2.5 px-3 font-bold text-purple-300">{black.accuracy_percentage}%</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-sans text-slate-400">Average Centipawn Loss</td>
                <td className="py-2.5 px-3">{white.average_cpl} cp</td>
                <td className="py-2.5 px-3">{black.average_cpl} cp</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-sans text-slate-400">Best & Excellent Moves</td>
                <td className="py-2.5 px-3 text-emerald-400">{white.best_moves + white.excellent_moves}</td>
                <td className="py-2.5 px-3 text-emerald-400">{black.best_moves + black.excellent_moves}</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-sans text-slate-400">Good Moves</td>
                <td className="py-2.5 px-3">{white.good_moves}</td>
                <td className="py-2.5 px-3">{black.good_moves}</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-sans text-slate-400">Inaccuracies (80–150 cp)</td>
                <td className="py-2.5 px-3 text-amber-400">{white.inaccuracies}</td>
                <td className="py-2.5 px-3 text-amber-400">{black.inaccuracies}</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-sans text-slate-400">Mistakes (150–300 cp)</td>
                <td className="py-2.5 px-3 text-orange-400">{white.mistakes}</td>
                <td className="py-2.5 px-3 text-orange-400">{black.mistakes}</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-sans text-slate-400">Blunders (300+ cp)</td>
                <td className="py-2.5 px-3 text-rose-400 font-bold">{white.blunders}</td>
                <td className="py-2.5 px-3 text-rose-400 font-bold">{black.blunders}</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-sans text-slate-400">Average Reported Confidence</td>
                <td className="py-2.5 px-3">{Math.round(white.average_confidence * 100)}%</td>
                <td className="py-2.5 px-3">{Math.round(black.average_confidence * 100)}%</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-sans text-slate-400">Average Turn Latency</td>
                <td className="py-2.5 px-3">{white.average_latency_ms} ms</td>
                <td className="py-2.5 px-3">{black.average_latency_ms} ms</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Visual Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Evaluation Timeline Chart */}
        <EvaluationChart
          timeline={analysis.evaluation_timeline}
          onPointClick={(ply) => navigate(`/games/${game.id}`)}
        />

        {/* Strategy Breakdown Chart */}
        <StrategyChart
          whiteStrategies={analysis.white_strategies}
          blackStrategies={analysis.black_strategies}
        />
      </div>

      {/* Experimental Style Profile Radar & Critical Moments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <StyleRadarChart
          whiteStyle={analysis.white_style}
          blackStyle={analysis.black_style}
          whiteModel={white.model}
          blackModel={black.model}
        />

        <CriticalMoments
          moments={analysis.critical_moments}
          onSelectPly={(ply) => navigate(`/games/${game.id}`)}
        />
      </div>
    </div>
  );
};
