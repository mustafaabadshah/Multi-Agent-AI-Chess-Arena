# ChessMind Arena — Architecture Overview

ChessMind Arena is a multi-agent AI chess laboratory architected for observing, recording, evaluating, and visualizing decision-making between opposing LLMs hosted on the Groq API.

```mermaid
graph TD
    Client["React UI (Vite + TS + Tailwind)"] -->|"REST API / HTTP"| API["FastAPI Application"]
    Client <-->|"WebSocket Telemetry"| WSM["WebSocket Hub"]
    
    API --> GS["Game Service"]
    GS --> BM["BoardManager (python-chess)"]
    GS --> AG1["White Agent (Groq / Mock)"]
    GS --> AG2["Black Agent (Groq / Mock)"]
    GS --> SF["Stockfish Evaluator (UCI)"]
    GS --> AS["Analysis Service"]
    GS --> DB[(PostgreSQL / SQLite)]
    
    AG1 -.->|"JSON Schema"| GROQ1["Groq API (Model A)"]
    AG2 -.->|"JSON Schema"| GROQ2["Groq API (Model B)"]
    
    SF -.->|"Centipawns & Best Move"| SF_BIN["Stockfish 19 Binary"]
```

## Core Tenets

1. **AI Decision vs Chess Truth vs Objective Evaluation**:
   - **AI Decision**: The candidate move and structured strategy summary proposed by the LLM.
   - **Chess Truth**: Validated strictly by `python-chess`. If the LLM proposes an illegal move, it is rejected and retried with backoff.
   - **Objective Evaluation**: Evaluated independently by Stockfish (depth 10–20). Stockfish acts as referee and impartial evaluator.

2. **No Private Chain-of-Thought Exposed**:
   - Agents return a concise `ChessDecision` JSON object explaining tactical/strategic factors directly intended for user inspection.

3. **Resilient Local Setup**:
   - Built-in automatic fallback engine evaluator and SQLite storage if PostgreSQL or Stockfish binary are not configured in a given environment.
