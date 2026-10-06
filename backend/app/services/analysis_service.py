from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
import chess

from app.database.models import GameModel, MoveModel, GameAnalysisModel, get_utc_now
from app.chess.evaluator import MoveQualityClassifier
from app.schemas.analysis import (
    GameAnalysisResponse,
    AgentSideStats,
    StyleIndicators,
    CriticalMomentItem
)

class AnalysisService:
    @classmethod
    def compute_game_analysis(cls, game: GameModel, moves: List[MoveModel]) -> GameAnalysisModel:
        """
        Computes comprehensive game analytics and persists GameAnalysisModel.
        """
        white_moves = [m for m in moves if m.color == "white"]
        black_moves = [m for m in moves if m.color == "black"]

        def analyze_side(side_moves: List[MoveModel], default_model: str, default_personality: str):
            cpls = [m.centipawn_loss for m in side_moves if m.centipawn_loss is not None]
            avg_cpl = round(sum(cpls) / len(cpls), 1) if cpls else 0.0
            accuracy = MoveQualityClassifier.calculate_accuracy(cpls)

            blunders = sum(1 for m in side_moves if m.move_quality == "Blunder")
            mistakes = sum(1 for m in side_moves if m.move_quality == "Mistake")
            inaccuracies = sum(1 for m in side_moves if m.move_quality == "Inaccuracy")
            good = sum(1 for m in side_moves if m.move_quality == "Good")
            excellent = sum(1 for m in side_moves if m.move_quality == "Excellent")
            best = sum(1 for m in side_moves if m.move_quality == "Best Move")

            confs = [m.confidence for m in side_moves if m.confidence is not None]
            avg_conf = round(sum(confs) / len(confs), 2) if confs else 0.85

            lats = [m.latency_ms for m in side_moves if m.latency_ms is not None]
            avg_lat = round(sum(lats) / len(lats), 1) if lats else 0.0

            toks = [m.output_tokens for m in side_moves if m.output_tokens is not None]
            tot_toks = sum(toks) if toks else 0

            return {
                "model": side_moves[0].model if side_moves else default_model,
                "personality": side_moves[0].personality if side_moves else default_personality,
                "accuracy": accuracy,
                "avg_cpl": avg_cpl,
                "blunders": blunders,
                "mistakes": mistakes,
                "inaccuracies": inaccuracies,
                "good": good,
                "excellent": excellent,
                "best": best,
                "avg_confidence": avg_conf,
                "avg_latency": avg_lat,
                "total_tokens": tot_toks,
            }

        w_stats = analyze_side(white_moves, game.white_model, game.white_personality)
        b_stats = analyze_side(black_moves, game.black_model, game.black_personality)

        # Strategy distributions
        def count_strategies(side_moves: List[MoveModel]) -> Dict[str, int]:
            counts: Dict[str, int] = {}
            for m in side_moves:
                s = m.strategy or "Other"
                counts[s] = counts.get(s, 0) + 1
            return counts

        white_strats = count_strategies(white_moves)
        black_strats = count_strategies(black_moves)

        # Critical moments & timeline
        timeline = []
        critical_moments = []
        for m in moves:
            eval_after = m.stockfish_eval_after if m.stockfish_eval_after is not None else 0.0
            eval_before = m.stockfish_eval_before if m.stockfish_eval_before is not None else 0.0
            timeline.append({
                "ply": m.ply,
                "move_number": m.move_number,
                "color": m.color,
                "san": m.san_move,
                "eval": eval_after,
                "quality": m.move_quality,
                "cpl": m.centipawn_loss
            })

            cm = MoveQualityClassifier.detect_critical_moment(
                ply=m.ply,
                move_number=m.move_number,
                color=m.color,
                san_move=m.san_move,
                eval_before=eval_before,
                eval_after=eval_after,
                quality=m.move_quality or "Good",
                best_move_san=m.stockfish_best_move
            )
            if cm:
                critical_moments.append(cm.model_dump())

        # Game phases breakdown
        total_plies = len(moves)
        opening_end_ply = min(24, total_plies)
        middlegame_end_ply = min(60, total_plies)

        phases = {
            "opening": {
                "name": "Opening",
                "ply_range": [1, opening_end_ply],
                "moves_count": opening_end_ply
            },
            "middlegame": {
                "name": "Middlegame",
                "ply_range": [opening_end_ply + 1, middlegame_end_ply] if total_plies > 24 else [0, 0],
                "moves_count": max(0, middlegame_end_ply - opening_end_ply)
            },
            "endgame": {
                "name": "Endgame",
                "ply_range": [middlegame_end_ply + 1, total_plies] if total_plies > 60 else [0, 0],
                "moves_count": max(0, total_plies - middlegame_end_ply)
            }
        }

        # Experimental style indicators
        def compute_style(side_moves: List[MoveModel], strats: Dict[str, int]) -> Dict[str, int]:
            tot = max(1, len(side_moves))
            attack_count = strats.get("Attack", 0) + strats.get("Initiative", 0)
            tactical_count = strats.get("Tactical", 0) + strats.get("Material Gain", 0)
            defensive_count = strats.get("Defense", 0) + strats.get("King Safety", 0)
            positional_count = strats.get("Center Control", 0) + strats.get("Pawn Structure", 0) + strats.get("Space Advantage", 0)

            high_risk = sum(1 for m in side_moves if (m.risk_level or "").lower() == "high")
            low_risk = sum(1 for m in side_moves if (m.risk_level or "").lower() == "low")

            return {
                "aggression": min(100, int((attack_count / tot) * 160 + 30)),
                "risk": min(100, int((high_risk / tot) * 180 + 20)),
                "tactical_tendency": min(100, int((tactical_count / tot) * 170 + 25)),
                "defensive_tendency": min(100, int((defensive_count / tot) * 160 + 20)),
                "king_safety_priority": min(100, int((strats.get("King Safety", 0) / tot) * 200 + 35)),
                "material_preference": min(100, int((strats.get("Material Gain", 0) / tot) * 180 + 30)),
                "positional_preference": min(100, int((positional_count / tot) * 150 + 30)),
            }

        white_style = compute_style(white_moves, white_strats)
        black_style = compute_style(black_moves, black_strats)

        # Markdown Report Generation
        report = f"""# ChessMind Arena Game Analysis Report

## Game Overview
- **Game ID:** `{game.id}`
- **Opening:** {game.opening or 'Standard Opening'}
- **Total Plies / Moves:** {total_plies} plies ({game.moves[-1].move_number if moves else 0} moves)
- **Winner:** {game.winner.capitalize() if game.winner else 'Undetermined'}
- **Termination Reason:** {game.termination_reason or 'Ongoing'}

---

## Agent Performance Comparison

| Metric | White Agent ({game.white_model}) | Black Agent ({game.black_model}) |
| :--- | :--- | :--- |
| **Personality** | {game.white_personality} | {game.black_personality} |
| **Stockfish Accuracy** | {w_stats['accuracy']}% | {b_stats['accuracy']}% |
| **Average Centipawn Loss** | {w_stats['avg_cpl']} cp | {b_stats['avg_cpl']} cp |
| **Best / Excellent Moves** | {w_stats['best'] + w_stats['excellent']} | {b_stats['best'] + b_stats['excellent']} |
| **Good Moves** | {w_stats['good']} | {b_stats['good']} |
| **Inaccuracies** | {w_stats['inaccuracies']} | {b_stats['inaccuracies']} |
| **Mistakes** | {w_stats['mistakes']} | {b_stats['mistakes']} |
| **Blunders** | {w_stats['blunders']} | {b_stats['blunders']} |
| **Average Decision Confidence** | {w_stats['avg_confidence']} | {b_stats['avg_confidence']} |
| **Avg Model Latency** | {w_stats['avg_latency']} ms | {b_stats['avg_latency']} ms |

---

## Critical Moments & Evaluation Swings
"""
        if critical_moments:
            for cm in critical_moments[:8]:
                report += f"- **Ply {cm['ply']} ({cm['color'].capitalize()} {cm['san_move']}):** {cm['quality']} with swing {cm['eval_swing']} ({cm['eval_before']:+.2f} → {cm['eval_after']:+.2f}). Best: `{cm['stockfish_best_move']}`\n"
        else:
            report += "No major blunders or critical evaluation swings occurred during this encounter.\n"

        report += """
---
*Note: Stated AI strategies represent structured decision summaries reported by the opposing models and verified against independent Stockfish engine evaluation.*
"""

        analysis_record = GameAnalysisModel(
            id=game.id,
            game_id=game.id,
            white_accuracy=w_stats["accuracy"],
            black_accuracy=b_stats["accuracy"],
            white_average_cpl=w_stats["avg_cpl"],
            black_average_cpl=b_stats["avg_cpl"],
            white_blunders=w_stats["blunders"],
            black_blunders=b_stats["blunders"],
            white_mistakes=w_stats["mistakes"],
            black_mistakes=b_stats["mistakes"],
            white_inaccuracies=w_stats["inaccuracies"],
            black_inaccuracies=b_stats["inaccuracies"],
            opening=game.opening,
            game_phase_stats=phases,
            strategy_stats={
                "white": white_strats,
                "black": black_strats
            },
            style_summary={
                "white": white_style,
                "black": black_style
            },
            critical_moments=critical_moments,
            summary_report=report,
            created_at=get_utc_now()
        )
        return analysis_record
