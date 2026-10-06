import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart2, Download, Play, Sparkles, HelpCircle, ChevronDown, ChevronUp, Swords, RefreshCw, Zap } from 'lucide-react';

import { Game, MoveRecord, WSThinkingEvent, WSDecisionReadyEvent } from '../types';
import { api } from '../services/api';
import { GameWebSocketClient } from '../services/websocket';
import { ChessBoard } from '../components/ChessBoard';
import { EvaluationBar } from '../components/EvaluationBar';
import { AgentCard } from '../components/AgentCard';
import { AgentThinking } from '../components/AgentThinking';
import { MoveHistory } from '../components/MoveHistory';
import { MoveDetails } from '../components/MoveDetails';
import { GameControls } from '../components/GameControls';
import { StatusBadge } from '../components/StatusBadge';

interface ArenaPageProps {
  onOpenNewGame: () => void;
}

export const ArenaPage: React.FC<ArenaPageProps> = ({ onOpenNewGame }) => {
  const navigate = useNavigate();
  const [currentGame, setCurrentGame] = useState<Game | null>(null);
  const [moves, setMoves] = useState<MoveRecord[]>([]);
  const [selectedPly, setSelectedPly] = useState<number | null>(null);
  const [boardOrientation, setBoardOrientation] = useState<'white' | 'black'>('white');
  const [moveDelayMs, setMoveDelayMs] = useState<number>(1000);
  const [isThinking, setIsThinking] = useState<boolean>(false);
  const [thinkingData, setThinkingData] = useState<WSThinkingEvent | null>(null);
  const [decisionReadyData, setDecisionReadyData] = useState<WSDecisionReadyEvent | null>(null);
  const [stockfishEval, setStockfishEval] = useState<number>(0.0);
  const [lastMoveUci, setLastMoveUci] = useState<string>('');
  const [bestEngineMoveUci, setBestEngineMoveUci] = useState<string>('');
  const [showGuide, setShowGuide] = useState<boolean>(false);
  const [isLaunching, setIsLaunching] = useState<boolean>(false);

  const wsClientRef = useRef<GameWebSocketClient | null>(null);

  // Load latest active game or fetch recent
  useEffect(() => {
    loadLatestGame();
  }, []);

  const loadLatestGame = async () => {
    try {
      const { games } = await api.listGames({ limit: 10 });
      if (games && games.length > 0) {
        // Prioritize actively running or waiting game if one exists
        const activeGame = games.find((g) => g.status === 'running' || g.status === 'waiting');
        if (activeGame) {
          selectGame(activeGame.id);
        } else {
          selectGame(games[0].id);
        }
      }
    } catch (e) {
      console.error('Failed to load games:', e);
    }
  };

  const selectGame = async (gameId: string) => {
    try {
      const g = await api.getGame(gameId);
      setCurrentGame(g);
      setMoveDelayMs(g.move_delay_ms);

      const mList = await api.getGameMoves(gameId);
      setMoves(mList);

      if (mList.length > 0) {
        const last = mList[mList.length - 1];
        setStockfishEval(last.stockfish_eval_after ?? 0.0);
        setLastMoveUci(last.uci_move);
        setSelectedPly(last.ply);
      } else {
        setStockfishEval(0.0);
        setLastMoveUci('');
        setSelectedPly(null);
      }

      setupWebSocket(gameId);
    } catch (e) {
      console.error('Error selecting game:', e);
    }
  };

  const setupWebSocket = (gameId: string) => {
    if (wsClientRef.current) {
      wsClientRef.current.disconnect();
    }

    const client = new GameWebSocketClient(gameId);
    client.connect();

    client.onMessage((msg) => {
      handleWebSocketMessage(msg);
    });

    wsClientRef.current = client;
  };

  useEffect(() => {
    return () => {
      if (wsClientRef.current) {
        wsClientRef.current.disconnect();
      }
    };
  }, []);

  const handleWebSocketMessage = (data: any) => {
    switch (data.event) {
      case 'agent_thinking':
        setIsThinking(true);
        setThinkingData(data);
        setDecisionReadyData(null);
        break;

      case 'decision_ready':
        setDecisionReadyData(data);
        break;

      case 'move_played':
        setIsThinking(false);
        setThinkingData(null);
        setDecisionReadyData(null);

        // Update moves
        const mv = data.move;
        const newRecord: MoveRecord = {
          id: `${data.game_id}-${mv.ply}`,
          game_id: data.game_id,
          ply: mv.ply,
          move_number: mv.move_number,
          color: mv.color,
          agent: `${mv.color}_agent`,
          model: mv.model,
          personality: '',
          fen_before: '',
          uci_move: mv.uci_move,
          san_move: mv.san_move,
          fen_after: mv.fen_after,
          decision_summary: mv.decision_summary,
          confidence: mv.confidence,
          strategy: mv.strategy,
          secondary_strategies: [],
          risk_level: 'low',
          alternatives: mv.alternatives || [],
          stockfish_eval_before: mv.eval_before,
          stockfish_eval_after: mv.eval_score,
          stockfish_best_move: mv.best_engine_move,
          centipawn_loss: mv.cpl,
          move_quality: mv.quality,
          latency_ms: mv.latency_ms,
          move_source: 'llm',
          created_at: new Date().toISOString(),
        };

        setMoves((prev) => [...prev, newRecord]);
        setSelectedPly(mv.ply);
        setStockfishEval(mv.eval_score);
        setLastMoveUci(mv.uci_move);

        // Update game state
        setCurrentGame((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            current_fen: mv.fen_after,
            current_ply: mv.ply,
            move_number: mv.move_number,
            turn: mv.color === 'white' ? 'black' : 'white',
            opening: mv.opening || prev.opening,
            is_check: mv.is_check,
          };
        });
        break;

      case 'game_completed':
        setIsThinking(false);
        setCurrentGame((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            status: 'completed',
            winner: data.winner,
            termination_reason: data.reason,
          };
        });
        break;

      case 'game_paused':
        setIsThinking(false);
        setCurrentGame((prev) => (prev ? { ...prev, status: 'paused' } : null));
        break;

      case 'game_started':
        setCurrentGame((prev) => (prev ? { ...prev, status: 'running' } : null));
        break;

      case 'game_error':
        setIsThinking(false);
        console.error('Game error:', data.error);
        break;
    }
  };

  // 1-Click Quick Match Launcher (Friendly for beginners)
  const handleQuickLaunch = async () => {
    setIsLaunching(true);
    try {
      const newGame = await api.createGame({
        white_model: 'qwen/qwen3.8-27b',
        black_model: 'openai/gpt-oss-120b',
        white_personality: 'Strategic Aggressor',
        black_personality: 'Positional Defender',
        stockfish_depth: 14,
        move_delay_ms: 1000,
        max_moves: 120,
        auto_start: true,
      });
      await selectGame(newGame.id);
    } catch (e) {
      console.error('Failed to quick launch game:', e);
    } finally {
      setIsLaunching(false);
    }
  };

  // Game control handlers
  const handleStart = async () => {
    if (currentGame) {
      await api.startGame(currentGame.id);
      setCurrentGame((prev) => (prev ? { ...prev, status: 'running' } : null));
    }
  };

  const handlePause = async () => {
    if (currentGame) {
      await api.pauseGame(currentGame.id);
      setCurrentGame((prev) => (prev ? { ...prev, status: 'paused' } : null));
    }
  };

  const handleResume = async () => {
    if (currentGame) {
      await api.resumeGame(currentGame.id);
      setCurrentGame((prev) => (prev ? { ...prev, status: 'running' } : null));
    }
  };

  const handleNextMove = async () => {
    if (currentGame) {
      await api.nextMove(currentGame.id);
    }
  };

  const handleStop = async () => {
    if (currentGame) {
      await api.stopGame(currentGame.id);
      setCurrentGame((prev) => (prev ? { ...prev, status: 'aborted' } : null));
    }
  };

  const handleFlipBoard = () => {
    setBoardOrientation((prev) => (prev === 'white' ? 'black' : 'white'));
  };

  const selectedMove = moves.find((m) => m.ply === selectedPly) || (moves.length > 0 ? moves[moves.length - 1] : null);
  const isSameModel = currentGame && currentGame.white_model === currentGame.black_model;

  // Layman advantage indicator text
  const getAdvantageSummary = () => {
    if (stockfishEval > 2.5) return { text: `⚪ White is in the lead (+${stockfishEval.toFixed(1)} pawns)`, color: 'text-slate-100 bg-slate-800' };
    if (stockfishEval > 0.4) return { text: `⚪ White has a slight edge (+${stockfishEval.toFixed(1)} pawns)`, color: 'text-slate-200 bg-slate-800' };
    if (stockfishEval < -2.5) return { text: `⚫ Black is in the lead (${stockfishEval.toFixed(1)} pawns)`, color: 'text-slate-100 bg-slate-900 border-slate-700' };
    if (stockfishEval < -0.4) return { text: `⚫ Black has a slight edge (${stockfishEval.toFixed(1)} pawns)`, color: 'text-slate-200 bg-slate-900 border-slate-700' };
    return { text: `⚖️ Game is completely even (0.0 pawns)`, color: 'text-cyan-300 bg-cyan-950/60 border-cyan-800' };
  };

  const advantage = getAdvantageSummary();

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 space-y-3.5">
      {/* 1. Beginner Guide Banner (Collapsible) */}
      <div className="bg-arena-panel/90 border border-arena-border rounded-xl px-4 py-2.5 shadow-sm text-xs">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShowGuide(!showGuide)}
            className="flex items-center gap-2 text-cyan-300 hover:text-cyan-200 font-semibold transition-colors"
          >
            <HelpCircle className="w-4 h-4 text-cyan-400" />
            <span>New here? How ChessMind Arena Works (Click to {showGuide ? 'hide' : 'learn'})</span>
            {showGuide ? <ChevronUp className="w-3.5 h-3.5 ml-1" /> : <ChevronDown className="w-3.5 h-3.5 ml-1" />}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleQuickLaunch}
              disabled={isLaunching}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-md transition-all hover:scale-102 disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isLaunching ? 'Starting...' : '⚡ Quick Launch Match'}</span>
            </button>
            <button
              type="button"
              onClick={onOpenNewGame}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-arena-800 hover:bg-arena-700 text-slate-200 font-semibold text-xs border border-arena-border transition-colors"
            >
              <span>Custom Match...</span>
            </button>
          </div>
        </div>

        {showGuide && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 mt-2 border-t border-arena-border/60 text-slate-300 text-[11px] leading-relaxed">
            <div className="p-2.5 rounded-lg bg-arena-card border border-arena-border">
              <strong className="text-cyan-300 block mb-1">1. Two AIs Playing Chess</strong>
              Two distinct LLM models (e.g., Qwen vs OpenAI) play against each other on Groq. Each AI selects legal moves based on its chosen personality.
            </div>
            <div className="p-2.5 rounded-lg bg-arena-card border border-arena-border">
              <strong className="text-cyan-300 block mb-1">2. Stockfish Impartial Referee</strong>
              Stockfish 19 watches every move, grades whether it's a "Best Move" or a "Blunder", and tracks who is winning in points.
            </div>
            <div className="p-2.5 rounded-lg bg-arena-card border border-arena-border">
              <strong className="text-cyan-300 block mb-1">3. Understand AI Reasoning</strong>
              Click any move in the history table to see in plain English why the AI chose that move and what alternative ideas it considered!
            </div>
          </div>
        )}
      </div>

      {/* 2. Top Match Status & Live Score Bar */}
      {currentGame ? (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-arena-panel rounded-xl border border-arena-border shadow-sm">
          <div className="flex items-center gap-3">
            <StatusBadge
              status={currentGame.status}
              isCheck={currentGame.is_check}
              isCheckmate={currentGame.is_checkmate}
            />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-xs text-white">
                  {currentGame.opening || "Standard Opening"}
                </span>
                <span className="text-slate-500 text-xs">•</span>
                <span className="text-xs text-slate-300">
                  Move {currentGame.move_number}
                </span>
                <span className="text-slate-500 text-xs">•</span>
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold border ${advantage.color}`}>
                  {advantage.text}
                </span>
              </div>
              {currentGame.winner && (
                <p className="text-xs text-amber-300 font-bold mt-0.5">
                  {currentGame.winner.toLowerCase() === 'draw'
                    ? `🤝 Match Ended in a Draw (${currentGame.termination_reason || 'Draw'})`
                    : `🏆 Match Ended: ${currentGame.winner.toUpperCase()} Won (${currentGame.termination_reason || 'Checkmate'})`}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {currentGame.status === 'completed' && (
              <>
                <button
                  type="button"
                  onClick={handleQuickLaunch}
                  disabled={isLaunching}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all hover:scale-102 disabled:opacity-50"
                  title="Start a fresh 100-move live match between AI agents"
                >
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  <span>{isLaunching ? 'Starting AI...' : '⚡ Start Live Match'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/games/${currentGame.id}/analysis`)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md transition-all hover:scale-102"
                >
                  <BarChart2 className="w-3.5 h-3.5" />
                  <span>Full Game Report</span>
                </button>
              </>
            )}

            <a
              href={api.getPgnUrl(currentGame.id)}
              download
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-arena-800 hover:bg-arena-700 text-slate-300 font-medium text-xs border border-arena-border transition-colors"
              title="Download standard PGN chess notation"
            >
              <Download className="w-3.5 h-3.5" />
              <span>PGN</span>
            </a>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center bg-arena-panel rounded-xl border border-arena-border space-y-3">
          <p className="text-slate-300 font-medium text-sm">Ready to start an AI battle?</p>
          <div className="flex justify-center gap-3">
            <button
              type="button"
              onClick={handleQuickLaunch}
              className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-lg transition-all"
            >
              ⚡ Start Instant Match
            </button>
            <button
              type="button"
              onClick={onOpenNewGame}
              className="px-5 py-2.5 rounded-xl bg-arena-800 hover:bg-arena-700 text-slate-200 font-bold text-xs border border-arena-border"
            >
              Custom Setup...
            </button>
          </div>
        </div>
      )}

      {/* 2.1 Layman Explainer when Match is Completed */}
      {currentGame && currentGame.status === 'completed' && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-gradient-to-r from-arena-800 to-arena-900 border border-cyan-800/60 rounded-xl text-xs text-slate-200 shadow-md">
          <div className="flex items-start gap-2.5">
            <span className="text-cyan-400 text-lg">💡</span>
            <div>
              <p className="font-semibold text-white">
                This game has concluded ({moves.length > 0 ? `${Math.ceil(moves.length / 2)} moves played` : 'Completed'}).
              </p>
              <p className="text-slate-400 text-[11px] mt-0.5">
                In standard chess, full matches typically last 30 to 80 moves before checkmate or draw.
                Ready to watch a brand new AI battle play out in real-time?
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleQuickLaunch}
            disabled={isLaunching}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-lg shadow-cyan-950/40 transition-all hover:scale-102 disabled:opacity-50"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>{isLaunching ? 'Starting AI Match...' : '⚡ Launch Full 100-Move Match'}</span>
          </button>
        </div>
      )}

      {/* 3. Main Arena Layout */}
      {currentGame && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Column: Board & Agent Cards & Controls (7 Cols) */}
          <div className="lg:col-span-7 space-y-3">
            {/* Black Agent Header Card */}
            <AgentCard
              color="black"
              model={currentGame.black_model}
              personality={currentGame.black_personality}
              isThinking={isThinking && thinkingData?.color === 'black'}
              isTurn={currentGame.turn === 'black'}
              confidence={selectedMove?.color === 'black' ? selectedMove.confidence : undefined}
              warningSameModel={!!isSameModel}
            />

            {/* Chessboard + Vertical Evaluation Bar */}
            <div className="flex justify-center items-stretch gap-3 py-1">
              <EvaluationBar score={stockfishEval} depth={currentGame.stockfish_depth} />
              <ChessBoard
                fen={currentGame.current_fen}
                orientation={boardOrientation}
                lastMoveUci={lastMoveUci}
                bestMoveUci={bestEngineMoveUci}
                boardWidth={490}
              />
            </div>

            {/* White Agent Footer Card */}
            <AgentCard
              color="white"
              model={currentGame.white_model}
              personality={currentGame.white_personality}
              isThinking={isThinking && thinkingData?.color === 'white'}
              isTurn={currentGame.turn === 'white'}
              confidence={selectedMove?.color === 'white' ? selectedMove.confidence : undefined}
              warningSameModel={!!isSameModel}
            />

            {/* Game Controls Bar */}
            <GameControls
              status={currentGame.status}
              onStart={handleStart}
              onPause={handlePause}
              onResume={handleResume}
              onNextMove={handleNextMove}
              onStop={handleStop}
              onFlipBoard={handleFlipBoard}
              onNewGame={handleQuickLaunch}
              moveDelayMs={moveDelayMs}
              onChangeDelay={(d) => setMoveDelayMs(d)}
              disabled={isThinking}
            />

            {/* Live Thinking Status Box */}
            <AgentThinking
              color={thinkingData?.color}
              model={thinkingData?.model}
              personality={thinkingData?.personality}
              moveNumber={thinkingData?.move_number}
              isAnalyzing={isThinking}
              decisionReady={decisionReadyData}
            />
          </div>

          {/* Right Column: Move History & Decision Inspector (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col gap-3 min-h-[560px]">
            {/* Move History Table (Top half) */}
            <div className="h-64 flex-shrink-0">
              <MoveHistory
                moves={moves}
                selectedPly={selectedPly}
                onSelectMove={(ply) => setSelectedPly(ply)}
              />
            </div>

            {/* Decision Inspector (Bottom half) */}
            <div className="flex-1">
              <MoveDetails move={selectedMove} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
