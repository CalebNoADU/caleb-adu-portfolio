from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import math

app = FastAPI()

# Enable CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify the actual origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class GameState(BaseModel):
    board: List[Optional[str]]  # 9 elements, 'X', 'O', or None
    player: str  # 'X' or 'O' (the AI's symbol)

def check_winner(board: List[Optional[str]]) -> Optional[str]:
    lines = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],  # Rows
        [0, 3, 6], [1, 4, 7], [2, 5, 8],  # Cols
        [0, 4, 8], [2, 4, 6]             # Diagonals
    ]
    for line in lines:
        if board[line[0]] and board[line[0]] == board[line[1]] == board[line[2]]:
            return board[line[0]]
    if all(board):
        return "Draw"
    return None

def minimax(board: List[Optional[str]], depth: int, is_maximizing: bool, ai_player: str, human_player: str) -> int:
    winner = check_winner(board)
    if winner == ai_player:
        return 10 - depth
    if winner == human_player:
        return depth - 10
    if winner == "Draw":
        return 0

    if is_maximizing:
        best_score = -math.inf
        for i in range(9):
            if board[i] is None:
                board[i] = ai_player
                score = minimax(board, depth + 1, False, ai_player, human_player)
                board[i] = None
                best_score = max(score, best_score)
        return best_score
    else:
        best_score = math.inf
        for i in range(9):
            if board[i] is None:
                board[i] = human_player
                score = minimax(board, depth + 1, True, ai_player, human_player)
                board[i] = None
                best_score = min(score, best_score)
        return best_score

@app.post("/move")
async def get_move(state: GameState):
    if len(state.board) != 9:
        raise HTTPException(status_code=400, detail="Invalid board size")
    
    ai_player = state.player
    human_player = "O" if ai_player == "X" else "X"
    
    best_score = -math.inf
    move = -1
    
    # Try every available spot
    for i in range(9):
        if state.board[i] is None:
            state.board[i] = ai_player
            score = minimax(state.board, 0, False, ai_player, human_player)
            state.board[i] = None
            if score > best_score:
                best_score = score
                move = i
                
    return {"move": move}

@app.get("/health")
async def health():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
