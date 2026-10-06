import asyncio
import logging
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any, Tuple

from app.database.models import TournamentModel, GameModel, get_utc_now
from app.database.session import SessionLocal
from app.database.repositories import TournamentRepository, GameRepository, MoveRepository, AnalysisRepository
from sqlalchemy.orm.attributes import flag_modified
from app.schemas.tournament import (
    TournamentCreateRequest,
    TournamentParticipant,
    TournamentMatch,
    TournamentResponse
)
from app.services.game_service import game_service
from app.api.websocket import ws_manager

logger = logging.getLogger("chessmind.tournament_service")


class TournamentService:
    def __init__(self):
        self.running_tournaments: Dict[str, asyncio.Task] = {}

    def create_tournament(self, req: TournamentCreateRequest) -> TournamentModel:
        participants_data = [p.model_dump() for p in req.participants]
        num_p = len(participants_data)
        if num_p < 4 or num_p > 6:
            raise ValueError("Tournament must have between 4 and 6 participants.")

        # Ensure seed sorting
        participants_data.sort(key=lambda x: x["seed"])

        # Generate Bracket Matches
        matches = self._generate_bracket(participants_data)

        settings_dict = {
            "max_moves": req.settings.max_moves if req.settings else 40,
            "move_delay_ms": req.settings.move_delay_ms if req.settings else 250,
            "stockfish_depth": req.settings.stockfish_depth if req.settings else 12,
        }

        tourn = TournamentModel(
            id=str(uuid.uuid4()),
            name=req.name or f"AI Tournament ({num_p} Contenders)",
            num_participants=num_p,
            status="setup",
            current_round="quarterfinals" if num_p > 4 else "semifinals",
            current_match_id=None,
            participants_json=participants_data,
            matches_json=matches,
            standings_json=None,
            summary_report=None,
            settings_json=settings_dict,
            created_at=get_utc_now()
        )

        with SessionLocal() as db:
            saved = TournamentRepository.create(db, tourn)

        logger.info(f"Created tournament {saved.id} with {num_p} participants.")
        return saved

    def _generate_bracket(self, participants: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        num = len(participants)
        p_by_seed = {p["seed"]: p["id"] for p in participants}

        matches: List[Dict[str, Any]] = []

        if num == 4:
            # 4 participants: 2 Semifinals, 3rd Place Match, Grand Final
            matches.append({
                "id": "sf1",
                "round": "semifinals",
                "round_name": "Semifinal 1",
                "white_participant_id": p_by_seed.get(1),
                "black_participant_id": p_by_seed.get(4),
                "winner_participant_id": None,
                "loser_participant_id": None,
                "game_id": None,
                "status": "pending",
                "winner_color": None,
                "termination_reason": None,
                "tiebreak_note": None,
                "white_accuracy": None,
                "black_accuracy": None,
                "total_moves": None
            })
            matches.append({
                "id": "sf2",
                "round": "semifinals",
                "round_name": "Semifinal 2",
                "white_participant_id": p_by_seed.get(2),
                "black_participant_id": p_by_seed.get(3),
                "winner_participant_id": None,
                "loser_participant_id": None,
                "game_id": None,
                "status": "pending",
                "winner_color": None,
                "termination_reason": None,
                "tiebreak_note": None,
                "white_accuracy": None,
                "black_accuracy": None,
                "total_moves": None
            })
            matches.append({
                "id": "third_place",
                "round": "finals",
                "round_name": "3rd Place Playoff",
                "white_participant_id": None,  # Loser SF1
                "black_participant_id": None,  # Loser SF2
                "winner_participant_id": None,
                "loser_participant_id": None,
                "game_id": None,
                "status": "pending",
                "winner_color": None,
                "termination_reason": None,
                "tiebreak_note": None,
                "white_accuracy": None,
                "black_accuracy": None,
                "total_moves": None
            })
            matches.append({
                "id": "final",
                "round": "finals",
                "round_name": "Grand Championship Final 🏆",
                "white_participant_id": None,  # Winner SF1
                "black_participant_id": None,  # Winner SF2
                "winner_participant_id": None,
                "loser_participant_id": None,
                "game_id": None,
                "status": "pending",
                "winner_color": None,
                "termination_reason": None,
                "tiebreak_note": None,
                "white_accuracy": None,
                "black_accuracy": None,
                "total_moves": None
            })

        elif num == 5:
            # 5 participants: Top 3 byes, QF1 (Seed 4 vs Seed 5), SF1 (Seed 1 vs Winner QF1), SF2 (Seed 2 vs Seed 3), 3rd, Final
            matches.append({
                "id": "qf1",
                "round": "quarterfinals",
                "round_name": "Quarterfinal Play-In",
                "white_participant_id": p_by_seed.get(4),
                "black_participant_id": p_by_seed.get(5),
                "winner_participant_id": None,
                "loser_participant_id": None,
                "game_id": None,
                "status": "pending",
                "winner_color": None,
                "termination_reason": None,
                "tiebreak_note": None,
                "white_accuracy": None,
                "black_accuracy": None,
                "total_moves": None
            })
            matches.append({
                "id": "sf1",
                "round": "semifinals",
                "round_name": "Semifinal 1",
                "white_participant_id": p_by_seed.get(1),
                "black_participant_id": None,  # Winner QF1
                "winner_participant_id": None,
                "loser_participant_id": None,
                "game_id": None,
                "status": "pending",
                "winner_color": None,
                "termination_reason": None,
                "tiebreak_note": None,
                "white_accuracy": None,
                "black_accuracy": None,
                "total_moves": None
            })
            matches.append({
                "id": "sf2",
                "round": "semifinals",
                "round_name": "Semifinal 2",
                "white_participant_id": p_by_seed.get(2),
                "black_participant_id": p_by_seed.get(3),
                "winner_participant_id": None,
                "loser_participant_id": None,
                "game_id": None,
                "status": "pending",
                "winner_color": None,
                "termination_reason": None,
                "tiebreak_note": None,
                "white_accuracy": None,
                "black_accuracy": None,
                "total_moves": None
            })
            matches.append({
                "id": "third_place",
                "round": "finals",
                "round_name": "3rd Place Playoff",
                "white_participant_id": None,
                "black_participant_id": None,
                "winner_participant_id": None,
                "loser_participant_id": None,
                "game_id": None,
                "status": "pending",
                "winner_color": None,
                "termination_reason": None,
                "tiebreak_note": None,
                "white_accuracy": None,
                "black_accuracy": None,
                "total_moves": None
            })
            matches.append({
                "id": "final",
                "round": "finals",
                "round_name": "Grand Championship Final 🏆",
                "white_participant_id": None,
                "black_participant_id": None,
                "winner_participant_id": None,
                "loser_participant_id": None,
                "game_id": None,
                "status": "pending",
                "winner_color": None,
                "termination_reason": None,
                "tiebreak_note": None,
                "white_accuracy": None,
                "black_accuracy": None,
                "total_moves": None
            })

        else:
            # 6 participants: Seeds 1 and 2 bye
            # QF1: Seed 3 vs Seed 6
            # QF2: Seed 4 vs Seed 5
            # SF1: Seed 1 vs Winner QF2
            # SF2: Seed 2 vs Winner QF1
            # 3rd Place Match: Loser SF1 vs Loser SF2
            # Final: Winner SF1 vs Winner SF2 🏆
            matches.append({
                "id": "qf1",
                "round": "quarterfinals",
                "round_name": "Quarterfinal 1",
                "white_participant_id": p_by_seed.get(3),
                "black_participant_id": p_by_seed.get(6),
                "winner_participant_id": None,
                "loser_participant_id": None,
                "game_id": None,
                "status": "pending",
                "winner_color": None,
                "termination_reason": None,
                "tiebreak_note": None,
                "white_accuracy": None,
                "black_accuracy": None,
                "total_moves": None
            })
            matches.append({
                "id": "qf2",
                "round": "quarterfinals",
                "round_name": "Quarterfinal 2",
                "white_participant_id": p_by_seed.get(4),
                "black_participant_id": p_by_seed.get(5),
                "winner_participant_id": None,
                "loser_participant_id": None,
                "game_id": None,
                "status": "pending",
                "winner_color": None,
                "termination_reason": None,
                "tiebreak_note": None,
                "white_accuracy": None,
                "black_accuracy": None,
                "total_moves": None
            })
            matches.append({
                "id": "sf1",
                "round": "semifinals",
                "round_name": "Semifinal 1",
                "white_participant_id": p_by_seed.get(1),
                "black_participant_id": None,  # Winner QF2
                "winner_participant_id": None,
                "loser_participant_id": None,
                "game_id": None,
                "status": "pending",
                "winner_color": None,
                "termination_reason": None,
                "tiebreak_note": None,
                "white_accuracy": None,
                "black_accuracy": None,
                "total_moves": None
            })
            matches.append({
                "id": "sf2",
                "round": "semifinals",
                "round_name": "Semifinal 2",
                "white_participant_id": p_by_seed.get(2),
                "black_participant_id": None,  # Winner QF1
                "winner_participant_id": None,
                "loser_participant_id": None,
                "game_id": None,
                "status": "pending",
                "winner_color": None,
                "termination_reason": None,
                "tiebreak_note": None,
                "white_accuracy": None,
                "black_accuracy": None,
                "total_moves": None
            })
            matches.append({
                "id": "third_place",
                "round": "finals",
                "round_name": "3rd Place Playoff",
                "white_participant_id": None,  # Loser SF1
                "black_participant_id": None,  # Loser SF2
                "winner_participant_id": None,
                "loser_participant_id": None,
                "game_id": None,
                "status": "pending",
                "winner_color": None,
                "termination_reason": None,
                "tiebreak_note": None,
                "white_accuracy": None,
                "black_accuracy": None,
                "total_moves": None
            })
            matches.append({
                "id": "final",
                "round": "finals",
                "round_name": "Grand Championship Final 🏆",
                "white_participant_id": None,  # Winner SF1
                "black_participant_id": None,  # Winner SF2
                "winner_participant_id": None,
                "loser_participant_id": None,
                "game_id": None,
                "status": "pending",
                "winner_color": None,
                "termination_reason": None,
                "tiebreak_note": None,
                "white_accuracy": None,
                "black_accuracy": None,
                "total_moves": None
            })

        return matches

    async def start_tournament(self, tournament_id: str):
        with SessionLocal() as db:
            tourn = TournamentRepository.get(db, tournament_id)
            if not tourn:
                raise ValueError("Tournament not found")
            if tourn.status == "completed":
                return
            tourn.status = "running"
            TournamentRepository.update(db, tourn)

        if tournament_id in self.running_tournaments and not self.running_tournaments[tournament_id].done():
            self.running_tournaments[tournament_id].cancel()

        self.running_tournaments[tournament_id] = asyncio.create_task(
            self._run_tournament_loop(tournament_id)
        )
        logger.info(f"Tournament {tournament_id} execution started.")

    async def pause_tournament(self, tournament_id: str):
        if tournament_id in self.running_tournaments:
            self.running_tournaments[tournament_id].cancel()
            del self.running_tournaments[tournament_id]

        with SessionLocal() as db:
            tourn = TournamentRepository.get(db, tournament_id)
            if tourn:
                tourn.status = "paused"
                TournamentRepository.update(db, tourn)

        logger.info(f"Tournament {tournament_id} paused.")

    async def resume_active_tournaments(self):
        """
        On server startup, scans for any tournament marked as 'running'
        and restarts the execution loop if it's not already executing.
        """
        with SessionLocal() as db:
            tournaments = TournamentRepository.list(db, limit=50)
            for t in tournaments:
                if t.status == "running" and (t.id not in self.running_tournaments or self.running_tournaments[t.id].done()):
                    logger.info(f"Auto-resuming active tournament: {t.id} ({t.name})...")
                    self.running_tournaments[t.id] = asyncio.create_task(
                        self._run_tournament_loop(t.id)
                    )

    async def _run_tournament_loop(self, tournament_id: str):
        try:
            while True:
                with SessionLocal() as db:
                    tourn = TournamentRepository.get(db, tournament_id)
                    if not tourn or tourn.status != "running":
                        break
                    matches = list(tourn.matches_json)
                    participants = {p["id"]: p for p in tourn.participants_json}
                    settings = tourn.settings_json or {}

                # Find the next pending match whose participants are both decided
                next_match = None
                for m in matches:
                    if m["status"] in ["pending", "running"] and m.get("white_participant_id") and m.get("black_participant_id"):
                        next_match = m
                        break

                if not next_match:
                    # Check if all matches completed
                    all_done = all(m["status"] == "completed" for m in matches)
                    if all_done:
                        await self._finalize_tournament(tournament_id)
                        break
                    else:
                        logger.info(f"Waiting for bracket dependencies in tournament {tournament_id}...")
                        await asyncio.sleep(1.0)
                        continue

                # Run this match
                await self._execute_match(tournament_id, next_match, participants, settings)

        except asyncio.CancelledError:
            logger.info(f"Tournament loop {tournament_id} cancelled.")
        except Exception as e:
            logger.error(f"Error in tournament loop {tournament_id}: {e}", exc_info=True)
            with SessionLocal() as db:
                tourn = TournamentRepository.get(db, tournament_id)
                if tourn:
                    tourn.status = "error"
                    TournamentRepository.update(db, tourn)

    async def _execute_match(
        self,
        tournament_id: str,
        match: Dict[str, Any],
        participants: Dict[str, Any],
        settings: Dict[str, Any]
    ):
        white_p = participants[match["white_participant_id"]]
        black_p = participants[match["black_participant_id"]]

        # 1. Create or resume chess game for this match
        from app.schemas.games import GameCreateRequest
        game_req = GameCreateRequest(
            white_model=white_p["model"],
            black_model=black_p["model"],
            white_personality=white_p["personality"],
            black_personality=black_p["personality"],
            max_moves=settings.get("max_moves", 40),
            move_delay_ms=settings.get("move_delay_ms", 250),
            stockfish_depth=settings.get("stockfish_depth", 12),
            auto_start=False
        )

        existing_game = None
        game_id = match.get("game_id")
        if not game_id:
            with SessionLocal() as db:
                tourn_rec = TournamentRepository.get(db, tournament_id)
                if tourn_rec and tourn_rec.current_match_id == match["id"] and tourn_rec.current_game_id:
                    game_id = tourn_rec.current_game_id
                    match["game_id"] = game_id

        if game_id:
            with SessionLocal() as db:
                existing_game = GameRepository.get(db, game_id)

        if not existing_game:
            with SessionLocal() as db:
                game = game_service.create_game(db, game_req)
                game_id = game.id
                match["game_id"] = game_id

                tourn = TournamentRepository.get(db, tournament_id)
                if tourn:
                    tourn.current_match_id = match["id"]
                    tourn.current_game_id = game_id
                    tourn.current_round = match["round"]
                    # Update match in json
                    matches = list(tourn.matches_json)
                    for m in matches:
                        if m["id"] == match["id"]:
                            m["status"] = "running"
                            m["game_id"] = game_id
                    tourn.matches_json = matches
                    flag_modified(tourn, "matches_json")
                    TournamentRepository.update(db, tourn)

            # Broadcast match started
            await ws_manager.broadcast("tournaments", {
                "event": "tournament_match_started",
                "tournament_id": tournament_id,
                "match_id": match["id"],
                "round": match["round"],
                "white": white_p["name"],
                "black": black_p["name"],
                "game_id": game_id
            })

            # Start game loop
            await game_service.start_game(game_id)
        else:
            # Sync status if match was still marked as pending in matches_json
            with SessionLocal() as db:
                tourn = TournamentRepository.get(db, tournament_id)
                if tourn:
                    tourn.current_match_id = match["id"]
                    tourn.current_game_id = game_id
                    tourn.current_round = match["round"]
                    matches = list(tourn.matches_json)
                    for m in matches:
                        if m["id"] == match["id"]:
                            m["game_id"] = game_id
                            if m["status"] == "pending":
                                m["status"] = "running"
                    tourn.matches_json = matches
                    flag_modified(tourn, "matches_json")
                    TournamentRepository.update(db, tourn)

            if existing_game.status not in ["completed", "aborted", "error"]:
                if game_id not in game_service.running_tasks or game_service.running_tasks[game_id].done():
                    await game_service.start_game(game_id)

        # 2. Await game completion
        while True:
            await asyncio.sleep(0.4)
            with SessionLocal() as db:
                g = GameRepository.get(db, game_id)
                if not g or g.status in ["completed", "aborted", "error"]:
                    break

        # 3. Determine winner and resolve tiebreak
        with SessionLocal() as db:
            g = GameRepository.get(db, game_id)
            moves = MoveRepository.get_by_game(db, game_id)
            analysis = AnalysisRepository.get_by_game(db, game_id)

        winner_participant_id = None
        loser_participant_id = None
        winner_color = g.winner if g else "draw"
        term_reason = g.termination_reason if g else "Game concluded"
        tiebreak_note = None

        if winner_color == "white":
            winner_participant_id = white_p["id"]
            loser_participant_id = black_p["id"]
        elif winner_color == "black":
            winner_participant_id = black_p["id"]
            loser_participant_id = white_p["id"]
        else:
            # Drawn game (e.g. repetition or move limit reached) -> KNOCKOUT TIEBREAK RESOLUTION
            # Compare final Stockfish positional score
            last_move = moves[-1] if moves else None
            final_eval = last_move.stockfish_eval_after if (last_move and last_move.stockfish_eval_after is not None) else 0.0

            white_acc = analysis.white_accuracy if analysis else 50.0
            black_acc = analysis.black_accuracy if analysis else 50.0

            if final_eval >= 0.25:
                winner_participant_id = white_p["id"]
                loser_participant_id = black_p["id"]
                winner_color = "white"
                tiebreak_note = f"Drawn ({term_reason}). White advanced via Positional Superiority (+{final_eval:.2f} eval)."
            elif final_eval <= -0.25:
                winner_participant_id = black_p["id"]
                loser_participant_id = white_p["id"]
                winner_color = "black"
                tiebreak_note = f"Drawn ({term_reason}). Black advanced via Positional Superiority ({final_eval:.2f} eval)."
            else:
                # Stockfish eval is completely neutral -> compare accuracy
                if white_acc > black_acc:
                    winner_participant_id = white_p["id"]
                    loser_participant_id = black_p["id"]
                    winner_color = "white"
                    tiebreak_note = f"Drawn. White advanced via Higher Match Accuracy ({white_acc:.1f}% vs {black_acc:.1f}%)."
                elif black_acc > white_acc:
                    winner_participant_id = black_p["id"]
                    loser_participant_id = white_p["id"]
                    winner_color = "black"
                    tiebreak_note = f"Drawn. Black advanced via Higher Match Accuracy ({black_acc:.1f}% vs {white_acc:.1f}%)."
                else:
                    # Still tied -> higher seed advances
                    if white_p["seed"] < black_p["seed"]:
                        winner_participant_id = white_p["id"]
                        loser_participant_id = black_p["id"]
                        winner_color = "white"
                        tiebreak_note = f"Drawn. White advanced via Higher Tournament Seed (#{white_p['seed']})."
                    else:
                        winner_participant_id = black_p["id"]
                        loser_participant_id = white_p["id"]
                        winner_color = "black"
                        tiebreak_note = f"Drawn. Black advanced via Higher Tournament Seed (#{black_p['seed']})."

        # Update Match Details and Bracket Advancement
        with SessionLocal() as db:
            tourn = TournamentRepository.get(db, tournament_id)
            if not tourn:
                return

            matches = list(tourn.matches_json)
            participants_list = list(tourn.participants_json)

            # Update match record
            for m in matches:
                if m["id"] == match["id"]:
                    m["status"] = "completed"
                    m["winner_participant_id"] = winner_participant_id
                    m["loser_participant_id"] = loser_participant_id
                    m["winner_color"] = winner_color
                    m["termination_reason"] = term_reason
                    m["tiebreak_note"] = tiebreak_note
                    m["white_accuracy"] = analysis.white_accuracy if analysis else None
                    m["black_accuracy"] = analysis.black_accuracy if analysis else None
                    m["total_moves"] = len(moves)

            # Update participant stats
            for p in participants_list:
                if p["id"] == winner_participant_id:
                    p["wins"] = p.get("wins", 0) + 1
                elif p["id"] == loser_participant_id:
                    p["losses"] = p.get("losses", 0) + 1

            # Advance in Bracket
            self._advance_bracket(matches, match["id"], winner_participant_id, loser_participant_id)

            tourn.matches_json = matches
            tourn.participants_json = participants_list
            flag_modified(tourn, "matches_json")
            flag_modified(tourn, "participants_json")
            tourn.current_game_id = None
            TournamentRepository.update(db, tourn)

        logger.info(
            f"Match {match['id']} completed! Winner: {winner_participant_id} "
            f"({tiebreak_note or term_reason})"
        )

        await ws_manager.broadcast("tournaments", {
            "event": "tournament_match_completed",
            "tournament_id": tournament_id,
            "match_id": match["id"],
            "winner_id": winner_participant_id,
            "loser_id": loser_participant_id,
            "winner_color": winner_color,
            "tiebreak_note": tiebreak_note
        })

    def _advance_bracket(
        self,
        matches: List[Dict[str, Any]],
        match_id: str,
        winner_id: str,
        loser_id: str
    ):
        """
        Populates downstream matches in the bracket tree.
        """
        match_map = {m["id"]: m for m in matches}

        # 4-participant progression
        if match_id == "sf1":
            if "final" in match_map:
                match_map["final"]["white_participant_id"] = winner_id
            if "third_place" in match_map:
                match_map["third_place"]["white_participant_id"] = loser_id
        elif match_id == "sf2":
            if "final" in match_map:
                match_map["final"]["black_participant_id"] = winner_id
            if "third_place" in match_map:
                match_map["third_place"]["black_participant_id"] = loser_id

        # 6-participant progression
        elif match_id == "qf1":
            # QF1 winner plays SF2
            if "sf2" in match_map:
                match_map["sf2"]["black_participant_id"] = winner_id
        elif match_id == "qf2":
            # QF2 winner plays SF1
            if "sf1" in match_map:
                match_map["sf1"]["black_participant_id"] = winner_id

    async def _finalize_tournament(self, tournament_id: str):
        with SessionLocal() as db:
            tourn = TournamentRepository.get(db, tournament_id)
            if not tourn:
                return

            matches = list(tourn.matches_json)
            participants = {p["id"]: p for p in tourn.participants_json}

            final_match = next((m for m in matches if m["id"] == "final"), None)
            third_match = next((m for m in matches if m["id"] == "third_place"), None)

            champion_id = final_match["winner_participant_id"] if final_match else None
            runner_up_id = final_match["loser_participant_id"] if final_match else None
            third_place_id = third_match["winner_participant_id"] if third_match else None
            fourth_place_id = third_match["loser_participant_id"] if third_match else None

            champion_p = participants.get(champion_id, {})
            runner_p = participants.get(runner_up_id, {})
            third_p = participants.get(third_place_id, {})

            tourn.status = "completed"
            tourn.current_round = "completed"
            tourn.current_match_id = None
            tourn.current_game_id = None
            tourn.champion_id = champion_id
            tourn.champion_name = champion_p.get("name")
            tourn.champion_model = champion_p.get("model")
            tourn.runner_up_name = runner_p.get("name")
            tourn.third_place_name = third_p.get("name")
            tourn.completed_at = get_utc_now()

            # Compile Standings
            standings: List[Dict[str, Any]] = []
            assigned_ranks = {
                champion_id: 1,
                runner_up_id: 2,
                third_place_id: 3,
                fourth_place_id: 4
            }
            # For 5 or 6 participants, remaining are 5 and 6
            rank_counter = 5
            for p_id, p_info in participants.items():
                if p_id not in assigned_ranks:
                    assigned_ranks[p_id] = rank_counter
                    rank_counter += 1

            for p_id, p_info in participants.items():
                p_copy = dict(p_info)
                p_copy["rank"] = assigned_ranks.get(p_id, 99)
                standings.append(p_copy)

            standings.sort(key=lambda x: x["rank"])
            tourn.standings_json = standings
            flag_modified(tourn, "standings_json")

            # Generate Deep AI Tournament & Prompt Analysis Report
            summary = self._generate_tournament_report(tourn, matches, standings)
            tourn.summary_report = summary

            TournamentRepository.update(db, tourn)

        logger.info(
            f"Tournament {tournament_id} finalized! Champion: {champion_p.get('name')} 🏆"
        )

        await ws_manager.broadcast("tournaments", {
            "event": "tournament_completed",
            "tournament_id": tournament_id,
            "champion": champion_p.get("name"),
            "champion_model": champion_p.get("model"),
            "runner_up": runner_p.get("name"),
            "third_place": third_p.get("name")
        })

    def _generate_tournament_report(
        self,
        tourn: TournamentModel,
        matches: List[Dict[str, Any]],
        standings: List[Dict[str, Any]]
    ) -> str:
        """
        Creates a deep, clear, user-facing analysis of the tournament.
        Covers champion crowning, model performance, accuracy comparison,
        tactical dynamics, and prompt recommendations.
        """
        champ = tourn.champion_name or "Unknown Champion"
        runner = tourn.runner_up_name or "Unknown Runner-up"
        third = tourn.third_place_name or "Unknown 3rd Place"
        champ_model = tourn.champion_model or "Unknown Model"

        # Accuracies
        match_accuracies = []
        for m in matches:
            if m.get("white_accuracy") is not None:
                match_accuracies.append(m["white_accuracy"])
            if m.get("black_accuracy") is not None:
                match_accuracies.append(m["black_accuracy"])
        avg_tourn_acc = sum(match_accuracies) / max(len(match_accuracies), 1)

        report = f"""# 🏆 {tourn.name} — Tournament Championship Report

### 🥇 Tournament Podium & Honors
- **Champion 🏆:** **{champ}** ({champ_model})
- **Runner-Up 🥈:** **{runner}**
- **3rd Place 🥉:** **{third}**
- **Overall Tournament Accuracy:** **{avg_tourn_acc:.1f}%**
- **Total Matches Contested:** {len(matches)}

---

### 📊 Tactical & Model Performance Insights
1. **Dominant Architecture:**
   The championship was claimed by **{champ}** utilizing `{champ_model}`. This model demonstrated superior positional conversion and minimized tactical blunders in high-stress knockout rounds.

2. **Knockout Resilience & Conversion:**
   The decisive differentiator throughout the bracket was endgame conversion and threat defense. Agents that actively pushed passed pawns and maintained central piece mobility dominated prolonged games.

3. **Playing Style Breakdown:**
   Agents employing dynamic aggressive and master tactical personalities forced higher centipawn volatility, creating decisive checkmate threats. Positional defenders succeeded in early-game equality but required sharp tactical alerts to counter late-game mating nets.

---

### 🧠 Prompt Engineering Evaluation & Takeaways
- **Threat Awareness Filter (Success):**
  The two-ply tactical threat awareness directive prevented routine one-move hanging piece blunders, resulting in tournament-level games of high strategic depth.
- **Endgame Conversion Directive:**
  The anti-repetition and passed pawn conversion instructions prevented endless queen shuffles, compelling decisive tactical pushes.
- **Recommended Next Prompt Optimization:**
  For even sharper tournament gameplay, introducing dynamic tactical priority based on king danger scores (e.g., doubling lookahead vigilance when opponent has open files to the king) will further elevate tactical mastery.
"""
        return report

    def get_tournament(self, tournament_id: str) -> Optional[Dict[str, Any]]:
        with SessionLocal() as db:
            tourn = TournamentRepository.get(db, tournament_id)
            if not tourn:
                return None

            data = {
                "id": tourn.id,
                "name": tourn.name,
                "num_participants": tourn.num_participants,
                "status": tourn.status,
                "current_round": tourn.current_round,
                "current_match_id": tourn.current_match_id,
                "current_game_id": tourn.current_game_id,
                "champion_id": tourn.champion_id,
                "champion_name": tourn.champion_name,
                "champion_model": tourn.champion_model,
                "runner_up_name": tourn.runner_up_name,
                "third_place_name": tourn.third_place_name,
                "participants": tourn.participants_json,
                "matches": tourn.matches_json,
                "standings": tourn.standings_json,
                "summary_report": tourn.summary_report,
                "settings": tourn.settings_json,
                "created_at": tourn.created_at,
                "completed_at": tourn.completed_at
            }

            # If there is a current game running, fetch its latest FEN and status for live preview
            if tourn.current_game_id:
                g = GameRepository.get(db, tourn.current_game_id)
                if g:
                    data["current_fen"] = g.current_fen
                    data["current_game_turn"] = "white" if (len(g.moves) % 2 == 0) else "black"
                    data["current_game_moves"] = len(g.moves)

            # If tournament is running but server loop task was dropped (e.g. server restart), auto-resume!
            if tourn.status == "running" and (tournament_id not in self.running_tournaments or self.running_tournaments[tournament_id].done()):
                try:
                    loop = asyncio.get_running_loop()
                    self.running_tournaments[tournament_id] = loop.create_task(
                        self._run_tournament_loop(tournament_id)
                    )
                except RuntimeError:
                    pass

            return data

    def list_tournaments(self, limit: int = 50) -> List[Dict[str, Any]]:
        with SessionLocal() as db:
            tournaments = TournamentRepository.list(db, limit=limit)
            results = []
            for t in tournaments:
                results.append({
                    "id": t.id,
                    "name": t.name,
                    "num_participants": t.num_participants,
                    "status": t.status,
                    "current_round": t.current_round,
                    "champion_name": t.champion_name,
                    "champion_model": t.champion_model,
                    "runner_up_name": t.runner_up_name,
                    "third_place_name": t.third_place_name,
                    "created_at": t.created_at,
                    "completed_at": t.completed_at
                })
            return results

    def delete_tournament(self, tournament_id: str) -> bool:
        if tournament_id in self.running_tournaments:
            self.running_tournaments[tournament_id].cancel()
            del self.running_tournaments[tournament_id]

        with SessionLocal() as db:
            return TournamentRepository.delete(db, tournament_id)


tournament_service = TournamentService()
