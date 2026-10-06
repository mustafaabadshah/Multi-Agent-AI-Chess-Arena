from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.config import settings
from app.database.session import get_db
from app.chess.stockfish import StockfishEvaluator

router = APIRouter(prefix="/health", tags=["Health"])

@router.get("")
def get_health(db: Session = Depends(get_db)):
    # Check Database
    db_status = "ok"
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"error: {str(e)}"

    # Check Stockfish
    evaluator = StockfishEvaluator()
    stockfish_status = "real_engine" if evaluator.is_real_stockfish else "heuristic_fallback"

    # Check Groq configuration
    groq_status = "configured" if bool(settings.GROQ_API_KEY) else "no_api_key (mock mode recommended)"

    return {
        "status": "healthy" if db_status == "ok" else "degraded",
        "app_name": settings.APP_NAME,
        "database": db_status,
        "stockfish": {
            "mode": stockfish_status,
            "engine_path": evaluator.engine_path
        },
        "groq": {
            "status": groq_status,
            "mock_mode": settings.MOCK_MODE
        },
        "default_models": {
            "white": settings.WHITE_MODEL,
            "black": settings.BLACK_MODEL
        }
    }
