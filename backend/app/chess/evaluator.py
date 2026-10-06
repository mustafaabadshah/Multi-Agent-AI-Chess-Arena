from typing import Tuple, Optional, Dict, Any, List
import math
from app.schemas.analysis import CriticalMomentItem

class MoveQualityClassifier:
    """
    Classifies chess moves based on engine evaluation change and centipawn loss.
    Calculates moving player perspective metrics.
    """

    EXCELLENT_THRESHOLD = 30
    GOOD_THRESHOLD = 80
    INACCURACY_THRESHOLD = 150
    MISTAKE_THRESHOLD = 300
    # 300+ cp is Blunder

    CRITICAL_SWING_THRESHOLD = 1.5  # 1.5 pawn swing in evaluation

    @classmethod
    def calculate_cpl_and_quality(
        cls,
        color: str,
        eval_before: float,
        eval_after: float,
        played_move_uci: str,
        best_move_uci: Optional[str] = None
    ) -> Tuple[int, str]:
        """
        Calculates centipawn loss (CPL) and assigns move quality label.
        eval_before and eval_after are normalized to White advantage (in pawns).
        """
        # Convert pawn scores to centipawns
        cp_before = int(eval_before * 100)
        cp_after = int(eval_after * 100)

        # Player-relative perspective:
        # For White, positive score is good. CPL = before - after
        # For Black, negative score is good. CPL = (-before) - (-after) = after - before
        if color.lower() == "white":
            loss = cp_before - cp_after
        else:
            loss = cp_after - cp_before

        # Cap loss at 0 if move was beneficial or maintained advantage
        cpl = max(0, loss)

        # Move quality classification
        if played_move_uci and best_move_uci and played_move_uci.lower() == best_move_uci.lower():
            quality = "Best Move"
        elif cpl <= cls.EXCELLENT_THRESHOLD:
            quality = "Excellent"
        elif cpl <= cls.GOOD_THRESHOLD:
            quality = "Good"
        elif cpl <= cls.INACCURACY_THRESHOLD:
            quality = "Inaccuracy"
        elif cpl <= cls.MISTAKE_THRESHOLD:
            quality = "Mistake"
        else:
            quality = "Blunder"

        return cpl, quality

    @classmethod
    def calculate_accuracy(cls, cpl_list: List[int]) -> float:
        """
        Calculates overall game accuracy (0% to 100%) from a list of CPL values.
        Uses a smooth exponential decay formula similar to modern chess analytics platforms.
        """
        if not cpl_list:
            return 100.0
        
        move_accuracies = []
        for cpl in cpl_list:
            # 0 cpl = 100%
            # 30 cpl ~ 92%
            # 80 cpl ~ 75%
            # 150 cpl ~ 50%
            # 300 cpl ~ 20%
            acc = 100.0 * math.exp(-0.0055 * cpl)
            move_accuracies.append(acc)
            
        return round(sum(move_accuracies) / len(move_accuracies), 1)

    @classmethod
    def detect_critical_moment(
        cls,
        ply: int,
        move_number: int,
        color: str,
        san_move: str,
        eval_before: float,
        eval_after: float,
        quality: str,
        best_move_san: Optional[str] = None
    ) -> Optional[CriticalMomentItem]:
        """
        Detects if a move constituted a critical inflection point in the game.
        """
        eval_swing = abs(eval_after - eval_before)
        is_blunder = quality == "Blunder"
        is_mistake = quality == "Mistake"
        is_large_swing = eval_swing >= cls.CRITICAL_SWING_THRESHOLD

        if is_blunder or is_mistake or is_large_swing:
            direction = "turned in favor of White" if eval_after > eval_before else "turned in favor of Black"
            desc = f"Move {move_number} ({color.capitalize()} {san_move}): {quality} caused a {eval_swing:.1f} pawn swing ({eval_before:+.2f} → {eval_after:+.2f}). Position {direction}."
            
            return CriticalMomentItem(
                ply=ply,
                move_number=move_number,
                color=color,
                san_move=san_move,
                eval_before=round(eval_before, 2),
                eval_after=round(eval_after, 2),
                eval_swing=round(eval_swing, 2),
                quality=quality,
                description=desc,
                stockfish_best_move=best_move_san
            )
        return None
