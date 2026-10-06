from typing import Optional, List, Any
from pydantic import BaseModel, Field, field_validator, ConfigDict
from datetime import datetime

STRATEGY_TAXONOMY = [
    "Opening Development",
    "Center Control",
    "King Safety",
    "Piece Development",
    "Attack",
    "Defense",
    "Counterattack",
    "Tactical",
    "Material Gain",
    "Material Sacrifice",
    "Pawn Structure",
    "Space Advantage",
    "Piece Activity",
    "Initiative",
    "Endgame",
    "Simplification",
    "Promotion",
    "Forced Response",
    "Other",
]

class AlternativeMove(BaseModel):
    move: str
    reason: str

class ChessDecision(BaseModel):
    move: str = Field(description="Selected move in UCI or SAN notation (e.g., e2e4 or e4)")
    confidence: float = Field(ge=0.0, le=1.0, description="Agent confidence score between 0.0 and 1.0")
    strategy: str = Field(description="Primary strategic purpose of the move")
    secondary_strategies: List[str] = Field(default_factory=list, description="Secondary strategic goals")
    position_assessment: str = Field(description="Concise evaluation of current board dynamics")
    tactical_idea: Optional[str] = Field(default=None, description="Concrete tactical motif if present")
    risk_level: str = Field(description="Risk assessment: low, medium, or high")
    decision_summary: str = Field(description="Concise user-facing decision summary")
    alternatives: List[AlternativeMove] = Field(default_factory=list, description="Alternative moves considered")

    @field_validator("confidence", mode="before")
    @classmethod
    def validate_confidence(cls, v: Any) -> float:
        try:
            val = float(v)
            if val > 10.0 and val <= 100.0:  # e.g., model returned 91 instead of 0.91
                val = val / 100.0
            return max(0.0, min(1.0, val))
        except (ValueError, TypeError):
            return 0.85

    @field_validator("risk_level")
    @classmethod
    def validate_risk_level(cls, v: str) -> str:
        val = v.lower().strip()
        if val not in ["low", "medium", "high"]:
            return "medium"
        return val

    @field_validator("strategy")
    @classmethod
    def validate_strategy(cls, v: str) -> str:
        # Match case-insensitively with taxonomy or return as is/fallback
        for s in STRATEGY_TAXONOMY:
            if s.lower() == v.lower().strip():
                return s
        return v.strip() or "Other"

class MoveRecord(BaseModel):
    id: str
    game_id: str
    ply: int
    move_number: int
    color: str  # "white" | "black"
    agent: str
    model: str
    personality: str
    fen_before: str
    uci_move: str
    san_move: str
    fen_after: str
    decision_summary: Optional[str] = None
    confidence: Optional[float] = None
    strategy: Optional[str] = None
    secondary_strategies: List[str] = Field(default_factory=list)
    risk_level: Optional[str] = None
    alternatives: List[AlternativeMove] = Field(default_factory=list)
    stockfish_eval_before: Optional[float] = None
    stockfish_eval_after: Optional[float] = None
    stockfish_best_move: Optional[str] = None
    centipawn_loss: Optional[int] = None
    move_quality: Optional[str] = None  # Best Move, Excellent, Good, Inaccuracy, Mistake, Blunder
    latency_ms: Optional[int] = None
    input_tokens: Optional[int] = None
    output_tokens: Optional[int] = None
    move_source: str = "llm"  # "llm", "stockfish_fallback", "mock", "human"
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
