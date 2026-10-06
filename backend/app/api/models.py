from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.agent import GroqModelInfo, AgentPersonality
from app.schemas.analysis import ModelComparisonMetric
from app.agents.personalities import PERSONALITY_PRESETS
from app.services.model_service import ModelService

router = APIRouter(tags=["Models & Personalities"])

@router.get("/models", response_model=List[GroqModelInfo])
async def list_models():
    """
    Returns available Groq models dynamically discovered or catalogue.
    """
    return await ModelService.get_available_models()

@router.get("/personalities", response_model=List[AgentPersonality])
def list_personalities():
    """
    Returns preset agent personalities with system instructions.
    """
    return list(PERSONALITY_PRESETS.values())

@router.get("/models/comparison", response_model=List[ModelComparisonMetric])
def compare_models(
    model: Optional[str] = Query(None, description="Optional model ID to filter"),
    db: Session = Depends(get_db)
):
    """
    Returns comparative performance metrics across all models from historical games.
    """
    return ModelService.get_comparison_stats(db, filter_model=model)
