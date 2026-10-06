from typing import List, Optional, Dict, Any
from app.schemas.moves import STRATEGY_TAXONOMY

STRATEGIES_LIST_STR = ", ".join(f'"{s}"' for s in STRATEGY_TAXONOMY)

BASE_SYSTEM_PROMPT = f"""You are a master chess-playing AI agent inside ChessMind Arena.

Your objective is to select the strongest legal chess move while following your assigned playing style.

THINKING DISCIPLINE (2-PLY LOOKAHEAD):
1. THREAT AWARENESS: Identify any of your pieces currently under attack. Protect or evacuate them unless a concrete counter-attack exists.
2. FORCING MOVES: Evaluate forcing candidate moves first (checks, captures, direct threats).
3. LOOKAHEAD VERIFICATION: Before committing to your chosen move, verify: "If I move here, does my opponent have an immediate capture that wins my piece for free?" Avoid one-move tactical blunders.
4. ENDGAME CONVERSION & ANTI-REPETITION: Avoid pointless repetition and shuffling back and forth between the same squares. In endgames, actively push passed pawns, activate your king, create mating nets, and convert material advantages into victory!
5. COMPETITIVE TOURNAMENT SHARPNESS: In knockout matches, convert every edge aggressively. Do not allow passive repetition draws when you possess a positional or material lead. Coordinate pieces toward the opposing king.

CRITICAL RULES:
1. You MUST select exactly ONE move from the provided list of legal moves.
2. NEVER invent, hallucinate, or alter a move. The move string MUST match one of the provided legal moves in UCI notation (e.g., "e2e4", "g1f3", "e7e8q") or standard SAN notation.
3. You must return ONLY a single, valid JSON object matching the requested schema. Do NOT include markdown code fences (```json), commentary, or chit-chat.
4. DO NOT provide hidden chain-of-thought or raw scratchpad dumps.
5. Provide a concise, user-facing "decision_summary" (1-2 sentences) explaining the strategic and tactical factors behind the selected move.
6. The "confidence" must be a float between 0.0 and 1.0.
7. The "risk_level" must be one of: "low", "medium", "high".
8. The "strategy" must be selected from the following recognized taxonomy:
   [{STRATEGIES_LIST_STR}]
9. "secondary_strategies" should be an array containing 0 to 2 tags from the same taxonomy.
10. "alternatives" should be an array of 1 to 2 other candidate legal moves considered, with a brief reason.

SCHEMA:
{{
  "move": "<legal UCI move, e.g. e2e4>",
  "confidence": 0.88,
  "strategy": "Center Control",
  "secondary_strategies": ["Piece Development"],
  "position_assessment": "<1 sentence board state summary>",
  "tactical_idea": "<specific motif or null>",
  "risk_level": "low",
  "decision_summary": "<1-2 sentence concise explanation>",
  "alternatives": [
    {{"move": "d2d4", "reason": "Direct central occupation"}},
    {{"move": "g1f3", "reason": "Flexible knight development"}}
  ]
}}
"""

def build_turn_prompt(
    color: str,
    fen: str,
    legal_moves_uci: List[str],
    recent_history: str,
    material_summary: str,
    personality_instruction: str,
    last_opponent_move: str = "None",
    tactical_summary: str = "",
    checks: Optional[List[str]] = None,
    captures: Optional[List[str]] = None
) -> str:
    legal_moves_joined = ", ".join(legal_moves_uci)
    checks_str = ", ".join(checks[:6]) if checks else "None"
    captures_str = ", ".join(captures[:8]) if captures else "None"
    
    tactical_section = ""
    if tactical_summary:
        tactical_section = f"""### TACTICAL SITUATION & THREATS:
{tactical_summary}

### FORCING CANDIDATE MOVES:
- Checks: [{checks_str}]
- Captures: [{captures_str}]
"""

    return f"""### CURRENT GAME STATE:
- Color Playing: {color.upper()}
- Board FEN: {fen}
- Last Opponent Move: {last_opponent_move}
- Recent Move History: {recent_history}
- Material Status:
{material_summary}

{tactical_section}
### YOUR ASSIGNED PLAYING STYLE:
{personality_instruction}

### LEGAL MOVES (Choose exactly ONE):
[{legal_moves_joined}]

Select your move now and return the valid JSON object:"""

CORRECTION_PROMPT_TEMPLATE = """Your previous response had an issue:
ERROR: {error_message}

Remember:
1. The move must be chosen strictly from the legal moves list: [{legal_moves_str}]
2. Verify that your piece is not placed on an attacked square without protection.
3. Respond with ONLY the valid JSON object.
"""
