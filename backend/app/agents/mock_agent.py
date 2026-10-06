import time
import asyncio
import random
from typing import Tuple, Dict, Any
import chess

from app.agents.base import BaseChessAgent
from app.agents.personalities import get_personality
from app.chess.board_manager import BoardManager
from app.schemas.moves import ChessDecision, AlternativeMove

class MockChessAgent(BaseChessAgent):
    """
    Deterministic AI Chess Agent for testing, CI, and mock mode demonstrations.
    Does not require Groq API key or network access.
    """

    def __init__(self, color: str, model_name: str = "mock-model-v1", personality_name: str = "Balanced"):
        super().__init__(color, model_name, personality_name)
        self.personality = get_personality(personality_name)

    async def select_move(self, board_mgr: BoardManager, last_opponent_move: str = "None") -> Tuple[ChessDecision, Dict[str, Any]]:
        # Simulate slight processing delay for realism
        await asyncio.sleep(0.08)
        
        legal_moves = list(board_mgr.board.legal_moves)
        if not legal_moves:
            raise RuntimeError("No legal moves available on board.")

        # Heuristic move ranking based on personality
        ranked_moves = []
        for m in legal_moves:
            score = 0
            # Captures
            if board_mgr.board.is_capture(m):
                score += 15
            # Checks
            board_mgr.board.push(m)
            if board_mgr.board.is_check():
                score += 10
            board_mgr.board.pop()
            
            # Central control squares (d4, d5, e4, e5)
            to_sq = m.to_square
            if to_sq in [chess.D4, chess.D5, chess.E4, chess.E5]:
                score += 8
            elif to_sq in [chess.C3, chess.C6, chess.F3, chess.F6]:
                score += 5
            
            # Personality adjustments
            if "Aggressive" in self.personality_name:
                if board_mgr.board.is_capture(m):
                    score += 10
            elif "Positional" in self.personality_name:
                if m.to_square in [chess.D4, chess.D5, chess.E4, chess.E5]:
                    score += 8
            
            ranked_moves.append((score, m))

        ranked_moves.sort(key=lambda x: x[0], reverse=True)
        selected_move = ranked_moves[0][1]
        selected_uci = selected_move.uci()
        selected_san = board_mgr.board.san(selected_move)

        # Alternatives
        alternatives = []
        for _, alt in ranked_moves[1:3]:
            alternatives.append(
                AlternativeMove(
                    move=alt.uci(),
                    reason=f"Candidate alternative {board_mgr.board.san(alt)} with good square control."
                )
            )

        # Strategy classification based on move attributes
        if board_mgr.board.is_capture(selected_move):
            strategy = "Material Gain"
            secondary = ["Tactical", "Initiative"]
            tactical_idea = "Capture of active opposing piece"
            risk = "medium"
        elif selected_move.to_square in [chess.D4, chess.D5, chess.E4, chess.E5]:
            strategy = "Center Control"
            secondary = ["Opening Development", "Space Advantage"]
            tactical_idea = None
            risk = "low"
        elif board_mgr.board.piece_at(selected_move.from_square) and board_mgr.board.piece_at(selected_move.from_square).piece_type in [chess.KNIGHT, chess.BISHOP]:
            strategy = "Piece Development"
            secondary = ["Initiative"]
            tactical_idea = None
            risk = "low"
        else:
            strategy = "Pawn Structure"
            secondary = ["Positional"]
            tactical_idea = None
            risk = "low"

        decision = ChessDecision(
            move=selected_uci,
            confidence=round(random.uniform(0.82, 0.95), 2),
            strategy=strategy,
            secondary_strategies=secondary,
            position_assessment=f"Position is solid; focusing on {strategy.lower()} as {self.color}.",
            tactical_idea=tactical_idea,
            risk_level=risk,
            decision_summary=f"Plays {selected_san} to reinforce {strategy.lower()} while adhering to {self.personality_name} directives.",
            alternatives=alternatives
        )

        telemetry = {
            "latency_ms": random.randint(85, 210),
            "input_tokens": random.randint(310, 480),
            "output_tokens": random.randint(95, 160),
            "move_source": "mock",
            "attempts": 1
        }
        return decision, telemetry
