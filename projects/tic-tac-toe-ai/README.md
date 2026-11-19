# Tic-Tac-Toe AI Suite (Web · FastAPI Backend · Desktop/CLI)

An unbeatable **Minimax AI** implementation delivered across three separate software interfaces to compare client-side UI, REST API architecture, and native desktop/CLI tooling.

## Architecture
- **[web/](web/)** — Responsive dark-mode browser app supporting **Player vs. AI** (Easy, Medium, Unbeatable Minimax) and **Local 2-Player** mode with a live scoreboard.
- **[backend/](backend/)** — Python **FastAPI** + Pydantic REST service (`main.py`) exposing stateless board validation and optimal Minimax move computation.
- **[desktop/tic_tac_toe.py](desktop/tic_tac_toe.py)** — Pure Python **Tkinter Canvas GUI** with an optional terminal mode (`--cli`).

## Run Locally
```bash
# 1. Web UI: open web/index.html in a browser

# 2. FastAPI Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload

# 3. Desktop GUI or CLI
python3 desktop/tic_tac_toe.py
python3 desktop/tic_tac_toe.py --cli
```
