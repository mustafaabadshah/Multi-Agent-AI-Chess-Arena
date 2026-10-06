import pytest
import chess
from pydantic import ValidationError
from app.schemas.moves import ChessDecision, AlternativeMove, STRATEGY_TAXONOMY
from app.agents.mock_agent import MockChessAgent
from app.agents.personalities import get_personality, PERSONALITY_PRESETS
from app.chess.board_manager import BoardManager

def test_chess_decision_schema_validation():
    # Valid decision
    valid_data = {
        "move": "e2e4",
        "confidence": 0.91,
        "strategy": "Center Control",
        "secondary_strategies": ["Piece Development"],
        "position_assessment": "White controls central squares.",
        "tactical_idea": "Open lines for bishop and queen.",
        "risk_level": "low",
        "decision_summary": "Controls e4 and opens development paths.",
        "alternatives": [
            {"move": "d2d4", "reason": "Central occupation."}
        ]
    }
    decision = ChessDecision.model_validate(valid_data)
    assert decision.move == "e2e4"
    assert decision.confidence == 0.91
    assert decision.strategy == "Center Control"

    # Clamped confidence
    decision_clamped = ChessDecision.model_validate({**valid_data, "confidence": 1.5})
    assert decision_clamped.confidence == 1.0

    # Risk level fallback
    decision_risk = ChessDecision.model_validate({**valid_data, "risk_level": "EXTREME"})
    assert decision_risk.risk_level == "medium"

@pytest.mark.asyncio
async def test_mock_chess_agent_select_move():
    mgr = BoardManager()
    agent_white = MockChessAgent(color="white", model_name="mock-alpha", personality_name="Strategic Aggressor")
    
    decision, telemetry = await agent_white.select_move(mgr)
    assert decision.move in mgr.get_legal_moves_uci()
    assert 0.0 <= decision.confidence <= 1.0
    assert decision.strategy in STRATEGY_TAXONOMY
    assert telemetry["move_source"] == "mock"
    assert telemetry["latency_ms"] > 0

    # Black move test
    mgr.apply_move(chess.Move.from_uci(decision.move))
    agent_black = MockChessAgent(color="black", model_name="mock-beta", personality_name="Positional Defender")
    decision_b, telemetry_b = await agent_black.select_move(mgr)
    assert decision_b.move in mgr.get_legal_moves_uci()

def test_personalities_presets():
    assert "Strategic Aggressor" in PERSONALITY_PRESETS
    assert "Positional Defender" in PERSONALITY_PRESETS
    pers = get_personality("Strategic Aggressor")
    assert "ambitious" in pers.system_instruction.lower()
