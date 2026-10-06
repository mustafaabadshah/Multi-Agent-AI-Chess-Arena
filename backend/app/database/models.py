import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    String,
    Integer,
    Float,
    DateTime,
    Text,
    ForeignKey,
    JSON,
    Boolean,
)
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

def get_utc_now():
    return datetime.now(timezone.utc)

class GameModel(Base):
    __tablename__ = "games"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    white_model = Column(String(100), nullable=False)
    black_model = Column(String(100), nullable=False)
    white_personality = Column(String(100), nullable=False)
    black_personality = Column(String(100), nullable=False)
    status = Column(String(30), nullable=False, default="waiting")  # waiting, running, paused, completed, aborted, error
    winner = Column(String(20), nullable=True)  # white, black, draw
    termination_reason = Column(String(255), nullable=True)
    initial_fen = Column(String(150), nullable=False)
    current_fen = Column(String(150), nullable=False)
    pgn = Column(Text, nullable=True)
    opening = Column(String(150), nullable=True)
    stockfish_depth = Column(Integer, default=15)
    move_delay_ms = Column(Integer, default=1000)
    max_moves = Column(Integer, default=150)
    error_message = Column(Text, nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=get_utc_now)

    # Relationships
    moves = relationship("MoveModel", back_populates="game", cascade="all, delete-orphan", order_by="MoveModel.ply")
    analysis = relationship("GameAnalysisModel", back_populates="game", uselist=False, cascade="all, delete-orphan")


class MoveModel(Base):
    __tablename__ = "moves"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    game_id = Column(String(36), ForeignKey("games.id", ondelete="CASCADE"), nullable=False, index=True)
    ply = Column(Integer, nullable=False)
    move_number = Column(Integer, nullable=False)
    color = Column(String(10), nullable=False)  # white, black
    agent = Column(String(50), nullable=False)
    model = Column(String(100), nullable=False)
    personality = Column(String(100), nullable=False)
    fen_before = Column(String(150), nullable=False)
    uci_move = Column(String(10), nullable=False)
    san_move = Column(String(15), nullable=False)
    fen_after = Column(String(150), nullable=False)
    decision_summary = Column(Text, nullable=True)
    confidence = Column(Float, nullable=True)
    strategy = Column(String(100), nullable=True)
    secondary_strategies = Column(JSON, nullable=True)
    risk_level = Column(String(20), nullable=True)
    alternatives_json = Column(JSON, nullable=True)
    stockfish_eval_before = Column(Float, nullable=True)
    stockfish_eval_after = Column(Float, nullable=True)
    stockfish_best_move = Column(String(15), nullable=True)
    centipawn_loss = Column(Integer, nullable=True)
    move_quality = Column(String(30), nullable=True)  # Best Move, Excellent, Good, Inaccuracy, Mistake, Blunder
    latency_ms = Column(Integer, nullable=True)
    input_tokens = Column(Integer, nullable=True)
    output_tokens = Column(Integer, nullable=True)
    move_source = Column(String(30), default="llm")
    created_at = Column(DateTime(timezone=True), default=get_utc_now)

    game = relationship("GameModel", back_populates="moves")


class GameAnalysisModel(Base):
    __tablename__ = "game_analysis"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    game_id = Column(String(36), ForeignKey("games.id", ondelete="CASCADE"), nullable=False, unique=True)
    white_accuracy = Column(Float, nullable=False, default=100.0)
    black_accuracy = Column(Float, nullable=False, default=100.0)
    white_average_cpl = Column(Float, nullable=False, default=0.0)
    black_average_cpl = Column(Float, nullable=False, default=0.0)
    white_blunders = Column(Integer, default=0)
    black_blunders = Column(Integer, default=0)
    white_mistakes = Column(Integer, default=0)
    black_mistakes = Column(Integer, default=0)
    white_inaccuracies = Column(Integer, default=0)
    black_inaccuracies = Column(Integer, default=0)
    opening = Column(String(150), nullable=True)
    game_phase_stats = Column(JSON, nullable=True)
    strategy_stats = Column(JSON, nullable=True)
    style_summary = Column(JSON, nullable=True)
    critical_moments = Column(JSON, nullable=True)
    summary_report = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=get_utc_now)

    game = relationship("GameModel", back_populates="analysis")


class ExperimentModel(Base):
    __tablename__ = "experiments"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(150), nullable=False)
    num_games = Column(Integer, nullable=False)
    games_completed = Column(Integer, default=0)
    status = Column(String(30), default="pending")  # pending, running, completed, stopped, failed
    model_a = Column(String(100), nullable=False)
    model_b = Column(String(100), nullable=False)
    config_json = Column(JSON, nullable=True)
    results_json = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), default=get_utc_now)
    completed_at = Column(DateTime(timezone=True), nullable=True)


class TournamentModel(Base):
    __tablename__ = "tournaments"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(150), nullable=False)
    num_participants = Column(Integer, nullable=False, default=4)
    status = Column(String(30), default="setup")  # setup, running, paused, completed, aborted
    current_round = Column(String(30), default="quarterfinals")  # quarterfinals, semifinals, finals, completed
    current_match_id = Column(String(50), nullable=True)
    current_game_id = Column(String(36), nullable=True)
    champion_id = Column(String(50), nullable=True)
    champion_name = Column(String(100), nullable=True)
    champion_model = Column(String(100), nullable=True)
    runner_up_name = Column(String(100), nullable=True)
    third_place_name = Column(String(100), nullable=True)
    participants_json = Column(JSON, nullable=False)
    matches_json = Column(JSON, nullable=False)
    standings_json = Column(JSON, nullable=True)
    summary_report = Column(Text, nullable=True)
    settings_json = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), default=get_utc_now)
    completed_at = Column(DateTime(timezone=True), nullable=True)

