from typing import List, Optional, Dict, Any, Tuple
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database.models import GameModel, MoveModel, GameAnalysisModel, ExperimentModel, TournamentModel, get_utc_now

class GameRepository:
    @staticmethod
    def create(db: Session, game: GameModel) -> GameModel:
        db.add(game)
        db.commit()
        db.refresh(game)
        return game

    @staticmethod
    def get(db: Session, game_id: str) -> Optional[GameModel]:
        return db.query(GameModel).filter(GameModel.id == game_id).first()

    @staticmethod
    def list(
        db: Session,
        skip: int = 0,
        limit: int = 50,
        status: Optional[str] = None,
        model: Optional[str] = None
    ) -> Tuple[List[GameModel], int]:
        query = db.query(GameModel)
        if status:
            query = query.filter(GameModel.status == status)
        if model:
            query = query.filter(
                (GameModel.white_model == model) | (GameModel.black_model == model)
            )
        total = query.count()
        games = query.order_by(desc(GameModel.created_at)).offset(skip).limit(limit).all()
        return games, total

    @staticmethod
    def update(db: Session, game: GameModel) -> GameModel:
        db.commit()
        db.refresh(game)
        return game

    @staticmethod
    def delete(db: Session, game_id: str) -> bool:
        game = db.query(GameModel).filter(GameModel.id == game_id).first()
        if game:
            db.delete(game)
            db.commit()
            return True
        return False


class MoveRepository:
    @staticmethod
    def create(db: Session, move: MoveModel) -> MoveModel:
        db.add(move)
        db.commit()
        db.refresh(move)
        return move

    @staticmethod
    def get_by_game(db: Session, game_id: str) -> List[MoveModel]:
        return (
            db.query(MoveModel)
            .filter(MoveModel.game_id == game_id)
            .order_by(MoveModel.ply)
            .all()
        )

    @staticmethod
    def get_last_move(db: Session, game_id: str) -> Optional[MoveModel]:
        return (
            db.query(MoveModel)
            .filter(MoveModel.game_id == game_id)
            .order_by(desc(MoveModel.ply))
            .first()
        )


class AnalysisRepository:
    @staticmethod
    def save(db: Session, analysis: GameAnalysisModel) -> GameAnalysisModel:
        existing = db.query(GameAnalysisModel).filter(GameAnalysisModel.game_id == analysis.game_id).first()
        if existing:
            for key, value in analysis.__dict__.items():
                if not key.startswith("_") and key != "id":
                    setattr(existing, key, value)
            db.commit()
            db.refresh(existing)
            return existing
        else:
            db.add(analysis)
            db.commit()
            db.refresh(analysis)
            return analysis

    @staticmethod
    def get_by_game(db: Session, game_id: str) -> Optional[GameAnalysisModel]:
        return db.query(GameAnalysisModel).filter(GameAnalysisModel.game_id == game_id).first()


class ExperimentRepository:
    @staticmethod
    def create(db: Session, exp: ExperimentModel) -> ExperimentModel:
        db.add(exp)
        db.commit()
        db.refresh(exp)
        return exp

    @staticmethod
    def get(db: Session, exp_id: str) -> Optional[ExperimentModel]:
        return db.query(ExperimentModel).filter(ExperimentModel.id == exp_id).first()

    @staticmethod
    def list(db: Session, limit: int = 50) -> List[ExperimentModel]:
        return db.query(ExperimentModel).order_by(desc(ExperimentModel.created_at)).limit(limit).all()

    @staticmethod
    def update(db: Session, exp: ExperimentModel) -> ExperimentModel:
        db.commit()
        db.refresh(exp)
        return exp


class TournamentRepository:
    @staticmethod
    def create(db: Session, tournament: TournamentModel) -> TournamentModel:
        db.add(tournament)
        db.commit()
        db.refresh(tournament)
        return tournament

    @staticmethod
    def get(db: Session, tournament_id: str) -> Optional[TournamentModel]:
        return db.query(TournamentModel).filter(TournamentModel.id == tournament_id).first()

    @staticmethod
    def list(db: Session, limit: int = 50) -> List[TournamentModel]:
        return db.query(TournamentModel).order_by(desc(TournamentModel.created_at)).limit(limit).all()

    @staticmethod
    def update(db: Session, tournament: TournamentModel) -> TournamentModel:
        db.commit()
        db.refresh(tournament)
        return tournament

    @staticmethod
    def delete(db: Session, tournament_id: str) -> bool:
        tourn = db.query(TournamentModel).filter(TournamentModel.id == tournament_id).first()
        if tourn:
            db.delete(tourn)
            db.commit()
            return True
        return False

