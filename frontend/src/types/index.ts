export interface AlternativeMove {
  move: string;
  reason: string;
}

export interface ChessDecision {
  move: string;
  confidence: number;
  strategy: string;
  secondary_strategies: string[];
  position_assessment: string;
  tactical_idea?: string | null;
  risk_level: string;
  decision_summary: string;
  alternatives: AlternativeMove[];
}

export interface MoveRecord {
  id: string;
  game_id: string;
  ply: number;
  move_number: number;
  color: 'white' | 'black';
  agent: string;
  model: string;
  personality: string;
  fen_before: string;
  uci_move: string;
  san_move: string;
  fen_after: string;
  decision_summary?: string;
  confidence?: number;
  strategy?: string;
  secondary_strategies: string[];
  risk_level?: string;
  alternatives: AlternativeMove[];
  stockfish_eval_before?: number;
  stockfish_eval_after?: number;
  stockfish_best_move?: string;
  centipawn_loss?: number;
  move_quality?: string;
  latency_ms?: number;
  input_tokens?: number;
  output_tokens?: number;
  move_source: string;
  created_at: string;
}

export interface Game {
  id: string;
  white_model: string;
  black_model: string;
  white_personality: string;
  black_personality: string;
  status: 'waiting' | 'running' | 'paused' | 'completed' | 'aborted' | 'error';
  turn: 'white' | 'black';
  current_ply: number;
  move_number: number;
  winner?: 'white' | 'black' | 'draw' | null;
  termination_reason?: string;
  initial_fen: string;
  current_fen: string;
  is_check: boolean;
  is_checkmate: boolean;
  is_stalemate: boolean;
  is_draw: boolean;
  opening?: string;
  pgn?: string;
  stockfish_depth: number;
  move_delay_ms: number;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  error_message?: string;
}

export interface CriticalMomentItem {
  ply: number;
  move_number: number;
  color: string;
  san_move: string;
  eval_before: number;
  eval_after: number;
  eval_swing: number;
  quality: string;
  description: string;
  stockfish_best_move?: string;
}

export interface AgentSideStats {
  model: string;
  personality: string;
  accuracy_percentage: number;
  average_cpl: number;
  blunders: number;
  mistakes: number;
  inaccuracies: number;
  good_moves: number;
  excellent_moves: number;
  best_moves: number;
  average_confidence: number;
  average_latency_ms: number;
  total_tokens: number;
}

export interface StyleIndicators {
  aggression: number;
  risk: number;
  tactical_tendency: number;
  defensive_tendency: number;
  king_safety_priority: number;
  material_preference: number;
  positional_preference: number;
}

export interface GameAnalysis {
  game_id: string;
  opening?: string;
  total_moves: number;
  winner?: string;
  termination_reason?: string;
  white: AgentSideStats;
  black: AgentSideStats;
  evaluation_timeline: {
    ply: number;
    move_number: number;
    color: string;
    san: string;
    eval: number;
    quality: string;
    cpl: number;
  }[];
  critical_moments: CriticalMomentItem[];
  white_strategies: Record<string, number>;
  black_strategies: Record<string, number>;
  game_phases: {
    opening?: { name: string; ply_range: [number, number]; moves_count: number };
    middlegame?: { name: string; ply_range: [number, number]; moves_count: number };
    endgame?: { name: string; ply_range: [number, number]; moves_count: number };
  };
  white_style: StyleIndicators;
  black_style: StyleIndicators;
  summary_report: string;
  created_at: string;
}

export interface ModelComparisonMetric {
  model: string;
  games_played: number;
  wins: number;
  losses: number;
  draws: number;
  win_rate: number;
  average_cpl: number;
  average_confidence: number;
  blunder_rate: number;
  mistake_rate: number;
  average_latency_ms: number;
  average_tokens: number;
  strategy_distribution: Record<string, number>;
  favorite_openings: { opening: string; count: number }[];
}

export interface GroqModelInfo {
  id: string;
  name: string;
  description?: string;
  context_window?: number;
  is_available: boolean;
}

export interface AgentPersonality {
  name: string;
  description: string;
  system_instruction: string;
  traits: string[];
}

export interface ResearchExperiment {
  id: string;
  name: string;
  num_games: number;
  games_completed: number;
  status: string;
  model_a: string;
  model_b: string;
  model_a_wins: number;
  model_b_wins: number;
  draws: number;
  model_a_avg_cpl: number;
  model_b_avg_cpl: number;
  model_a_blunder_rate: number;
  model_b_blunder_rate: number;
  game_ids: string[];
  created_at: string;
  completed_at?: string;
}

export interface WSThinkingEvent {
  event: 'agent_thinking';
  game_id: string;
  agent: string;
  color: 'white' | 'black';
  model: string;
  personality: string;
  move_number: number;
  ply: number;
}

export interface WSDecisionReadyEvent {
  event: 'decision_ready';
  game_id: string;
  color: 'white' | 'black';
  model: string;
  move: string;
  confidence: number;
  strategy: string;
  decision_summary: string;
}

export interface WSMovePlayedEvent {
  event: 'move_played';
  game_id: string;
  move: {
    ply: number;
    move_number: number;
    color: 'white' | 'black';
    model: string;
    san_move: string;
    uci_move: string;
    fen_after: string;
    eval_score: number;
    eval_before: number;
    best_engine_move?: string;
    cpl: number;
    quality: string;
    confidence: number;
    strategy: string;
    decision_summary: string;
    alternatives: AlternativeMove[];
    latency_ms?: number;
    is_check: boolean;
    opening?: string;
  };
}

export interface WSCriticalMoveEvent {
  event: 'critical_move';
  game_id: string;
  critical_moment: CriticalMomentItem;
}

export interface WSGameCompletedEvent {
  event: 'game_completed';
  game_id: string;
  status: string;
  winner?: string;
  reason?: string;
}

export interface TournamentParticipant {
  id: string;
  seed: number;
  name: string;
  model: string;
  personality: string;
  temperature: number;
  color_theme: string;
  wins: number;
  losses: number;
  draws: number;
  rank?: number | null;
}

export interface TournamentMatch {
  id: string;
  round: 'quarterfinals' | 'semifinals' | 'finals';
  round_name: string;
  white_participant_id?: string | null;
  black_participant_id?: string | null;
  winner_participant_id?: string | null;
  loser_participant_id?: string | null;
  game_id?: string | null;
  status: 'pending' | 'running' | 'completed';
  winner_color?: string | null;
  termination_reason?: string | null;
  tiebreak_note?: string | null;
  white_accuracy?: number | null;
  black_accuracy?: number | null;
  total_moves?: number | null;
}

export interface TournamentSettings {
  max_moves: number;
  move_delay_ms: number;
  stockfish_depth: number;
}

export interface Tournament {
  id: string;
  name: string;
  num_participants: number;
  status: 'setup' | 'running' | 'paused' | 'completed' | 'aborted' | 'error';
  current_round: string;
  current_match_id?: string | null;
  current_game_id?: string | null;
  current_fen?: string | null;
  current_game_turn?: 'white' | 'black' | null;
  current_game_moves?: number | null;
  champion_id?: string | null;
  champion_name?: string | null;
  champion_model?: string | null;
  runner_up_name?: string | null;
  third_place_name?: string | null;
  participants: TournamentParticipant[];
  matches: TournamentMatch[];
  standings?: TournamentParticipant[] | null;
  summary_report?: string | null;
  settings?: TournamentSettings | null;
  created_at: string;
  completed_at?: string | null;
}

export interface TournamentSummaryItem {
  id: string;
  name: string;
  num_participants: number;
  status: string;
  current_round: string;
  champion_name?: string | null;
  champion_model?: string | null;
  runner_up_name?: string | null;
  third_place_name?: string | null;
  created_at: string;
  completed_at?: string | null;
}

