import {
  Game,
  MoveRecord,
  GameAnalysis,
  GroqModelInfo,
  AgentPersonality,
  ModelComparisonMetric,
  ResearchExperiment,
  Tournament,
  TournamentParticipant,
  TournamentSettings,
  TournamentSummaryItem
} from '../types';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api';

export const api = {
  // Health
  async getHealth() {
    const res = await fetch(`${API_BASE}/health`);
    return res.json();
  },

  // Models & Personalities
  async getModels(): Promise<GroqModelInfo[]> {
    const res = await fetch(`${API_BASE}/models`);
    return res.json();
  },

  async getPersonalities(): Promise<AgentPersonality[]> {
    const res = await fetch(`${API_BASE}/personalities`);
    return res.json();
  },

  async getModelComparison(model?: string): Promise<ModelComparisonMetric[]> {
    const url = model ? `${API_BASE}/models/comparison?model=${encodeURIComponent(model)}` : `${API_BASE}/models/comparison`;
    const res = await fetch(url);
    return res.json();
  },

  // Games
  async createGame(data: {
    white_model?: string;
    black_model?: string;
    white_personality?: string;
    black_personality?: string;
    initial_fen?: string;
    stockfish_depth?: number;
    move_delay_ms?: number;
    max_moves?: number;
    auto_start?: boolean;
  }): Promise<Game> {
    const res = await fetch(`${API_BASE}/games`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to create game' }));
      throw new Error(err.detail || 'Failed to create game');
    }
    return res.json();
  },

  async listGames(params?: { skip?: number; limit?: number; status?: string; model?: string }): Promise<{ games: Game[]; total: number }> {
    const query = new URLSearchParams();
    if (params?.skip !== undefined) query.set('skip', params.skip.toString());
    if (params?.limit !== undefined) query.set('limit', params.limit.toString());
    if (params?.status) query.set('status', params.status);
    if (params?.model) query.set('model', params.model);

    const res = await fetch(`${API_BASE}/games?${query.toString()}`);
    return res.json();
  },

  async getGame(id: string): Promise<Game> {
    const res = await fetch(`${API_BASE}/games/${id}`);
    if (!res.ok) throw new Error('Game not found');
    return res.json();
  },

  async startGame(id: string): Promise<void> {
    await fetch(`${API_BASE}/games/${id}/start`, { method: 'POST' });
  },

  async pauseGame(id: string): Promise<void> {
    await fetch(`${API_BASE}/games/${id}/pause`, { method: 'POST' });
  },

  async resumeGame(id: string): Promise<void> {
    await fetch(`${API_BASE}/games/${id}/resume`, { method: 'POST' });
  },

  async nextMove(id: string): Promise<{ message: string; game_ended: boolean }> {
    const res = await fetch(`${API_BASE}/games/${id}/next-move`, { method: 'POST' });
    return res.json();
  },

  async stopGame(id: string): Promise<void> {
    await fetch(`${API_BASE}/games/${id}/stop`, { method: 'POST' });
  },

  async deleteGame(id: string): Promise<void> {
    await fetch(`${API_BASE}/games/${id}`, { method: 'DELETE' });
  },

  // Moves
  async getGameMoves(id: string): Promise<MoveRecord[]> {
    const res = await fetch(`${API_BASE}/games/${id}/moves`);
    return res.json();
  },

  // Analysis
  async getGameAnalysis(id: string): Promise<GameAnalysis> {
    const res = await fetch(`${API_BASE}/games/${id}/analysis`);
    if (!res.ok) throw new Error('Failed to retrieve analysis');
    return res.json();
  },

  async recomputeAnalysis(id: string): Promise<GameAnalysis> {
    const res = await fetch(`${API_BASE}/games/${id}/analysis/recompute`, { method: 'POST' });
    return res.json();
  },

  // Exports URLs
  getPgnUrl(id: string): string {
    return `${API_BASE}/games/${id}/pgn`;
  },

  getJsonExportUrl(id: string): string {
    return `${API_BASE}/games/${id}/export/json`;
  },

  getCsvExportUrl(id: string): string {
    return `${API_BASE}/games/${id}/export/csv`;
  },

  getReportUrl(id: string): string {
    return `${API_BASE}/games/${id}/report`;
  },

  // Research Experiments
  async createExperiment(data: {
    name: string;
    num_games: number;
    model_a: string;
    model_b: string;
    personality_a?: string;
    personality_b?: string;
    randomize_colors?: boolean;
    starting_fen?: string;
    stockfish_depth?: number;
    move_delay_ms?: number;
  }): Promise<ResearchExperiment> {
    const res = await fetch(`${API_BASE}/research`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async listExperiments(): Promise<ResearchExperiment[]> {
    const res = await fetch(`${API_BASE}/research`);
    return res.json();
  },

  async getExperiment(id: string): Promise<ResearchExperiment> {
    const res = await fetch(`${API_BASE}/research/${id}`);
    return res.json();
  },

  // Tournaments
  async createTournament(data: {
    name: string;
    participants: TournamentParticipant[];
    settings?: TournamentSettings;
    auto_start?: boolean;
  }): Promise<Tournament> {
    const res = await fetch(`${API_BASE}/tournaments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to create tournament' }));
      throw new Error(err.detail || 'Failed to create tournament');
    }
    return res.json();
  },

  async listTournaments(limit: number = 50): Promise<{ tournaments: TournamentSummaryItem[]; total: number }> {
    const res = await fetch(`${API_BASE}/tournaments?limit=${limit}`);
    return res.json();
  },

  async getTournament(id: string): Promise<Tournament> {
    const res = await fetch(`${API_BASE}/tournaments/${id}`);
    if (!res.ok) throw new Error('Tournament not found');
    return res.json();
  },

  async startTournament(id: string): Promise<void> {
    await fetch(`${API_BASE}/tournaments/${id}/start`, { method: 'POST' });
  },

  async pauseTournament(id: string): Promise<void> {
    await fetch(`${API_BASE}/tournaments/${id}/pause`, { method: 'POST' });
  },

  async deleteTournament(id: string): Promise<void> {
    await fetch(`${API_BASE}/tournaments/${id}`, { method: 'DELETE' });
  }
};

