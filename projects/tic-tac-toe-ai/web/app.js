const WIN_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
  [0, 4, 8], [2, 4, 6]             // diagonals
];

const state = {
  board: Array(9).fill(null),
  currentPlayer: 'X',
  gameOver: false,
  mode: 'ai',          // 'ai' | 'pvp'
  difficulty: 'hard',  // 'easy' | 'medium' | 'hard'
  scores: { X: 0, O: 0, draw: 0 },
  aiThinking: false
};

const cells = Array.from(document.querySelectorAll('.cell'));
const statusText = document.getElementById('status-text');
const scoreXEl = document.getElementById('score-x');
const scoreOEl = document.getElementById('score-o');
const scoreDrawEl = document.getElementById('score-draw');
const cardX = document.getElementById('score-card-x');
const cardO = document.getElementById('score-card-o');
const labelO = document.getElementById('label-o');
const modeBtns = document.querySelectorAll('.seg-btn');
const difficultySelect = document.getElementById('difficulty-select');
const newGameBtn = document.getElementById('new-game-btn');
const resetScoresBtn = document.getElementById('reset-scores-btn');

function checkWinner(board) {
  for (const [a, b, c] of WIN_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line: [a, b, c] };
    }
  }
  if (board.every(cell => cell !== null)) {
    return { winner: 'draw', line: [] };
  }
  return null;
}

function updateTurnIndicator() {
  cardX.classList.toggle('active-turn', !state.gameOver && state.currentPlayer === 'X');
  cardO.classList.toggle('active-turn', !state.gameOver && state.currentPlayer === 'O');
}

function renderBoard(winLine = []) {
  cells.forEach((cell, idx) => {
    const val = state.board[idx];
    cell.textContent = val || '';
    cell.className = 'cell';
    if (val) cell.classList.add(val.toLowerCase());
    if (winLine.includes(idx)) cell.classList.add('win');
    cell.disabled = Boolean(val) || state.gameOver || state.aiThinking;
  });
  updateTurnIndicator();
}

function handleMove(index) {
  if (state.board[index] || state.gameOver || state.aiThinking) return;

  state.board[index] = state.currentPlayer;
  const result = checkWinner(state.board);

  if (result) {
    endGame(result);
    return;
  }

  state.currentPlayer = state.currentPlayer === 'X' ? 'O' : 'X';
  const oName = state.mode === 'ai' ? 'AI' : 'Player O';
  statusText.textContent = state.currentPlayer === 'X' ? "Player X's turn" : `${oName}'s turn`;
  renderBoard();

  if (state.mode === 'ai' && state.currentPlayer === 'O' && !state.gameOver) {
    state.aiThinking = true;
    renderBoard();
    setTimeout(makeAIMove, 260);
  }
}

function endGame({ winner, line }) {
  state.gameOver = true;
  state.aiThinking = false;

  if (winner === 'draw') {
    state.scores.draw++;
    scoreDrawEl.textContent = state.scores.draw;
    statusText.textContent = "It's a draw!";
  } else {
    state.scores[winner]++;
    if (winner === 'X') {
      scoreXEl.textContent = state.scores.X;
      statusText.textContent = 'Player X wins!';
    } else {
      scoreOEl.textContent = state.scores.O;
      statusText.textContent = state.mode === 'ai' ? 'AI wins!' : 'Player O wins!';
    }
  }
  renderBoard(line);
}

function getAvailableMoves(board) {
  const moves = [];
  board.forEach((val, idx) => {
    if (!val) moves.push(idx);
  });
  return moves;
}

function minimax(board, depth, isMaximizing) {
  const res = checkWinner(board);
  if (res) {
    if (res.winner === 'O') return 10 - depth;
    if (res.winner === 'X') return depth - 10;
    return 0;
  }

  const moves = getAvailableMoves(board);
  if (isMaximizing) {
    let best = -Infinity;
    for (const idx of moves) {
      board[idx] = 'O';
      best = Math.max(best, minimax(board, depth + 1, false));
      board[idx] = null;
    }
    return best;
  } else {
    let best = Infinity;
    for (const idx of moves) {
      board[idx] = 'X';
      best = Math.min(best, minimax(board, depth + 1, true));
      board[idx] = null;
    }
    return best;
  }
}

function chooseBestMove(board) {
  let bestScore = -Infinity;
  let bestMoves = [];
  for (const idx of getAvailableMoves(board)) {
    board[idx] = 'O';
    const score = minimax(board, 0, false);
    board[idx] = null;
    if (score > bestScore) {
      bestScore = score;
      bestMoves = [idx];
    } else if (score === bestScore) {
      bestMoves.push(idx);
    }
  }
  return bestMoves[Math.floor(Math.random() * bestMoves.length)];
}

function makeAIMove() {
  const available = getAvailableMoves(state.board);
  if (available.length === 0) return;

  let chosen;
  if (state.difficulty === 'easy') {
    chosen = available[Math.floor(Math.random() * available.length)];
  } else if (state.difficulty === 'medium') {
    chosen = Math.random() < 0.65
      ? chooseBestMove(state.board)
      : available[Math.floor(Math.random() * available.length)];
  } else {
    chosen = chooseBestMove(state.board);
  }

  state.aiThinking = false;
  handleMove(chosen);
}

function startNewRound() {
  state.board = Array(9).fill(null);
  state.currentPlayer = 'X';
  state.gameOver = false;
  state.aiThinking = false;
  statusText.textContent = "Player X's turn";
  renderBoard();
}

function resetScores() {
  state.scores = { X: 0, O: 0, draw: 0 };
  scoreXEl.textContent = '0';
  scoreOEl.textContent = '0';
  scoreDrawEl.textContent = '0';
  startNewRound();
}

cells.forEach((cell, idx) => {
  cell.addEventListener('click', () => handleMove(idx));
});

modeBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    modeBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.mode = btn.dataset.mode;
    difficultySelect.style.display = state.mode === 'ai' ? 'block' : 'none';
    labelO.textContent = state.mode === 'ai' ? 'AI (O)' : 'Player O';
    resetScores();
  });
});

difficultySelect.addEventListener('change', (e) => {
  state.difficulty = e.target.value;
  startNewRound();
});

newGameBtn.addEventListener('click', startNewRound);
resetScoresBtn.addEventListener('click', resetScores);

renderBoard();
