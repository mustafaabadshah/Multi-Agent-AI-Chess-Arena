import pytest
import chess
from app.chess.stockfish import StockfishEvaluator
from app.chess.evaluator import MoveQualityClassifier

def test_stockfish_or_heuristic_evaluation():
    evaluator = StockfishEvaluator()
    res = evaluator.evaluate_position(chess.STARTING_FEN, depth=5)
    assert "score_white" in res
    assert "best_move_uci" in res
    assert isinstance(res["score_white"], float)

def test_cpl_and_move_quality():
    # White perspective
    # Before: +1.0, After: +0.9 => 10 cp loss => Excellent
    cpl, quality = MoveQualityClassifier.calculate_cpl_and_quality(
        color="white",
        eval_before=1.0,
        eval_after=0.9,
        played_move_uci="e2e4",
        best_move_uci="d2d4"
    )
    assert cpl == 10
    assert quality == "Excellent"

    # Best move match
    cpl, quality = MoveQualityClassifier.calculate_cpl_and_quality(
        color="white",
        eval_before=1.0,
        eval_after=1.0,
        played_move_uci="e2e4",
        best_move_uci="e2e4"
    )
    assert cpl == 0
    assert quality == "Best Move"

    # White blunder: +1.5 -> -2.0 => 350 cp loss => Blunder
    cpl, quality = MoveQualityClassifier.calculate_cpl_and_quality(
        color="white",
        eval_before=1.5,
        eval_after=-2.0,
        played_move_uci="e2e4",
        best_move_uci="d2d4"
    )
    assert cpl == 350
    assert quality == "Blunder"

    # Black perspective
    # Before: -0.5 (favoring Black), After: +1.0 (favoring White)
    # Moving player: Black. loss = after - before = 100 - (-50) = 150 cp => Inaccuracy/Mistake
    cpl, quality = MoveQualityClassifier.calculate_cpl_and_quality(
        color="black",
        eval_before=-0.5,
        eval_after=1.0,
        played_move_uci="e7e5",
        best_move_uci="c7c5"
    )
    assert cpl == 150
    assert quality in ["Inaccuracy", "Mistake"]

def test_accuracy_calculation():
    # Perfect play
    assert MoveQualityClassifier.calculate_accuracy([0, 0, 0]) == 100.0
    # Good play
    acc = MoveQualityClassifier.calculate_accuracy([15, 25, 10, 40])
    assert 80.0 <= acc <= 95.0
    # Blunder-prone play
    low_acc = MoveQualityClassifier.calculate_accuracy([250, 400, 300])
    assert low_acc < 50.0

def test_critical_moment_detection():
    cm = MoveQualityClassifier.detect_critical_moment(
        ply=25,
        move_number=13,
        color="white",
        san_move="Qxf7+",
        eval_before=0.2,
        eval_after=3.5,
        quality="Best Move",
        best_move_san="Qxf7+"
    )
    assert cm is not None
    assert cm.eval_swing >= 1.5
    assert cm.color == "white"
