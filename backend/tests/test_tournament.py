import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.tournament_service import tournament_service
from app.schemas.tournament import TournamentCreateRequest, TournamentParticipant, TournamentSettings

client = TestClient(app)

def test_create_4_participant_tournament():
    participants = [
        TournamentParticipant(id="p1", seed=1, name="Seed 1 Qwen", model="qwen/qwen3.8-27b", personality="Strategic Aggressor"),
        TournamentParticipant(id="p2", seed=2, name="Seed 2 GPT 120B", model="openai/gpt-oss-120b", personality="Positional Defender"),
        TournamentParticipant(id="p3", seed=3, name="Seed 3 GPT 20B", model="openai/gpt-oss-20b", personality="Tactical Master"),
        TournamentParticipant(id="p4", seed=4, name="Seed 4 Contender", model="mock-model", personality="Endgame Virtuoso"),
    ]
    req = TournamentCreateRequest(
        name="Test 4-Cup",
        participants=participants,
        settings=TournamentSettings(max_moves=20, move_delay_ms=100, stockfish_depth=8),
        auto_start=False
    )
    
    tourn = tournament_service.create_tournament(req)
    assert tourn.id is not None
    assert tourn.num_participants == 4
    assert len(tourn.matches_json) == 4
    
    # sf1, sf2, third_place, final
    match_ids = [m["id"] for m in tourn.matches_json]
    assert "sf1" in match_ids
    assert "sf2" in match_ids
    assert "third_place" in match_ids
    assert "final" in match_ids


def test_create_6_participant_tournament():
    participants = [
        TournamentParticipant(id=f"p{i}", seed=i, name=f"Model {i}", model="mock-model", personality="Balanced")
        for i in range(1, 7)
    ]
    req = TournamentCreateRequest(
        name="Test 6-Cup",
        participants=participants,
        auto_start=False
    )
    
    tourn = tournament_service.create_tournament(req)
    assert tourn.id is not None
    assert tourn.num_participants == 6
    assert len(tourn.matches_json) == 6
    
    match_ids = [m["id"] for m in tourn.matches_json]
    assert "qf1" in match_ids
    assert "qf2" in match_ids
    assert "sf1" in match_ids
    assert "sf2" in match_ids
    assert "third_place" in match_ids
    assert "final" in match_ids


def test_tournament_api_endpoints():
    payload = {
        "name": "API Tournament Cup",
        "participants": [
            {"id": "a1", "seed": 1, "name": "A1", "model": "mock-model", "personality": "Balanced", "temperature": 0.2, "color_theme": "#06b6d4"},
            {"id": "a2", "seed": 2, "name": "A2", "model": "mock-model", "personality": "Balanced", "temperature": 0.2, "color_theme": "#10b981"},
            {"id": "a3", "seed": 3, "name": "A3", "model": "mock-model", "personality": "Balanced", "temperature": 0.2, "color_theme": "#f59e0b"},
            {"id": "a4", "seed": 4, "name": "A4", "model": "mock-model", "personality": "Balanced", "temperature": 0.2, "color_theme": "#ef4444"},
        ],
        "settings": {"max_moves": 25, "move_delay_ms": 100, "stockfish_depth": 8},
        "auto_start": False
    }
    
    # 1. Create
    resp = client.post("/api/tournaments", json=payload)
    assert resp.status_code == 201, resp.text
    data = resp.json()
    t_id = data["id"]
    assert data["name"] == "API Tournament Cup"
    assert len(data["matches"]) == 4

    # 2. Get
    resp2 = client.get(f"/api/tournaments/{t_id}")
    assert resp2.status_code == 200
    assert resp2.json()["id"] == t_id

    # 3. List
    resp3 = client.get("/api/tournaments")
    assert resp3.status_code == 200
    assert resp3.json()["total"] >= 1
