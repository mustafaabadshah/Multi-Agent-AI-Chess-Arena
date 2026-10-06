from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime

class GameCreateRequest(BaseModel):
    white_model: Optional[str] = None
    black_model: Optional[str] = None
    white_personality: Optional[str] = "Strategic Aggressor"
    black_personality: Optional[str] = "Positional Defender"
    initial_fen: Optional[str] = None
    stockfish_depth: Optional[int] = 15
    move_delay_ms: Optional[int] = 1000
    max_moves: Optional[int] = 150
    auto_start: Optional[bool] = False

class GameResponse(BaseModel):
    id: str
    white_model: str
    black_model: str
    white_personality: str
    black_personality: str
    status: str  # waiting, running, paused, completed, aborted, error
    turn: str  # "white" | "black"
    current_ply: int
    move_number: int
    winner: Optional[str] = None  # "white", "black", "draw", None
    termination_reason: Optional[str] = None
    initial_fen: str
    current_fen: str
    is_check: bool = False
    is_checkmate: bool = False
    is_stalemate: bool = False
    is_draw: bool = False
    opening: Optional[str] = None
    pgn: Optional[str] = None
    stockfish_depth: int
    move_delay_ms: int
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    error_message: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class GameListResponse(BaseModel):
    games: List[GameResponse]
    total: int
