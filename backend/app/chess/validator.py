from typing import Tuple, Optional
import chess

def validate_fen(fen: str) -> Tuple[bool, Optional[str]]:
    """
    Validates a chess FEN string using python-chess.
    Returns (is_valid, error_message).
    """
    if not fen or not fen.strip():
        return False, "FEN string cannot be empty."
    
    fen_clean = fen.strip()
    parts = fen_clean.split()
    if len(parts) != 6:
        return False, f"Invalid FEN: Expected 6 space-separated fields, got {len(parts)}."
    
    try:
        chess.Board(fen_clean)
        return True, None
    except ValueError as e:
        return False, f"Invalid FEN: {str(e)}"
    except Exception as e:
        return False, f"Malformed FEN syntax: {str(e)}"

def validate_move(board: chess.Board, move_str: str) -> Tuple[bool, Optional[chess.Move], Optional[str]]:
    """
    Validates whether a move string (UCI or SAN) is legal for the current board state.
    Returns (is_legal, move_obj, error_message).
    """
    if not move_str or not move_str.strip():
        return False, None, "Move string cannot be empty."
    
    clean_move = move_str.strip()
    
    # Try UCI notation first (e.g. 'e2e4', 'e7e8q')
    try:
        move_obj = chess.Move.from_uci(clean_move)
        if move_obj in board.legal_moves:
            return True, move_obj, None
    except ValueError:
        pass
    
    # Try SAN notation (e.g. 'e4', 'Nf3', 'O-O', 'exd5')
    try:
        move_obj = board.parse_san(clean_move)
        if move_obj in board.legal_moves:
            return True, move_obj, None
    except (ValueError, chess.IllegalMoveError, chess.AmbiguousMoveError):
        pass
    
    # If not found, list legal moves for error context
    legal_uci = [m.uci() for m in board.legal_moves]
    return False, None, f"Move '{clean_move}' is not legal in the current position. Legal moves: {', '.join(legal_uci[:10])}..."
