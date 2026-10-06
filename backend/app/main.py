import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database.session import init_db
from app.api.health import router as health_router
from app.api.models import router as models_router
from app.api.games import router as games_router
from app.api.moves import router as moves_router
from app.api.analysis import router as analysis_router
from app.api.research import router as research_router
from app.api.tournament import router as tournament_router
from app.api.websocket import ws_manager

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("chessmind.main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing ChessMind Arena database and services...")
    init_db()
    try:
        from app.services.tournament_service import tournament_service
        await tournament_service.resume_active_tournaments()
    except Exception as e:
        logger.error(f"Error resuming active tournaments on startup: {e}", exc_info=True)
    yield
    logger.info("Shutting down ChessMind Arena...")

app = FastAPI(
    title=settings.APP_NAME,
    description="Multi-Agent Platform for Evaluating AI Reasoning and Strategy Through Chess",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all for development and local testing
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Routers
app.include_router(health_router, prefix="/api")
app.include_router(models_router, prefix="/api")
app.include_router(games_router, prefix="/api")
app.include_router(moves_router, prefix="/api")
app.include_router(analysis_router, prefix="/api")
app.include_router(research_router, prefix="/api")
app.include_router(tournament_router, prefix="/api")

# Real-time WebSocket endpoint
@app.websocket("/ws/games/{game_id}")
async def websocket_game_endpoint(websocket: WebSocket, game_id: str):
    await ws_manager.connect(websocket, game_id)
    try:
        while True:
            # Keep socket alive and accept client pings/messages
            data = await websocket.receive_text()
            # Client can ping or send acknowledgment
            await websocket.send_json({"event": "pong", "data": data})
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, game_id)
    except Exception as e:
        logger.warning(f"WebSocket error for game {game_id}: {e}")
        ws_manager.disconnect(websocket, game_id)

@app.websocket("/ws/tournaments/{tournament_id}")
async def websocket_tournament_endpoint(websocket: WebSocket, tournament_id: str):
    await ws_manager.connect(websocket, "tournaments")
    try:
        while True:
            data = await websocket.receive_text()
            await websocket.send_json({"event": "pong", "data": data})
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, "tournaments")
    except Exception as e:
        logger.warning(f"WebSocket error for tournament {tournament_id}: {e}")
        ws_manager.disconnect(websocket, "tournaments")


@app.get("/")
def root():
    return {
        "app": settings.APP_NAME,
        "status": "online",
        "docs_url": "/docs",
        "health_url": "/api/health"
    }
