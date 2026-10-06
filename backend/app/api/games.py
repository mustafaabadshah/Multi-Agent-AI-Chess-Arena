import io
import csv
import json
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.database.repositories import GameRepository, MoveRepository
from app.schemas.games import GameCreateRequest, GameResponse, GameListResponse
from app.services.game_service import game_service

router = APIRouter(prefix="/games", tags=["Games"])

def _format_game_response(game, board_mgr=None) -> GameResponse:
    turn = "white"
    current_ply = 0
    move_num = 1
    is_chk = False
    is_mate = False
    is_stale = False
    is_drw = False

    if board_mgr:
        turn = board_mgr.turn_color
        current_ply = board_mgr.ply
        move_num = board_mgr.fullmove_number
        is_chk = board_mgr.is_check
        is_mate = board_mgr.is_checkmate
        is_stale = board_mgr.is_stalemate
        is_drw = board_mgr.is_game_over and not is_mate

    return GameResponse(
        id=game.id,
        white_model=game.white_model,
        black_model=game.black_model,
        white_personality=game.white_personality,
        black_personality=game.black_personality,
        status=game.status,
        turn=turn,
        current_ply=current_ply,
        move_number=move_num,
        winner=game.winner,
        termination_reason=game.termination_reason,
        initial_fen=game.initial_fen,
        current_fen=game.current_fen,
        is_check=is_chk,
        is_checkmate=is_mate,
        is_stalemate=is_stale,
        is_draw=is_drw,
        opening=game.opening,
        pgn=game.pgn,
        stockfish_depth=game.stockfish_depth,
        move_delay_ms=game.move_delay_ms,
        started_at=game.started_at,
        completed_at=game.completed_at,
        created_at=game.created_at,
        error_message=game.error_message
    )

@router.post("", response_model=GameResponse)
async def create_game(req: GameCreateRequest, db: Session = Depends(get_db)):
    try:
        game = game_service.create_game(db, req)
        board_mgr = game_service.get_or_create_board(game)
        if req.auto_start:
            await game_service.start_game(game.id)
        return _format_game_response(game, board_mgr)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("", response_model=GameListResponse)
def list_games(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    model: Optional[str] = None,
    db: Session = Depends(get_db)
):
    games, total = GameRepository.list(db, skip=skip, limit=limit, status=status, model=model)
    formatted = [_format_game_response(g, game_service.active_boards.get(g.id)) for g in games]
    return GameListResponse(games=formatted, total=total)

@router.get("/{game_id}", response_model=GameResponse)
def get_game(game_id: str, db: Session = Depends(get_db)):
    game = GameRepository.get(db, game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    board_mgr = game_service.get_or_create_board(game)
    return _format_game_response(game, board_mgr)

@router.post("/{game_id}/start")
async def start_game(game_id: str, db: Session = Depends(get_db)):
    game = GameRepository.get(db, game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    await game_service.start_game(game_id)
    return {"message": "Game started", "game_id": game_id}

@router.post("/{game_id}/pause")
async def pause_game(game_id: str, db: Session = Depends(get_db)):
    game = GameRepository.get(db, game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    await game_service.pause_game(game_id)
    return {"message": "Game paused", "game_id": game_id}

@router.post("/{game_id}/resume")
async def resume_game(game_id: str, db: Session = Depends(get_db)):
    game = GameRepository.get(db, game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    await game_service.resume_game(game_id)
    return {"message": "Game resumed", "game_id": game_id}

@router.post("/{game_id}/next-move")
async def next_move(game_id: str, db: Session = Depends(get_db)):
    game = GameRepository.get(db, game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    ended = await game_service.execute_next_move(game_id)
    return {"message": "Next move executed", "game_id": game_id, "game_ended": ended}

@router.post("/{game_id}/stop")
async def stop_game(game_id: str, db: Session = Depends(get_db)):
    game = GameRepository.get(db, game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    await game_service.stop_game(game_id)
    return {"message": "Game stopped", "game_id": game_id}

@router.delete("/{game_id}")
def delete_game(game_id: str, db: Session = Depends(get_db)):
    success = GameRepository.delete(db, game_id)
    if not success:
        raise HTTPException(status_code=404, detail="Game not found")
    if game_id in game_service.active_boards:
        del game_service.active_boards[game_id]
    return {"message": "Game deleted", "game_id": game_id}

@router.get("/{game_id}/pgn")
def get_game_pgn(game_id: str, db: Session = Depends(get_db)):
    game = GameRepository.get(db, game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    board_mgr = game_service.get_or_create_board(game)
    pgn_str = game.pgn or board_mgr.generate_pgn()
    return Response(
        content=pgn_str,
        media_type="application/x-chess-pgn",
        headers={"Content-Disposition": f'attachment; filename="game_{game_id}.pgn"'}
    )

@router.get("/{game_id}/export/json")
def export_game_json(game_id: str, db: Session = Depends(get_db)):
    game = GameRepository.get(db, game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    moves = MoveRepository.get_by_game(db, game_id)
    
    payload = {
        "game": {
            "id": game.id,
            "white_model": game.white_model,
            "black_model": game.black_model,
            "white_personality": game.white_personality,
            "black_personality": game.black_personality,
            "status": game.status,
            "winner": game.winner,
            "termination_reason": game.termination_reason,
            "initial_fen": game.initial_fen,
            "current_fen": game.current_fen,
            "opening": game.opening,
            "pgn": game.pgn,
            "created_at": game.created_at.isoformat() if game.created_at else None,
            "completed_at": game.completed_at.isoformat() if game.completed_at else None,
        },
        "moves": [
            {
                "ply": m.ply,
                "move_number": m.move_number,
                "color": m.color,
                "model": m.model,
                "uci_move": m.uci_move,
                "san_move": m.san_move,
                "strategy": m.strategy,
                "confidence": m.confidence,
                "decision_summary": m.decision_summary,
                "stockfish_eval_before": m.stockfish_eval_before,
                "stockfish_eval_after": m.stockfish_eval_after,
                "stockfish_best_move": m.stockfish_best_move,
                "centipawn_loss": m.centipawn_loss,
                "move_quality": m.move_quality,
                "latency_ms": m.latency_ms
            }
            for m in moves
        ]
    }
    return Response(
        content=json.dumps(payload, indent=2),
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="game_{game_id}.json"'}
    )

@router.get("/{game_id}/export/csv")
def export_game_csv(game_id: str, db: Session = Depends(get_db)):
    game = GameRepository.get(db, game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    moves = MoveRepository.get_by_game(db, game_id)
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Ply", "MoveNumber", "Color", "Model", "SAN", "UCI",
        "Strategy", "Confidence", "StockfishEvalBefore", "StockfishEvalAfter",
        "BestMove", "CPL", "Quality", "LatencyMs"
    ])
    for m in moves:
        writer.writerow([
            m.ply, m.move_number, m.color, m.model, m.san_move, m.uci_move,
            m.strategy, m.confidence, m.stockfish_eval_before, m.stockfish_eval_after,
            m.stockfish_best_move, m.centipawn_loss, m.move_quality, m.latency_ms
        ])
    
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="game_{game_id}_moves.csv"'}
    )
