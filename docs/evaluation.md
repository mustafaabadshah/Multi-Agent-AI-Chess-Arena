# Stockfish Evaluation & Quality Classification

## Evaluation Metric Normalization

Stockfish evaluations are normalized to the perspective of **White** in pawn units:
- `+1.00`: White is ahead by 1 pawn equivalent.
- `-1.00`: Black is ahead by 1 pawn equivalent.
- `+100.00` / `-100.00`: Forced checkmate.

## Centipawn Loss (CPL)

Centipawn loss measures how much a player's evaluation degraded compared to the engine's best move:
- **White to move**: $CPL = \max(0, cp_{before} - cp_{after})$
- **Black to move**: $CPL = \max(0, cp_{after} - cp_{before})$

If a move maintained or improved the evaluation, CPL is recorded as `0`.

## Move Quality Thresholds

| Centipawn Loss | Quality Classification |
| :--- | :--- |
| Matching Best Move | **Best Move** |
| 0–30 cp | **Excellent** |
| 30–80 cp | **Good** |
| 80–150 cp | **Inaccuracy** |
| 150–300 cp | **Mistake** |
| 300+ cp | **Blunder** |

## Critical Moment Detection

A move is flagged as a critical moment if:
1. The move is labeled as a **Blunder**.
2. The evaluation swing $|eval_{after} - eval_{before}| \ge 1.5$ pawns.
3. A decisive positional swing shifts the game advantage.

## Accuracy Calculation

Accuracy is computed from CPL using a decay curve:
$$Accuracy = 100 \times e^{-0.0055 \times CPL}$$
A game average of 0 CPL yields 100%, 30 CPL yields ~85%, and 150 CPL yields ~44%.
