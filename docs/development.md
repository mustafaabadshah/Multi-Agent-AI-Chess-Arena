# Development Guide & Testing

## Local Setup

### 1. Requirements
- Python 3.12+
- Node.js 20+
- Stockfish 16/17/19 (bundled in `backend/bin/stockfish.exe` or installed in PATH)
- Optional: PostgreSQL 14+ (falls back to SQLite automatically if offline)

### 2. Environment Setup
```bash
cp .env.example .env
# Edit .env with your GROQ_API_KEY
```

### 3. Backend Setup
```bash
cd backend
python -m venv venv
venv\Scripts\activate   # On Windows (or source venv/bin/activate on Linux/Mac)
pip install -r requirements.txt
```

Run Backend Tests:
```bash
pytest -v
```

Start Backend Server:
```bash
uvicorn app.main:app --reload --port 8000
```

### 4. Frontend Setup
```bash
cd frontend
npm install --legacy-peer-deps
```

Run Frontend Tests:
```bash
npm test
```

Build Production Bundle:
```bash
npm run build
```

Start Frontend Dev Server:
```bash
npm run dev
```

### 5. Docker Setup
To start all services (PostgreSQL, Backend, Frontend) with one command:
```bash
docker-compose up --build
```
Access at:
- Web UI: `http://localhost:3000`
- API Docs: `http://localhost:8000/docs`
