import pytest
import chess
from app.chess.validator import validate_fen, validate_move
from app.chess.board_manager import BoardManager
from app.chess.openings import identify_opening

def test_fen_validation():
    # Valid starting FEN
    valid, err = validate_fen(chess.STARTING_FEN)
    assert valid is True
    assert err is None

    # Invalid fields count
    valid, err = validate_fen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq")
    assert valid is False
    assert "Expected 6" in err

    # Empty FEN
    valid, err = validate_fen("")
    assert valid is False

def test_move_validation():
    board = chess.Board()
    
    # Valid UCI
    valid, move_obj, err = validate_move(board, "e2e4")
    assert valid is True
    assert move_obj == chess.Move.from_uci("e2e4")

    # Valid SAN
    valid, move_obj, err = validate_move(board, "Nf3")
    assert valid is True
    assert move_obj == chess.Move.from_uci("g1f3")

    # Illegal move
    valid, move_obj, err = validate_move(board, "e2e5")
    assert valid is False
    assert "not legal" in err

def test_board_manager_lifecycle():
    mgr = BoardManager()
    assert mgr.turn_color == "white"
    assert mgr.ply == 0
    assert mgr.fullmove_number == 1
    assert not mgr.is_check
    assert not mgr.is_game_over

    # Play 1. e4
    san, uci, new_fen = mgr.apply_move(chess.Move.from_uci("e2e4"))
    assert san == "e4"
    assert uci == "e2e4"
    assert mgr.turn_color == "black"
    assert mgr.ply == 1

    # Play 1... e5
    san, uci, new_fen = mgr.apply_move(chess.Move.from_uci("e7e5"))
    assert san == "e5"
    assert mgr.turn_color == "white"
    assert mgr.ply == 2
    assert mgr.fullmove_number == 2

    # Material summary
    mat = mgr.get_material_summary()
    assert mat["balance_desc"] == "Equal"
    assert mat["white_points"] == mat["black_points"]

    # History formatting
    hist_text = mgr.get_recent_history_text()
    assert "1. e4 e5" in hist_text

    # PGN generation
    pgn = mgr.generate_pgn()
    assert "1. e4 e5" in pgn

def test_opening_identification():
    # Sicilian
    assert identify_opening(["e2e4", "c7c5"]) == "Sicilian Defense"
    assert identify_opening(["e2e4", "c7c5", "g1f3", "d7d6", "d2d4", "c5d4", "f3d4", "g8f6", "b1c3", "a7a6"]) == "Sicilian Defense: Najdorf Variation"
    
    # French
    assert identify_opening(["e2e4", "e7e6"]) == "French Defense"
    
    # Queen's Gambit
    assert identify_opening(["d2d4", "d7d5", "c2c4"]) == "Queen's Gambit"

def test_tactical_context_and_safety():
    mgr = BoardManager()
    tac = mgr.get_tactical_context()
    assert "summary_text" in tac
    assert isinstance(tac["checks"], list)
    assert isinstance(tac["captures"], list)
    
    # 1. e4 is safe
    safe, msg = mgr.check_move_safety("e2e4")
    assert safe is True
    assert msg == ""
    
    # Position where black queen hangs on d4
    hanging_fen = "rnb1kbnr/pppp1ppp/8/4p3/3q4/4P3/PPPP1PPP/RNBQKBNR w KQkq - 1 3"
    mgr_hang = BoardManager(initial_fen=hanging_fen)
    tac_hang = mgr_hang.get_tactical_context()
    assert tac_hang["captures"] is not None
    # exd4 is a capture of Black Queen
    assert any("e3d4" in c for c in tac_hang["captures"])
    
    # White blundering queen to d4 would be unsafe if undefended
    blunder_fen = "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 1 2"
    mgr_blunder = BoardManager(initial_fen=blunder_fen)
    # Queen to d5 or f3 or e2
    safe_q, msg_q = mgr_blunder.check_move_safety("d1h5")
    assert safe_q is True # Qh5 is a valid legal square in Scholar's mate attack

