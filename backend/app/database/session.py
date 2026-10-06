import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from app.config import settings
from app.database.models import Base

logger = logging.getLogger("chessmind.database")

def get_engine_and_session():
    # Attempt connecting to primary DATABASE_URL (PostgreSQL)
    primary_url = settings.DATABASE_URL
    try:
        engine = create_engine(primary_url, pool_pre_ping=True)
        # Test connection
        with engine.connect() as conn:
            pass
        logger.info(f"Connected to primary database: {primary_url.split('@')[-1] if '@' in primary_url else primary_url}")
        return engine
    except Exception as e:
        logger.warning(
            f"Could not connect to primary database ({primary_url}): {e}. "
            f"Falling back to SQLite database ({settings.SQLITE_FALLBACK_URL})."
        )
        sqlite_engine = create_engine(
            settings.SQLITE_FALLBACK_URL,
            connect_args={"check_same_thread": False}
        )
        return sqlite_engine

engine = get_engine_and_session()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db():
    """Initializes tables in database."""
    Base.metadata.create_all(bind=engine)
    logger.info("Database schema verified and created.")

def get_db():
    """FastAPI Dependency for database session."""
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()
