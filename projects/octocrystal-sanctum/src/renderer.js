/**
 * HD-2D / 16-Bit JRPG Canvas Renderer
 * Renders both the Shadowcast Dungeon Exploration View and the Side-View Octopath/FF Battle Scene.
 */
import { DAMAGE_TYPES } from './data.js';

export class GameRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.floatingTexts = [];
    this.particles = [];
    this.enemyBounds = []; // Clickable hitboxes for selecting targets in combat
  }

  pushVisualEvent(ev) {
    if (!ev) return;
    if (ev.type === 'damage') {
      const color = ev.isBreak
        ? '#facc15'
        : ev.isWeak || ev.isBrokenHit
        ? '#fb7185'
        : ev.isEnemyAttack
        ? '#f87171'
        : '#ffffff';
      const label = ev.isBreak
        ? `BREAK! -${ev.amount}`
        : ev.isWeak
        ? `WEAK! -${ev.amount}`
        : `-${ev.amount}`;
      this.floatingTexts.push({
        unitId: ev.unit?.uid || ev.unit?.id,
        text: label,
        color,
        age: 0,
        maxAge: 55,
      });
      if (ev.isBreak) {
        this.spawnBreakParticles(ev.unit?.uid || ev.unit?.id);
      }
    } else if (ev.type === 'heal') {
      this.floatingTexts.push({
        unitId: ev.unit?.uid || ev.unit?.id,
        text: `${ev.tag ? ev.tag + ' ' : ''}+${ev.amount}`,
        color: '#4ade80',
        age: 0,
        maxAge: 55,
      });
    } else if (ev.type === 'text') {
      this.floatingTexts.push({
        unitId: ev.unit?.uid || ev.unit?.id,
        text: ev.text,
        color: ev.color || '#38bdf8',
        age: 0,
        maxAge: 50,
      });
    }
  }

  spawnBreakParticles(unitId) {
    for (let i = 0; i < 18; i++) {
      const angle = (Math.PI * 2 * i) / 18;
      const speed = 1.5 + Math.random() * 2.5;
      this.particles.push({
        unitId,
        dx: Math.cos(angle) * speed,
        dy: Math.sin(angle) * speed,
        ox: 0,
        oy: 0,
        age: 0,
        maxAge: 35,
        color: i % 2 === 0 ? '#facc15' : '#38bdf8',
      });
    }
  }

  render(engine, timestamp = 0) {
    const ctx = this.ctx;
    const W = this.canvas.width;
    const H = this.canvas.height;

    ctx.clearRect(0, 0, W, H);

    if (engine.state === 'COMBAT' && engine.combat) {
      this.renderCombat(ctx, W, H, engine, timestamp);
    } else {
      this.renderDungeon(ctx, W, H, engine, timestamp);
    }
  }

  renderDungeon(ctx, W, H, engine, timestamp) {
    this.enemyBounds = [];
    const { dungeon, playerPos, party } = engine;
    const tileW = Math.floor(W / dungeon.width);
    const tileH = Math.floor(H / dungeon.height);
    const pulse = 0.5 + 0.5 * Math.sin(timestamp * 0.005);

    ctx.fillStyle = '#07060b';
    ctx.fillRect(0, 0, W, H);

    // Draw Tiles
    for (let y = 0; y < dungeon.height; y++) {
      for (let x = 0; x < dungeon.width; x++) {
        const isVis = dungeon.visible[y][x];
        const isExp = dungeon.explored[y][x];
        if (!isVis && !isExp) continue;

        const tile = dungeon.tiles[y][x];
        const px = x * tileW;
        const py = y * tileH;

        ctx.save();
        if (!isVis) {
          ctx.globalAlpha = 0.34;
        }

        if (tile.id === 'wall') {
          ctx.fillStyle = '#251f33';
          ctx.fillRect(px, py, tileW, tileH);
          ctx.fillStyle = '#38304c';
          ctx.fillRect(px, py, tileW, Math.max(3, Math.floor(tileH * 0.35)));
          ctx.strokeStyle = '#161221';
          ctx.strokeRect(px + 0.5, py + 0.5, tileW - 1, tileH - 1);
        } else {
          ctx.fillStyle = (x + y) % 2 === 0 ? '#181523' : '#1b1828';
          ctx.fillRect(px, py, tileW, tileH);

          if (tile.id === 'stairs') {
            ctx.fillStyle = '#facc15';
            for (let s = 0; s < 3; s++) {
              ctx.fillRect(
                px + 3 + s * 2,
                py + 4 + s * 4,
                tileW - 6 - s * 2,
                3
              );
            }
          } else if (tile.id === 'shrine') {
            ctx.fillStyle = tile.used ? '#475569' : '#38bdf8';
            ctx.beginPath();
            ctx.moveTo(px + tileW / 2, py + 2);
            ctx.lineTo(px + tileW - 3, py + tileH / 2);
            ctx.lineTo(px + tileW / 2, py + tileH - 2);
            ctx.lineTo(px + 3, py + tileH / 2);
            ctx.closePath();
            ctx.fill();
          }
        }
        ctx.restore();
      }
    }

    // Draw Treasure Chests
    for (const chest of dungeon.chests) {
      if (!dungeon.visible[chest.y][chest.x] && !dungeon.explored[chest.y][chest.x]) {
        continue;
      }
      const px = chest.x * tileW;
      const py = chest.y * tileH;
      ctx.save();
      if (!dungeon.visible[chest.y][chest.x]) ctx.globalAlpha = 0.4;
      ctx.fillStyle = chest.opened ? '#64748b' : '#d97706';
      ctx.fillRect(px + 3, py + 4, tileW - 6, tileH - 6);
      ctx.fillStyle = chest.opened ? '#94a3b8' : '#facc15';
      ctx.fillRect(px + 3, py + Math.floor(tileH / 2) - 1, tileW - 6, 2);
      ctx.restore();
    }

    // Draw Monsters in FOV
    for (const mob of dungeon.entities) {
      if (!dungeon.visible[mob.y][mob.x]) continue;
      const px = mob.x * tileW;
      const py = mob.y * tileH;
      ctx.save();
      ctx.fillStyle = mob.color || '#ef4444';
      ctx.beginPath();
      ctx.arc(
        px + tileW / 2,
        py + tileH / 2,
        Math.min(tileW, tileH) * (mob.isBoss ? 0.46 : 0.36),
        0,
        Math.PI * 2
      );
      ctx.fill();
      ctx.strokeStyle = mob.isBoss ? '#fef08a' : '#111827';
      ctx.lineWidth = mob.isBoss ? 2 : 1;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(mob.glyph, px + tileW / 2, py + tileH / 2 + 0.5);
      ctx.restore();
    }

    // Draw Player Party Avatar
    const ppx = playerPos.x * tileW;
    const ppy = playerPos.y * tileH;
    const leadHero = party[0];

    // HD-2D Torchlight Warm Radial Glow
    const cx = ppx + tileW / 2;
    const cy = ppy + tileH / 2;
    const grad = ctx.createRadialGradient(
      cx,
      cy,
      tileW * 0.5,
      cx,
      cy,
      tileW * (7.5 + pulse * 0.4)
    );
    grad.addColorStop(0, 'rgba(251, 191, 36, 0.22)');
    grad.addColorStop(0.5, 'rgba(245, 158, 11, 0.07)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0.65)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Draw Hero Sprite on Map
    this.drawPixelHero(
      ctx,
      cx - 8,
      cy - 9,
      2,
      leadHero.palette || { primary: '#3b82f6', cape: '#f8fafc', trim: '#facc15' },
      leadHero.hairColor
    );

    // Overlay Banner if Victory or Game Over
    if (engine.state === 'VICTORY' || engine.state === 'GAMEOVER') {
      ctx.fillStyle = 'rgba(9, 10, 18, 0.82)';
      ctx.fillRect(0, 0, W, H);
      ctx.textAlign = 'center';
      ctx.fillStyle = engine.state === 'VICTORY' ? '#facc15' : '#f87171';
      ctx.font = 'bold 30px "Georgia", serif';
      ctx.fillText(
        engine.state === 'VICTORY'
          ? '✨ SANCTUM CRYSTALS RESTORED! ✨'
          : '💀 PARTY FALLEN IN BATTLE 💀',
        W / 2,
        H / 2 - 16
      );
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '15px sans-serif';
      ctx.fillText(
        'Click "New Seeded Run" in the top bar to embark on another adventure.',
        W / 2,
        H / 2 + 20
      );
    }
  }

  renderCombat(ctx, W, H, engine, timestamp) {
    const combat = engine.combat;
    this.enemyBounds = [];

    // 1. HD-2D Battle Backdrop (Sanctum Pillars + Torchlit Floor)
    const skyGrad = ctx.createLinearGradient(0, 0, 0, H * 0.55);
    skyGrad.addColorStop(0, '#090714');
    skyGrad.addColorStop(1, '#1e1633');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, H * 0.55);

    // Distant pillars
    ctx.fillStyle = '#161126';
    for (let i = 0; i < 6; i++) {
      const px = 50 + i * 135;
      ctx.fillRect(px, 24, 34, H * 0.55 - 24);
      ctx.fillStyle = '#251d3d';
      ctx.fillRect(px + 4, 24, 6, H * 0.55 - 24);
      ctx.fillStyle = '#161126';
    }

    // Torch flames on pillars
    const flicker = Math.sin(timestamp * 0.01) * 3;
    for (let i = 0; i < 6; i++) {
      const tx = 67 + i * 135;
      const ty = 85;
      const tGrad = ctx.createRadialGradient(tx, ty, 2, tx, ty, 42 + flicker);
      tGrad.addColorStop(0, 'rgba(253, 224, 71, 0.85)');
      tGrad.addColorStop(0.4, 'rgba(249, 115, 22, 0.35)');
      tGrad.addColorStop(1, 'rgba(249, 115, 22, 0)');
      ctx.fillStyle = tGrad;
      ctx.beginPath();
      ctx.arc(tx, ty, 42 + flicker, 0, Math.PI * 2);
      ctx.fill();
    }

    // Perspective stone battle floor
    const floorGrad = ctx.createLinearGradient(0, H * 0.52, 0, H);
    floorGrad.addColorStop(0, '#231c35');
    floorGrad.addColorStop(1, '#100d19');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, H * 0.52, W, H * 0.48);

    // Subtle tile perspective lines
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.08)';
    ctx.lineWidth = 1;
    for (let row = 0; row < 6; row++) {
      const ry = H * 0.52 + row * 36;
      ctx.beginPath();
      ctx.moveTo(0, ry);
      ctx.lineTo(W, ry);
      ctx.stroke();
    }

    const unitPositions = new Map();

    // 2. Render Turn Order Bar at Top of Battle Screen (Octopath-style)
    this.renderTurnOrderBar(ctx, W, combat);

    // 3. Render Enemies on Left Side
    combat.enemies.forEach((enemy, idx) => {
      if (enemy.hp <= 0) return;

      const ex = enemy.isBoss ? 145 : 105 + (idx % 2) * 125;
      const ey = enemy.isBoss ? 195 : 165 + idx * 82;
      unitPositions.set(enemy.uid, { x: ex, y: ey });

      const isSelected = idx === combat.selectedTargetIndex;
      this.enemyBounds.push({
        index: idx,
        x: ex - 58,
        y: ey - 55,
        w: 116,
        h: 115,
      });

      // Selection reticle under target enemy
      if (isSelected) {
        ctx.save();
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(ex, ey + 28, 44, 13, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Draw Enemy Pixel Sprite
      this.drawEnemySprite(ctx, ex, ey, enemy, timestamp);

      // Enemy Name & HP Bar
      const barW = 114;
      const bx = ex - barW / 2;
      const by = ey + 34;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.fillRect(bx, by, barW, 38);
      ctx.strokeStyle = isSelected ? '#facc15' : '#475569';
      ctx.lineWidth = 1;
      ctx.strokeRect(bx, by, barW, 38);

      // Name & HP
      ctx.fillStyle = enemy.broken ? '#f87171' : '#f8fafc';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(enemy.name.slice(0, 16), bx + 5, by + 12);

      // HP Gauge
      const hpPct = Math.max(0, enemy.hp / enemy.maxHp);
      ctx.fillStyle = '#334155';
      ctx.fillRect(bx + 5, by + 16, barW - 10, 5);
      ctx.fillStyle = enemy.broken ? '#f43f5e' : '#22c55e';
      ctx.fillRect(bx + 5, by + 16, (barW - 10) * hpPct, 5);

      // Octopath Shield Point Badge (Hexagon on left of enemy bar)
      this.drawShieldBadge(ctx, bx - 16, by + 16, enemy.shield, enemy.broken);

      // Weakness Icons Row
      enemy.weaknesses.forEach((wKey, wIdx) => {
        const wx = bx + 6 + wIdx * 18;
        const wy = by + 24;
        const revealed = enemy.revealedWeaknesses.has(wKey);
        ctx.fillStyle = revealed ? '#1e293b' : '#0f172a';
        ctx.fillRect(wx, wy, 15, 12);
        ctx.strokeStyle = revealed ? '#38bdf8' : '#334155';
        ctx.strokeRect(wx, wy, 15, 12);

        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = revealed ? '#ffffff' : '#64748b';
        ctx.fillText(
          revealed ? DAMAGE_TYPES[wKey]?.icon || '?' : '?',
          wx + 7.5,
          wy + 10
        );
      });
    });

    // 4. Render Party Heroes on Right Side (Classic FF4/5/6 Column)
    combat.party.forEach((hero, idx) => {
      const hx = W - 165 + (idx % 2) * 24;
      const hy = 145 + idx * 68;
      unitPositions.set(hero.id, { x: hx, y: hy });

      const isActive = combat.activeUnit && combat.activeUnit.id === hero.id;

      // Active Hero Turn Ring + Boost Aura
      if (isActive) {
        ctx.save();
        const boost = combat.selectedBoost || 0;
        ctx.strokeStyle = boost > 0 ? '#f97316' : '#38bdf8';
        ctx.lineWidth = 2 + boost;
        ctx.beginPath();
        ctx.ellipse(hx + 14, hy + 26, 26, 9, 0, 0, Math.PI * 2);
        ctx.stroke();

        if (boost > 0) {
          const glow = ctx.createRadialGradient(
            hx + 14,
            hy + 10,
            4,
            hx + 14,
            hy + 10,
            28 + boost * 8
          );
          glow.addColorStop(0, 'rgba(251, 146, 60, 0.45)');
          glow.addColorStop(1, 'rgba(251, 146, 60, 0)');
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(hx + 14, hy + 10, 28 + boost * 8, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      if (hero.hp <= 0) {
        ctx.save();
        ctx.globalAlpha = 0.45;
        this.drawPixelHero(ctx, hx, hy + 10, 3, hero.palette, hero.hairColor);
        ctx.restore();
      } else {
        const stepForward = isActive ? -16 : 0;
        this.drawPixelHero(
          ctx,
          hx + stepForward,
          hy,
          3,
          hero.palette,
          hero.hairColor
        );
      }

      // Hero Name & BP Pips above/beside sprite
      ctx.fillStyle = isActive ? '#fde047' : '#e2e8f0';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(hero.name, hx + 36, hy + 8);

      // Draw BP Pips (Octopath Orange Gems)
      for (let b = 0; b < 5; b++) {
        const px = hx + 36 + b * 10;
        const py = hy + 14;
        const filled = b < hero.bp;
        const spending =
          isActive && b >= hero.bp - combat.selectedBoost && b < hero.bp;
        ctx.fillStyle = spending
          ? '#38bdf8'
          : filled
          ? '#f59e0b'
          : '#1e293b';
        ctx.fillRect(px, py, 7, 7);
        ctx.strokeStyle = '#78350f';
        ctx.strokeRect(px, py, 7, 7);
      }
    });

    // 5. Render Break Particles & Floating Combat Popups
    this.updateAndDrawEffects(ctx, unitPositions);

    // 6. HD-2D Atmospheric Corner Vignette
    const vig = ctx.createRadialGradient(W / 2, H / 2, W * 0.3, W / 2, H / 2, W * 0.65);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(4, 3, 10, 0.52)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);
  }

  renderTurnOrderBar(ctx, W, combat) {
    const barX = 16;
    const barY = 12;
    const barH = 32;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(barX, barY, W - 32, barH);
    ctx.strokeStyle = '#475569';
    ctx.strokeRect(barX, barY, W - 32, barH);

    ctx.fillStyle = '#facc15';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`ROUND ${combat.round} ORDER:`, barX + 10, barY + 20);

    const sequence = [
      ...(combat.activeUnit ? [combat.activeUnit] : []),
      ...combat.turnQueue,
    ];

    sequence.slice(0, 8).forEach((u, i) => {
      const ux = barX + 125 + i * 74;
      const uy = barY + 5;
      ctx.fillStyle =
        i === 0
          ? '#1d4ed8'
          : u.isEnemy
          ? '#4c0519'
          : '#1e293b';
      ctx.fillRect(ux, uy, 68, 22);
      ctx.strokeStyle = i === 0 ? '#fde047' : u.isEnemy ? '#f43f5e' : '#38bdf8';
      ctx.strokeRect(ux, uy, 68, 22);

      ctx.fillStyle = '#f8fafc';
      ctx.font = i === 0 ? 'bold 10px sans-serif' : '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(u.name.slice(0, 9), ux + 34, uy + 15);
    });
  }

  drawShieldBadge(ctx, cx, cy, shield, broken) {
    ctx.save();
    ctx.beginPath();
    const r = 13;
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i - Math.PI / 6;
      const x = cx + r * Math.cos(a);
      const y = cy + r * Math.sin(a);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = broken ? '#450a0a' : '#1e3a8a';
    ctx.fill();
    ctx.strokeStyle = broken ? '#f87171' : '#60a5fa';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = broken ? '#fca5a5' : '#ffffff';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(broken ? '!' : String(shield), cx, cy + 1);
    ctx.restore();
  }

  drawPixelHero(ctx, x, y, scale, palette, hairColor = '#fde047') {
    const p = (gx, gy, w, h, color) => {
      ctx.fillStyle = color;
      ctx.fillRect(x + gx * scale, y + gy * scale, w * scale, h * scale);
    };
    // Cape
    p(3, 4, 5, 5, palette.cape || '#ef4444');
    // Head & Hair
    p(2, 0, 4, 2, hairColor);
    p(2, 2, 4, 2, '#fed7aa');
    p(2, 2, 1, 1, '#0f172a'); // Eye facing left
    // Torso & Trim
    p(2, 4, 4, 4, palette.primary || '#3b82f6');
    p(2, 5, 4, 1, palette.trim || '#facc15');
    // Boots
    p(2, 8, 1, 2, '#cbd5e1');
    p(5, 8, 1, 2, '#cbd5e1');
    // Weapon glint
    p(0, 4, 2, 1, '#e2e8f0');
  }

  drawEnemySprite(ctx, cx, cy, enemy, timestamp) {
    const bob = enemy.broken ? 0 : Math.sin(timestamp * 0.006 + cx) * 3;
    ctx.save();
    if (enemy.broken) {
      ctx.globalAlpha = 0.72;
    }

    const r = enemy.isBoss ? 38 : 26;
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 24, r * 0.9, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Main Silhouette / Pixel Art Block
    ctx.fillStyle = enemy.color || '#ef4444';
    ctx.fillRect(cx - r * 0.75, cy - r + bob, r * 1.5, r * 1.5);

    // Inner armor / highlight
    ctx.strokeStyle = enemy.isBoss ? '#fde047' : '#ffffff';
    ctx.lineWidth = enemy.isBoss ? 3 : 1.5;
    ctx.strokeRect(cx - r * 0.75, cy - r + bob, r * 1.5, r * 1.5);

    // Eyes
    ctx.fillStyle = enemy.broken ? '#94a3b8' : '#fef08a';
    ctx.fillRect(cx - 4, cy - r * 0.4 + bob, 5, 5);
    ctx.fillRect(cx + 8, cy - r * 0.4 + bob, 5, 5);

    if (enemy.broken) {
      ctx.fillStyle = '#f87171';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('BROKEN', cx, cy - r - 8);
    }
    ctx.restore();
  }

  updateAndDrawEffects(ctx, unitPositions) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.age += 1;
      pt.ox += pt.dx;
      pt.oy += pt.dy;
      if (pt.age >= pt.maxAge) {
        this.particles.splice(i, 1);
        continue;
      }
      const pos = unitPositions.get(pt.unitId);
      if (!pos) continue;
      ctx.fillStyle = pt.color;
      ctx.fillRect(pos.x + pt.ox, pos.y + pt.oy, 4, 4);
    }

    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.age += 1;
      if (ft.age >= ft.maxAge) {
        this.floatingTexts.splice(i, 1);
        continue;
      }
      const pos = unitPositions.get(ft.unitId) || { x: 240, y: 180 };
      const yOffset = -20 - ft.age * 0.7;
      ctx.save();
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#000000';
      ctx.fillText(ft.text, pos.x + 1, pos.y + yOffset + 1);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, pos.x, pos.y + yOffset);
      ctx.restore();
    }
  }
}
