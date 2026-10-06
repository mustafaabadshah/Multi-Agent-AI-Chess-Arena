from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.database.repositories import GameRepository, MoveRepository
from app.schemas.moves import MoveRecord, AlternativeMove

router = APIRouter(prefix="/games", tags=["Moves"])

@router.get("/{game_id}/moves", response_model=List[MoveRecord])
def get_game_moves(game_id: str, db: Session = Depends(get_db)):
    game = GameRepository.get(db, game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    moves = MoveRepository.get_by_game(db, game_id)
    results = []
    for m in moves:
        alts = []
        if m.alternatives_json and isinstance(m.alternatives_json, list):
            for a in m.alternatives_json:
                if isinstance(a, dict):
                    alts.append(AlternativeMove(move=a.get("move", ""), reason=a.get("reason", "")))

        results.append(
            MoveRecord(
                id=m.id,
                game_id=m.game_id,
                ply=m.ply,
                move_number=m.move_number,
                color=m.color,
                agent=m.agent,
                model=m.model,
                personality=m.personality,
                fen_before=m.fen_before,
                uci_move=m.uci_move,
                san_move=m.san_move,
                fen_after=m.fen_after,
                decision_summary=m.decision_summary,
                confidence=m.confidence,
                strategy=m.strategy,
                secondary_strategies=m.secondary_strategies or [],
                risk_level=m.risk_level,
                alternatives=alts,
                stockfish_eval_before=m.stockfish_eval_before,
                stockfish_eval_after=m.stockfish_eval_after,
                stockfish_best_move=m.stockfish_best_move,
                centipawn_loss=m.centipawn_loss,
                move_quality=m.move_quality,
                latency_ms=m.latency_ms,
                input_tokens=m.input_tokens,
                output_tokens=m.output_tokens,
                move_source=m.move_source,
                created_at=m.created_at
            )
        )
    return results
