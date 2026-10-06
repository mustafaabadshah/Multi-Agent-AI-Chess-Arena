import asyncio
import logging
import uuid
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from app.database.models import ExperimentModel, GameModel, MoveModel, get_utc_now
from app.database.session import SessionLocal
from app.database.repositories import ExperimentRepository, GameRepository, MoveRepository
from app.schemas.research import ResearchExperimentRequest
from app.schemas.games import GameCreateRequest
from app.services.game_service import game_service

logger = logging.getLogger("chessmind.research_service")

class ResearchService:
    def __init__(self):
        self.active_experiments: Dict[str, asyncio.Task] = {}

    def create_experiment(self, db: Session, req: ResearchExperimentRequest) -> ExperimentModel:
        exp_id = str(uuid.uuid4())
        record = ExperimentModel(
            id=exp_id,
            name=req.name,
            num_games=req.num_games,
            games_completed=0,
            status="pending",
            model_a=req.model_a,
            model_b=req.model_b,
            config_json=req.model_dump(),
            results_json={
                "model_a_wins": 0,
                "model_b_wins": 0,
                "draws": 0,
                "game_ids": [],
                "model_a_cpls": [],
                "model_b_cpls": [],
            },
            created_at=get_utc_now()
        )
        saved = ExperimentRepository.create(db, record)
        # Launch background experiment runner
        self.active_experiments[exp_id] = asyncio.create_task(self._run_experiment(exp_id, req))
        return saved

    async def _run_experiment(self, exp_id: str, req: ResearchExperimentRequest):
        logger.info(f"Starting research experiment {exp_id} ({req.num_games} games)")
        with SessionLocal() as db:
            exp = ExperimentRepository.get(db, exp_id)
            if exp:
                exp.status = "running"
                ExperimentRepository.update(db, exp)

        game_ids = []
        model_a_wins = 0
        model_b_wins = 0
        draws = 0

        for i in range(req.num_games):
            # Alternating colors: even = A White/B Black, odd = B White/A Black
            if req.randomize_colors and (i % 2 == 1):
                white_model, black_model = req.model_b, req.model_a
                white_pers, black_pers = req.personality_b, req.personality_a
                a_color = "black"
            else:
                white_model, black_model = req.model_a, req.model_b
                white_pers, black_pers = req.personality_a, req.personality_b
                a_color = "white"

            with SessionLocal() as db:
                create_req = GameCreateRequest(
                    white_model=white_model,
                    black_model=black_model,
                    white_personality=white_pers,
                    black_personality=black_pers,
                    initial_fen=req.starting_fen,
                    stockfish_depth=req.stockfish_depth,
                    move_delay_ms=req.move_delay_ms,
                    max_moves=100
                )
                game = game_service.create_game(db, create_req)
                game_id = game.id
                game_ids.append(game_id)

            # Play the game automatically
            await game_service.start_game(game_id)
            
            # Wait for game to complete
            while True:
                await asyncio.sleep(0.5)
                with SessionLocal() as db:
                    g = GameRepository.get(db, game_id)
                    if not g or g.status in ["completed", "aborted", "error"]:
                        break

            # Tally result
            with SessionLocal() as db:
                completed_game = GameRepository.get(db, game_id)
                winner = completed_game.winner if completed_game else "draw"
                if winner == "draw":
                    draws += 1
                elif (winner == "white" and a_color == "white") or (winner == "black" and a_color == "black"):
                    model_a_wins += 1
                else:
                    model_b_wins += 1

                # Update progress
                exp_record = ExperimentRepository.get(db, exp_id)
                if exp_record:
                    exp_record.games_completed = i + 1
                    exp_record.results_json = {
                        "model_a_wins": model_a_wins,
                        "model_b_wins": model_b_wins,
                        "draws": draws,
                        "game_ids": game_ids
                    }
                    ExperimentRepository.update(db, exp_record)

        # Finalize experiment stats
        with SessionLocal() as db:
            exp_record = ExperimentRepository.get(db, exp_id)
            if exp_record:
                exp_record.status = "completed"
                exp_record.completed_at = get_utc_now()
                ExperimentRepository.update(db, exp_record)
        logger.info(f"Research experiment {exp_id} completed. A: {model_a_wins}, B: {model_b_wins}, Draws: {draws}")

research_service = ResearchService()
