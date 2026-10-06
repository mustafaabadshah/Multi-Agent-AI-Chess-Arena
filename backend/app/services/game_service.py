import asyncio
import logging
import uuid
from typing import Dict, Optional, Tuple, Any
from datetime import datetime, timezone
import chess
from sqlalchemy.orm import Session

from app.config import settings
from app.database.models import GameModel, MoveModel, get_utc_now
from app.database.session import SessionLocal
from app.database.repositories import GameRepository, MoveRepository, AnalysisRepository
from app.chess.board_manager import BoardManager
from app.chess.validator import validate_fen, validate_move
from app.chess.stockfish import StockfishEvaluator
from app.chess.evaluator import MoveQualityClassifier
from app.agents.groq_agent import GroqChessAgent
from app.agents.mock_agent import MockChessAgent
from app.schemas.games import GameCreateRequest
from app.schemas.moves import ChessDecision
from app.api.websocket import ws_manager
from app.services.analysis_service import AnalysisService

logger = logging.getLogger("chessmind.game_service")

class GameService:
    def __init__(self):
        # In-memory board state for active games
        self.active_boards: Dict[str, BoardManager] = {}
        # Background loops
        self.running_tasks: Dict[str, asyncio.Task] = {}
        # Evaluator instance
        self.evaluator = StockfishEvaluator(
            stockfish_path=settings.STOCKFISH_PATH,
            depth=settings.STOCKFISH_DEPTH
        )

    def get_or_create_board(self, game: GameModel) -> BoardManager:
        if game.id not in self.active_boards:
            mgr = BoardManager(initial_fen=game.initial_fen)
            # Replay existing moves from DB if board was unloaded
            with SessionLocal() as db:
                moves = MoveRepository.get_by_game(db, game.id)
                for m in moves:
                    move_obj = chess.Move.from_uci(m.uci_move)
                    mgr.board.push(move_obj)
                    mgr.move_history_uci.append(m.uci_move)
                    mgr.move_history_san.append(m.san_move)
            self.active_boards[game.id] = mgr
        return self.active_boards[game.id]

    def create_game(self, db: Session, req: GameCreateRequest) -> GameModel:
        # Validate custom FEN if provided
        initial_fen = req.initial_fen.strip() if req.initial_fen and req.initial_fen.strip() else chess.STARTING_FEN
        is_valid, err = validate_fen(initial_fen)
        if not is_valid:
            raise ValueError(f"Invalid starting FEN: {err}")

        white_model = req.white_model or settings.WHITE_MODEL
        black_model = req.black_model or settings.BLACK_MODEL

        game_id = str(uuid.uuid4())
        game = GameModel(
            id=game_id,
            white_model=white_model,
            black_model=black_model,
            white_personality=req.white_personality or "Strategic Aggressor",
            black_personality=req.black_personality or "Positional Defender",
            status="waiting",
            initial_fen=initial_fen,
            current_fen=initial_fen,
            stockfish_depth=req.stockfish_depth or settings.STOCKFISH_DEPTH,
            move_delay_ms=req.move_delay_ms if req.move_delay_ms is not None else settings.DEFAULT_MOVE_DELAY_MS,
            max_moves=req.max_moves or 150,
            created_at=get_utc_now()
        )
        saved = GameRepository.create(db, game)
        # Initialize board
        self.active_boards[game_id] = BoardManager(initial_fen=initial_fen)
        logger.info(f"Created game {game_id} [White: {white_model} vs Black: {black_model}]")
        return saved

    async def start_game(self, game_id: str):
        with SessionLocal() as db:
            game = GameRepository.get(db, game_id)
            if not game:
                raise ValueError("Game not found")
            game.status = "running"
            game.started_at = get_utc_now()
            GameRepository.update(db, game)

        await ws_manager.broadcast(game_id, {
            "event": "game_started",
            "game_id": game_id,
            "status": "running"
        })

        # Start game loop task
        if game_id in self.running_tasks and not self.running_tasks[game_id].done():
            self.running_tasks[game_id].cancel()

        self.running_tasks[game_id] = asyncio.create_task(self._run_game_loop(game_id))

    async def pause_game(self, game_id: str):
        if game_id in self.running_tasks:
            self.running_tasks[game_id].cancel()
            del self.running_tasks[game_id]
        
        with SessionLocal() as db:
            game = GameRepository.get(db, game_id)
            if game:
                game.status = "paused"
                GameRepository.update(db, game)

        await ws_manager.broadcast(game_id, {
            "event": "game_paused",
            "game_id": game_id,
            "status": "paused"
        })

    async def resume_game(self, game_id: str):
        await self.start_game(game_id)

    async def stop_game(self, game_id: str):
        if game_id in self.running_tasks:
            self.running_tasks[game_id].cancel()
            del self.running_tasks[game_id]
        
        with SessionLocal() as db:
            game = GameRepository.get(db, game_id)
            if game:
                game.status = "aborted"
                game.termination_reason = "Terminated by user"
                game.completed_at = get_utc_now()
                GameRepository.update(db, game)

        await ws_manager.broadcast(game_id, {
            "event": "game_completed",
            "game_id": game_id,
            "status": "aborted",
            "reason": "Terminated by user"
        })

    async def _run_game_loop(self, game_id: str):
        """
        Background autonomous turn-by-turn game loop.
        """
        try:
            while True:
                with SessionLocal() as db:
                    game = GameRepository.get(db, game_id)
                    if not game or game.status != "running":
                        break
                    max_moves = game.max_moves
                    delay_ms = game.move_delay_ms

                board_mgr = self.get_or_create_board(game)

                # Check game over conditions
                if board_mgr.is_game_over or board_mgr.fullmove_number > max_moves:
                    await self._finalize_game(game_id)
                    break

                # Execute one move
                is_completed = await self.execute_next_move(game_id)
                if is_completed:
                    break

                # Inter-move delay
                await asyncio.sleep(max(0.1, delay_ms / 1000.0))

        except asyncio.CancelledError:
            logger.info(f"Game loop for {game_id} cancelled.")
        except Exception as e:
            logger.error(f"Error in game loop for {game_id}: {e}", exc_info=True)
            with SessionLocal() as db:
                game = GameRepository.get(db, game_id)
                if game:
                    game.status = "error"
                    game.error_message = str(e)
                    GameRepository.update(db, game)
            await ws_manager.broadcast(game_id, {
                "event": "game_error",
                "game_id": game_id,
                "error": str(e)
            })

    async def execute_next_move(self, game_id: str) -> bool:
        """
        Executes a single turn for the active player.
        Returns True if game ended after this move, False otherwise.
        """
        with SessionLocal() as db:
            game = GameRepository.get(db, game_id)
            if not game:
                return True

        board_mgr = self.get_or_create_board(game)
        if board_mgr.is_game_over:
            await self._finalize_game(game_id)
            return True

        color = board_mgr.turn_color
        is_white = (color == "white")
        model_name = game.white_model if is_white else game.black_model
        personality_name = game.white_personality if is_white else game.black_personality
        ply = board_mgr.ply + 1
        move_number = board_mgr.fullmove_number

        # 1. Broadcast thinking event
        await ws_manager.broadcast(game_id, {
            "event": "agent_thinking",
            "game_id": game_id,
            "agent": f"{color}_agent",
            "color": color,
            "model": model_name,
            "personality": personality_name,
            "move_number": move_number,
            "ply": ply
        })

        # 2. Evaluate position before move with Stockfish
        fen_before = board_mgr.current_fen
        eval_before = self.evaluator.evaluate_position(fen_before, depth=game.stockfish_depth)

        # 3. Instantiate appropriate agent (Mock vs Groq)
        last_move_san = board_mgr.move_history_san[-1] if board_mgr.move_history_san else "None"
        is_mock = (
            settings.MOCK_MODE
            or not settings.GROQ_API_KEY
            or "mock" in model_name.lower()
        )

        if is_mock:
            agent = MockChessAgent(color=color, model_name=model_name, personality_name=personality_name)
        else:
            agent = GroqChessAgent(color=color, model_name=model_name, personality_name=personality_name)

        # 4. Agent selects move
        try:
            decision, telemetry = await agent.select_move(board_mgr, last_opponent_move=last_move_san)
        except Exception as e:
            logger.error(f"Agent turn failed for game {game_id}: {e}")
            raise

        # 5. Broadcast decision ready
        await ws_manager.broadcast(game_id, {
            "event": "decision_ready",
            "game_id": game_id,
            "color": color,
            "model": model_name,
            "move": decision.move,
            "confidence": decision.confidence,
            "strategy": decision.strategy,
            "decision_summary": decision.decision_summary
        })

        # 6. Apply validated move to authoritative board
        is_legal, move_obj, err_msg = validate_move(board_mgr.board, decision.move)
        if not is_legal or move_obj is None:
            raise ValueError(f"Illegal move proposed: {err_msg}")

        san_move, uci_move, fen_after = board_mgr.apply_move(move_obj)

        # 7. Evaluate position after move with Stockfish
        eval_after = self.evaluator.evaluate_position(fen_after, depth=game.stockfish_depth)

        # 8. Calculate CPL and classify move quality
        cpl, quality = MoveQualityClassifier.calculate_cpl_and_quality(
            color=color,
            eval_before=eval_before["score_white"],
            eval_after=eval_after["score_white"],
            played_move_uci=uci_move,
            best_move_uci=eval_before.get("best_move_uci")
        )

        # 9. Store move telemetry in DB
        with SessionLocal() as db:
            move_record = MoveModel(
                id=str(uuid.uuid4()),
                game_id=game_id,
                ply=ply,
                move_number=move_number,
                color=color,
                agent=f"{color}_agent",
                model=model_name,
                personality=personality_name,
                fen_before=fen_before,
                uci_move=uci_move,
                san_move=san_move,
                fen_after=fen_after,
                decision_summary=decision.decision_summary,
                confidence=decision.confidence,
                strategy=decision.strategy,
                secondary_strategies=decision.secondary_strategies,
                risk_level=decision.risk_level,
                alternatives_json=[a.model_dump() for a in decision.alternatives],
                stockfish_eval_before=eval_before["score_white"],
                stockfish_eval_after=eval_after["score_white"],
                stockfish_best_move=eval_before.get("best_move_san"),
                centipawn_loss=cpl,
                move_quality=quality,
                latency_ms=telemetry.get("latency_ms"),
                input_tokens=telemetry.get("input_tokens"),
                output_tokens=telemetry.get("output_tokens"),
                move_source=telemetry.get("move_source", "llm"),
                created_at=get_utc_now()
            )
            MoveRepository.create(db, move_record)

            # Update game current status
            db_game = GameRepository.get(db, game_id)
            if db_game:
                db_game.current_fen = fen_after
                db_game.opening = board_mgr.get_opening_name()
                GameRepository.update(db, db_game)

        # 10. Broadcast move_played event
        move_data = {
            "ply": ply,
            "move_number": move_number,
            "color": color,
            "model": model_name,
            "san_move": san_move,
            "uci_move": uci_move,
            "fen_after": fen_after,
            "eval_score": eval_after["score_white"],
            "eval_before": eval_before["score_white"],
            "best_engine_move": eval_before.get("best_move_san"),
            "cpl": cpl,
            "quality": quality,
            "confidence": decision.confidence,
            "strategy": decision.strategy,
            "decision_summary": decision.decision_summary,
            "alternatives": [a.model_dump() for a in decision.alternatives],
            "latency_ms": telemetry.get("latency_ms"),
            "is_check": board_mgr.is_check,
            "opening": board_mgr.get_opening_name()
        }

        await ws_manager.broadcast(game_id, {
            "event": "move_played",
            "game_id": game_id,
            "move": move_data
        })

        # 11. Check if critical moment occurred
        cm = MoveQualityClassifier.detect_critical_moment(
            ply=ply,
            move_number=move_number,
            color=color,
            san_move=san_move,
            eval_before=eval_before["score_white"],
            eval_after=eval_after["score_white"],
            quality=quality,
            best_move_san=eval_before.get("best_move_san")
        )
        if cm:
            await ws_manager.broadcast(game_id, {
                "event": "critical_move",
                "game_id": game_id,
                "critical_moment": cm.model_dump()
            })

        # 12. Check game termination
        if board_mgr.is_game_over or board_mgr.fullmove_number > game.max_moves:
            await self._finalize_game(game_id)
            return True

        return False

    async def _finalize_game(self, game_id: str):
        board_mgr = self.active_boards.get(game_id)
        if not board_mgr:
            return

        with SessionLocal() as db:
            game_obj = GameRepository.get(db, game_id)
            max_moves = game_obj.max_moves if game_obj else 100

        winner, reason = board_mgr.get_game_result()
        if not winner:
            winner = "draw"
            if board_mgr.fullmove_number >= max_moves:
                reason = f"Move limit reached ({max_moves} full moves)"
            else:
                reason = "Draw concluded"

        pgn_str = board_mgr.generate_pgn(
            result="1-0" if winner == "white" else "0-1" if winner == "black" else "1/2-1/2"
        )

        with SessionLocal() as db:
            game = GameRepository.get(db, game_id)
            if game:
                game.status = "completed"
                game.winner = winner
                game.termination_reason = reason
                game.completed_at = get_utc_now()
                game.pgn = pgn_str
                GameRepository.update(db, game)

                # Generate comprehensive post-game analysis
                moves = MoveRepository.get_by_game(db, game_id)
                analysis_record = AnalysisService.compute_game_analysis(game, moves)
                AnalysisRepository.save(db, analysis_record)

        logger.info(f"Game {game_id} completed: {winner} ({reason})")

        await ws_manager.broadcast(game_id, {
            "event": "game_completed",
            "game_id": game_id,
            "status": "completed",
            "winner": winner,
            "reason": reason
        })

game_service = GameService()
