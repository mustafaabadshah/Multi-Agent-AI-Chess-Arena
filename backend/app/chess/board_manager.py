from typing import List, Dict, Optional, Tuple, Any
import chess
import chess.pgn
import io
from app.chess.openings import identify_opening

class BoardManager:
    """
    Authoritative chess board manager using python-chess.
    Maintains official state, legal moves, history, PGN, and contextual summaries.
    """

    def __init__(self, initial_fen: Optional[str] = None):
        self.initial_fen = initial_fen.strip() if initial_fen and initial_fen.strip() else chess.STARTING_FEN
        self.board = chess.Board(self.initial_fen)
        self.move_history_uci: List[str] = []
        self.move_history_san: List[str] = []

    @property
    def current_fen(self) -> str:
        return self.board.fen()

    @property
    def turn_color(self) -> str:
        return "white" if self.board.turn == chess.WHITE else "black"

    @property
    def ply(self) -> int:
        return len(self.move_history_uci)

    @property
    def fullmove_number(self) -> int:
        return self.board.fullmove_number

    @property
    def is_check(self) -> bool:
        return self.board.is_check()

    @property
    def is_checkmate(self) -> bool:
        return self.board.is_checkmate()

    @property
    def is_stalemate(self) -> bool:
        return self.board.is_stalemate()

    @property
    def is_insufficient_material(self) -> bool:
        return self.board.is_insufficient_material()

    @property
    def is_fifty_moves(self) -> bool:
        return self.board.is_fifty_moves()

    @property
    def is_repetition(self) -> bool:
        return self.board.is_repetition(3)

    @property
    def is_game_over(self) -> bool:
        return (
            self.board.is_checkmate()
            or self.board.is_stalemate()
            or self.board.is_insufficient_material()
            or self.board.is_fifty_moves()
            or self.board.is_repetition(3)
        )

    def get_game_result(self) -> Tuple[Optional[str], Optional[str]]:
        """
        Returns (winner, termination_reason).
        winner: 'white', 'black', 'draw', or None if game is ongoing.
        """
        if self.board.is_checkmate():
            winner = "black" if self.board.turn == chess.WHITE else "white"
            return winner, f"Checkmate ({winner.capitalize()} wins)"
        if self.board.is_stalemate():
            return "draw", "Draw by Stalemate"
        if self.board.is_insufficient_material():
            return "draw", "Draw by Insufficient Material"
        if self.board.is_fifty_moves():
            return "draw", "Draw by 50-move rule"
        if self.board.is_repetition(3):
            return "draw", "Draw by Threefold Repetition"
        return None, None

    def get_legal_moves_uci(self) -> List[str]:
        return [m.uci() for m in self.board.legal_moves]

    def get_legal_moves_san(self) -> List[str]:
        return [self.board.san(m) for m in self.board.legal_moves]

    def apply_move(self, move: chess.Move) -> Tuple[str, str, str]:
        """
        Applies a validated legal chess.Move to the board.
        Returns (san_move, uci_move, new_fen).
        """
        san = self.board.san(move)
        uci = move.uci()
        self.move_history_uci.append(uci)
        self.move_history_san.append(san)
        self.board.push(move)
        return san, uci, self.board.fen()

    def get_material_summary(self) -> Dict[str, Any]:
        """
        Returns piece counts and material balance.
        """
        piece_values = {
            chess.PAWN: 1,
            chess.KNIGHT: 3,
            chess.BISHOP: 3,
            chess.ROOK: 5,
            chess.QUEEN: 9,
        }
        
        white_pieces = {
            "Q": len(self.board.pieces(chess.QUEEN, chess.WHITE)),
            "R": len(self.board.pieces(chess.ROOK, chess.WHITE)),
            "B": len(self.board.pieces(chess.BISHOP, chess.WHITE)),
            "N": len(self.board.pieces(chess.KNIGHT, chess.WHITE)),
            "P": len(self.board.pieces(chess.PAWN, chess.WHITE)),
        }
        black_pieces = {
            "Q": len(self.board.pieces(chess.QUEEN, chess.BLACK)),
            "R": len(self.board.pieces(chess.ROOK, chess.BLACK)),
            "B": len(self.board.pieces(chess.BISHOP, chess.BLACK)),
            "N": len(self.board.pieces(chess.KNIGHT, chess.BLACK)),
            "P": len(self.board.pieces(chess.PAWN, chess.BLACK)),
        }
        
        white_pts = sum(white_pieces[p] * val for p, val in [("Q", 9), ("R", 5), ("B", 3), ("N", 3), ("P", 1)])
        black_pts = sum(black_pieces[p] * val for p, val in [("Q", 9), ("R", 5), ("B", 3), ("N", 3), ("P", 1)])
        diff = white_pts - black_pts
        
        if diff > 0:
            balance_desc = f"White +{diff}"
        elif diff < 0:
            balance_desc = f"Black +{abs(diff)}"
        else:
            balance_desc = "Equal"
            
        white_str = f"Q={white_pieces['Q']} R={white_pieces['R']} B={white_pieces['B']} N={white_pieces['N']} pawns={white_pieces['P']}"
        black_str = f"Q={black_pieces['Q']} R={black_pieces['R']} B={black_pieces['B']} N={black_pieces['N']} pawns={black_pieces['P']}"
        
        return {
            "white_pieces": white_pieces,
            "black_pieces": black_pieces,
            "white_points": white_pts,
            "black_points": black_pts,
            "difference": diff,
            "balance_desc": balance_desc,
            "text": f"White material: {white_str}\nBlack material: {black_str}\nMaterial balance: {balance_desc}"
        }

    def get_recent_history_text(self, max_plies: int = 20) -> str:
        """
        Returns recent moves formatted cleanly as move pairs (e.g., 1. e4 c5 2. Nf3 d6 ...).
        """
        if not self.move_history_san:
            return "No moves played yet."
        
        pairs = []
        start_idx = max(0, len(self.move_history_san) - max_plies)
        
        # Build turn pairs
        full_pairs = []
        for i in range(0, len(self.move_history_san), 2):
            w = self.move_history_san[i]
            b = self.move_history_san[i + 1] if i + 1 < len(self.move_history_san) else ""
            move_num = (i // 2) + 1
            full_pairs.append(f"{move_num}. {w} {b}".strip())
        
        # Take the tail
        tail_pairs = full_pairs[-((max_plies + 1) // 2):]
        return " ".join(tail_pairs)

    def get_castling_rights_text(self) -> str:
        white_k = self.board.has_kingside_castling_rights(chess.WHITE)
        white_q = self.board.has_queenside_castling_rights(chess.WHITE)
        black_k = self.board.has_kingside_castling_rights(chess.BLACK)
        black_q = self.board.has_queenside_castling_rights(chess.BLACK)
        
        w_rights = ("K" if white_k else "") + ("Q" if white_q else "") or "None"
        b_rights = ("k" if black_k else "") + ("q" if black_q else "") or "None"
        return f"White: {w_rights}, Black: {b_rights}"

    def get_opening_name(self) -> str:
        return identify_opening(self.move_history_uci)

    def generate_pgn(
        self,
        white_player: str = "White Agent",
        black_player: str = "Black Agent",
        event: str = "ChessMind Arena AI Clash",
        result: str = "*"
    ) -> str:
        """
        Generates standard PGN string for the game.
        """
        game = chess.pgn.Game()
        game.headers["Event"] = event
        game.headers["Site"] = "ChessMind Arena"
        game.headers["White"] = white_player
        game.headers["Black"] = black_player
        game.headers["Result"] = result
        
        if self.initial_fen != chess.STARTING_FEN:
            game.headers["SetUp"] = "1"
            game.headers["FEN"] = self.initial_fen

        node = game
        temp_board = chess.Board(self.initial_fen)
        for uci in self.move_history_uci:
            move = chess.Move.from_uci(uci)
            node = node.add_variation(move)
            temp_board.push(move)

        return str(game)

    def get_tactical_context(self) -> Dict[str, Any]:
        """
        Extracts rich tactical signals from the board to dramatically boost LLM awareness:
        - Forcing moves (checks, captures) vs quiet moves
        - Pieces currently attacked by opponent, highlighting hanging/under-defended pieces
        - Direct king safety state (is in check, can escape/block)
        """
        turn = self.board.turn
        opponent = not turn
        
        checks: List[str] = []
        captures: List[str] = []
        quiet: List[str] = []
        
        piece_names = {
            chess.PAWN: "Pawn",
            chess.KNIGHT: "Knight",
            chess.BISHOP: "Bishop",
            chess.ROOK: "Rook",
            chess.QUEEN: "Queen",
            chess.KING: "King"
        }
        
        for move in self.board.legal_moves:
            uci = move.uci()
            san = self.board.san(move)
            if self.board.gives_check(move):
                checks.append(f"{uci} ({san}+ [Check])")
            elif self.board.is_capture(move):
                captured_piece = self.board.piece_at(move.to_square)
                cap_name = piece_names.get(captured_piece.piece_type, "piece") if captured_piece else "piece"
                captures.append(f"{uci} ({san} [captures {cap_name}])")
            else:
                quiet.append(uci)
                
        attacked_pieces: List[str] = []
        hanging_pieces: List[str] = []
        
        for sq, piece in self.board.piece_map().items():
            if piece.color == turn and piece.piece_type != chess.KING:
                enemy_attackers = list(self.board.attackers(opponent, sq))
                friendly_defenders = list(self.board.attackers(turn, sq))
                
                if enemy_attackers:
                    p_name = piece_names.get(piece.piece_type, "Piece")
                    sq_name = chess.square_name(sq)
                    if len(friendly_defenders) == 0:
                        hanging_pieces.append(
                            f"CRITICAL: Your {p_name} on {sq_name} is UNPROTECTED and attacked by {len(enemy_attackers)} enemy piece(s)!"
                        )
                    elif len(enemy_attackers) > len(friendly_defenders):
                        hanging_pieces.append(
                            f"WARNING: Your {p_name} on {sq_name} is under-defended ({len(friendly_defenders)} defender vs {len(enemy_attackers)} attackers)!"
                        )
                    else:
                        attacked_pieces.append(
                            f"Your {p_name} on {sq_name} is defended ({len(friendly_defenders)} defenders)"
                        )

        lines: List[str] = []
        if self.board.is_check():
            lines.append("⚠️ YOU ARE IN CHECK! You must move your king, block the check, or capture the checking piece.")
        
        if hanging_pieces:
            lines.extend(hanging_pieces)
        elif attacked_pieces:
            lines.extend(attacked_pieces[:3])
            
        if not lines:
            lines.append("No immediate pieces hanging or in check.")
            
        tactical_summary_text = "\n".join(f"- {line}" for line in lines)
        
        return {
            "is_check": self.board.is_check(),
            "checks": checks,
            "captures": captures,
            "quiet_count": len(quiet),
            "hanging_pieces": hanging_pieces,
            "attacked_pieces": attacked_pieces,
            "summary_text": tactical_summary_text
        }

    def check_move_safety(self, move_uci: str) -> Tuple[bool, str]:
        """
        Simulates move on a temporary board to verify whether the piece was moved
        onto an attacked square without sufficient defense (blundering a piece).
        Returns (is_safe, warning_message).
        """
        try:
            move = chess.Move.from_uci(move_uci)
        except Exception:
            return True, ""
            
        if move not in self.board.legal_moves:
            return False, "Move is not in legal moves list."
            
        turn = self.board.turn
        opponent = not turn
        piece = self.board.piece_at(move.from_square)
        if not piece:
            return True, ""
            
        piece_values = {
            chess.PAWN: 1,
            chess.KNIGHT: 3,
            chess.BISHOP: 3,
            chess.ROOK: 5,
            chess.QUEEN: 9,
            chess.KING: 0
        }
        val = piece_values.get(piece.piece_type, 0)
        captured = self.board.piece_at(move.to_square)
        cap_val = piece_values.get(captured.piece_type, 0) if captured else 0
        
        test_board = self.board.copy()
        test_board.push(move)
        
        # If checkmate or check delivered, allow tactic
        if test_board.is_checkmate():
            return True, ""
            
        to_sq = move.to_square
        attackers = list(test_board.attackers(opponent, to_sq))
        defenders = list(test_board.attackers(turn, to_sq))
        
        if attackers:
            # Completely undefended major piece
            if len(defenders) == 0 and val > cap_val and val >= 3:
                sq_name = chess.square_name(to_sq)
                return False, f"Blunder risk: {move_uci} places your {piece.symbol()} on {sq_name} with 0 defenders while attacked by {len(attackers)} enemy piece(s)."
            # Gross material sacrifice without justification
            if len(attackers) > len(defenders) and (val - cap_val) >= 3 and not test_board.is_check():
                sq_name = chess.square_name(to_sq)
                return False, f"Material loss: {move_uci} loses material on {sq_name} ({val}pts for {cap_val}pts)."
                
        return True, ""
