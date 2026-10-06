import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database.session import init_db

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_test():
    init_db()

def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ["healthy", "degraded"]
    assert "stockfish" in data
    assert "database" in data

def test_models_and_personalities():
    res_models = client.get("/api/models")
    assert res_models.status_code == 200
    models_list = res_models.json()
    assert len(models_list) > 0

    res_pers = client.get("/api/personalities")
    assert res_pers.status_code == 200
    pers_list = res_pers.json()
    assert any(p["name"] == "Strategic Aggressor" for p in pers_list)
    assert any(p["name"] == "Positional Defender" for p in pers_list)

def test_game_creation_and_lifecycle():
    # 1. Create Game
    create_payload = {
        "white_model": "mock-llama-3.3-70b",
        "black_model": "mock-llama-3.1-8b",
        "white_personality": "Strategic Aggressor",
        "black_personality": "Positional Defender",
        "stockfish_depth": 5,
        "move_delay_ms": 50,
        "max_moves": 20
    }
    res = client.post("/api/games", json=create_payload)
    assert res.status_code == 200
    game = res.json()
    game_id = game["id"]
    assert game["status"] == "waiting"

    # 2. Get Game
    res_get = client.get(f"/api/games/{game_id}")
    assert res_get.status_code == 200
    assert res_get.json()["id"] == game_id

    # 3. Step one move
    res_step = client.post(f"/api/games/{game_id}/next-move")
    assert res_step.status_code == 200

    # 4. Get Moves
    res_moves = client.get(f"/api/games/{game_id}/moves")
    assert res_moves.status_code == 200
    moves = res_moves.json()
    assert len(moves) == 1
    assert moves[0]["color"] == "white"

    # 5. Get Analysis
    res_analysis = client.get(f"/api/games/{game_id}/analysis")
    assert res_analysis.status_code == 200
    analysis = res_analysis.json()
    assert "white" in analysis
    assert "black" in analysis

    # 6. Export PGN
    res_pgn = client.get(f"/api/games/{game_id}/pgn")
    assert res_pgn.status_code == 200
    assert "Site \"ChessMind Arena\"" in res_pgn.text
