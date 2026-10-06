import pytest
from app.database.session import SessionLocal
from app.database.models import GameModel, MoveModel, GameAnalysisModel

@pytest.fixture(autouse=True)
def cleanup_mock_test_games():
    """Ensure test mock games never linger in database."""
    yield
    try:
        with SessionLocal() as db:
            mock_game_ids = [g.id for g in db.query(GameModel).filter(GameModel.white_model.like("mock%")).all()]
            if mock_game_ids:
                db.query(MoveModel).filter(MoveModel.game_id.in_(mock_game_ids)).delete(synchronize_session=False)
                db.query(GameAnalysisModel).filter(GameAnalysisModel.game_id.in_(mock_game_ids)).delete(synchronize_session=False)
                db.query(GameModel).filter(GameModel.id.in_(mock_game_ids)).delete(synchronize_session=False)
                db.commit()
    except Exception as e:
        pass
