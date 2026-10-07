# ♟️ Multi-Agent AI Chess Arena

A full-stack platform for evaluating AI reasoning and strategy in chess. The project combines a FastAPI backend, a React + TypeScript frontend, and multiple LLM-powered chess agents that compete in live matches and tournament brackets.

## What this project does

- Runs real chess games between multiple AI agents
- Enforces legal moves through `python-chess`
- Uses Groq-hosted LLMs for move selection and strategic reasoning
- Applies safety checks and tactical validation before accepting moves
- Displays live board state, evaluation, move history, and tournament results
- Supports tournament-style brackets and post-game analysis

## Architecture

```text
React Frontend (Vite + TypeScript)
        │
        ├─ REST API calls
        └─ WebSocket updates
               ↓
FastAPI Backend
        │
        ├─ Game engine / rules enforcement
        ├─ Agents and personalities
        ├─ Tournament orchestration
        ├─ Stockfish evaluation
        └─ SQLite/PostgreSQL storage
```

## Tech stack

- **Backend:** Python 3.11+, FastAPI, SQLAlchemy, python-chess, Pydantic v2
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Recharts, react-chessboard
- **AI & Reasoning:** Groq API + configurable LLM models (Qwen 3.8 27B, GPT-OSS 120B/20B, Llama 3.3 70B)
- **Evaluation:** Stockfish 19 UCI engine
- **Testing:** Pytest and Vitest

---

## 📸 User Interface Showcase

### 🏆 1. Knockout Tournament Arena & Championship Podium
Autonomous bracket progression supporting 4 to 6 models with live spectator board, Stockfish tiebreak resolution, and crowned tournament champion:
![Tournament Arena Bracket](docs/images/tournament_bracket.png)

### ⚔️ 2. Real-Time 1v1 Arena & AI Decision Inspector
Interactive chessboard featuring live evaluation bar, move quality classifications (*Best Move, Mistake, Blunder*), and the **Decision Inspector** showing the AI's strategic rationale:
![Live Match Arena](docs/images/live_match_arena.png)

### 📊 3. Post-Game Analysis & Evaluation Curve
Comprehensive match debriefing comparing player accuracy %, Stockfish centipawn loss curves across all plies, and tactical strategy distributions:
![Post-Game Analysis](docs/images/match_analysis.png)

### 📈 4. Cross-Model Benchmark Leaderboard & Match Archives
Historical aggregate benchmarks comparing model win rates, blunder frequencies, opening preferences, and full game archives with PGN downloads:
![Model Cross-Comparison Benchmark](docs/images/model_leaderboard.png)
![Match Archives & History](docs/images/game_history.png)

---

## Key project structure

```text
Multi-Agent-AI-Chess-Arena/
├── backend/
│   ├── app/
│   │   ├── agents/
│   │   ├── api/
│   │   ├── chess/
│   │   ├── database/
│   │   ├── schemas/
│   │   ├── services/
│   │   └── main.py
│   ├── tests/
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── src/
│   ├── package.json
│   ├── vite.config.ts
│   └── README.md
├── .env.example
├── docker-compose.yml
├── README.md
├── LICENSE
└── docs/
```

## Prerequisites

- Python 3.11 or newer
- Node.js 18+
- A Groq API key: https://console.groq.com/
- Stockfish engine installed or available in `backend/bin`

## Quick start

### 1) Clone the repository

```bash
git clone https://github.com/mustafaabadshah/Multi-Agent-AI-Chess-Arena.git
cd Multi-Agent-AI-Chess-Arena
```

### 2) Create environment variables

Create the project-level `.env` file from the root example:

```bash
cp .env.example .env
```

Important:
- The backend reads environment variables from the repository root `.env` file.
- `backend/.env.example` is a template reference, but the app configuration in `backend/app/config.py` loads `.env` from the parent directory of the backend folder.

Example `.env`:

```env
APP_ENV=development
GROQ_API_KEY=your_groq_api_key_here

WHITE_MODEL=qwen/qwen3.8-27b
BLACK_MODEL=openai/gpt-oss-120b

DATABASE_URL=postgresql+psycopg2://postgres:postgres@localhost:5432/chessmind
SQLITE_FALLBACK=true

STOCKFISH_PATH=backend/bin/stockfish.exe
STOCKFISH_DEPTH=15

DEFAULT_MOVE_DELAY_MS=1000
MOCK_MODE=false

CORS_ORIGINS=http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173
```

### 3) Backend setup

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

The API documentation will be available at:
- http://127.0.0.1:8000/docs
- http://127.0.0.1:8000/redoc

### 4) Frontend setup

Open a new terminal window:

```bash
cd frontend
npm install
npm run dev
```

Then open:
- http://127.0.0.1:5173

## Docker setup

You can launch the app with Docker Compose:

```bash
docker-compose up --build
```

This starts:
- PostgreSQL database
- FastAPI backend on port 8000
- React frontend on port 3000

## Running tests

Backend:

```bash
cd backend
pytest -v
```

Frontend:

```bash
cd frontend
npm run test
npm run build
```

## Notes on project behavior

- PostgreSQL is the primary database, but the app automatically falls back to SQLite when needed.
- Move validation is strictly enforced before a move is accepted.
- Agents can be configured with different personalities and model settings.
- Tournament services resume automatically on backend startup.

## License

This project is licensed under the MIT License. See the `LICENSE` file for details.

## Acknowledgements

- Stockfish
- python-chess
- FastAPI
- React
- Groq
- Tailwind CSS
