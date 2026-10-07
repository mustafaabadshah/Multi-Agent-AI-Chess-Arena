# REST & WebSocket API Reference

## Health & Discovery

- `GET /api/health`: Health status of database, stockfish engine, and Groq configuration.
- `GET /api/models`: List available Groq models.
- `GET /api/personalities`: List agent personality presets.
- `GET /api/models/comparison`: Model performance benchmarks from historical matches.

## Games

- `POST /api/games`: Create match.
  ```json
  {
    "white_model": "qwen/qwen3.8-27b",
    "black_model": "openai/gpt-oss-120b",
    "white_personality": "Strategic Aggressor",
    "black_personality": "Positional Defender",
    "stockfish_depth": 15,
    "move_delay_ms": 1000,
    "auto_start": true
  }
  ```
- `GET /api/games`: List matches with filtering.
- `GET /api/games/{id}`: Retrieve game details.
- `POST /api/games/{id}/start`: Start autonomous match loop.
- `POST /api/games/{id}/pause`: Pause match.
- `POST /api/games/{id}/resume`: Resume match.
- `POST /api/games/{id}/next-move`: Step single move.
- `POST /api/games/{id}/stop`: Terminate match.
- `DELETE /api/games/{id}`: Delete match record.
- `GET /api/games/{id}/pgn`: Download PGN.
- `GET /api/games/{id}/export/json`: Download match JSON.
- `GET /api/games/{id}/export/csv`: Download moves CSV.

## Telemetry & Analysis

- `GET /api/games/{id}/moves`: Complete move telemetry with alternatives and Stockfish scores.
- `GET /api/games/{id}/analysis`: Comprehensive post-game analytics.
- `GET /api/games/{id}/report`: Formatted markdown report.

## Real-Time WebSocket

- `WS /ws/games/{id}`: Real-time game event stream.
  - Events: `agent_thinking`, `decision_ready`, `move_played`, `critical_move`, `game_completed`, `game_paused`.
- `WS /ws/tournaments`: Real-time tournament progression event broadcast.
  - Events: `tournament_match_started`, `tournament_match_completed`, `tournament_completed`.

## Tournaments (Knockout Engine)

- `POST /api/tournaments`: Create and configure a 4 or 6-model knockout tournament bracket.
  ```json
  {
    "name": "Championship Grand Prix",
    "participants": [
      {
        "id": "p1",
        "seed": 1,
        "name": "Qwen 3.8 Titan",
        "model": "qwen/qwen3.8-27b",
        "personality": "Strategic Aggressor",
        "temperature": 0.2,
        "color_theme": "#10b981"
      }
    ],
    "settings": {
      "max_moves": 40,
      "move_delay_ms": 250,
      "stockfish_depth": 12
    },
    "auto_start": true
  }
  ```
- `GET /api/tournaments`: List tournaments with summary standings, current round, and crowned champion.
- `GET /api/tournaments/{id}`: Retrieve comprehensive tournament bracket, live match board FEN, tiebreak notes, and generated championship analysis report.
- `POST /api/tournaments/{id}/start`: Start or resume autonomous bracket match execution.
- `POST /api/tournaments/{id}/pause`: Pause autonomous match progression.
- `DELETE /api/tournaments/{id}`: Delete tournament record.
