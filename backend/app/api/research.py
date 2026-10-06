from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.database.repositories import ExperimentRepository
from app.schemas.research import ResearchExperimentRequest, ResearchExperimentResponse
from app.services.research_service import research_service

router = APIRouter(prefix="/research", tags=["Research Experiments"])

@router.post("", response_model=ResearchExperimentResponse)
async def create_experiment(req: ResearchExperimentRequest, db: Session = Depends(get_db)):
    exp = research_service.create_experiment(db, req)
    res = exp.results_json or {}
    return ResearchExperimentResponse(
        id=exp.id,
        name=exp.name,
        num_games=exp.num_games,
        games_completed=exp.games_completed,
        status=exp.status,
        model_a=exp.model_a,
        model_b=exp.model_b,
        model_a_wins=res.get("model_a_wins", 0),
        model_b_wins=res.get("model_b_wins", 0),
        draws=res.get("draws", 0),
        game_ids=res.get("game_ids", []),
        created_at=exp.created_at,
        completed_at=exp.completed_at
    )

@router.get("", response_model=List[ResearchExperimentResponse])
def list_experiments(db: Session = Depends(get_db)):
    exps = ExperimentRepository.list(db)
    results = []
    for exp in exps:
        res = exp.results_json or {}
        results.append(
            ResearchExperimentResponse(
                id=exp.id,
                name=exp.name,
                num_games=exp.num_games,
                games_completed=exp.games_completed,
                status=exp.status,
                model_a=exp.model_a,
                model_b=exp.model_b,
                model_a_wins=res.get("model_a_wins", 0),
                model_b_wins=res.get("model_b_wins", 0),
                draws=res.get("draws", 0),
                game_ids=res.get("game_ids", []),
                created_at=exp.created_at,
                completed_at=exp.completed_at
            )
        )
    return results

@router.get("/{experiment_id}", response_model=ResearchExperimentResponse)
def get_experiment(experiment_id: str, db: Session = Depends(get_db)):
    exp = ExperimentRepository.get(db, experiment_id)
    if not exp:
        raise HTTPException(status_code=404, detail="Experiment not found")
    res = exp.results_json or {}
    return ResearchExperimentResponse(
        id=exp.id,
        name=exp.name,
        num_games=exp.num_games,
        games_completed=exp.games_completed,
        status=exp.status,
        model_a=exp.model_a,
        model_b=exp.model_b,
        model_a_wins=res.get("model_a_wins", 0),
        model_b_wins=res.get("model_b_wins", 0),
        draws=res.get("draws", 0),
        game_ids=res.get("game_ids", []),
        created_at=exp.created_at,
        completed_at=exp.completed_at
    )
