import logging
from typing import List, Dict, Any, Optional
from groq import AsyncGroq
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.config import settings
from app.schemas.agent import GroqModelInfo
from app.schemas.analysis import ModelComparisonMetric
from app.database.models import GameModel, MoveModel

logger = logging.getLogger("chessmind.model_service")

# Current standard Groq models for fallback/offline discovery
DEFAULT_KNOWN_MODELS = [
    GroqModelInfo(
        id="llama-3.3-70b-versatile",
        name="Llama 3.3 70B Versatile",
        description="State-of-the-art open model with high reasoning capability",
        context_window=128000,
        is_available=True
    ),
    GroqModelInfo(
        id="llama-3.1-8b-instant",
        name="Llama 3.1 8B Instant",
        description="Fast, low-latency model for rapid tactical turns",
        context_window=128000,
        is_available=True
    ),
    GroqModelInfo(
        id="mixtral-8x7b-32768",
        name="Mixtral 8x7B MoE",
        description="Sparse Mixture-of-Experts with balanced strategic breadth",
        context_window=32768,
        is_available=True
    ),
    GroqModelInfo(
        id="gemma2-9b-it",
        name="Gemma 2 9B IT",
        description="Google Gemma 2 high-efficiency architecture",
        context_window=8192,
        is_available=True
    ),
    GroqModelInfo(
        id="deepseek-r1-distill-llama-70b",
        name="DeepSeek R1 Distill Llama 70B",
        description="High-reasoning distilled architecture",
        context_window=128000,
        is_available=True
    ),
    GroqModelInfo(
        id="mock-agent-v1",
        name="Deterministic Mock Agent",
        description="Built-in zero-API agent for local testing and CI",
        context_window=4096,
        is_available=True
    )
]

class ModelService:
    @staticmethod
    async def get_available_models(api_key: Optional[str] = None) -> List[GroqModelInfo]:
        key = api_key or settings.GROQ_API_KEY
        if not key:
            return DEFAULT_KNOWN_MODELS

        try:
            client = AsyncGroq(api_key=key)
            models_response = await client.models.list()
            
            # Non-chess / audio / voice / embedding keywords to strictly exclude
            EXCLUDED_KEYWORDS = ["whisper", "guard", "embed", "orpheus", "audio", "tts", "voice", "canopy", "allam"]
            
            FRIENDLY_NAMES = {
                "qwen/qwen3.8-27b": ("Qwen 3.8 27B (Premier)", "Top-tier tactical chess LLM with high accuracy and deep positional sense"),
                "openai/gpt-oss-120b": ("OpenAI GPT-OSS 120B (Deep Reasoning)", "Flagship deep reasoning model with multi-step search"),
                "openai/gpt-oss-20b": ("OpenAI GPT-OSS 20B (Fast Reasoning)", "High-speed reasoning model with low latency and balanced token usage"),
                "llama-3.3-70b-versatile": ("Llama 3.3 70B Versatile", "Grandmaster-level strategic breadth and endgame calculation"),
                "llama-3.1-8b-instant": ("Llama 3.1 8B Instant", "Ultra-fast reflexive moves for rapid match simulation"),
            }

            def model_sort_key(m_id: str) -> int:
                m = m_id.lower()
                if "qwen" in m:
                    return 0
                if "gpt-oss-120b" in m or "120b" in m:
                    return 1
                if "gpt-oss-20b" in m or "20b" in m:
                    return 2
                if "llama-3.3-70b" in m:
                    return 3
                if "llama-3.1-8b" in m:
                    return 4
                if "llama" in m:
                    return 5
                return 20

            discovered = []
            for m in models_response.data:
                # Exclude non-chess / audio models
                if any(skip in m.id.lower() for skip in EXCLUDED_KEYWORDS):
                    continue

                display_name, desc = FRIENDLY_NAMES.get(
                    m.id,
                    (m.id, f"Active Groq LLM ({m.owned_by})")
                )

                discovered.append(
                    GroqModelInfo(
                        id=m.id,
                        name=display_name,
                        description=desc,
                        context_window=getattr(m, "context_window", None),
                        is_available=m.active
                    )
                )

            discovered.sort(key=lambda item: model_sort_key(item.id))
            return discovered if discovered else DEFAULT_KNOWN_MODELS
        except Exception as e:
            logger.warning(f"Could not discover live models from Groq API: {e}. Using known catalog.")
            return DEFAULT_KNOWN_MODELS

    @staticmethod
    def get_comparison_stats(db: Session, filter_model: Optional[str] = None) -> List[ModelComparisonMetric]:
        """
        Aggregates performance metrics across historical games grouped by model.
        """
        # Find distinct models from moves
        model_query = db.query(MoveModel.model).distinct()
        if filter_model:
            model_query = model_query.filter(MoveModel.model == filter_model)
        models = [row[0] for row in model_query.all()]

        results: List[ModelComparisonMetric] = []

        for m_name in models:
            moves = db.query(MoveModel).filter(MoveModel.model == m_name).all()
            if not moves:
                continue

            total_moves = len(moves)
            cpls = [m.centipawn_loss for m in moves if m.centipawn_loss is not None]
            avg_cpl = round(sum(cpls) / len(cpls), 1) if cpls else 0.0

            confidences = [m.confidence for m in moves if m.confidence is not None]
            avg_conf = round(sum(confidences) / len(confidences), 2) if confidences else 0.0

            latencies = [m.latency_ms for m in moves if m.latency_ms is not None]
            avg_lat = round(sum(latencies) / len(latencies), 1) if latencies else 0.0

            tokens = [m.output_tokens for m in moves if m.output_tokens is not None]
            avg_tok = round(sum(tokens) / len(tokens), 1) if tokens else 0.0

            blunders = sum(1 for m in moves if m.move_quality == "Blunder")
            mistakes = sum(1 for m in moves if m.move_quality == "Mistake")
            blunder_rate = round((blunders / total_moves) * 100, 1) if total_moves else 0.0
            mistake_rate = round((mistakes / total_moves) * 100, 1) if total_moves else 0.0

            # Strategy counts
            strat_counts: Dict[str, int] = {}
            for m in moves:
                strat = m.strategy or "Other"
                strat_counts[strat] = strat_counts.get(strat, 0) + 1

            # Game win/loss counts
            white_games = db.query(GameModel).filter(GameModel.white_model == m_name, GameModel.status == "completed").all()
            black_games = db.query(GameModel).filter(GameModel.black_model == m_name, GameModel.status == "completed").all()

            wins = 0
            losses = 0
            draws = 0

            for g in white_games:
                if g.winner == "white":
                    wins += 1
                elif g.winner == "black":
                    losses += 1
                elif g.winner == "draw":
                    draws += 1

            for g in black_games:
                if g.winner == "black":
                    wins += 1
                elif g.winner == "white":
                    losses += 1
                elif g.winner == "draw":
                    draws += 1

            total_games = wins + losses + draws
            win_rate = round((wins / total_games) * 100, 1) if total_games else 0.0

            # Favorite openings
            openings_map: Dict[str, int] = {}
            for g in white_games + black_games:
                if g.opening:
                    openings_map[g.opening] = openings_map.get(g.opening, 0) + 1
            favorite_openings = [{"opening": k, "count": v} for k, v in sorted(openings_map.items(), key=lambda x: x[1], reverse=True)[:5]]

            results.append(
                ModelComparisonMetric(
                    model=m_name,
                    games_played=total_games,
                    wins=wins,
                    losses=losses,
                    draws=draws,
                    win_rate=win_rate,
                    average_cpl=avg_cpl,
                    average_confidence=avg_conf,
                    blunder_rate=blunder_rate,
                    mistake_rate=mistake_rate,
                    average_latency_ms=avg_lat,
                    average_tokens=avg_tok,
                    strategy_distribution=strat_counts,
                    favorite_openings=favorite_openings
                )
            )

        return results
