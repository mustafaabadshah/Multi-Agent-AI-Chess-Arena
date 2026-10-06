import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

BASE_DIR = Path(__file__).resolve().parent.parent

class Settings(BaseSettings):
    APP_ENV: str = "development"
    APP_NAME: str = "ChessMind Arena"
    
    # Groq API configuration
    GROQ_API_KEY: Optional[str] = None
    WHITE_MODEL: str = "qwen/qwen3.8-27b"
    BLACK_MODEL: str = "openai/gpt-oss-120b"
    
    # Database configuration
    DATABASE_URL: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/chessmind"
    SQLITE_FALLBACK_URL: str = f"sqlite:///{BASE_DIR / 'chessmind.db'}"
    
    # Stockfish configuration
    STOCKFISH_PATH: Optional[str] = str(BASE_DIR / "bin" / "stockfish.exe")
    STOCKFISH_DEPTH: int = 15
    
    # Game engine settings
    DEFAULT_MOVE_DELAY_MS: int = 1000
    MOCK_MODE: bool = False
    
    # CORS
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"
    
    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR.parent / ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

settings = Settings()
