from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict
from datetime import datetime

class CriticalMomentItem(BaseModel):
    ply: int
    move_number: int
    color: str
    san_move: str
    eval_before: float
    eval_after: float
    eval_swing: float
    quality: str
    description: str
    stockfish_best_move: Optional[str] = None

class AgentSideStats(BaseModel):
    model: str
    personality: str
    accuracy_percentage: float
    average_cpl: float
    blunders: int
    mistakes: int
    inaccuracies: int
    good_moves: int
    excellent_moves: int
    best_moves: int
    average_confidence: float
    average_latency_ms: float
    total_tokens: int

class StyleIndicators(BaseModel):
    aggression: int  # 0 - 100
    risk: int        # 0 - 100
    tactical_tendency: int
    defensive_tendency: int
    king_safety_priority: int
    material_preference: int
    positional_preference: int

class GameAnalysisResponse(BaseModel):
    game_id: str
    opening: Optional[str] = None
    total_moves: int
    winner: Optional[str] = None
    termination_reason: Optional[str] = None
    white: AgentSideStats
    black: AgentSideStats
    evaluation_timeline: List[Dict[str, Any]]
    critical_moments: List[CriticalMomentItem]
    white_strategies: Dict[str, int]
    black_strategies: Dict[str, int]
    game_phases: Dict[str, Dict[str, Any]]  # opening, middlegame, endgame
    white_style: StyleIndicators
    black_style: StyleIndicators
    summary_report: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ModelComparisonMetric(BaseModel):
    model: str
    games_played: int
    wins: int
    losses: int
    draws: int
    win_rate: float
    average_cpl: float
    average_confidence: float
    blunder_rate: float
    mistake_rate: float
    average_latency_ms: float
    average_tokens: float
    strategy_distribution: Dict[str, int]
    favorite_openings: List[Dict[str, Any]]
