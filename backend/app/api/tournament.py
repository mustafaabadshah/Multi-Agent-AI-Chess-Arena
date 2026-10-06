import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.schemas.tournament import (
    TournamentCreateRequest,
    TournamentResponse,
    TournamentListResponse
)
from app.services.tournament_service import tournament_service

logger = logging.getLogger("chessmind.api.tournament")

router = APIRouter(prefix="/tournaments", tags=["Tournaments"])


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_tournament(req: TournamentCreateRequest):
    """
    Creates a new 4 to 6 AI model tournament with custom participants and bracket.
    """
    try:
        tournament = tournament_service.create_tournament(req)
        if req.auto_start:
            await tournament_service.start_tournament(tournament.id)
        
        detail = tournament_service.get_tournament(tournament.id)
        return detail
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to create tournament: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("")
def list_tournaments(limit: int = Query(50, ge=1, le=100)):
    """
    Lists all tournaments with summary metadata.
    """
    tournaments = tournament_service.list_tournaments(limit=limit)
    return {"tournaments": tournaments, "total": len(tournaments)}


@router.get("/{tournament_id}")
async def get_tournament(tournament_id: str):
    """
    Retrieves full details of a tournament: bracket matches, participants, standings, live board FEN, and report.
    """
    tourn = tournament_service.get_tournament(tournament_id)
    if not tourn:
        raise HTTPException(status_code=404, detail="Tournament not found")
    return tourn


@router.post("/{tournament_id}/start")
async def start_tournament(tournament_id: str):
    """
    Starts or resumes autonomous execution of tournament matches.
    """
    try:
        await tournament_service.start_tournament(tournament_id)
        return {"message": "Tournament progression started", "tournament_id": tournament_id}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{tournament_id}/pause")
async def pause_tournament(tournament_id: str):
    """
    Pauses autonomous tournament match execution.
    """
    try:
        await tournament_service.pause_tournament(tournament_id)
        return {"message": "Tournament paused", "tournament_id": tournament_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{tournament_id}")
def delete_tournament(tournament_id: str):
    """
    Deletes a tournament and its state.
    """
    deleted = tournament_service.delete_tournament(tournament_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Tournament not found")
    return {"message": "Tournament deleted successfully", "tournament_id": tournament_id}
