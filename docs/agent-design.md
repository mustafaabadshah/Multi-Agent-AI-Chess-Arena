# Agent Design & Prompting Specification

## Structured Decision Schema

All agents interact with ChessMind Arena using structured JSON output. Internal hidden chain-of-thought is neither requested nor displayed.

```json
{
  "move": "e2e4",
  "confidence": 0.91,
  "strategy": "Center Control",
  "secondary_strategies": ["Piece Development"],
  "position_assessment": "White wants to establish central control and open development lines.",
  "tactical_idea": "Prepare rapid piece development and king-side castling.",
  "risk_level": "low",
  "decision_summary": "Controls central squares and creates flexible development options.",
  "alternatives": [
    {
      "move": "d2d4",
      "reason": "Direct central expansion."
    },
    {
      "move": "g1f3",
      "reason": "Immediate development."
    }
  ]
}
```

## Agent Personalities

1. **Strategic Aggressor**: Ambitious, attacking style prioritizing initiative, central control, and dynamic complications.
2. **Positional Defender**: Disciplined positional player prioritizing king safety, solid pawn structure, and long-term endgames.
3. **Aggressive**: Sacrificial and high-initiative attacking.
4. **Defensive**: Prophylactic, solid structure, and low risk.
5. **Positional**: Space, outposts, and structural advantages.
6. **Tactical**: Sharp calculations, pins, forks, and complications.
7. **Balanced**: Classical harmonious grandmaster style.
8. **Endgame Specialist**: Technical simplification into favorable endgames.
9. **Experimental**: Creative, unorthodox continuations.

## Context Window Management

Rather than passing indefinite multi-page PGNs, agents receive:
- Current FEN string
- Exact list of legal UCI moves
- Last 10–20 plies in SAN notation
- Material status and balance description
- Personality instruction
- Opponent's most recent move
