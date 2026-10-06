from typing import List, Tuple
import chess
from app.schemas.moves import STRATEGY_TAXONOMY

class StrategyService:
    @staticmethod
    def classify_move_heuristics(
        board_before: chess.Board,
        move: chess.Move
    ) -> Tuple[str, List[str]]:
        """
        Determines secondary or fallback strategies deterministically from chess geometry.
        """
        secondaries = []
        is_capture = board_before.is_capture(move)
        
        # Check castling
        if board_before.is_castling(move):
            return "King Safety", ["Piece Activity", "Initiative"]

        # Check check
        board_before.push(move)
        is_check = board_before.is_check()
        board_before.pop()

        if is_check:
            secondaries.append("Attack")

        piece = board_before.piece_at(move.from_square)
        if not piece:
            return "Other", secondaries

        # Opening development
        if board_before.fullmove_number <= 10:
            if piece.piece_type in [chess.KNIGHT, chess.BISHOP]:
                return "Piece Development", ["Opening Development"] + secondaries
            if move.to_square in [chess.D4, chess.D5, chess.E4, chess.E5]:
                return "Center Control", ["Opening Development", "Space Advantage"] + secondaries

        if is_capture:
            return "Material Gain", ["Tactical"] + secondaries

        # Pawn advance
        if piece.piece_type == chess.PAWN:
            if move.to_square in [chess.D4, chess.D5, chess.E4, chess.E5]:
                return "Center Control", ["Pawn Structure"] + secondaries
            if chess.square_rank(move.to_square) in [6, 1]:  # near promotion
                return "Promotion", ["Initiative"] + secondaries
            return "Pawn Structure", ["Space Advantage"] + secondaries

        # King moves (not castling)
        if piece.piece_type == chess.KING:
            if board_before.fullmove_number > 35:
                return "Endgame", ["Piece Activity"] + secondaries
            return "King Safety", ["Defense"] + secondaries

        return "Piece Activity", secondaries[:2]
