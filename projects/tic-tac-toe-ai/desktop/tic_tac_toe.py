#!/usr/bin/env python3
"""
Tic Tac Toe — Pure Python App (Desktop GUI & CLI)
Features:
- Player vs AI (Easy, Medium, Unbeatable Minimax) & 2-Player Local Mode
- Live Scoreboard (Player X, Draws, AI / Player O)
- Custom-rendered dark-mode Canvas UI (macOS compatible)
- Optional CLI mode (`python3 tic_tac_toe.py --cli`)
"""

import math
import os
import random
import sys
from typing import Dict, List, Optional, Tuple

# Automatically switch to macOS system Python if Homebrew Python lacks _tkinter
os.environ.setdefault("TK_SILENCE_DEPRECATION", "1")
if "--cli" not in sys.argv:
    try:
        import tkinter as tk
    except ImportError:
        sys_py = "/usr/bin/python3"
        if os.path.exists(sys_py) and os.path.realpath(sys.executable) != os.path.realpath(sys_py):
            os.execv(sys_py, [sys_py, *sys.argv])
        raise


WIN_LINES: List[Tuple[int, int, int]] = [
    (0, 1, 2), (3, 4, 5), (6, 7, 8),  # rows
    (0, 3, 6), (1, 4, 7), (2, 5, 8),  # cols
    (0, 4, 8), (2, 4, 6),             # diagonals
]


class TicTacToeEngine:
    """Core game state and Minimax AI engine written in Python."""

    def __init__(self) -> None:
        self.board: List[Optional[str]] = [None] * 9
        self.current_player: str = "X"
        self.game_over: bool = False
        self.winner: Optional[str] = None
        self.win_line: List[int] = []
        self.mode: str = "ai"          # "ai" | "pvp"
        self.difficulty: str = "hard"  # "easy" | "medium" | "hard"
        self.scores: Dict[str, int] = {"X": 0, "O": 0, "draw": 0}

    def new_round(self) -> None:
        self.board = [None] * 9
        self.current_player = "X"
        self.game_over = False
        self.winner = None
        self.win_line = []

    def reset_scores(self) -> None:
        self.scores = {"X": 0, "O": 0, "draw": 0}
        self.new_round()

    @staticmethod
    def check_winner(board: List[Optional[str]]) -> Optional[Tuple[str, List[int]]]:
        for a, b, c in WIN_LINES:
            if board[a] and board[a] == board[b] == board[c]:
                return board[a], [a, b, c]
        if all(cell is not None for cell in board):
            return "draw", []
        return None

    @staticmethod
    def available_moves(board: List[Optional[str]]) -> List[int]:
        return [i for i, cell in enumerate(board) if cell is None]

    def make_move(self, index: int) -> bool:
        if self.game_over or self.board[index] is not None:
            return False

        self.board[index] = self.current_player
        result = self.check_winner(self.board)

        if result:
            winner, line = result
            self.game_over = True
            self.winner = winner
            self.win_line = line
            self.scores[winner] += 1
        else:
            self.current_player = "O" if self.current_player == "X" else "X"
        return True

    @classmethod
    def _minimax(cls, board: List[Optional[str]], depth: int, is_maximizing: bool) -> int:
        res = cls.check_winner(board)
        if res:
            winner, _ = res
            if winner == "O":
                return 10 - depth
            if winner == "X":
                return depth - 10
            return 0

        moves = cls.available_moves(board)
        if is_maximizing:
            best = -math.inf
            for idx in moves:
                board[idx] = "O"
                best = max(best, cls._minimax(board, depth + 1, False))
                board[idx] = None
            return int(best)
        else:
            best = math.inf
            for idx in moves:
                board[idx] = "X"
                best = min(best, cls._minimax(board, depth + 1, True))
                board[idx] = None
            return int(best)

    def choose_ai_move(self) -> Optional[int]:
        moves = self.available_moves(self.board)
        if not moves:
            return None

        if self.difficulty == "easy":
            return random.choice(moves)
        if self.difficulty == "medium" and random.random() > 0.65:
            return random.choice(moves)

        best_score = -math.inf
        best_moves: List[int] = []
        for idx in moves:
            self.board[idx] = "O"
            score = self._minimax(self.board, 0, False)
            self.board[idx] = None
            if score > best_score:
                best_score = score
                best_moves = [idx]
            elif score == best_score:
                best_moves.append(idx)
        return random.choice(best_moves)


class TicTacToeGUI:
    """Dark-mode Tkinter Canvas UI matching the web app design."""

    BG = "#0f172a"
    CARD = "#1e293b"
    CELL_BG = "#334155"
    CELL_HOVER = "#475569"
    TEXT = "#f8fafc"
    MUTED = "#94a3b8"
    BORDER = "#334155"
    X_COLOR = "#38bdf8"
    O_COLOR = "#f472b6"
    WIN_BG = "#14532d"
    WIN_BORDER = "#22c55e"
    ACCENT = "#6366f1"

    WIDTH = 420
    HEIGHT = 590

    def __init__(self, root: "tk.Tk") -> None:
        self.root = root
        self.root.title("Tic Tac Toe (Python)")
        self.root.configure(bg=self.BG)
        self.root.resizable(False, False)

        self.engine = TicTacToeEngine()
        self.ai_thinking = False
        self.hovered_cell: Optional[int] = None

        self.canvas = tk.Canvas(
            root,
            width=self.WIDTH,
            height=self.HEIGHT,
            bg=self.BG,
            highlightthickness=0,
        )
        self.canvas.pack()

        self.cell_rects: List[Tuple[int, int, int, int]] = []
        self.hit_regions: Dict[str, Tuple[int, int, int, int]] = {}
        self._compute_layout()

        self.canvas.bind("<Button-1>", self._on_click)
        self.canvas.bind("<Motion>", self._on_motion)
        self.render()

    def _compute_layout(self) -> None:
        # 3x3 board cells
        board_top = 215
        board_left = 35
        cell_size = 110
        gap = 10
        self.cell_rects = []
        for idx in range(9):
            r, c = divmod(idx, 3)
            x1 = board_left + c * (cell_size + gap)
            y1 = board_top + r * (cell_size + gap)
            self.cell_rects.append((x1, y1, x1 + cell_size, y1 + cell_size))

        # Control buttons
        self.hit_regions = {
            "mode_ai": (35, 62, 115, 92),
            "mode_pvp": (118, 62, 205, 92),
            "diff_cycle": (220, 62, 385, 92),
            "new_round": (35, 535, 250, 572),
            "reset_scores": (262, 535, 385, 572),
        }

    def _round_rect(
        self,
        x1: float,
        y1: float,
        x2: float,
        y2: float,
        r: float = 12,
        fill: str = "",
        outline: str = "",
        width: int = 1,
    ) -> None:
        points = [
            x1 + r, y1,
            x2 - r, y1,
            x2, y1,
            x2, y1 + r,
            x2, y2 - r,
            x2, y2,
            x2 - r, y2,
            x1 + r, y2,
            x1, y2,
            x1, y2 - r,
            x1, y1 + r,
            x1, y1,
        ]
        self.canvas.create_polygon(
            points, smooth=True, fill=fill, outline=outline, width=width
        )

    def render(self) -> None:
        self.canvas.delete("all")

        # Main Card Container
        self._round_rect(16, 16, self.WIDTH - 16, self.HEIGHT - 12, r=20, fill=self.CARD, outline=self.BORDER, width=1)

        # Title
        self.canvas.create_text(
            self.WIDTH // 2, 38,
            text="Tic Tac Toe",
            fill=self.TEXT,
            font=("Helvetica", 18, "bold"),
        )

        # Mode Switcher (vs AI | 2 Players)
        ax1, ay1, ax2, ay2 = self.hit_regions["mode_ai"]
        px1, py1, px2, py2 = self.hit_regions["mode_pvp"]
        self._round_rect(ax1 - 2, ay1 - 2, px2 + 2, py2 + 2, r=8, fill=self.BG, outline=self.BORDER)

        if self.engine.mode == "ai":
            self._round_rect(ax1, ay1, ax2, ay2, r=6, fill=self.CARD, outline=self.ACCENT)
        else:
            self._round_rect(px1, py1, px2, py2, r=6, fill=self.CARD, outline=self.ACCENT)

        self.canvas.create_text(
            (ax1 + ax2) // 2, (ay1 + ay2) // 2,
            text="vs AI",
            fill=self.TEXT if self.engine.mode == "ai" else self.MUTED,
            font=("Helvetica", 11, "bold"),
        )
        self.canvas.create_text(
            (px1 + px2) // 2, (py1 + py2) // 2,
            text="2 Players",
            fill=self.TEXT if self.engine.mode == "pvp" else self.MUTED,
            font=("Helvetica", 11, "bold"),
        )

        # Difficulty Button
        dx1, dy1, dx2, dy2 = self.hit_regions["diff_cycle"]
        diff_labels = {"easy": "AI: Easy", "medium": "AI: Medium", "hard": "AI: Unbeatable"}
        self._round_rect(dx1, dy1, dx2, dy2, r=8, fill=self.BG, outline=self.BORDER)
        self.canvas.create_text(
            (dx1 + dx2) // 2, (dy1 + dy2) // 2,
            text=diff_labels[self.engine.difficulty] if self.engine.mode == "ai" else "Local PvP",
            fill=self.TEXT if self.engine.mode == "ai" else self.MUTED,
            font=("Helvetica", 11, "bold"),
        )

        # Scoreboard (3 columns)
        score_y1, score_y2 = 106, 166
        col_w = 110
        gap = 10
        o_label = "AI (O)" if self.engine.mode == "ai" else "PLAYER O"
        cards = [
            ("PLAYER X", str(self.engine.scores["X"]), self.X_COLOR, not self.engine.game_over and self.engine.current_player == "X"),
            ("DRAWS", str(self.engine.scores["draw"]), self.TEXT, False),
            (o_label, str(self.engine.scores["O"]), self.O_COLOR, not self.engine.game_over and self.engine.current_player == "O"),
        ]
        for i, (label, val, color, active) in enumerate(cards):
            cx1 = 35 + i * (col_w + gap)
            cx2 = cx1 + col_w
            border_col = color if active else self.BORDER
            self._round_rect(cx1, score_y1, cx2, score_y2, r=10, fill=self.BG, outline=border_col, width=2 if active else 1)
            self.canvas.create_text((cx1 + cx2) // 2, score_y1 + 18, text=label, fill=self.MUTED, font=("Helvetica", 9, "bold"))
            self.canvas.create_text((cx1 + cx2) // 2, score_y1 + 42, text=val, fill=color, font=("Helvetica", 16, "bold"))

        # Status Text
        status = self._status_message()
        self.canvas.create_text(
            self.WIDTH // 2, 190,
            text=status,
            fill=self.TEXT,
            font=("Helvetica", 12, "bold"),
        )

        # 3x3 Board Cells
        for idx, (x1, y1, x2, y2) in enumerate(self.cell_rects):
            val = self.engine.board[idx]
            is_win = idx in self.engine.win_line
            is_hover = (
                self.hovered_cell == idx
                and val is None
                and not self.engine.game_over
                and not self.ai_thinking
            )
            fill = self.WIN_BG if is_win else (self.CELL_HOVER if is_hover else self.CELL_BG)
            outline = self.WIN_BORDER if is_win else fill
            self._round_rect(x1, y1, x2, y2, r=14, fill=fill, outline=outline, width=2)

            cx, cy = (x1 + x2) // 2, (y1 + y2) // 2
            if val == "X":
                offset = 24
                self.canvas.create_line(cx - offset, cy - offset, cx + offset, cy + offset, fill=self.X_COLOR, width=7, capstyle=tk.ROUND)
                self.canvas.create_line(cx + offset, cy - offset, cx - offset, cy + offset, fill=self.X_COLOR, width=7, capstyle=tk.ROUND)
            elif val == "O":
                radius = 25
                self.canvas.create_oval(cx - radius, cy - radius, cx + radius, cy + radius, outline=self.O_COLOR, width=7)

        # Bottom Action Buttons
        nx1, ny1, nx2, ny2 = self.hit_regions["new_round"]
        rx1, ry1, rx2, ry2 = self.hit_regions["reset_scores"]
        self._round_rect(nx1, ny1, nx2, ny2, r=10, fill=self.ACCENT, outline=self.ACCENT)
        self.canvas.create_text((nx1 + nx2) // 2, (ny1 + ny2) // 2, text="New Round", fill="#ffffff", font=("Helvetica", 12, "bold"))

        self._round_rect(rx1, ry1, rx2, ry2, r=10, fill=self.BG, outline=self.BORDER)
        self.canvas.create_text((rx1 + rx2) // 2, (ry1 + ry2) // 2, text="Reset Scores", fill=self.MUTED, font=("Helvetica", 11, "bold"))

    def _status_message(self) -> str:
        if self.engine.game_over:
            if self.engine.winner == "draw":
                return "It's a draw!"
            if self.engine.winner == "X":
                return "Player X wins!"
            return "AI wins!" if self.engine.mode == "ai" else "Player O wins!"
        if self.ai_thinking:
            return "AI is thinking..."
        if self.engine.current_player == "X":
            return "Player X's turn"
        return "AI's turn" if self.engine.mode == "ai" else "Player O's turn"

    @staticmethod
    def _inside(x: int, y: int, rect: Tuple[int, int, int, int]) -> bool:
        x1, y1, x2, y2 = rect
        return x1 <= x <= x2 and y1 <= y <= y2

    def _on_motion(self, event: "tk.Event") -> None:
        new_hover = None
        for idx, rect in enumerate(self.cell_rects):
            if self._inside(event.x, event.y, rect):
                new_hover = idx
                break
        if new_hover != self.hovered_cell:
            self.hovered_cell = new_hover
            self.render()

    def _on_click(self, event: "tk.Event") -> None:
        x, y = event.x, event.y

        if self._inside(x, y, self.hit_regions["mode_ai"]):
            if self.engine.mode != "ai":
                self.engine.mode = "ai"
                self.ai_thinking = False
                self.engine.reset_scores()
                self.render()
            return

        if self._inside(x, y, self.hit_regions["mode_pvp"]):
            if self.engine.mode != "pvp":
                self.engine.mode = "pvp"
                self.ai_thinking = False
                self.engine.reset_scores()
                self.render()
            return

        if self._inside(x, y, self.hit_regions["diff_cycle"]) and self.engine.mode == "ai":
            order = ["easy", "medium", "hard"]
            next_idx = (order.index(self.engine.difficulty) + 1) % len(order)
            self.engine.difficulty = order[next_idx]
            self.ai_thinking = False
            self.engine.new_round()
            self.render()
            return

        if self._inside(x, y, self.hit_regions["new_round"]):
            self.ai_thinking = False
            self.engine.new_round()
            self.render()
            return

        if self._inside(x, y, self.hit_regions["reset_scores"]):
            self.ai_thinking = False
            self.engine.reset_scores()
            self.render()
            return

        if self.ai_thinking or self.engine.game_over:
            return

        for idx, rect in enumerate(self.cell_rects):
            if self._inside(x, y, rect):
                if self.engine.make_move(idx):
                    self.render()
                    if (
                        self.engine.mode == "ai"
                        and not self.engine.game_over
                        and self.engine.current_player == "O"
                    ):
                        self.ai_thinking = True
                        self.render()
                        self.root.after(240, self._trigger_ai_move)
                break

    def _trigger_ai_move(self) -> None:
        if not self.ai_thinking or self.engine.game_over:
            return
        choice = self.engine.choose_ai_move()
        self.ai_thinking = False
        if choice is not None:
            self.engine.make_move(choice)
        self.render()


def run_cli() -> None:
    """Interactive terminal mode (`python3 tic_tac_toe.py --cli`)."""
    engine = TicTacToeEngine()
    print("=== Tic Tac Toe (Python CLI) ===")
    mode_in = input("Choose mode — [1] vs Unbeatable AI (default), [2] 2 Players: ").strip()
    engine.mode = "pvp" if mode_in == "2" else "ai"

    def print_board() -> None:
        symbols = [cell if cell else str(i + 1) for i, cell in enumerate(engine.board)]
        print(f"\n {symbols[0]} | {symbols[1]} | {symbols[2]} ")
        print("---+---+---")
        print(f" {symbols[3]} | {symbols[4]} | {symbols[5]} ")
        print("---+---+---")
        print(f" {symbols[6]} | {symbols[7]} | {symbols[8]} \n")

    while True:
        print_board()
        if engine.mode == "ai" and engine.current_player == "O":
            move = engine.choose_ai_move()
            assert move is not None
            print(f"AI chooses position {move + 1}")
            engine.make_move(move)
        else:
            raw = input(f"Player {engine.current_player}, enter position (1-9) or 'q' to quit: ").strip().lower()
            if raw == "q":
                break
            if not raw.isdigit() or not (1 <= int(raw) <= 9):
                print("Please enter a number between 1 and 9.")
                continue
            if not engine.make_move(int(raw) - 1):
                print("That cell is already taken!")
                continue

        if engine.game_over:
            print_board()
            if engine.winner == "draw":
                print("Result: It's a draw!")
            else:
                print(f"Result: {engine.winner} wins!")
            print(f"Score — X: {engine.scores['X']} | Draws: {engine.scores['draw']} | O: {engine.scores['O']}")
            again = input("Play another round? (y/n): ").strip().lower()
            if again == "y":
                engine.new_round()
            else:
                break


def main() -> None:
    if "--cli" in sys.argv:
        run_cli()
    else:
        root = tk.Tk()
        TicTacToeGUI(root)
        root.mainloop()


if __name__ == "__main__":
    main()
