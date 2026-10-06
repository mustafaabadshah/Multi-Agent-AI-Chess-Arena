import React, { useState, useEffect, useRef } from 'react';
import {
  Trophy,
  Swords,
  Crown,
  Medal,
  Play,
  Pause,
  Plus,
  RefreshCw,
  Sparkles,
  Sliders,
  Users,
  CheckCircle2,
  Clock,
  ArrowRight,
  Shield,
  Zap,
  Flame,
  BrainCircuit,
  Eye,
  Trash2,
  ChevronRight,
  BarChart3,
  BookOpen
} from 'lucide-react';

import { ChessBoard } from '../components/ChessBoard';
import { EvaluationBar } from '../components/EvaluationBar';
import { api } from '../services/api';
import {
  Tournament,
  TournamentParticipant,
  TournamentMatch,
  GroqModelInfo,
  AgentPersonality,
  Game,
  MoveRecord
} from '../types';

const COLOR_PALETTES = [
  { name: 'Emerald', value: '#10b981', border: 'border-emerald-500/50', bg: 'bg-emerald-950/40', text: 'text-emerald-400' },
  { name: 'Cyan', value: '#06b6d4', border: 'border-cyan-500/50', bg: 'bg-cyan-950/40', text: 'text-cyan-400' },
  { name: 'Violet', value: '#8b5cf6', border: 'border-violet-500/50', bg: 'bg-violet-950/40', text: 'text-violet-400' },
  { name: 'Amber', value: '#f59e0b', border: 'border-amber-500/50', bg: 'bg-amber-950/40', text: 'text-amber-400' },
  { name: 'Rose', value: '#f43f5e', border: 'border-rose-500/50', bg: 'bg-rose-950/40', text: 'text-rose-400' },
  { name: 'Blue', value: '#3b82f6', border: 'border-blue-500/50', bg: 'bg-blue-950/40', text: 'text-blue-400' },
];

export const TournamentPage: React.FC = () => {
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [activeTournament, setActiveTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'bracket' | 'standings' | 'report'>('bracket');

  // Customizer Wizard State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [numContenders, setNumContenders] = useState<4 | 6>(4);
  const [tournamentName, setTournamentName] = useState<string>('Grandmasters Championship Cup');
  const [maxMoves, setMaxMoves] = useState<number>(40);
  const [moveDelayMs, setMoveDelayMs] = useState<number>(250);
  const [stockfishDepth, setStockfishDepth] = useState<number>(12);
  const [customParticipants, setCustomParticipants] = useState<TournamentParticipant[]>([]);

  // Live Inspection / Spectating
  const [selectedMatch, setSelectedMatch] = useState<TournamentMatch | null>(null);
  const [inspectedGame, setInspectedGame] = useState<Game | null>(null);
  const [inspectedMoves, setInspectedMoves] = useState<MoveRecord[]>([]);

  // Metadata
  const [models, setModels] = useState<GroqModelInfo[]>([]);
  const [personalities, setPersonalities] = useState<AgentPersonality[]>([]);

  const pollIntervalRef = useRef<any>(null);

  // Initial Load
  useEffect(() => {
    loadMetadata();
    loadTournaments();
  }, []);

  const loadMetadata = async () => {
    try {
      const [mList, pList] = await Promise.all([api.getModels(), api.getPersonalities()]);
      setModels(mList);
      setPersonalities(pList);
    } catch (e) {
      console.error('Failed to load metadata:', e);
    }
  };

  const loadTournaments = async (preferredId?: string) => {
    setLoading(true);
    try {
      const res = await api.listTournaments(20);
      setTournaments(res.tournaments || []);
      if (res.tournaments && res.tournaments.length > 0) {
        // Prioritize: 1) preferredId, 2) actively running tournament, 3) completed tournament with champion, 4) first
        let targetId = preferredId;
        if (!targetId) {
          const running = res.tournaments.find(t => t.status === 'running');
          const completedWithChamp = res.tournaments.find(t => t.status === 'completed' && t.champion_name);
          targetId = running ? running.id : completedWithChamp ? completedWithChamp.id : res.tournaments[0].id;
        }
        loadTournamentDetail(targetId);
      } else {
        // No tournaments yet, open create modal with default setup
        initDefaultContenders(4);
        setIsModalOpen(true);
      }
    } catch (e) {
      console.error('Failed to load tournaments:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadTournamentDetail = async (id: string) => {
    try {
      const t = await api.getTournament(id);
      setActiveTournament(t);

      // Default selected match to currently running or latest completed
      if (t.matches && t.matches.length > 0) {
        const liveMatch = t.matches.find(m => m.status === 'running') ||
                          t.matches.filter(m => m.status === 'completed').pop() ||
                          t.matches[0];
        setSelectedMatch(liveMatch);
        if (liveMatch.game_id) {
          fetchGameDetails(liveMatch.game_id);
        }
      }
    } catch (e) {
      console.error('Failed to load tournament detail:', e);
    }
  };

  const fetchGameDetails = async (gameId: string) => {
    try {
      const [g, m] = await Promise.all([api.getGame(gameId), api.getGameMoves(gameId)]);
      setInspectedGame(g);
      setInspectedMoves(m);
    } catch (e) {
      console.error('Failed to fetch game details:', e);
    }
  };

  // Autonomous Polling when tournament is running
  useEffect(() => {
    if (activeTournament && activeTournament.status === 'running') {
      pollIntervalRef.current = setInterval(async () => {
        try {
          const t = await api.getTournament(activeTournament.id);
          setActiveTournament(t);

          // Update inspected match if game is running
          if (t.current_match_id) {
            const m = t.matches.find(match => match.id === t.current_match_id);
            if (m) {
              setSelectedMatch(m);
              if (m.game_id) {
                const [g, moves] = await Promise.all([api.getGame(m.game_id), api.getGameMoves(m.game_id)]);
                setInspectedGame(g);
                setInspectedMoves(moves);
              }
            }
          }
        } catch (err) {
          console.error('Error polling tournament:', err);
        }
      }, 1500);
    } else {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    }

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [activeTournament?.id, activeTournament?.status]);

  // Setup Default Contenders based on count (4 or 6)
  const initDefaultContenders = (count: 4 | 6) => {
    const templates: TournamentParticipant[] = [
      {
        id: 'p1',
        seed: 1,
        name: 'Qwen 3.8 27B Titan',
        model: 'qwen/qwen3.8-27b',
        personality: 'Strategic Aggressor',
        temperature: 0.2,
        color_theme: '#10b981',
        wins: 0,
        losses: 0,
        draws: 0,
      },
      {
        id: 'p2',
        seed: 2,
        name: 'GPT-OSS 120B Thinker',
        model: 'openai/gpt-oss-120b',
        personality: 'Positional Defender',
        temperature: 0.2,
        color_theme: '#06b6d4',
        wins: 0,
        losses: 0,
        draws: 0,
      },
      {
        id: 'p3',
        seed: 3,
        name: 'GPT-OSS 20B Blitz',
        model: 'openai/gpt-oss-20b',
        personality: 'Tactical Master',
        temperature: 0.2,
        color_theme: '#8b5cf6',
        wins: 0,
        losses: 0,
        draws: 0,
      },
      {
        id: 'p4',
        seed: 4,
        name: 'Qwen Endgame Virtuoso',
        model: 'qwen/qwen3.8-27b',
        personality: 'Endgame Virtuoso',
        temperature: 0.15,
        color_theme: '#f59e0b',
        wins: 0,
        losses: 0,
        draws: 0,
      },
      {
        id: 'p5',
        seed: 5,
        name: 'GPT-OSS 120B Fort',
        model: 'openai/gpt-oss-120b',
        personality: 'Positional Defender',
        temperature: 0.2,
        color_theme: '#f43f5e',
        wins: 0,
        losses: 0,
        draws: 0,
      },
      {
        id: 'p6',
        seed: 6,
        name: 'GPT-OSS 20B Maverick',
        model: 'openai/gpt-oss-20b',
        personality: 'Speed & Chaos',
        temperature: 0.35,
        color_theme: '#3b82f6',
        wins: 0,
        losses: 0,
        draws: 0,
      },
    ];

    setCustomParticipants(templates.slice(0, count));
  };

  const handleContenderCountChange = (count: 4 | 6) => {
    setNumContenders(count);
    initDefaultContenders(count);
  };

  const handleUpdateParticipant = (index: number, key: keyof TournamentParticipant, value: any) => {
    setCustomParticipants(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [key]: value };
      return copy;
    });
  };

  const handleCreateTournament = async () => {
    try {
      setLoading(true);
      const payload = {
        name: tournamentName,
        participants: customParticipants,
        settings: {
          max_moves: maxMoves,
          move_delay_ms: moveDelayMs,
          stockfish_depth: stockfishDepth,
        },
        auto_start: true,
      };

      const created = await api.createTournament(payload);
      setIsModalOpen(false);
      setActiveTournament(created);
      await loadTournaments();
    } catch (e: any) {
      alert(`Error creating tournament: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePause = async () => {
    if (!activeTournament) return;
    try {
      if (activeTournament.status === 'running') {
        await api.pauseTournament(activeTournament.id);
      } else {
        await api.startTournament(activeTournament.id);
      }
      const updated = await api.getTournament(activeTournament.id);
      setActiveTournament(updated);
    } catch (e: any) {
      alert(`Error toggling tournament: ${e.message}`);
    }
  };

  const handleDeleteTournament = async (id: string) => {
    if (!confirm('Are you sure you want to delete this tournament?')) return;
    try {
      await api.deleteTournament(id);
      await loadTournaments();
    } catch (e: any) {
      alert(`Error deleting tournament: ${e.message}`);
    }
  };

  // Helper to get participant info by ID
  const getParticipant = (id?: string | null): TournamentParticipant | undefined => {
    if (!id || !activeTournament) return undefined;
    return activeTournament.participants.find(p => p.id === id);
  };

  // Render Bracket Matches grouped by round
  const qfMatches = activeTournament?.matches.filter(m => m.round === 'quarterfinals') || [];
  const sfMatches = activeTournament?.matches.filter(m => m.round === 'semifinals') || [];
  const finalsMatches = activeTournament?.matches.filter(m => m.round === 'finals') || [];
  const grandFinalMatch = finalsMatches.find(m => m.id === 'final');
  const thirdPlaceMatch = finalsMatches.find(m => m.id === 'third_place');

  const latestMove = inspectedMoves[inspectedMoves.length - 1];
  const lastMoveUci = latestMove?.uci_move;
  const bestMoveUci = latestMove?.stockfish_best_move;
  const currentEval = latestMove?.stockfish_eval_after ?? 0;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* 1. Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-arena-950 via-arena-900 to-indigo-950/40 border border-arena-border shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-wrap items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center shadow-lg shadow-amber-950">
                <Trophy className="w-5 h-5 text-slate-950 fill-current" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-wide text-slate-100 flex items-center gap-2">
                  TOURNAMENT ARENA
                  <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    4–6 AI MODELS KNOCKOUT
                  </span>
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  Automated Bracket Elimination &bull; Decisive Tiebreak Evaluation &bull; Post-Tournament Prompt Analytics
                </p>
              </div>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2.5">
            {activeTournament && (
              <>
                <button
                  type="button"
                  onClick={handleTogglePause}
                  disabled={activeTournament.status === 'completed'}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-md ${
                    activeTournament.status === 'running'
                      ? 'bg-amber-600 hover:bg-amber-500 text-white'
                      : activeTournament.status === 'completed'
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  }`}
                >
                  {activeTournament.status === 'running' ? (
                    <>
                      <Pause className="w-3.5 h-3.5 fill-current" />
                      Pause Games
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      Resume Progression
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => loadTournamentDetail(activeTournament.id)}
                  className="p-1.5 rounded-lg bg-arena-800 hover:bg-arena-700 text-slate-300 border border-arena-border"
                  title="Refresh state"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => {
                initDefaultContenders(numContenders);
                setIsModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-cyan-950/60 transition-transform hover:scale-102"
            >
              <Plus className="w-3.5 h-3.5" />
              New Tournament
            </button>
          </div>
        </div>

        {/* Tournament Selector & Status Bar */}
        {activeTournament && (
          <div className="mt-5 pt-4 border-t border-arena-border/80 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-400">Selected Cup:</span>
              <select
                aria-label="Select tournament"
                value={activeTournament.id}
                onChange={(e) => loadTournamentDetail(e.target.value)}
                className="bg-arena-950 border border-arena-border text-xs text-cyan-300 font-bold px-3 py-1 rounded-lg focus:outline-none focus:border-cyan-500"
              >
                {tournaments.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.num_participants} Models) &bull; {t.status.toUpperCase()}
                  </option>
                ))}
              </select>

              <span
                className={`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${
                  activeTournament.status === 'completed'
                    ? 'bg-amber-950/60 text-amber-300 border-amber-600/50'
                    : activeTournament.status === 'running'
                    ? 'bg-emerald-950/60 text-emerald-300 border-emerald-600/50 animate-pulse'
                    : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                {activeTournament.status === 'completed'
                  ? '🏆 CHAMPION CROWNED'
                  : activeTournament.status === 'running'
                  ? '⚡ IN PROGRESS'
                  : 'PAUSED / SETUP'}
              </span>
            </div>

            {/* Quick Champion Badge if completed */}
            {activeTournament.champion_name && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-amber-950/40 border border-amber-600/40 text-amber-200 text-xs">
                <Crown className="w-4 h-4 text-amber-400 fill-current animate-bounce" />
                <span className="font-bold">Champion: {activeTournament.champion_name}</span>
                <span className="font-mono text-[10px] text-amber-400/80">({activeTournament.champion_model})</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. Navigation Tabs */}
      <div className="flex border-b border-arena-border gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('bracket')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'bracket'
              ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Swords className="w-4 h-4" />
          Interactive Bracket & Live Arena
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('standings')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'standings'
              ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Medal className="w-4 h-4" />
          Podium & Standings
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('report')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'report'
              ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <BrainCircuit className="w-4 h-4" />
          Deep AI & Prompt Analysis
        </button>
      </div>

      {/* 3. Tab Contents */}

      {/* TAB 1: BRACKET & LIVE ARENA */}
      {activeTab === 'bracket' && activeTournament && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left / Center: Interactive Tournament Bracket (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="p-5 rounded-2xl bg-arena-panel border border-arena-border shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Swords className="w-4 h-4 text-cyan-400" />
                  <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider font-mono">
                    Knockout Progression Tree ({activeTournament.num_participants} Contenders)
                  </h2>
                </div>
                <span className="text-[11px] text-slate-400">
                  Click any match card to inspect board
                </span>
              </div>

              {/* Bracket Columns */}
              <div className="space-y-6 overflow-x-auto pb-4">
                {/* Quarterfinals (if 6 participants) */}
                {qfMatches.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2.5">
                      <span className="text-[11px] font-mono font-bold text-indigo-400 uppercase tracking-wider bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800/40">
                        Quarterfinals (Play-ins)
                      </span>
                      <span className="text-[10px] text-slate-500">(Seeds 1 & 2 bye into Semifinals)</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {qfMatches.map((m) => (
                        <MatchCard
                          key={m.id}
                          match={m}
                          isSelected={selectedMatch?.id === m.id}
                          onSelect={() => {
                            setSelectedMatch(m);
                            if (m.game_id) fetchGameDetails(m.game_id);
                          }}
                          getParticipant={getParticipant}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Semifinals */}
                <div>
                  <div className="flex items-center gap-2 mb-2.5">
                    <span className="text-[11px] font-mono font-bold text-cyan-400 uppercase tracking-wider bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
                      Semifinals
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {sfMatches.map((m) => (
                      <MatchCard
                        key={m.id}
                        match={m}
                        isSelected={selectedMatch?.id === m.id}
                        onSelect={() => {
                          setSelectedMatch(m);
                          if (m.game_id) fetchGameDetails(m.game_id);
                        }}
                        getParticipant={getParticipant}
                      />
                    ))}
                  </div>
                </div>

                {/* Championship Final & 3rd Place */}
                <div className="pt-2 border-t border-arena-border/60">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Grand Championship Final */}
                    {grandFinalMatch && (
                      <div className="p-3.5 rounded-xl bg-gradient-to-br from-amber-950/30 via-arena-950 to-arena-900 border-2 border-amber-500/50 shadow-xl shadow-amber-950/20">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-mono font-bold text-amber-300 flex items-center gap-1.5">
                            <Crown className="w-3.5 h-3.5 fill-current" />
                            GRAND CHAMPIONSHIP FINAL
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-200 border border-amber-500/40">
                            1st Place Match
                          </span>
                        </div>
                        <MatchCard
                          match={grandFinalMatch}
                          isSelected={selectedMatch?.id === grandFinalMatch.id}
                          onSelect={() => {
                            setSelectedMatch(grandFinalMatch);
                            if (grandFinalMatch.game_id) fetchGameDetails(grandFinalMatch.game_id);
                          }}
                          getParticipant={getParticipant}
                          highlightGold
                        />
                      </div>
                    )}

                    {/* 3rd Place Match */}
                    {thirdPlaceMatch && (
                      <div className="p-3.5 rounded-xl bg-arena-950/60 border border-arena-border/80">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-mono font-bold text-slate-300 flex items-center gap-1.5">
                            <Medal className="w-3.5 h-3.5 text-amber-600" />
                            3RD PLACE PLAYOFF
                          </span>
                          <span className="text-[10px] text-slate-400">Bronze Medal</span>
                        </div>
                        <MatchCard
                          match={thirdPlaceMatch}
                          isSelected={selectedMatch?.id === thirdPlaceMatch.id}
                          onSelect={() => {
                            setSelectedMatch(thirdPlaceMatch);
                            if (thirdPlaceMatch.game_id) fetchGameDetails(thirdPlaceMatch.game_id);
                          }}
                          getParticipant={getParticipant}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Live Match Spectator / Inspector Board (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="p-5 rounded-2xl bg-arena-panel border border-arena-border shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-arena-border pb-3">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-bold text-slate-100 font-mono">
                    {selectedMatch ? selectedMatch.round_name : 'MATCH SPECTATOR'}
                  </h3>
                </div>
                {selectedMatch?.status === 'running' ? (
                  <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-rose-400 bg-rose-950/60 px-2 py-0.5 rounded border border-rose-800/50 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    LIVE ON BOARD
                  </span>
                ) : selectedMatch?.status === 'completed' ? (
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-800/40">
                    MATCH CONCLUDED
                  </span>
                ) : (
                  <span className="text-[10px] font-mono text-slate-400">PENDING START</span>
                )}
              </div>

              {/* Contenders Header */}
              {selectedMatch && (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-arena-900 border border-arena-border">
                    <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono uppercase">
                      <span>⚪ WHITE</span>
                    </div>
                    <div className="font-bold text-slate-100 mt-0.5 truncate">
                      {getParticipant(selectedMatch.white_participant_id)?.name || 'TBD'}
                    </div>
                    <div className="text-[10px] text-cyan-400 font-mono truncate">
                      {getParticipant(selectedMatch.white_participant_id)?.model || 'Model'}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-arena-900 border border-arena-border">
                    <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono uppercase">
                      <span>⚫ BLACK</span>
                    </div>
                    <div className="font-bold text-slate-100 mt-0.5 truncate">
                      {getParticipant(selectedMatch.black_participant_id)?.name || 'TBD'}
                    </div>
                    <div className="text-[10px] text-purple-400 font-mono truncate">
                      {getParticipant(selectedMatch.black_participant_id)?.model || 'Model'}
                    </div>
                  </div>
                </div>
              )}

              {/* Chess Board & Live Evaluation Bar */}
              <div className="flex justify-center items-center gap-3 py-2 bg-arena-950 rounded-xl p-3 border border-arena-border">
                <div className="h-[380px]">
                  <EvaluationBar score={currentEval} depth={12} />
                </div>
                <div className="flex justify-center">
                  <ChessBoard
                    fen={inspectedGame?.current_fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'}
                    boardWidth={360}
                    lastMoveUci={lastMoveUci}
                    bestMoveUci={bestMoveUci}
                  />
                </div>
              </div>

              {/* Tiebreak / Result Explanation */}
              {selectedMatch?.tiebreak_note && (
                <div className="p-3 rounded-lg bg-cyan-950/40 border border-cyan-800/40 text-xs text-cyan-200">
                  <div className="font-bold flex items-center gap-1 text-cyan-300">
                    <Sparkles className="w-3.5 h-3.5" />
                    Knockout Resolution:
                  </div>
                  <p className="text-[11px] mt-1 text-slate-300 leading-relaxed">
                    {selectedMatch.tiebreak_note}
                  </p>
                </div>
              )}

              {/* Move Stats & Quality */}
              {latestMove && (
                <div className="p-3 rounded-lg bg-arena-900 border border-arena-border text-xs space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Last Move Played:</span>
                    <span className="font-mono font-bold text-cyan-300">
                      #{latestMove.move_number} {latestMove.san_move} ({latestMove.uci_move})
                    </span>
                  </div>
                  {latestMove.decision_summary && (
                    <p className="text-[11px] text-slate-300 italic border-t border-arena-border pt-1">
                      "{latestMove.decision_summary}"
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PODIUM & STANDINGS */}
      {activeTab === 'standings' && activeTournament && (
        <div className="space-y-6">
          {/* Victory Podium */}
          {activeTournament.status === 'completed' ? (
            <div className="p-8 rounded-3xl bg-gradient-to-b from-amber-950/40 via-arena-950 to-arena-900 border-2 border-amber-500/40 shadow-2xl text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent pointer-events-none" />

              <Crown className="w-16 h-16 text-amber-400 fill-current mx-auto mb-3 animate-pulse" />
              <h2 className="text-3xl font-black text-amber-200 tracking-wide font-mono">
                TOURNAMENT CHAMPION
              </h2>
              <p className="text-xl font-extrabold text-slate-100 mt-1">
                {activeTournament.champion_name}
              </p>
              <p className="text-sm font-mono text-cyan-400 mt-0.5">
                Model: {activeTournament.champion_model}
              </p>

              {/* Podium Ranks (1st, 2nd, 3rd) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto mt-8">
                {/* 2nd Place */}
                <div className="p-5 rounded-2xl bg-arena-900/80 border border-slate-600/50 shadow-lg flex flex-col justify-end">
                  <div className="w-10 h-10 rounded-full bg-slate-400/20 text-slate-300 flex items-center justify-center font-black mx-auto mb-2">
                    2
                  </div>
                  <span className="text-xs font-mono text-slate-400 uppercase font-bold">Runner-Up 🥈</span>
                  <div className="text-sm font-bold text-slate-100 mt-1 truncate">
                    {activeTournament.runner_up_name || 'Runner-Up'}
                  </div>
                </div>

                {/* 1st Place Champion */}
                <div className="p-6 rounded-2xl bg-gradient-to-t from-amber-950/80 to-amber-900/40 border-2 border-amber-400 shadow-xl shadow-amber-950/50 -translate-y-2">
                  <Trophy className="w-12 h-12 text-amber-400 fill-current mx-auto mb-2" />
                  <span className="text-xs font-mono text-amber-300 uppercase font-black">1ST PLACE 🏆</span>
                  <div className="text-base font-black text-white mt-1 truncate">
                    {activeTournament.champion_name}
                  </div>
                </div>

                {/* 3rd Place */}
                <div className="p-5 rounded-2xl bg-arena-900/80 border border-amber-900/50 shadow-lg flex flex-col justify-end">
                  <div className="w-10 h-10 rounded-full bg-amber-700/20 text-amber-600 flex items-center justify-center font-black mx-auto mb-2">
                    3
                  </div>
                  <span className="text-xs font-mono text-amber-600 uppercase font-bold">3rd Place 🥉</span>
                  <div className="text-sm font-bold text-slate-100 mt-1 truncate">
                    {activeTournament.third_place_name || '3rd Place'}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 rounded-2xl bg-arena-panel border border-arena-border text-center text-slate-400 font-mono text-sm">
              <Clock className="w-8 h-8 text-cyan-400 mx-auto mb-2 animate-spin" />
              Tournament is currently in progress. Final podium will be crowned upon completion of the Grand Championship Final!
            </div>
          )}

          {/* Detailed Leaderboard Table */}
          <div className="p-6 rounded-2xl bg-arena-panel border border-arena-border shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-slate-100 font-mono uppercase tracking-wider flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-cyan-400" />
              Official Tournament Standings
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead>
                  <tr className="border-b border-arena-border text-slate-400 font-mono uppercase">
                    <th className="py-2.5 px-3">Rank</th>
                    <th className="py-2.5 px-3">Contender Name</th>
                    <th className="py-2.5 px-3">Model Architecture</th>
                    <th className="py-2.5 px-3">Assigned Style</th>
                    <th className="py-2.5 px-3 text-center">Wins</th>
                    <th className="py-2.5 px-3 text-center">Losses</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-arena-border/50">
                  {(activeTournament.standings || activeTournament.participants).map((p, idx) => (
                    <tr key={p.id} className="hover:bg-arena-800/40 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold">
                        {p.rank === 1 ? '🥇 1st' : p.rank === 2 ? '🥈 2nd' : p.rank === 3 ? '🥉 3rd' : `#${p.rank || idx + 1}`}
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-100 flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color_theme }} />
                        {p.name}
                      </td>
                      <td className="py-3 px-3 font-mono text-cyan-400">{p.model}</td>
                      <td className="py-3 px-3 text-slate-300">{p.personality}</td>
                      <td className="py-3 px-3 text-center font-bold text-emerald-400">{p.wins || 0}</td>
                      <td className="py-3 px-3 text-center text-rose-400">{p.losses || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: DEEP AI & PROMPT ANALYSIS */}
      {activeTab === 'report' && activeTournament && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-arena-panel border border-arena-border shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-arena-border pb-4">
              <div className="flex items-center gap-2.5">
                <BrainCircuit className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-slate-100 font-mono">
                  Deep Tournament & AI Prompt Analysis Report
                </h3>
              </div>
              <span className="text-xs font-mono text-slate-400">
                Engine: Stockfish 19 &bull; LLM Telemetry
              </span>
            </div>

            {/* Render Summary Report */}
            {activeTournament.summary_report ? (
              <div className="p-6 rounded-xl bg-arena-950 border border-arena-border font-sans text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">
                {activeTournament.summary_report}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400 text-xs font-mono">
                The deep AI analysis report will generate automatically when all knockout rounds complete.
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. PRE-TOURNAMENT SETUP & CUSTOMIZER MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-arena-950 border border-arena-border rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-6">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-arena-border pb-4">
              <div className="flex items-center gap-2.5">
                <Trophy className="w-6 h-6 text-amber-400" />
                <div>
                  <h2 className="text-lg font-bold text-slate-100">Configure AI Model Tournament</h2>
                  <p className="text-xs text-slate-400">
                    Customize models, seeds, playing styles, and speed before launch
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold p-1"
              >
                &times;
              </button>
            </div>

            {/* General Tournament Settings */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">TOURNAMENT TITLE</label>
                <input
                  type="text"
                  value={tournamentName}
                  onChange={(e) => setTournamentName(e.target.value)}
                  className="w-full bg-arena-900 border border-arena-border rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">BRACKET SIZE</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleContenderCountChange(4)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                      numContenders === 4
                        ? 'bg-cyan-600 text-white border-cyan-400'
                        : 'bg-arena-900 text-slate-400 border-arena-border hover:bg-arena-800'
                    }`}
                  >
                    4 Models (Semifinals & Final)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleContenderCountChange(6)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                      numContenders === 6
                        ? 'bg-cyan-600 text-white border-cyan-400'
                        : 'bg-arena-900 text-slate-400 border-arena-border hover:bg-arena-800'
                    }`}
                  >
                    6 Models (Quarterfinals & Byes)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">MOVES LIMIT PER MATCH</label>
                <select
                  value={maxMoves}
                  onChange={(e) => setMaxMoves(Number(e.target.value))}
                  className="w-full bg-arena-900 border border-arena-border rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value={30}>30 Moves (Fast & Decisive)</option>
                  <option value={40}>40 Moves (Standard Tournament)</option>
                  <option value={50}>50 Moves (Deep Strategic Endgame)</option>
                </select>
              </div>
            </div>

            {/* Slot-by-Slot Agent Customization Cards */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                  Customize Contenders ({customParticipants.length} Slots)
                </span>
                <span className="text-[10px] text-slate-500">
                  Select model, style, temperature, and display name for each seed
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {customParticipants.map((p, idx) => (
                  <div
                    key={p.id}
                    className="p-3.5 rounded-xl bg-arena-900 border border-arena-border space-y-3 relative overflow-hidden"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-arena-800 border border-arena-border flex items-center justify-center text-[10px] font-mono font-bold text-cyan-300">
                          #{p.seed}
                        </span>
                        <input
                          type="text"
                          value={p.name}
                          onChange={(e) => handleUpdateParticipant(idx, 'name', e.target.value)}
                          className="bg-transparent border-b border-transparent hover:border-slate-600 focus:border-cyan-400 text-xs font-bold text-slate-100 px-1 py-0.5 focus:outline-none"
                          placeholder={`Contender #${p.seed} Name`}
                        />
                      </div>

                      {/* Color Theme Selector */}
                      <div className="flex gap-1">
                        {COLOR_PALETTES.map((c) => (
                          <button
                            key={c.name}
                            type="button"
                            onClick={() => handleUpdateParticipant(idx, 'color_theme', c.value)}
                            className={`w-3.5 h-3.5 rounded-full transition-transform ${
                              p.color_theme === c.value ? 'scale-125 ring-2 ring-white' : 'opacity-60'
                            }`}
                            style={{ backgroundColor: c.value }}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Model & Personality Grid */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <label className="text-[10px] text-slate-400 font-mono block mb-1">AI MODEL</label>
                        <select
                          value={p.model}
                          onChange={(e) => handleUpdateParticipant(idx, 'model', e.target.value)}
                          className="w-full bg-arena-950 border border-arena-border rounded px-2 py-1 text-xs text-cyan-300 font-bold focus:outline-none focus:border-cyan-400"
                        >
                          {models.length > 0 ? (
                            models.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.name || m.id}
                              </option>
                            ))
                          ) : (
                            <>
                              <option value="qwen/qwen3.8-27b">Qwen 3.8 27B (Premier)</option>
                              <option value="openai/gpt-oss-120b">GPT-OSS 120B (Reasoning)</option>
                              <option value="openai/gpt-oss-20b">GPT-OSS 20B (Fast Reasoning)</option>
                              <option value="mock-model">Mock Model (Deterministic)</option>
                            </>
                          )}
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-400 font-mono block mb-1">PLAYING STYLE</label>
                        <select
                          value={p.personality}
                          onChange={(e) => handleUpdateParticipant(idx, 'personality', e.target.value)}
                          className="w-full bg-arena-950 border border-arena-border rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
                        >
                          {personalities.length > 0 ? (
                            personalities.map((pers) => (
                              <option key={pers.name} value={pers.name}>
                                {pers.name}
                              </option>
                            ))
                          ) : (
                            <>
                              <option value="Strategic Aggressor">Strategic Aggressor</option>
                              <option value="Positional Defender">Positional Defender</option>
                              <option value="Tactical Master">Tactical Master</option>
                              <option value="Endgame Virtuoso">Endgame Virtuoso</option>
                              <option value="Speed & Chaos">Speed & Chaos</option>
                            </>
                          )}
                        </select>
                      </div>
                    </div>

                    {/* Temperature Slider */}
                    <div className="flex items-center justify-between text-[11px] pt-1 border-t border-arena-border/50">
                      <span className="text-slate-400 font-mono">Style Temperature:</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min={0.05}
                          max={0.7}
                          step={0.05}
                          value={p.temperature}
                          onChange={(e) => handleUpdateParticipant(idx, 'temperature', parseFloat(e.target.value))}
                          className="w-24 accent-cyan-400 h-1 bg-arena-800 rounded cursor-pointer"
                        />
                        <span className="font-mono text-cyan-300 w-8 text-right">{p.temperature.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Launch Tournament Controls */}
            <div className="flex items-center justify-between pt-4 border-t border-arena-border">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-arena-900 hover:bg-arena-800 text-slate-300 text-xs font-bold"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleCreateTournament}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-300 text-slate-950 font-black text-xs shadow-lg shadow-amber-950/60 transition-transform hover:scale-102"
              >
                <Trophy className="w-4 h-4 fill-current" />
                START TOURNAMENT KNOCKOUT
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Subcomponent: Match Card inside Bracket Tree
interface MatchCardProps {
  match: TournamentMatch;
  isSelected: boolean;
  onSelect: () => void;
  getParticipant: (id?: string | null) => TournamentParticipant | undefined;
  highlightGold?: boolean;
}

const MatchCard: React.FC<MatchCardProps> = ({
  match,
  isSelected,
  onSelect,
  getParticipant,
  highlightGold,
}) => {
  const whiteP = getParticipant(match.white_participant_id);
  const blackP = getParticipant(match.black_participant_id);

  const isWhiteWinner = match.winner_participant_id && match.winner_participant_id === whiteP?.id;
  const isBlackWinner = match.winner_participant_id && match.winner_participant_id === blackP?.id;

  return (
    <div
      onClick={onSelect}
      className={`p-3 rounded-xl border transition-all cursor-pointer select-none space-y-2 ${
        isSelected
          ? 'bg-cyan-950/40 border-cyan-400 shadow-lg shadow-cyan-950/40 ring-1 ring-cyan-400/50'
          : match.status === 'running'
          ? 'bg-arena-900 border-rose-500/80 shadow-md shadow-rose-950/30'
          : highlightGold
          ? 'bg-arena-950/90 border-amber-500/60 hover:border-amber-400'
          : 'bg-arena-900/90 border-arena-border hover:border-slate-500'
      }`}
    >
      {/* Match Round Name & Status Badge */}
      <div className="flex items-center justify-between text-[10px] font-mono">
        <span className="font-bold text-slate-400">{match.round_name}</span>
        {match.status === 'running' ? (
          <span className="text-rose-400 font-bold flex items-center gap-1 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            LIVE NOW
          </span>
        ) : match.status === 'completed' ? (
          <span className="text-emerald-400 font-bold flex items-center gap-0.5">
            <CheckCircle2 className="w-3 h-3" />
            FINAL
          </span>
        ) : (
          <span className="text-slate-500">PENDING</span>
        )}
      </div>

      {/* White Player Row */}
      <div
        className={`flex items-center justify-between p-1.5 rounded text-xs transition-colors ${
          isWhiteWinner
            ? 'bg-emerald-950/60 font-bold text-emerald-200 border border-emerald-700/50'
            : 'text-slate-300'
        }`}
      >
        <div className="flex items-center gap-2 truncate">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: whiteP?.color_theme || '#94a3b8' }}
          />
          <span className="text-[10px] text-slate-400 font-mono">⚪</span>
          <span className="truncate">{whiteP?.name || 'TBD (Waiting)'}</span>
        </div>
        {isWhiteWinner && (
          <span className="text-[10px] font-mono px-1 rounded bg-emerald-500/20 text-emerald-300 font-bold">
            ADVANCED ✓
          </span>
        )}
      </div>

      {/* Black Player Row */}
      <div
        className={`flex items-center justify-between p-1.5 rounded text-xs transition-colors ${
          isBlackWinner
            ? 'bg-emerald-950/60 font-bold text-emerald-200 border border-emerald-700/50'
            : 'text-slate-300'
        }`}
      >
        <div className="flex items-center gap-2 truncate">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: blackP?.color_theme || '#94a3b8' }}
          />
          <span className="text-[10px] text-slate-400 font-mono">⚫</span>
          <span className="truncate">{blackP?.name || 'TBD (Waiting)'}</span>
        </div>
        {isBlackWinner && (
          <span className="text-[10px] font-mono px-1 rounded bg-emerald-500/20 text-emerald-300 font-bold">
            ADVANCED ✓
          </span>
        )}
      </div>

      {/* Tiebreak / Result Micro Footer */}
      {match.tiebreak_note && (
        <div className="text-[9px] font-mono text-cyan-400 truncate pt-1 border-t border-arena-border/40">
          ⚖️ {match.tiebreak_note}
        </div>
      )}
    </div>
  );
};

export default TournamentPage;
