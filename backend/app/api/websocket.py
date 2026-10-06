import json
import logging
from typing import Dict, List, Set, Any
from fastapi import WebSocket

logger = logging.getLogger("chessmind.websocket")

class ConnectionManager:
    """
    Manages WebSocket subscriptions per game_id for real-time telemetry streaming.
    """

    def __init__(self):
        # game_id -> set of active WebSockets
        self.active_connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, game_id: str):
        await websocket.accept()
        if game_id not in self.active_connections:
            self.active_connections[game_id] = set()
        self.active_connections[game_id].add(websocket)
        logger.info(f"WebSocket client connected to game: {game_id}. Total: {len(self.active_connections[game_id])}")

    def disconnect(self, websocket: WebSocket, game_id: str):
        if game_id in self.active_connections:
            self.active_connections[game_id].discard(websocket)
            if not self.active_connections[game_id]:
                del self.active_connections[game_id]
        logger.info(f"WebSocket client disconnected from game: {game_id}")

    async def broadcast(self, game_id: str, message: Dict[str, Any]):
        if game_id not in self.active_connections:
            return
        
        dead_sockets = set()
        for websocket in list(self.active_connections[game_id]):
            try:
                await websocket.send_json(message)
            except Exception as e:
                logger.warning(f"Error broadcasting to client: {e}")
                dead_sockets.add(websocket)
        
        for dead in dead_sockets:
            self.active_connections[game_id].discard(dead)

ws_manager = ConnectionManager()
