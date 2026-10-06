from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class TournamentParticipant(BaseModel):
    id: str
    seed: int
    name: str
    model: str
    personality: str
    temperature: float = 0.2
    color_theme: str = "#06b6d4"
    wins: int = 0
    losses: int = 0
    draws: int = 0
    rank: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class TournamentMatch(BaseModel):
    id: str
    round: str  # "quarterfinals", "semifinals", "finals"
    round_name: str
    white_participant_id: Optional[str] = None
    black_participant_id: Optional[str] = None
    winner_participant_id: Optional[str] = None
    loser_participant_id: Optional[str] = None
    game_id: Optional[str] = None
    status: str = "pending"  # "pending", "running", "completed"
    winner_color: Optional[str] = None
    termination_reason: Optional[str] = None
    tiebreak_note: Optional[str] = None
    white_accuracy: Optional[float] = None
    black_accuracy: Optional[float] = None
    total_moves: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class TournamentSettings(BaseModel):
    max_moves: int = 40
    move_delay_ms: int = 250
    stockfish_depth: int = 12


class TournamentCreateRequest(BaseModel):
    name: str = "AI Chess Championship"
    participants: List[TournamentParticipant]
    settings: Optional[TournamentSettings] = None
    auto_start: bool = True


class TournamentResponse(BaseModel):
    id: str
    name: str
    num_participants: int
    status: str
    current_round: str
    current_match_id: Optional[str] = None
    current_game_id: Optional[str] = None
    current_fen: Optional[str] = None
    champion_id: Optional[str] = None
    champion_name: Optional[str] = None
    champion_model: Optional[str] = None
    runner_up_name: Optional[str] = None
    third_place_name: Optional[str] = None
    participants: List[TournamentParticipant]
    matches: List[TournamentMatch]
    standings: Optional[List[Dict[str, Any]]] = None
    summary_report: Optional[str] = None
    settings: Optional[Dict[str, Any]] = None
    created_at: datetime
    completed_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class TournamentListResponse(BaseModel):
    tournaments: List[TournamentResponse]
    total: int
