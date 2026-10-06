from abc import ABC, abstractmethod
from typing import Tuple, Dict, Any, Optional
from app.chess.board_manager import BoardManager
from app.schemas.moves import ChessDecision

class BaseChessAgent(ABC):
    """
    Abstract interface for AI chess agents in ChessMind Arena.
    """

    def __init__(self, color: str, model_name: str, personality_name: str):
        self.color = color.lower()
        self.model_name = model_name
        self.personality_name = personality_name

    @abstractmethod
    async def select_move(self, board_mgr: BoardManager, last_opponent_move: str = "None") -> Tuple[ChessDecision, Dict[str, Any]]:
        """
        Receives current board state and returns (ChessDecision, telemetry_dict).
        telemetry_dict contains: latency_ms, input_tokens, output_tokens, move_source.
        """
        pass
