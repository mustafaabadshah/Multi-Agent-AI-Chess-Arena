import time
import json
import re
import asyncio
import logging
from typing import Tuple, Dict, Any, Optional, List
from groq import AsyncGroq, APIError, RateLimitError
import chess

from app.config import settings
from app.agents.base import BaseChessAgent
from app.agents.personalities import get_personality
from app.agents.prompts import BASE_SYSTEM_PROMPT, build_turn_prompt, CORRECTION_PROMPT_TEMPLATE
from app.chess.board_manager import BoardManager
from app.chess.validator import validate_move
from app.schemas.moves import ChessDecision, AlternativeMove

logger = logging.getLogger("chessmind.groq_agent")

def extract_json_from_text(text: str) -> Dict[str, Any]:
    """
    Extracts JSON object from response string, handling markdown code fences if present.
    """
    clean = text.strip()
    # Check for markdown fences
    if "```json" in clean:
        clean = clean.split("```json", 1)[1].split("```", 1)[0].strip()
    elif "```" in clean:
        clean = clean.split("```", 1)[1].split("```", 1)[0].strip()
    
    # Direct parse
    try:
        return json.loads(clean)
    except json.JSONDecodeError:
        pass
    
    # Try finding outermost braces { ... }
    match = re.search(r'\{.*\}', clean, re.DOTALL)
    if match:
        return json.loads(match.group(0))
    
    raise ValueError(f"Could not parse valid JSON from model response: {text[:150]}")

class GroqChessAgent(BaseChessAgent):
    """
    AI Chess Agent powered by Groq LLMs.
    Requests structured decision summaries using JSON mode and strictly enforces legal chess moves.
    """

    def __init__(self, color: str, model_name: str, personality_name: str, api_key: Optional[str] = None, temperature: Optional[float] = None):
        super().__init__(color, model_name, personality_name)
        self.api_key = api_key or settings.GROQ_API_KEY
        if not self.api_key:
            raise ValueError(f"GROQ_API_KEY is required to initialize GroqChessAgent for {self.color}.")
        self.client = AsyncGroq(api_key=self.api_key)
        self.personality = get_personality(personality_name)
        self.temperature = float(temperature) if temperature is not None else 0.2

    async def select_move(self, board_mgr: BoardManager, last_opponent_move: str = "None") -> Tuple[ChessDecision, Dict[str, Any]]:
        legal_moves_uci = board_mgr.get_legal_moves_uci()
        if not legal_moves_uci:
            raise RuntimeError("No legal moves available on board.")

        material = board_mgr.get_material_summary()["text"]
        recent_history = board_mgr.get_recent_history_text(max_plies=20)
        
        # 1. Extract rich tactical signals (checks, captures, hanging pieces)
        tactical = board_mgr.get_tactical_context()
        
        user_prompt = build_turn_prompt(
            color=self.color,
            fen=board_mgr.current_fen,
            legal_moves_uci=legal_moves_uci,
            recent_history=recent_history,
            material_summary=material,
            personality_instruction=self.personality.system_instruction,
            last_opponent_move=last_opponent_move,
            tactical_summary=tactical["summary_text"],
            checks=tactical["checks"],
            captures=tactical["captures"]
        )

        messages = [
            {"role": "system", "content": BASE_SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt}
        ]

        # Dynamic token budget: reasoning models require extra token budget for internal thoughts
        is_reasoning_model = any(keyword in self.model_name.lower() for keyword in ["gpt-oss", "r1", "reasoning", "think"])
        current_max_tokens = 1000 if is_reasoning_model else 350

        max_attempts = 3
        backoff = 1.0
        total_input_tokens: Optional[int] = None
        total_output_tokens: Optional[int] = None
        start_time = time.perf_counter()
        use_json_mode = True

        for attempt in range(1, max_attempts + 1):
            try:
                kwargs: Dict[str, Any] = {
                    "model": self.model_name,
                    "messages": messages,
                    "temperature": self.temperature,
                    "max_tokens": current_max_tokens
                }
                if is_reasoning_model:
                    kwargs["reasoning_effort"] = "low"
                if use_json_mode:
                    kwargs["response_format"] = {"type": "json_object"}

                completion = await self.client.chat.completions.create(**kwargs)

                # Collect usage tokens safely without inventing values
                if completion.usage:
                    total_input_tokens = completion.usage.prompt_tokens
                    total_output_tokens = completion.usage.completion_tokens

                choice = completion.choices[0]
                raw_content = choice.message.content or ""
                finish_reason = getattr(choice, "finish_reason", None)

                # If content is empty but reasoning exists, try extracting JSON from reasoning
                content_to_parse = raw_content
                if not content_to_parse.strip() and hasattr(choice.message, "reasoning"):
                    reasoning_text = getattr(choice.message, "reasoning", "") or ""
                    if "{" in reasoning_text and "}" in reasoning_text:
                        content_to_parse = reasoning_text

                # If response cut off due to length, increase tokens
                if finish_reason == "length":
                    current_max_tokens = min(current_max_tokens + 350, 1500)

                # Parse JSON and validate schema
                try:
                    data = extract_json_from_text(content_to_parse)
                    decision = ChessDecision.model_validate(data)
                except Exception as parse_err:
                    if attempt < max_attempts:
                        logger.warning(
                            f"Agent ({self.model_name}) parse error on attempt {attempt}: {parse_err}. Retrying..."
                        )
                        if raw_content:
                            messages.append({"role": "assistant", "content": raw_content})
                        messages.append({
                            "role": "user",
                            "content": CORRECTION_PROMPT_TEMPLATE.format(
                                error_message=f"Invalid format or missing required fields: {str(parse_err)}",
                                legal_moves_str=", ".join(legal_moves_uci[:15])
                            )
                        })
                        current_max_tokens = min(current_max_tokens + 250, 1500)
                        continue
                    raise

                # Validate chess legality strictly
                is_legal, move_obj, err_msg = validate_move(board_mgr.board, decision.move)
                if not is_legal or move_obj is None:
                    if attempt < max_attempts:
                        logger.warning(f"Agent ({self.model_name}) proposed illegal move '{decision.move}': {err_msg}. Requesting correction.")
                        messages.append({"role": "assistant", "content": raw_content})
                        messages.append({
                            "role": "user",
                            "content": CORRECTION_PROMPT_TEMPLATE.format(
                                error_message=f"Move '{decision.move}' is illegal. You must choose an exact move from the legal moves list.",
                                legal_moves_str=", ".join(legal_moves_uci)
                            )
                        })
                        continue
                    else:
                        raise ValueError(f"Agent failed to provide a legal move after {max_attempts} attempts: {err_msg}")

                # 2-Ply Blunder Safety Verification
                is_safe, safety_warning = board_mgr.check_move_safety(move_obj.uci())
                if not is_safe and attempt < max_attempts:
                    logger.warning(f"Agent ({self.model_name}) proposed blunder: {safety_warning}. Re-evaluating candidate.")
                    messages.append({"role": "assistant", "content": raw_content})
                    messages.append({
                        "role": "user",
                        "content": f"TACTICAL SAFETY ALERT: {safety_warning}\nPlease reconsider and select a safer legal move from [{', '.join(legal_moves_uci)}]. Return valid JSON:"
                    })
                    continue

                # Normalize move to UCI
                decision.move = move_obj.uci()

                total_latency = int((time.perf_counter() - start_time) * 1000)
                telemetry = {
                    "latency_ms": total_latency,
                    "input_tokens": total_input_tokens,
                    "output_tokens": total_output_tokens,
                    "move_source": "llm",
                    "attempts": attempt
                }
                return decision, telemetry

            except APIError as api_err:
                err_msg = str(api_err).lower()
                # If daily rate limit (TPD) hit, break immediately to emergency tactical move
                if "429" in err_msg and ("tokens per day" in err_msg or "tpd" in err_msg):
                    logger.warning(f"Groq API daily token limit reached for {self.model_name}. Activating immediate tactical fallback.")
                    break
                elif "429" in err_msg:
                    wait_time = max(backoff, 2.0)
                    logger.warning(f"Groq API 429 rate limit hit for {self.model_name}. Waiting {wait_time}s...")
                    await asyncio.sleep(wait_time)
                # If JSON mode specifically failed with 400 (e.g. model limitation), try plain text JSON prompt
                elif "json_validate_failed" in err_msg or "400" in err_msg:
                    logger.warning(f"JSON mode validation failed on {self.model_name}. Retrying with structured text prompt.")
                    use_json_mode = False
                    current_max_tokens = min(current_max_tokens + 250, 1500)
                    await asyncio.sleep(backoff)
                else:
                    logger.warning(f"Groq API error on attempt {attempt}: {api_err}. Retrying in {backoff}s...")
                    await asyncio.sleep(backoff)
                
                if attempt == max_attempts:
                    logger.error(f"Groq API error exhausted {max_attempts} attempts on {self.model_name}: {api_err}")
                    break
                backoff *= 2.0
            except Exception as e:
                logger.error(f"Unexpected error in GroqAgent select_move on attempt {attempt}: {e}")
                if attempt == max_attempts:
                    logger.warning(f"Agent {self.model_name} exhausted attempts. Falling back to sensible legal move.")
                    fallback_move = self._select_emergency_move(board_mgr, legal_moves_uci)
                    total_latency = int((time.perf_counter() - start_time) * 1000)
                    return ChessDecision(
                        move=fallback_move,
                        confidence=0.6,
                        strategy="Prophylaxis",
                        secondary_strategies=[],
                        position_assessment="Emergency move selected due to agent timeout.",
                        tactical_idea=None,
                        risk_level="medium",
                        decision_summary=f"Selected legal move {fallback_move} following positional safety.",
                        alternatives=[]
                    ), {
                        "latency_ms": total_latency,
                        "input_tokens": total_input_tokens,
                        "output_tokens": total_output_tokens,
                        "move_source": "fallback",
                        "attempts": attempt
                    }
                await asyncio.sleep(backoff)
                backoff *= 1.5

        # Guaranteed legal move fallback if loop exits
        fallback_move = self._select_emergency_move(board_mgr, legal_moves_uci)
        total_latency = int((time.perf_counter() - start_time) * 1000)
        return ChessDecision(
            move=fallback_move,
            confidence=0.6,
            strategy="Prophylaxis",
            secondary_strategies=[],
            position_assessment="Guaranteed legal fallback selected.",
            tactical_idea=None,
            risk_level="medium",
            decision_summary=f"Selected legal move {fallback_move}.",
            alternatives=[]
        ), {
            "latency_ms": total_latency,
            "input_tokens": total_input_tokens,
            "output_tokens": total_output_tokens,
            "move_source": "fallback",
            "attempts": max_attempts
        }

    def _select_emergency_move(self, board_mgr: Any, legal_moves_uci: List[str]) -> str:
        """Selects a sensible legal move that avoids hanging material."""
        if hasattr(board_mgr, "board"):
            board = board_mgr.board
            mgr = board_mgr
        else:
            board = board_mgr
            mgr = None

        # 1. Prefer safe captures
        captures = [m for m in board.legal_moves if board.is_capture(m)]
        if mgr:
            for c in captures:
                safe, _ = mgr.check_move_safety(c.uci())
                if safe:
                    return c.uci()
        if captures:
            return captures[0].uci()

        # 2. Prefer safe central pawn or minor piece development
        center_squares = {chess.D4, chess.E4, chess.D5, chess.E5, chess.C4, chess.F4, chess.C5, chess.F5}
        center_moves = [m for m in board.legal_moves if m.to_square in center_squares]
        if mgr:
            for m in center_moves:
                safe, _ = mgr.check_move_safety(m.uci())
                if safe:
                    return m.uci()
        elif center_moves:
            return center_moves[0].uci()

        # 3. Prefer safe minor piece moves
        for m in board.legal_moves:
            if mgr:
                safe, _ = mgr.check_move_safety(m.uci())
                if safe:
                    return m.uci()
            else:
                piece = board.piece_at(m.from_square)
                if piece and piece.piece_type not in (chess.ROOK, chess.KING):
                    return m.uci()

        return legal_moves_uci[0]
