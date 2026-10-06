import pytest
import asyncio
from app.database.session import SessionLocal, init_db
from app.database.repositories import GameRepository, MoveRepository, AnalysisRepository
from app.schemas.games import GameCreateRequest
from app.services.game_service import game_service
from app.services.analysis_service import AnalysisService

@pytest.fixture(autouse=True)
def setup_db():
    init_db()

@pytest.mark.asyncio
async def test_mock_game_loop_and_analysis():
    # Create game in mock mode
    with SessionLocal() as db:
        req = GameCreateRequest(
            white_model="mock-llama-3.3-70b",
            black_model="mock-llama-3.1-8b",
            white_personality="Strategic Aggressor",
            black_personality="Positional Defender",
            stockfish_depth=5,
            move_delay_ms=50,
            max_moves=4
        )
        game = game_service.create_game(db, req)
        game_id = game.id

    assert game_id is not None

    # Step 4 moves
    for i in range(4):
        ended = await game_service.execute_next_move(game_id)
        if ended:
            break

    # Verify moves in DB
    with SessionLocal() as db:
        moves = MoveRepository.get_by_game(db, game_id)
        assert len(moves) == 4
        assert moves[0].color == "white"
        assert moves[1].color == "black"
        assert moves[2].color == "white"
        assert moves[3].color == "black"

        # Check telemetry fields
        m0 = moves[0]
        assert m0.uci_move is not None
        assert m0.san_move is not None
        assert m0.strategy is not None
        assert m0.move_quality in ["Best Move", "Excellent", "Good", "Inaccuracy", "Mistake", "Blunder"]
        assert m0.confidence is not None

        # Verify Analysis generation
        updated_game = GameRepository.get(db, game_id)
        analysis = AnalysisService.compute_game_analysis(updated_game, moves)
        assert analysis.white_accuracy >= 0
        assert analysis.black_accuracy >= 0
        assert "white" in analysis.strategy_stats
        assert analysis.summary_report is not None
