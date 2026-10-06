# ♟️ Multi-Agent AI Chess Arena

[![Python](https://img.shields.io/badge/Python-3.11%20%7C%203.12-blue?logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Stockfish](https://img.shields.io/badge/Stockfish-19%20UCI-critical)](https://stockfishchess.org/)
[![Groq](https://img.shields.io/badge/Groq-LPU%20Inference-f55036)](https://groq.com/)

**Multi-Agent AI Chess Arena** is an advanced full-stack platform designed to evaluate, benchmark, and visualize the strategic reasoning, tactical calculation, and decision-making capabilities of frontier Large Language Models (LLMs) through competitive chess.

Featuring real-time 1v1 AI matches and **autonomous 4-to-6 model knockout tournaments**, the platform combines high-level LLM reasoning with strict rule enforcement via `python-chess` and objective evaluation via the Stockfish engine.

---

## 🏛️ System Architecture

```
                       MULTI-AGENT AI CHESS ARENA
 
             ┌───────────────────────────────────────────────┐
             │       React 19 Frontend (Vite + TypeScript)   │
             │   Interactive Board • Live Bracket • Spectate │
             └───────────────────────┬───────────────────────┘
                                     │ REST & Real-Time WebSockets
                                     ▼
             ┌───────────────────────────────────────────────┐
             │              FastAPI Backend Server           │
             │   Tournament Engine • Game Loop • Orchestrator│
             └───────┬───────────────────────────────┬───────┘
                     │                               │
         ┌───────────┴───────────┐       ┌───────────┴───────────┐
         ▼                       ▼       ▼                       ▼
 ┌───────────────┐       ┌───────────────┐       ┌───────────────┐
 │   Groq Agent  │       │   Groq Agent  │       │   Groq Agent  │
 │ Qwen 3.8 27B  │       │  GPT-OSS 120B │       │  GPT-OSS 20B  │
 └───────┬───────┘       └───────┬───────┘       └───────┬───────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 ▼
                 ┌───────────────────────────────┐
                 │    python-chess (Referee)     │
                 │     Authoritative Legality    │
                 └───────────────┬───────────────┘
                                 ▼
                 ┌───────────────────────────────┐
                 │     2-Ply Blunder Guard       │
                 │   Tactical Re-evaluation Alert│
                 └───────────────┬───────────────┘
                                 ▼
                 ┌───────────────────────────────┐
                 │      Stockfish Engine 19      │
                 │   Objective CPL / Accuracy %  │
                 └───────────────┬───────────────┘
                                 ▼
                 ┌───────────────────────────────┐
                 │   PostgreSQL / SQLite Storage │
                 │  Tournaments • Moves • Reports│
                 └───────────────────────────────┘
```

---

## ✨ Key Features

### 🏆 1. Knockout Tournament Arena (4 to 6 Models)
- **Bracket Progression:** Supports 4-player brackets (Semifinals, 3rd Place, Grand Final) and 6-player brackets (Quarterfinals with top seeds receiving automatic byes).
- **Decisive Knockout Tiebreaks:** If an AI game ends in a draw (repetition or move limit), the engine resolves ties objectively using Stockfish final centipawn evaluation, followed by move accuracy %, ensuring a decisive advancing winner.
- **Pre-Tournament Customizer Wizard:** Customize every contender agent before kickoff (Model, Personality style, Seed, Temperature, Avatar Color, and Engine Depth).
- **Victory Podium & Championship Reports:** Automatically crowns the Champion 🏆, Runner-Up 🥈, and 3rd Place 🥉, generating a comprehensive tactical and prompt engineering analysis report.

### ⚔️ 2. Live Match Arena & Spectator View
- **Interactive Chessboard:** Built with `react-chessboard` featuring smooth piece movements, legal move indicators, square highlights, and board flipping.
- **Real-Time Evaluation Bar:** Live Stockfish centipawn advantage bar updating dynamically with every move.
- **Live Move Stream:** Full SAN move list with accuracy indicators and Stockfish best-move recommendations.

### 🧠 3. Dual-Layer AI Reasoning & Blunder Guard
- **Strategic Cognition Layer:** Agents reason over formal strategic taxonomies (*Center Control, King Safety, Piece Activity, Prophylaxis, Passed Pawn Push*), returning confidence ratings, risk classifications, and candidate alternatives.
- **Blunder Safety Guard:** A Python-side 2-ply tactical interceptor scans every proposed move before it touches the board. If an AI hallucinates or leaves a major piece hanging, the engine issues a `TACTICAL SAFETY ALERT` forcing the model to calculate a safer alternative.

### 🎭 4. Configurable Agent Personalities
- **Strategic Aggressor:** Seeks piece initiative, kingside attacks, and open diagonals.
- **Positional Defender:** Solid pawn structures, prophylactic defense, and king safety.
- **Tactical Master:** Calculation-heavy, dynamic piece sacrifices, and tactical forks.
- **Endgame Virtuoso:** Proactive passed pawn pushes, king centralization, and endgame simplification.

### 📊 5. Deep Post-Game Analytics & Replay
- Head-to-head performance metrics (Accuracy %, Centipawn Loss, Blunder count).
- Full game replay stepper (`|< < Play > >|`) with synchronized evaluation graph.
- Export matches to standard **PGN**, **JSON**, or generated Markdown reports.

---

## 🛠️ Tech Stack

| Component | Technologies |
|---|---|
| **Backend** | Python 3.12, FastAPI, Pydantic v2, python-chess, SQLAlchemy, Alembic, WebSockets |
| **Chess Engines** | Stockfish 19 UCI, Groq Cloud API SDK |
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS, Lucide React, Recharts, react-chessboard |
| **Databases** | PostgreSQL 16 (Primary) with automatic SQLite local fallback |
| **Testing** | Pytest, Vitest, Testing Library |

---

## 🚀 Quick Start Guide

### Prerequisites
- [Python 3.11+](https://www.python.org/)
- [Node.js 18+](https://nodejs.org/)
- [Groq API Key](https://console.groq.com/)
- [Stockfish Engine](https://stockfishchess.org/download/) (A Windows Stockfish executable is bundled in `backend/bin/stockfish.exe`)

---

### 1. Clone the Repository
```bash
git clone https://github.com/mustafaabadshah/Multi-Agent-AI-Chess-Arena.git
cd Multi-Agent-AI-Chess-Arena
```

---

### 2. Configure Environment Variables
Copy `.env.example` to `.env` in both the root and `backend/` directories:
```bash
cp .env.example .env
cp backend/.env.example backend/.env
```

Edit `.env` and insert your Groq API key:
```env
APP_ENV=development
GROQ_API_KEY=gsk_your_groq_api_key_here

WHITE_MODEL=qwen/qwen3.8-27b
BLACK_MODEL=openai/gpt-oss-120b

DATABASE_URL=postgresql+psycopg2://postgres:postgres@localhost:5432/chessmind
SQLITE_FALLBACK=true

STOCKFISH_PATH=backend/bin/stockfish.exe
STOCKFISH_DEPTH=12
DEFAULT_MOVE_DELAY_MS=250
```
*(Note: If PostgreSQL is not running, the application automatically falls back to local SQLite `chessmind.db` with zero configuration needed).*

---

### 3. Backend Setup
```bash
cd backend

# Create and activate virtual environment
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the FastAPI server
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
The backend API is now running at `http://127.0.0.1:8000` (Swagger docs at `http://127.0.0.1:8000/docs`).

---

### 4. Frontend Setup
In a new terminal window:
```bash
cd frontend

# Install npm dependencies
npm install

# Start the Vite development server
npm run dev
```
Open your browser at `http://127.0.0.1:5173`.

---

## 🐳 Docker Deployment

To launch the entire platform (PostgreSQL database, FastAPI backend, and React frontend) with a single command:
```bash
docker-compose up --build
```
Access the application at `http://localhost:5173`.

---

## 🧪 Running Tests

### Backend Unit & Integration Tests (19 tests)
```bash
cd backend
pytest -v
```

### Frontend Unit Tests
```bash
cd frontend
npm run test
npm run build
```

---

## 📁 Project Structure

```
Multi-Agent-AI-Chess-Arena/
├── backend/
│   ├── app/
│   │   ├── agents/          # Groq agent implementations, prompt engineering, personalities
│   │   ├── api/             # FastAPI routers (tournaments, games, moves, models, analysis)
│   │   ├── chess/           # python-chess referee, board manager, Stockfish evaluator
│   │   ├── database/        # SQLAlchemy models, repositories, session manager
│   │   ├── schemas/         # Pydantic v2 schemas and request models
│   │   ├── services/        # Tournament service, game service, analysis service
│   │   └── main.py          # FastAPI application & lifespan orchestrator
│   ├── bin/                 # Stockfish engine binaries
│   ├── tests/               # Pytest test suite
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/      # ChessBoard, EvaluationBar, GameControls, Navbar, etc.
│   │   ├── pages/           # TournamentPage, ArenaPage, AnalysisPage, HistoryPage
│   │   ├── services/        # API client and WebSocket handlers
│   │   └── types/           # TypeScript interfaces & types
│   ├── package.json
│   └── vite.config.ts
├── docker-compose.yml
├── .env.example
├── .gitignore
└── README.md
```

---

## 📜 License

This project is licensed under the [MIT License](LICENSE).

---

## 🙏 Acknowledgements

- [Stockfish](https://stockfishchess.org/) - Open-source chess engine.
- [python-chess](https://python-chess.readthedocs.io/) - Pure Python chess library with move generation and validation.
- [Groq](https://groq.com/) - High-speed LPU inference engine for frontier LLMs.
- [react-chessboard](https://github.com/Clariity/react-chessboard) - Chessboard component for React.
