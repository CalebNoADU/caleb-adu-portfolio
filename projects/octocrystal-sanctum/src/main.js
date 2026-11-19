/**
 * UI & Input Controller connecting DOM / Keyboard / Canvas events to GameEngine & GameRenderer.
 */
import { GameEngine } from './engine.js';
import { GameRenderer } from './renderer.js';
import { JOBS, SKILLS, ITEMS, DAMAGE_TYPES } from './data.js';

const canvas = document.getElementById('game-canvas');
const renderer = new GameRenderer(canvas);
const engine = new GameEngine('OCTOPATH-FF6', (ev) => renderer.pushVisualEvent(ev));

const seedInput = document.getElementById('seed-input');
const newRunBtn = document.getElementById('new-run-btn');
const floorBadge = document.getElementById('floor-badge');
const modeBadge = document.getElementById('mode-badge');
const relicsBar = document.getElementById('relics-bar');
const partyContainer = document.getElementById('party-list');
const commandPanel = document.getElementById('command-panel');
const logContainer = document.getElementById('battle-log');

function syncUI() {
  floorBadge.textContent = `Floor ${engine.floor}/${engine.maxFloors} • Turn ${engine.turnCount}`;
  modeBadge.textContent =
    engine.state === 'COMBAT'
      ? '⚔️ COMBAT ENCOUNTER'
      : engine.state === 'VICTORY'
      ? '🏆 VICTORY'
      : engine.state === 'GAMEOVER'
      ? '💀 FALLEN'
      : '🧭 SANCTUM EXPLORATION';
  modeBadge.className = `badge mode-${engine.state.toLowerCase()}`;

  // Relics
  if (engine.relics.length === 0) {
    relicsBar.innerHTML = `<span class="muted">Relics: None discovered yet (open dungeon chests)</span>`;
  } else {
    relicsBar.innerHTML =
      `<strong>Relics:</strong> ` +
      engine.relics
        .map((rId) => `<span class="relic-pill" title="${ITEMS[rId]?.desc}">${ITEMS[rId]?.name}</span>`)
        .join(' ');
  }

  renderPartyPanel();
  renderCommandPanel();
  renderLogs();
}

function renderPartyPanel() {
  const isExplore = engine.state === 'EXPLORE';
  const activeId = engine.combat?.activeUnit?.id;

  partyContainer.innerHTML = engine.party
    .map((hero) => {
      const isActive = engine.state === 'COMBAT' && activeId === hero.id;
      const hpPct = Math.max(0, Math.min(100, Math.round((hero.hp / hero.maxHp) * 100)));
      const mpPct = Math.max(0, Math.min(100, Math.round((hero.mp / hero.maxMp) * 100)));
      const weaponInfo = DAMAGE_TYPES[hero.weapon];

      const bpGems = Array.from({ length: 5 }, (_, i) => {
        const filled = i < hero.bp;
        const spending =
          isActive &&
          i >= hero.bp - (engine.combat?.selectedBoost || 0) &&
          i < hero.bp;
        return `<span class="bp-gem ${spending ? 'spending' : filled ? 'filled' : ''}"></span>`;
      }).join('');

      const jobSelect = isExplore
        ? `<select class="job-select" data-hero-id="${hero.id}" aria-label="Change Job for ${hero.name}">
            ${Object.values(JOBS)
              .map(
                (j) =>
                  `<option value="${j.id}" ${j.id === hero.jobId ? 'selected' : ''}>${
                    j.name
                  }</option>`
              )
              .join('')}
          </select>`
        : `<span class="hero-job-label">${hero.jobName}</span>`;

      return `
        <div class="hero-card ${isActive ? 'active-turn' : ''} ${hero.hp <= 0 ? 'ko' : ''}">
          <div class="hero-header">
            <div>
              <span class="hero-name">${hero.name}</span>
              <span class="hero-lvl">Lv.${hero.level}</span>
            </div>
            <div class="bp-row" title="Boost Points (BP)">${bpGems}</div>
          </div>
          <div class="hero-sub">
            ${jobSelect}
            <span class="weapon-tag">${weaponInfo.icon} ${weaponInfo.label}</span>
          </div>
          <div class="stat-bars">
            <div class="bar-group">
              <div class="bar-label"><span>HP</span><span>${hero.hp}/${hero.maxHp}</span></div>
              <div class="bar-track"><div class="bar-fill hp-fill" style="width:${hpPct}%"></div></div>
            </div>
            <div class="bar-group">
              <div class="bar-label"><span>MP</span><span>${hero.mp}/${hero.maxMp}</span></div>
              <div class="bar-track"><div class="bar-fill mp-fill" style="width:${mpPct}%"></div></div>
            </div>
          </div>
        </div>
      `;
    })
    .join('');

  partyContainer.querySelectorAll('.job-select').forEach((sel) => {
    sel.addEventListener('change', (e) => {
      const heroId = e.target.getAttribute('data-hero-id');
      engine.changeHeroJob(heroId, e.target.value);
      syncUI();
    });
  });
}

function renderCommandPanel() {
  if (engine.state === 'EXPLORE') {
    const consumables = Object.entries(engine.inventory)
      .filter(([id, count]) => count > 0 && ITEMS[id]?.kind === 'consumable')
      .map(
        ([id, count]) =>
          `<button class="ff-btn item-btn" data-camp-item="${id}" title="${ITEMS[id].desc}">
            Use ${ITEMS[id].name} (x${count})
          </button>`
      )
      .join('');

    commandPanel.innerHTML = `
      <div class="panel-section">
        <h3>Dungeon Navigation (WASD / Arrow Keys)</h3>
        <div class="dpad-grid">
          <div></div>
          <button class="ff-btn dpad-btn" data-move="0,-1">▲ North (W)</button>
          <div></div>
          <button class="ff-btn dpad-btn" data-move="-1,0">◄ West (A)</button>
          <button class="ff-btn dpad-btn" data-move="0,1">▼ South (S)</button>
          <button class="ff-btn dpad-btn" data-move="1,0">► East (D)</button>
        </div>
        <p class="hint-text">
          Step onto <strong>Chests</strong> for Relics & Items, <strong>❖ Crystal Shrines</strong> to restore HP/MP/BP,
          or <strong>Monsters</strong> to trigger Break & Boost battles! Switch FF5 Jobs anytime in the Party roster.
        </p>
        <div class="camp-items">${consumables || '<span class="muted">No camp consumables left.</span>'}</div>
      </div>
    `;

    commandPanel.querySelectorAll('[data-move]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const [dx, dy] = btn.getAttribute('data-move').split(',').map(Number);
        engine.movePlayer(dx, dy);
        syncUI();
      });
    });

    commandPanel.querySelectorAll('[data-camp-item]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-camp-item');
        const item = ITEMS[id];
        if (!item || (engine.inventory[id] || 0) <= 0) return;
        engine.inventory[id] -= 1;
        for (const h of engine.party) {
          if (item.effect === 'heal_party') h.hp = Math.min(h.maxHp, h.hp + item.amount);
          if (item.effect === 'mp_party') h.mp = Math.min(h.maxMp, h.mp + item.amount);
          if (item.effect === 'bp_party') h.bp = Math.min(5, h.bp + item.amount);
        }
        engine.addLog(`Used ${item.name} while exploring!`);
        syncUI();
      });
    });
    return;
  }

  if (engine.state === 'COMBAT' && engine.combat) {
    const combat = engine.combat;
    const hero = combat.activeUnit;
    if (!hero || hero.isEnemy) return;

    const boost = combat.selectedBoost;
    const maxBoost = Math.min(3, hero.bp);
    const weaponInfo = DAMAGE_TYPES[hero.weapon];

    const targetsHtml = combat.enemies
      .map((enemy, idx) => {
        if (enemy.hp <= 0) return '';
        const selected = idx === combat.selectedTargetIndex;
        const weakIcons = enemy.weaknesses
          .map((w) => (enemy.revealedWeaknesses.has(w) ? DAMAGE_TYPES[w].icon : '?'))
          .join(' ');
        return `
          <button class="ff-btn target-btn ${selected ? 'selected' : ''}" data-target-idx="${idx}">
            <span>${selected ? '▶ ' : ''}${enemy.name}</span>
            <span class="shield-pill ${enemy.broken ? 'broken' : ''}">
              ${enemy.broken ? '💥 BROKEN' : `🛡️ ${enemy.shield}`} | ${weakIcons}
            </span>
          </button>
        `;
      })
      .join('');

    const skillsHtml = hero.skills
      .map((sId) => {
        const sk = SKILLS[sId];
        if (!sk) return '';
        const icon = DAMAGE_TYPES[sk.type]?.icon || '✨';
        const disabled = hero.mp < sk.mpCost;
        return `
          <button class="ff-btn skill-btn" data-skill-id="${sk.id}" ${disabled ? 'disabled' : ''} title="${sk.desc}">
            <span>${icon} ${sk.name}</span>
            <span class="mp-cost">${sk.mpCost} MP</span>
          </button>
        `;
      })
      .join('');

    const itemsHtml = Object.entries(engine.inventory)
      .filter(([id, count]) => count > 0 && ITEMS[id]?.kind === 'consumable')
      .map(
        ([id, count]) =>
          `<button class="ff-btn item-btn" data-combat-item="${id}" title="${ITEMS[id].desc}">
            🎒 ${ITEMS[id].name} (x${count})
          </button>`
      )
      .join('');

    commandPanel.innerHTML = `
      <div class="combat-commands">
        <div class="turn-banner">
          <div>
            <strong>${hero.name}’s Turn</strong> <span class="muted">(${hero.jobName})</span>
          </div>
          <div class="boost-controls">
            <button class="ff-btn boost-btn ${boost > 0 ? 'boost-active' : ''}" id="boost-cycle-btn">
              🔥 BOOST: +${boost} BP ${boost === 3 ? '(MAX!)' : `(Avail: ${maxBoost})`}
            </button>
          </div>
        </div>

        <div class="targets-row">
          <span class="row-label">Target:</span>
          ${targetsHtml}
        </div>

        <div class="actions-grid">
          <button class="ff-btn primary-action" id="act-attack">
            ${weaponInfo.icon} Attack (${1 + boost}x Hits)
          </button>
          <button class="ff-btn" id="act-defend">
            🛡️ Defend (+${3 + boost * 3} MP)
          </button>
          ${skillsHtml}
        </div>

        <div class="items-row">
          ${itemsHtml}
        </div>
      </div>
    `;

    document.getElementById('boost-cycle-btn')?.addEventListener('click', () => {
      combat.cycleBoost();
      syncUI();
    });

    commandPanel.querySelectorAll('[data-target-idx]').forEach((btn) => {
      btn.addEventListener('click', () => {
        combat.selectedTargetIndex = Number(btn.getAttribute('data-target-idx'));
        syncUI();
      });
    });

    document.getElementById('act-attack')?.addEventListener('click', () => {
      combat.executeHeroAttack(combat.selectedTargetIndex);
      engine.checkCombatOutcome();
      syncUI();
    });

    document.getElementById('act-defend')?.addEventListener('click', () => {
      combat.executeHeroDefend();
      engine.checkCombatOutcome();
      syncUI();
    });

    commandPanel.querySelectorAll('[data-skill-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const sId = btn.getAttribute('data-skill-id');
        combat.executeHeroSkill(sId, combat.selectedTargetIndex);
        engine.checkCombatOutcome();
        syncUI();
      });
    });

    commandPanel.querySelectorAll('[data-combat-item]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const itemId = btn.getAttribute('data-combat-item');
        combat.executeHeroItem(itemId);
        engine.checkCombatOutcome();
        syncUI();
      });
    });
    return;
  }

  // Victory or Game Over state
  commandPanel.innerHTML = `
    <div class="panel-section">
      <h3>${engine.state === 'VICTORY' ? '🎉 Sanctum Cleared!' : '💀 Run Ended'}</h3>
      <p>Enter any deterministic RNG seed above and click <strong>New Seeded Run</strong> to play again.</p>
    </div>
  `;
}

function renderLogs() {
  logContainer.innerHTML = engine.logs
    .slice(0, 14)
    .map((entry) => `<div class="log-line">${entry.text}</div>`)
    .join('');
}

// Keyboard Controls (Explore movement + Combat shortcuts)
window.addEventListener('keydown', (e) => {
  if (document.activeElement === seedInput) return;

  if (engine.state === 'EXPLORE') {
    const keyMap = {
      ArrowUp: [0, -1],
      KeyW: [0, -1],
      ArrowDown: [0, 1],
      KeyS: [0, 1],
      ArrowLeft: [-1, 0],
      KeyA: [-1, 0],
      ArrowRight: [1, 0],
      KeyD: [1, 0],
    };
    const move = keyMap[e.code];
    if (move) {
      e.preventDefault();
      engine.movePlayer(move[0], move[1]);
      syncUI();
    }
  } else if (engine.state === 'COMBAT' && engine.combat) {
    if (e.code === 'KeyB' || e.code === 'Space') {
      e.preventDefault();
      engine.combat.cycleBoost();
      syncUI();
    } else if (e.code === 'Enter') {
      e.preventDefault();
      engine.combat.executeHeroAttack(engine.combat.selectedTargetIndex);
      engine.checkCombatOutcome();
      syncUI();
    }
  }
});

// Click enemy sprite on canvas to target
canvas.addEventListener('click', (e) => {
  if (engine.state !== 'COMBAT' || !engine.combat) return;
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const cx = (e.clientX - rect.left) * scaleX;
  const cy = (e.clientY - rect.top) * scaleY;

  for (const b of renderer.enemyBounds) {
    if (cx >= b.x && cx <= b.x + b.w && cy >= b.y && cy <= b.y + b.h) {
      engine.combat.selectedTargetIndex = b.index;
      syncUI();
      break;
    }
  }
});

newRunBtn.addEventListener('click', () => {
  engine.initNewRun(seedInput.value);
  syncUI();
});

// Animation Loop
function animate(ts) {
  renderer.render(engine, ts);
  requestAnimationFrame(animate);
}

syncUI();
requestAnimationFrame(animate);
