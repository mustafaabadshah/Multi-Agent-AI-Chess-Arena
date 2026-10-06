import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  BarChart2,
  Download,
  RotateCcw,
} from 'lucide-react';
import { Game, MoveRecord } from '../types';
import { api } from '../services/api';
import { ChessBoard } from '../components/ChessBoard';
import { EvaluationBar } from '../components/EvaluationBar';
import { MoveHistory } from '../components/MoveHistory';
import { MoveDetails } from '../components/MoveDetails';
import { EvaluationChart } from '../components/EvaluationChart';

export const GameReplayPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [game, setGame] = useState<Game | null>(null);
  const [moves, setMoves] = useState<MoveRecord[]>([]);
  const [currentPly, setCurrentPly] = useState<number>(0); // 0 = initial position
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeedMs, setPlaybackSpeedMs] = useState<number>(1000);
  const [boardOrientation, setBoardOrientation] = useState<'white' | 'black'>('white');

  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (id) {
      loadGameData(id);
    }
  }, [id]);

  const loadGameData = async (gameId: string) => {
    try {
      const g = await api.getGame(gameId);
      setGame(g);
      const mList = await api.getGameMoves(gameId);
      setMoves(mList);
      setCurrentPly(mList.length); // Start at final position
    } catch (e) {
      console.error('Failed to load replay data:', e);
    }
  };

  // Autoplay loop
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setCurrentPly((prev) => {
          if (prev >= moves.length) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, playbackSpeedMs);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, moves.length, playbackSpeedMs]);

  const handleFirst = () => {
    setIsPlaying(false);
    setCurrentPly(0);
  };

  const handlePrev = () => {
    setIsPlaying(false);
    setCurrentPly((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setIsPlaying(false);
    setCurrentPly((prev) => Math.min(moves.length, prev + 1));
  };

  const handleLast = () => {
    setIsPlaying(false);
    setCurrentPly(moves.length);
  };

  const handleTogglePlay = () => {
    if (currentPly >= moves.length) {
      setCurrentPly(0);
    }
    setIsPlaying(!isPlaying);
  };

  // Derive active FEN and evaluation
  const activeMove = currentPly > 0 && currentPly <= moves.length ? moves[currentPly - 1] : null;
  const currentFen = activeMove ? activeMove.fen_after : game ? game.initial_fen : 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  const currentEval = activeMove ? (activeMove.stockfish_eval_after ?? 0.0) : 0.0;

  // Evaluation timeline data for chart
  const timelineData = moves.map((m) => ({
    ply: m.ply,
    move_number: m.move_number,
    color: m.color,
    san: m.san_move,
    eval: m.stockfish_eval_after ?? 0.0,
    quality: m.move_quality,
    cpl: m.centipawn_loss,
  }));

  if (!game) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-slate-500 font-mono text-sm">
        Loading game replay...
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 space-y-4">
      {/* Replay Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-arena-panel rounded-xl border border-arena-border">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
              Game Replay
            </span>
            <span className="font-mono text-xs font-bold text-cyan-300">
              {game.white_model} vs {game.black_model}
            </span>
          </div>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            {game.opening || 'Open Game'} &bull; Result: {game.winner ? game.winner.toUpperCase() : 'Draw'} ({game.termination_reason})
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(`/games/${game.id}/analysis`)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md transition-all"
          >
            <BarChart2 className="w-3.5 h-3.5" />
            Full Analysis
          </button>

          <a
            href={api.getPgnUrl(game.id)}
            download
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-arena-800 hover:bg-arena-700 text-slate-300 text-xs font-medium border border-arena-border transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            PGN
          </a>
        </div>
      </div>

      {/* Main Replay Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Board & Stepper Controls (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex justify-center items-stretch gap-3 py-1">
            <EvaluationBar score={currentEval} depth={game.stockfish_depth} />
            <ChessBoard
              fen={currentFen}
              orientation={boardOrientation}
              lastMoveUci={activeMove?.uci_move}
              bestMoveUci={activeMove?.stockfish_best_move}
              boardWidth={490}
            />
          </div>

          {/* Stepper Controls: |<  <  Play  >  >| */}
          <div className="flex items-center justify-between p-3 bg-arena-panel rounded-xl border border-arena-border">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleFirst}
                className="p-2 rounded-lg bg-arena-800 hover:bg-arena-700 text-slate-300 transition-colors"
                title="First Move"
              >
                <ChevronFirst className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handlePrev}
                className="p-2 rounded-lg bg-arena-800 hover:bg-arena-700 text-slate-300 transition-colors"
                title="Previous Move"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleTogglePlay}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-md transition-all"
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                <span>{isPlaying ? 'Pause' : 'Autoplay'}</span>
              </button>

              <button
                type="button"
                onClick={handleNext}
                className="p-2 rounded-lg bg-arena-800 hover:bg-arena-700 text-slate-300 transition-colors"
                title="Next Move"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleLast}
                className="p-2 rounded-lg bg-arena-800 hover:bg-arena-700 text-slate-300 transition-colors"
                title="Last Move"
              >
                <ChevronLast className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-slate-400">
                Ply {currentPly} / {moves.length}
              </span>

              <select
                value={playbackSpeedMs}
                onChange={(e) => setPlaybackSpeedMs(Number(e.target.value))}
                className="bg-arena-800 border border-arena-border text-slate-200 text-xs rounded px-2 py-1 font-mono focus:outline-none"
              >
                <option value={500}>0.5s</option>
                <option value={1000}>1.0s</option>
                <option value={2000}>2.0s</option>
              </select>

              <button
                type="button"
                onClick={() => setBoardOrientation((o) => (o === 'white' ? 'black' : 'white'))}
                className="p-1.5 rounded-lg bg-arena-800 hover:bg-arena-700 text-slate-300 border border-arena-border"
                title="Flip Board"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Evaluation Chart linked with active replay */}
          <EvaluationChart
            timeline={timelineData}
            onPointClick={(ply) => {
              setIsPlaying(false);
              setCurrentPly(ply);
            }}
          />
        </div>

        {/* Right: History & Decision Inspector (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-3 min-h-[560px]">
          <div className="h-64 flex-shrink-0">
            <MoveHistory
              moves={moves}
              selectedPly={currentPly > 0 ? currentPly : null}
              onSelectMove={(ply) => {
                setIsPlaying(false);
                setCurrentPly(ply);
              }}
            />
          </div>

          <div className="flex-1">
            <MoveDetails move={activeMove} />
          </div>
        </div>
      </div>
    </div>
  );
};
