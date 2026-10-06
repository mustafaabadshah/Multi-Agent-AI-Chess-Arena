from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict
from datetime import datetime

class ResearchExperimentRequest(BaseModel):
    name: str = "Model Comparison Experiment"
    num_games: int = 10
    model_a: str
    model_b: str
    personality_a: str = "Strategic Aggressor"
    personality_b: str = "Positional Defender"
    randomize_colors: bool = True
    starting_fen: Optional[str] = None
    stockfish_depth: int = 12
    move_delay_ms: int = 200

class ResearchExperimentResponse(BaseModel):
    id: str
    name: str
    num_games: int
    games_completed: int
    status: str  # "pending", "running", "completed", "failed", "stopped"
    model_a: str
    model_b: str
    model_a_wins: int = 0
    model_b_wins: int = 0
    draws: int = 0
    model_a_avg_cpl: float = 0.0
    model_b_avg_cpl: float = 0.0
    model_a_blunder_rate: float = 0.0
    model_b_blunder_rate: float = 0.0
    game_ids: List[str] = []
    created_at: datetime
    completed_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
