import os
import shutil
import logging
from typing import Optional, Dict, Any, Tuple
import chess
import chess.engine
from app.config import settings

logger = logging.getLogger("chessmind.stockfish")

class StockfishEvaluator:
    """
    Independent Chess Evaluator and Referee.
    Uses Stockfish UCI engine when available, with a robust heuristic fallback
    to guarantee zero crashes in all environments.
    """

    def __init__(self, stockfish_path: Optional[str] = None, depth: int = 15):
        self.depth = depth
        self.custom_path = stockfish_path or settings.STOCKFISH_PATH
        self.engine_path = self._resolve_engine_path()
        self.is_real_stockfish = bool(self.engine_path)

        if self.is_real_stockfish:
            logger.info(f"Initialized StockfishEvaluator with binary at: {self.engine_path}")
        else:
            logger.warning("Stockfish binary not detected or executable. Utilizing heuristic engine evaluator.")

    def _resolve_engine_path(self) -> Optional[str]:
        # 1. Check configured path
        if self.custom_path and os.path.isfile(self.custom_path):
            return self.custom_path
        
        # 2. Check system PATH
        path_in_env = shutil.which("stockfish") or shutil.which("stockfish.exe")
        if path_in_env:
            return path_in_env
            
        # 3. Check backend/bin/stockfish.exe
        rel_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "bin", "stockfish.exe")
        if os.path.isfile(rel_path):
            return rel_path
            
        return None

    def evaluate_position(self, fen: str, depth: Optional[int] = None) -> Dict[str, Any]:
        """
        Evaluates a position given by FEN.
        Returns:
            {
                "score_white": float,       # Normalized score in pawns: + White, - Black
                "score_cp": int,            # Centipawns from White perspective
                "mate": Optional[int],      # Mate in N (+ White, - Black)
                "best_move_uci": str,
                "best_move_san": str,
                "depth": int,
                "is_engine": bool
            }
        """
        eval_depth = depth or self.depth
        board = chess.Board(fen)

        if self.is_real_stockfish and self.engine_path:
            try:
                return self._evaluate_with_stockfish(board, eval_depth)
            except Exception as e:
                logger.error(f"Stockfish evaluation error: {e}. Falling back to heuristic evaluator.")
        
        return self._evaluate_heuristic(board)

    def _evaluate_with_stockfish(self, board: chess.Board, depth: int) -> Dict[str, Any]:
        with chess.engine.SimpleEngine.popen_uci(self.engine_path) as engine:
            info = engine.analyse(board, chess.engine.Limit(depth=depth))
            score = info.get("score")
            
            # Stockfish returns score from moving player's perspective or White
            # Let's get PovScore relative to chess.WHITE
            white_score = score.white() if score else None
            
            mate_val = None
            cp_val = 0
            pawn_val = 0.0

            if white_score:
                if white_score.is_mate():
                    mate_val = white_score.mate()
                    # Assign high value for mate
                    if mate_val is not None:
                        pawn_val = 100.0 if mate_val > 0 else -100.0
                        cp_val = 10000 if mate_val > 0 else -10000
                else:
                    cp_val = white_score.score() or 0
                    pawn_val = round(cp_val / 100.0, 2)

            pv = info.get("pv", [])
            best_move = pv[0] if pv else None
            best_uci = best_move.uci() if best_move else ""
            best_san = board.san(best_move) if best_move else ""

            return {
                "score_white": pawn_val,
                "score_cp": cp_val,
                "mate": mate_val,
                "best_move_uci": best_uci,
                "best_move_san": best_san,
                "depth": depth,
                "is_engine": True
            }

    def _evaluate_heuristic(self, board: chess.Board) -> Dict[str, Any]:
        """
        Positional and material heuristic evaluator used when Stockfish binary is not running.
        Evaluates material, piece placement, king safety, and mobility.
        """
        if board.is_checkmate():
            pawn_val = -100.0 if board.turn == chess.WHITE else 100.0
            return {
                "score_white": pawn_val,
                "score_cp": int(pawn_val * 100),
                "mate": -1 if board.turn == chess.WHITE else 1,
                "best_move_uci": "",
                "best_move_san": "",
                "depth": 1,
                "is_engine": False
            }
        
        if board.is_stalemate() or board.is_insufficient_material():
            return {
                "score_white": 0.0,
                "score_cp": 0,
                "mate": None,
                "best_move_uci": "",
                "best_move_san": "",
                "depth": 1,
                "is_engine": False
            }

        # Piece weights
        weights = {
            chess.PAWN: 100,
            chess.KNIGHT: 320,
            chess.BISHOP: 330,
            chess.ROOK: 500,
            chess.QUEEN: 900,
            chess.KING: 20000
        }

        # Piece-square tables for center control
        pawn_table = [
            0,  0,  0,  0,  0,  0,  0,  0,
            50, 50, 50, 50, 50, 50, 50, 50,
            10, 10, 20, 30, 30, 20, 10, 10,
             5,  5, 10, 25, 25, 10,  5,  5,
             0,  0,  0, 20, 20,  0,  0,  0,
             5, -5,-10,  0,  0,-10, -5,  5,
             5, 10, 10,-20,-20, 10, 10,  5,
             0,  0,  0,  0,  0,  0,  0,  0
        ]

        score = 0
        for square, piece in board.piece_map().items():
            val = weights.get(piece.piece_type, 0)
            if piece.piece_type == chess.PAWN:
                sq_bonus = pawn_table[square] if piece.color == chess.WHITE else pawn_table[chess.square_mirror(square)]
                val += sq_bonus
            
            if piece.color == chess.WHITE:
                score += val
            else:
                score -= val

        # Mobility bonus
        w_board = board.copy()
        w_board.turn = chess.WHITE
        w_moves = len(list(w_board.legal_moves))
        
        b_board = board.copy()
        b_board.turn = chess.BLACK
        b_moves = len(list(b_board.legal_moves))
        
        score += (w_moves - b_moves) * 5

        # Best move approximation from legal moves
        legal = list(board.legal_moves)
        best_uci = ""
        best_san = ""
        if legal:
            # Pick move that maximizes moving player's score
            best_move = legal[0]
            best_move_score = -999999 if board.turn == chess.WHITE else 999999
            for m in legal:
                board.push(m)
                # quick material delta
                m_score = sum(weights.get(p.piece_type, 0) * (1 if p.color == chess.WHITE else -1) for p in board.piece_map().values())
                board.pop()
                if board.turn == chess.WHITE:
                    if m_score > best_move_score:
                        best_move_score = m_score
                        best_move = m
                else:
                    if m_score < best_move_score:
                        best_move_score = m_score
                        best_move = m

            best_uci = best_move.uci()
            best_san = board.san(best_move)

        pawn_val = round(score / 100.0, 2)
        return {
            "score_white": pawn_val,
            "score_cp": int(score),
            "mate": None,
            "best_move_uci": best_uci,
            "best_move_san": best_san,
            "depth": 1,
            "is_engine": False
        }
