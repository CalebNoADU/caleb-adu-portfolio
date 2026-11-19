const STORAGE_KEY = 'pulse_habits_v1';

function formatDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getPastDays(count) {
  const days = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    days.push({
      date: d,
      key: formatDateKey(d),
      dayShort: d.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNum: d.getDate(),
      isToday: i === 0
    });
  }
  return days;
}

function createDefaultHabits() {
  const days = getPastDays(14);
  const k = (offsetAgo) => days[days.length - 1 - offsetAgo].key;
  return [
    {
      id: 'h1',
      name: 'Drink 2L Water',
      icon: '💧',
      color: '#38bdf8',
      logs: { [k(0)]: true, [k(1)]: true, [k(2)]: true, [k(3)]: true, [k(5)]: true }
    },
    {
      id: 'h2',
      name: '30m Workout / Walk',
      icon: '🏃',
      color: '#34d399',
      logs: { [k(1)]: true, [k(2)]: true, [k(4)]: true, [k(6)]: true }
    },
    {
      id: 'h3',
      name: 'Read 20 Pages',
      icon: '📚',
      color: '#a78bfa',
      logs: { [k(0)]: true, [k(1)]: true, [k(3)]: true, [k(4)]: true }
    },
    {
      id: 'h4',
      name: '10m Mindfulness',
      icon: '🧘',
      color: '#f472b6',
      logs: { [k(2)]: true, [k(3)]: true, [k(5)]: true }
    }
  ];
}

let habits = [];
let selectedIcon = '💧';
let selectedColor = '#38bdf8';

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      habits = JSON.parse(raw);
      return;
    }
  } catch (_) {}
  habits = createDefaultHabits();
  saveState();
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(habits));
  } catch (_) {}
}

function computeStreak(habit) {
  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = formatDateKey(d);
    if (habit.logs && habit.logs[key]) {
      streak++;
    } else if (i === 0) {
      // If today isn't checked yet, check if streak is alive from yesterday
      continue;
    } else {
      break;
    }
  }
  return streak;
}

function render() {
  const weekDays = getPastDays(7);
  const todayKey = weekDays[weekDays.length - 1].key;

  // Date header
  const todayLabel = document.getElementById('today-date-label');
  todayLabel.textContent = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  });

  // Matrix Header
  const matrixHeader = document.getElementById('matrix-header');
  matrixHeader.innerHTML = `
    <div class="col-habit-label">Habit</div>
    ${weekDays
      .map(
        (d) => `
      <div class="day-col-header ${d.isToday ? 'is-today' : ''}">
        <span class="day-name">${d.dayShort}</span>
        <span class="day-num">${d.dayNum}</span>
      </div>
    `
      )
      .join('')}
    <div class="col-habit-label" style="text-align:center">Streak</div>
    <div></div>
  `;

  // Habits rows
  const listEl = document.getElementById('habits-list');
  if (habits.length === 0) {
    listEl.innerHTML = `<p style="color:var(--muted);text-align:center;padding:1.5rem 0;">No habits yet — add your first habit above!</p>`;
  } else {
    listEl.innerHTML = habits
      .map((habit) => {
        const streak = computeStreak(habit);
        const cellsHtml = weekDays
          .map((d) => {
            const done = Boolean(habit.logs && habit.logs[d.key]);
            return `
              <button
                type="button"
                class="check-btn ${done ? 'done' : ''}"
                style="--habit-color: ${habit.color}"
                data-habit-id="${habit.id}"
                data-date-key="${d.key}"
                aria-label="Toggle ${habit.name} on ${d.key}"
              >${done ? '✓' : ''}</button>
            `;
          })
          .join('');

        return `
          <div class="habit-row">
            <div class="habit-meta">
              <div class="habit-icon" style="border-color:${habit.color}55">${habit.icon}</div>
              <span class="habit-title">${escapeHtml(habit.name)}</span>
            </div>
            ${cellsHtml}
            <div style="text-align:center">
              <span class="streak-badge">🔥 ${streak}d</span>
            </div>
            <button type="button" class="delete-btn" data-delete-id="${habit.id}" title="Delete habit">✕</button>
          </div>
        `;
      })
      .join('');
  }

  // Stats & Ring
  const totalToday = habits.length;
  const doneToday = habits.filter((h) => h.logs && h.logs[todayKey]).length;
  const pct = totalToday > 0 ? Math.round((doneToday / totalToday) * 100) : 0;

  const circumference = 2 * Math.PI * 26;
  const ringEl = document.getElementById('daily-ring-circle');
  ringEl.style.strokeDashoffset = String(circumference - (pct / 100) * circumference);

  document.getElementById('daily-percent').textContent = `${pct}%`;
  document.getElementById('daily-count-label').textContent = `${doneToday} of ${totalToday} today`;

  const bestStreak = habits.reduce((max, h) => Math.max(max, computeStreak(h)), 0);
  document.getElementById('best-streak-val').textContent = `${bestStreak}d`;

  const totalCheckins = habits.reduce(
    (sum, h) => sum + Object.values(h.logs || {}).filter(Boolean).length,
    0
  );
  document.getElementById('total-checkins-val').textContent = String(totalCheckins);

  // 28-Day Heatmap
  const days28 = getPastDays(28);
  const heatmapGrid = document.getElementById('heatmap-grid');
  heatmapGrid.innerHTML = days28
    .map((d) => {
      if (habits.length === 0) {
        return `<div class="heat-cell lvl-0" title="${d.key}: 0%"></div>`;
      }
      const completed = habits.filter((h) => h.logs && h.logs[d.key]).length;
      const ratio = completed / habits.length;
      let lvl = 0;
      if (ratio > 0 && ratio <= 0.25) lvl = 1;
      else if (ratio <= 0.5) lvl = 2;
      else if (ratio < 1) lvl = 3;
      else if (ratio === 1) lvl = 4;
      return `<div class="heat-cell lvl-${lvl}" title="${d.key}: ${completed}/${habits.length} completed"></div>`;
    })
    .join('');
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));
}

// Confetti celebration when hitting 100% today
function launchConfetti() {
  const canvas = document.getElementById('confetti-canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles = Array.from({ length: 70 }, () => ({
    x: canvas.width / 2 + (Math.random() - 0.5) * 200,
    y: canvas.height * 0.35,
    vx: (Math.random() - 0.5) * 12,
    vy: -Math.random() * 10 - 4,
    size: Math.random() * 6 + 4,
    color: ['#38bdf8', '#34d399', '#a78bfa', '#f472b6', '#fbbf24'][Math.floor(Math.random() * 5)],
    rot: Math.random() * Math.PI,
    vrot: (Math.random() - 0.5) * 0.2
  }));

  let frame = 0;
  function step() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.35;
      p.rot += p.vrot;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      ctx.restore();
    });
    frame++;
    if (frame < 90) requestAnimationFrame(step);
    else ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  requestAnimationFrame(step);
}

// Event Listeners
document.getElementById('habits-list').addEventListener('click', (e) => {
  const checkBtn = e.target.closest('.check-btn');
  if (checkBtn) {
    const { habitId, dateKey } = checkBtn.dataset;
    const habit = habits.find((h) => h.id === habitId);
    if (!habit) return;
    habit.logs = habit.logs || {};
    habit.logs[dateKey] = !habit.logs[dateKey];
    if (!habit.logs[dateKey]) delete habit.logs[dateKey];
    saveState();
    render();

    const todayKey = formatDateKey(new Date());
    if (
      dateKey === todayKey &&
      habits.length > 0 &&
      habits.every((h) => h.logs && h.logs[todayKey])
    ) {
      launchConfetti();
    }
    return;
  }

  const delBtn = e.target.closest('.delete-btn');
  if (delBtn) {
    const id = delBtn.dataset.deleteId;
    habits = habits.filter((h) => h.id !== id);
    saveState();
    render();
  }
});

document.getElementById('icon-picker').addEventListener('click', (e) => {
  const btn = e.target.closest('.icon-btn');
  if (!btn) return;
  document.querySelectorAll('.icon-btn').forEach((b) => b.classList.remove('selected'));
  btn.classList.add('selected');
  selectedIcon = btn.dataset.icon;
});

document.getElementById('color-picker').addEventListener('click', (e) => {
  const btn = e.target.closest('.color-swatch');
  if (!btn) return;
  document.querySelectorAll('.color-swatch').forEach((b) => b.classList.remove('selected'));
  btn.classList.add('selected');
  selectedColor = btn.dataset.color;
});

document.getElementById('add-habit-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const input = document.getElementById('habit-name-input');
  const name = input.value.trim();
  if (!name) return;
  habits.push({
    id: 'h_' + Date.now(),
    name,
    icon: selectedIcon,
    color: selectedColor,
    logs: {}
  });
  input.value = '';
  saveState();
  render();
});

loadState();
render();
