from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.database.repositories import GameRepository, MoveRepository, AnalysisRepository
from app.schemas.analysis import GameAnalysisResponse, AgentSideStats, StyleIndicators, CriticalMomentItem
from app.services.analysis_service import AnalysisService

router = APIRouter(prefix="/games", tags=["Analysis"])

def _format_analysis_response(game, analysis, moves) -> GameAnalysisResponse:
    white_moves = [m for m in moves if m.color == "white"]
    black_moves = [m for m in moves if m.color == "black"]

    def calc_tokens(side_moves):
        toks = [m.output_tokens for m in side_moves if m.output_tokens is not None]
        return sum(toks) if toks else 0

    def calc_lat(side_moves):
        lats = [m.latency_ms for m in side_moves if m.latency_ms is not None]
        return round(sum(lats) / len(lats), 1) if lats else 0.0

    def calc_conf(side_moves):
        confs = [m.confidence for m in side_moves if m.confidence is not None]
        return round(sum(confs) / len(confs), 2) if confs else 0.85

    w_stats = AgentSideStats(
        model=game.white_model,
        personality=game.white_personality,
        accuracy_percentage=analysis.white_accuracy,
        average_cpl=analysis.white_average_cpl,
        blunders=analysis.white_blunders,
        mistakes=analysis.white_mistakes,
        inaccuracies=analysis.white_inaccuracies,
        good_moves=sum(1 for m in white_moves if m.move_quality == "Good"),
        excellent_moves=sum(1 for m in white_moves if m.move_quality == "Excellent"),
        best_moves=sum(1 for m in white_moves if m.move_quality == "Best Move"),
        average_confidence=calc_conf(white_moves),
        average_latency_ms=calc_lat(white_moves),
        total_tokens=calc_tokens(white_moves)
    )

    b_stats = AgentSideStats(
        model=game.black_model,
        personality=game.black_personality,
        accuracy_percentage=analysis.black_accuracy,
        average_cpl=analysis.black_average_cpl,
        blunders=analysis.black_blunders,
        mistakes=analysis.black_mistakes,
        inaccuracies=analysis.black_inaccuracies,
        good_moves=sum(1 for m in black_moves if m.move_quality == "Good"),
        excellent_moves=sum(1 for m in black_moves if m.move_quality == "Excellent"),
        best_moves=sum(1 for m in black_moves if m.move_quality == "Best Move"),
        average_confidence=calc_conf(black_moves),
        average_latency_ms=calc_lat(black_moves),
        total_tokens=calc_tokens(black_moves)
    )

    timeline = []
    for m in moves:
        timeline.append({
            "ply": m.ply,
            "move_number": m.move_number,
            "color": m.color,
            "san": m.san_move,
            "eval": m.stockfish_eval_after or 0.0,
            "quality": m.move_quality or "Good",
            "cpl": m.centipawn_loss or 0
        })

    cms = []
    if analysis.critical_moments and isinstance(analysis.critical_moments, list):
        for item in analysis.critical_moments:
            cms.append(CriticalMomentItem.model_validate(item))

    strat_stats = analysis.strategy_stats or {}
    white_strats = strat_stats.get("white", {})
    black_strats = strat_stats.get("black", {})

    style_summary = analysis.style_summary or {}
    w_style = style_summary.get("white", {
        "aggression": 60, "risk": 40, "tactical_tendency": 50,
        "defensive_tendency": 40, "king_safety_priority": 60,
        "material_preference": 50, "positional_preference": 60
    })
    b_style = style_summary.get("black", {
        "aggression": 40, "risk": 30, "tactical_tendency": 45,
        "defensive_tendency": 70, "king_safety_priority": 75,
        "material_preference": 50, "positional_preference": 65
    })

    return GameAnalysisResponse(
        game_id=game.id,
        opening=analysis.opening or game.opening,
        total_moves=len(moves),
        winner=game.winner,
        termination_reason=game.termination_reason,
        white=w_stats,
        black=b_stats,
        evaluation_timeline=timeline,
        critical_moments=cms,
        white_strategies=white_strats,
        black_strategies=black_strats,
        game_phases=analysis.game_phase_stats or {},
        white_style=StyleIndicators.model_validate(w_style),
        black_style=StyleIndicators.model_validate(b_style),
        summary_report=analysis.summary_report or "",
        created_at=analysis.created_at
    )

@router.get("/{game_id}/analysis", response_model=GameAnalysisResponse)
def get_game_analysis(game_id: str, db: Session = Depends(get_db)):
    game = GameRepository.get(db, game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")

    moves = MoveRepository.get_by_game(db, game_id)
    analysis = AnalysisRepository.get_by_game(db, game_id)

    if not analysis:
        # Compute on the fly if not already saved
        analysis = AnalysisService.compute_game_analysis(game, moves)
        AnalysisRepository.save(db, analysis)

    return _format_analysis_response(game, analysis, moves)

@router.post("/{game_id}/analysis/recompute", response_model=GameAnalysisResponse)
def recompute_game_analysis(game_id: str, db: Session = Depends(get_db)):
    game = GameRepository.get(db, game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")

    moves = MoveRepository.get_by_game(db, game_id)
    analysis = AnalysisService.compute_game_analysis(game, moves)
    saved = AnalysisRepository.save(db, analysis)

    return _format_analysis_response(game, saved, moves)

@router.get("/{game_id}/report")
def get_game_report(game_id: str, db: Session = Depends(get_db)):
    game = GameRepository.get(db, game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")

    analysis = AnalysisRepository.get_by_game(db, game_id)
    if not analysis:
        moves = MoveRepository.get_by_game(db, game_id)
        analysis = AnalysisService.compute_game_analysis(game, moves)
        AnalysisRepository.save(db, analysis)

    return Response(
        content=analysis.summary_report,
        media_type="text/markdown",
        headers={"Content-Disposition": f'attachment; filename="report_{game_id}.md"'}
    )
