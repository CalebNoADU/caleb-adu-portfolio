/**
 * Core Game Engine & State Machine (strictly decoupled from DOM/Canvas rendering).
 * Enforces a strict turn-based loop:
 *   Player Input -> Validate Action -> Update State -> Process Monster/Environment Turns -> Recompute FOV.
 */
import { SeededRNG } from './rng.js';
import { HERO_TEMPLATES, JOBS, ITEMS } from './data.js';
import { generateDungeon } from './dungeon.js';
import { computeFOV } from './fov.js';
import { CombatEncounter } from './combat.js';

export class GameEngine {
  constructor(seed = 'OCTOPATH-FF6', onVisualEvent = () => {}) {
    this.onVisualEvent = onVisualEvent;
    this.maxFloors = 3;
    this.initNewRun(seed);
  }

  initNewRun(seed = this.seed) {
    this.seed = String(seed || 'OCTOPATH-FF6').trim() || 'OCTOPATH-FF6';
    this.rng = new SeededRNG(this.seed);
    this.floor = 1;
    this.turnCount = 0;
    this.state = 'EXPLORE'; // 'EXPLORE' | 'COMBAT' | 'VICTORY' | 'GAMEOVER'
    this.logs = [];
    this.relics = [];
    this.inventory = {
      potion: 2,
      ether: 1,
      pomegranate: 1,
    };

    this.party = HERO_TEMPLATES.map((tpl) => this.createHero(tpl));
    this.combat = null;

    this.loadFloor(1);
    this.addLog(
      `Entered the Sanctum of Crystals (Floor 1/${this.maxFloors}) — Seed: "${this.seed}".`
    );
    this.addLog(
      'Explore the dungeon, open chests, attune Crystal Shrines, and shatter enemy Shields!'
    );
  }

  createHero(tpl) {
    const hero = {
      id: tpl.id,
      name: tpl.name,
      title: tpl.title,
      hairColor: tpl.hairColor,
      level: 1,
      xp: 0,
      nextXp: 45,
      jobId: tpl.defaultJob,
      baseStats: { ...tpl.baseStats },
      hp: 100,
      maxHp: 100,
      mp: 30,
      maxMp: 30,
      atk: 10,
      def: 10,
      mag: 10,
      mnd: 10,
      spd: 10,
      bp: 1,
      weapon: 'sword',
      skills: [],
      defending: false,
      defBuffTurns: 0,
    };
    this.recalculateHeroStats(hero, true);
    return hero;
  }

  recalculateHeroStats(hero, fullRestore = false) {
    const job = JOBS[hero.jobId] || JOBS.knight;
    const hpRatio = hero.maxHp > 0 ? hero.hp / hero.maxHp : 1;
    const mpRatio = hero.maxMp > 0 ? hero.mp / hero.maxMp : 1;

    const relicBonus = { maxHp: 0, maxMp: 0, atk: 0, def: 0, mag: 0, mnd: 0, spd: 0 };
    for (const relicId of this.relics) {
      const item = ITEMS[relicId];
      if (item && item.statBonuses) {
        for (const [k, v] of Object.entries(item.statBonuses)) {
          relicBonus[k] = (relicBonus[k] || 0) + v;
        }
      }
    }

    const lvlBonus = hero.level - 1;
    hero.maxHp =
      hero.baseStats.maxHp + job.bonuses.maxHp + relicBonus.maxHp + lvlBonus * 14;
    hero.maxMp =
      hero.baseStats.maxMp + job.bonuses.maxMp + relicBonus.maxMp + lvlBonus * 5;
    hero.atk = hero.baseStats.atk + job.bonuses.atk + relicBonus.atk + lvlBonus * 3;
    hero.def = hero.baseStats.def + job.bonuses.def + relicBonus.def + lvlBonus * 2;
    hero.mag = hero.baseStats.mag + job.bonuses.mag + relicBonus.mag + lvlBonus * 3;
    hero.mnd = hero.baseStats.mnd + job.bonuses.mnd + relicBonus.mnd + lvlBonus * 2;
    hero.spd = hero.baseStats.spd + job.bonuses.spd + relicBonus.spd + lvlBonus * 1;

    hero.weapon = job.weapon;
    hero.jobName = job.name;
    hero.palette = job.palette;
    hero.skills = [...job.skills];

    if (fullRestore) {
      hero.hp = hero.maxHp;
      hero.mp = hero.maxMp;
    } else {
      hero.hp = Math.min(hero.maxHp, Math.max(1, Math.round(hero.maxHp * hpRatio)));
      hero.mp = Math.min(hero.maxMp, Math.max(0, Math.round(hero.maxMp * mpRatio)));
    }
  }

  changeHeroJob(heroId, newJobId) {
    if (!JOBS[newJobId]) return false;
    const hero = this.party.find((h) => h.id === heroId);
    if (!hero) return false;
    hero.jobId = newJobId;
    this.recalculateHeroStats(hero, false);
    this.addLog(`❖ ${hero.name} changed Job to ${JOBS[newJobId].name}!`);
    return true;
  }

  loadFloor(floorNumber) {
    this.floor = floorNumber;
    this.dungeon = generateDungeon({
      width: 44,
      height: 28,
      floor: floorNumber,
      maxFloors: this.maxFloors,
      rng: this.rng,
    });
    this.playerPos = { ...this.dungeon.startPos };
    computeFOV(this.dungeon, this.playerPos.x, this.playerPos.y, 8);
  }

  addLog(message) {
    this.logs.unshift({ id: `${this.turnCount}_${this.logs.length}`, text: message });
    if (this.logs.length > 40) {
      this.logs.pop();
    }
  }

  /**
   * Turn-Based Exploration Movement:
   * 1. Validate tile bounds & walkability
   * 2. Check monster collision (triggers JRPG combat)
   * 3. Update player position, open chests, trigger shrines/stairs
   * 4. Advance monster AI turns on map
   * 5. Recompute FOV
   */
  movePlayer(dx, dy) {
    if (this.state !== 'EXPLORE') return false;

    const nx = this.playerPos.x + dx;
    const ny = this.playerPos.y + dy;

    if (
      nx < 0 ||
      nx >= this.dungeon.width ||
      ny < 0 ||
      ny >= this.dungeon.height
    ) {
      return false;
    }

    const tile = this.dungeon.tiles[ny][nx];
    if (!tile.walkable) {
      return false;
    }

    this.turnCount += 1;

    // Check if an enemy occupies the destination tile
    const monster = this.dungeon.entities.find((e) => e.x === nx && e.y === ny);
    if (monster) {
      this.startCombat(monster);
      return true;
    }

    this.playerPos.x = nx;
    this.playerPos.y = ny;

    // Check treasure chest at new position
    const chest = this.dungeon.chests.find(
      (c) => !c.opened && c.x === nx && c.y === ny
    );
    if (chest) {
      chest.opened = true;
      this.grantItem(chest.itemId);
    }

    // Check Crystal Shrine at new position
    if (tile.id === 'shrine' && !tile.used) {
      tile.used = true;
      for (const hero of this.party) {
        hero.hp = hero.maxHp;
        hero.mp = hero.maxMp;
        hero.bp = Math.min(5, (hero.bp || 1) + 2);
      }
      this.addLog(
        '❖ Crystal Shrine resonates! Party HP & MP fully restored and +2 BP granted!'
      );
    }

    // Check Descending Stairs
    if (tile.id === 'stairs') {
      const nextFloor = this.floor + 1;
      this.loadFloor(nextFloor);
      this.addLog(`Descended the ancient stairs to Floor ${nextFloor}/${this.maxFloors}!`);
      return true;
    }

    // Process Map Monster AI turns
    this.processMapMonsters();

    // Update FOV
    computeFOV(this.dungeon, this.playerPos.x, this.playerPos.y, 8);
    return true;
  }

  grantItem(itemId) {
    const item = ITEMS[itemId];
    if (!item) return;

    if (item.kind === 'relic') {
      if (!this.relics.includes(itemId)) {
        this.relics.push(itemId);
        for (const hero of this.party) {
          this.recalculateHeroStats(hero, false);
        }
        this.addLog(`👑 Found Relic: ${item.name}! (${item.desc})`);
      } else {
        this.inventory.pomegranate = (this.inventory.pomegranate || 0) + 1;
        this.addLog(`📦 Chest contained an Energizing Pomegranate!`);
      }
    } else {
      this.inventory[itemId] = (this.inventory[itemId] || 0) + 1;
      this.addLog(`📦 Opened Treasure Chest: Obtained ${item.name}!`);
    }
  }

  processMapMonsters() {
    for (const mob of [...this.dungeon.entities]) {
      if (mob.isBoss) continue; // Bosses stand guard at the sanctum altar

      const dist =
        Math.abs(mob.x - this.playerPos.x) + Math.abs(mob.y - this.playerPos.y);
      // Only pursue if within player's sight/hearing range
      if (dist > 7) continue;

      const stepX = Math.sign(this.playerPos.x - mob.x);
      const stepY = Math.sign(this.playerPos.y - mob.y);

      const candidates = [];
      if (stepX !== 0) candidates.push({ x: mob.x + stepX, y: mob.y });
      if (stepY !== 0) candidates.push({ x: mob.x, y: mob.y + stepY });

      for (const cand of candidates) {
        if (cand.x === this.playerPos.x && cand.y === this.playerPos.y) {
          this.startCombat(mob);
          return;
        }
        const tile = this.dungeon.tiles[cand.y]?.[cand.x];
        const occupied = this.dungeon.entities.some(
          (other) => other.id !== mob.id && other.x === cand.x && other.y === cand.y
        );
        if (tile && tile.walkable && !occupied) {
          mob.x = cand.x;
          mob.y = cand.y;
          break;
        }
      }
    }
  }

  startCombat(mapEntity) {
    this.state = 'COMBAT';
    this.addLog(
      `⚔️ Encounter! ${mapEntity.name} blocks your path!`
    );
    this.combat = new CombatEncounter({
      party: this.party,
      mapEntity,
      floor: this.floor,
      rng: this.rng,
      inventory: this.inventory,
      onLog: (msg) => this.addLog(msg),
      onVisualEvent: (ev) => this.onVisualEvent(ev),
    });
    this.checkCombatOutcome();
  }

  checkCombatOutcome() {
    if (!this.combat) return;

    if (this.combat.status === 'VICTORY') {
      const defeatedEntity = this.combat.mapEntity;
      const totalXp = this.combat.enemies.reduce((acc, e) => acc + (e.xp || 20), 0);

      // Remove defeated monster from dungeon grid
      this.dungeon.entities = this.dungeon.entities.filter(
        (e) => e.id !== defeatedEntity.id
      );

      // Award XP and handle Level Ups
      for (const hero of this.party) {
        if (hero.hp <= 0) {
          hero.hp = 1; // Revive with 1 HP after battle like modern JRPGs
        }
        hero.xp += totalXp;
        while (hero.xp >= hero.nextXp) {
          hero.xp -= hero.nextXp;
          hero.level += 1;
          hero.nextXp = Math.round(hero.nextXp * 1.45);
          this.recalculateHeroStats(hero, true);
          this.addLog(`🌟 LEVEL UP! ${hero.name} reached Level ${hero.level}!`);
        }
      }

      this.addLog(`🏆 Victory! Party gained ${totalXp} EXP!`);

      if (defeatedEntity.isBoss) {
        this.state = 'VICTORY';
        this.combat = null;
        this.addLog(
          '🎉 You have vanquished Archfiend Galdera-Zemus and restored the Sanctum Crystals!'
        );
        return;
      }

      this.state = 'EXPLORE';
      this.combat = null;
      computeFOV(this.dungeon, this.playerPos.x, this.playerPos.y, 8);
    } else if (this.combat.status === 'DEFEAT') {
      this.state = 'GAMEOVER';
      this.addLog('💀 The party has fallen in the Sanctum...');
    }
  }
}
