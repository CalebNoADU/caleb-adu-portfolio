/**
 * Turn-Based Combat Engine combining:
 * - Octopath Traveler's Break & Boost (Shield Points, Weaknesses, BP 0..5, 1..4x Boost)
 * - Final Fantasy IV/V/VI Party Jobs, Spells, Relics, and Turn Timeline
 */
import { DAMAGE_TYPES, SKILLS, MONSTER_TEMPLATES, ITEMS } from './data.js';

export class CombatEncounter {
  constructor({ party, mapEntity, floor, rng, inventory, onLog, onVisualEvent }) {
    this.party = party;
    this.mapEntity = mapEntity;
    this.floor = floor;
    this.rng = rng;
    this.inventory = inventory;
    this.onLog = onLog || (() => {});
    this.onVisualEvent = onVisualEvent || (() => {});

    this.round = 1;
    this.status = 'ONGOING'; // 'ONGOING' | 'VICTORY' | 'DEFEAT'
    this.selectedBoost = 0; // 0..3 BP to spend on current hero's turn
    this.selectedTargetIndex = 0;

    this.enemies = this.buildEnemies(mapEntity, floor);
    this.turnQueue = [];
    this.activeUnit = null;

    // Reset temporary combat state on heroes
    for (const hero of this.party) {
      hero.bp = Math.min(5, Math.max(1, hero.bp || 1));
      hero.defending = false;
      hero.defBuffTurns = 0;
      hero.spentBpLastTurn = false;
    }

    this.startNewRound(true);
  }

  buildEnemies(mapEntity, floor) {
    const primaryTemplate =
      MONSTER_TEMPLATES[mapEntity.templateId] || MONSTER_TEMPLATES.goblin_guard;

    if (primaryTemplate.isBoss) {
      // Boss + 1 Magitek / Tonberry escort
      const boss = this.instantiateEnemy(primaryTemplate, 0, floor);
      const escort = this.instantiateEnemy(MONSTER_TEMPLATES.tonberry_stalker, 1, floor);
      escort.name = 'Sanctum Sentinel';
      return [boss, escort];
    }

    const count = mapEntity.packSize || 1;
    const pool = Object.values(MONSTER_TEMPLATES).filter(
      (m) => !m.isBoss && floor >= m.minFloor && floor <= m.maxFloor
    );

    const list = [];
    for (let i = 0; i < count; i++) {
      const tpl = i === 0 ? primaryTemplate : this.rng.choice(pool) || primaryTemplate;
      list.push(this.instantiateEnemy(tpl, i, floor));
    }
    return list;
  }

  instantiateEnemy(tpl, idx, floor) {
    const scale = 1 + (floor - 1) * 0.14;
    const maxHp = Math.round(tpl.hp * (tpl.isBoss ? 1 : scale));
    return {
      uid: `enemy_${idx}_${tpl.id}`,
      templateId: tpl.id,
      isEnemy: true,
      isBoss: Boolean(tpl.isBoss),
      name: idx > 0 && !tpl.isBoss ? `${tpl.name} ${String.fromCharCode(65 + idx)}` : tpl.name,
      spriteType: tpl.spriteType,
      color: tpl.color,
      hp: maxHp,
      maxHp,
      shield: tpl.shield,
      maxShield: tpl.shield,
      broken: false,
      recoverOnNextTurn: false,
      atk: Math.round(tpl.atk * (tpl.isBoss ? 1 : scale)),
      def: tpl.def,
      spd: tpl.spd,
      xp: tpl.xp,
      weaknesses: [...tpl.weaknesses],
      revealedWeaknesses: new Set(),
      actions: tpl.actions,
    };
  }

  livingHeroes() {
    return this.party.filter((h) => h.hp > 0);
  }

  livingEnemies() {
    return this.enemies.filter((e) => e.hp > 0);
  }

  ensureValidTarget() {
    const alive = this.livingEnemies();
    if (alive.length === 0) return null;
    if (
      !this.enemies[this.selectedTargetIndex] ||
      this.enemies[this.selectedTargetIndex].hp <= 0
    ) {
      this.selectedTargetIndex = this.enemies.findIndex((e) => e.hp > 0);
    }
    return this.enemies[this.selectedTargetIndex];
  }

  startNewRound(isFirstRound = false) {
    if (!isFirstRound) {
      this.round += 1;
    }

    // Grant +1 BP at start of round to living heroes who didn't spend BP on their previous turn
    for (const hero of this.livingHeroes()) {
      if (!isFirstRound && !hero.spentBpLastTurn) {
        hero.bp = Math.min(5, hero.bp + 1);
      }
      hero.spentBpLastTurn = false;
      if (hero.defBuffTurns > 0) {
        hero.defBuffTurns -= 1;
      }
    }

    const units = [...this.livingHeroes(), ...this.livingEnemies()];
    units.sort((a, b) => {
      const spdA = a.spd + (a.defending ? 8 : 0);
      const spdB = b.spd + (b.defending ? 8 : 0);
      return spdB - spdA;
    });

    this.turnQueue = units;
    this.advanceTurn();
  }

  advanceTurn() {
    if (this.livingEnemies().length === 0) {
      this.status = 'VICTORY';
      this.activeUnit = null;
      return;
    }
    if (this.livingHeroes().length === 0) {
      this.status = 'DEFEAT';
      this.activeUnit = null;
      return;
    }

    // Filter out dead units from queue
    this.turnQueue = this.turnQueue.filter((u) => u.hp > 0);

    if (this.turnQueue.length === 0) {
      this.startNewRound(false);
      return;
    }

    this.activeUnit = this.turnQueue.shift();
    this.selectedBoost = 0;
    this.ensureValidTarget();

    if (this.activeUnit.isEnemy) {
      this.processEnemyTurn(this.activeUnit);
    } else {
      // Hero's turn begins: clear their defending stance from last round
      this.activeUnit.defending = false;
    }
  }

  setBoost(level) {
    if (!this.activeUnit || this.activeUnit.isEnemy) return;
    const maxAffordable = Math.min(3, this.activeUnit.bp);
    this.selectedBoost = Math.max(0, Math.min(maxAffordable, level));
  }

  cycleBoost() {
    if (!this.activeUnit || this.activeUnit.isEnemy) return;
    const maxAffordable = Math.min(3, this.activeUnit.bp);
    this.selectedBoost = this.selectedBoost >= maxAffordable ? 0 : this.selectedBoost + 1;
  }

  /**
   * Player Action: Basic Weapon Attack
   * Boost multiplies the number of hits: 1 + boostLevel (up to 4 hits!).
   */
  executeHeroAttack(targetIndex = this.selectedTargetIndex) {
    const hero = this.activeUnit;
    if (!hero || hero.isEnemy || this.status !== 'ONGOING') return false;

    const target = this.enemies[targetIndex] && this.enemies[targetIndex].hp > 0
      ? this.enemies[targetIndex]
      : this.ensureValidTarget();
    if (!target) return false;

    const boost = this.selectedBoost;
    if (boost > 0) {
      hero.bp -= boost;
      hero.spentBpLastTurn = true;
    }

    const hits = 1 + boost;
    const weaponType = hero.weapon;
    const typeInfo = DAMAGE_TYPES[weaponType];

    this.onLog(
      `${hero.name} attacks ${target.name} with ${typeInfo.icon} ${typeInfo.label}${
        boost > 0 ? ` [BOOST x${hits}!]` : ''
      }!`
    );

    for (let h = 0; h < hits; h++) {
      if (target.hp <= 0) break;
      this.applyHit({
        attacker: hero,
        target,
        damageType: weaponType,
        statValue: hero.atk,
        power: 0.92,
      });
    }

    this.advanceTurn();
    return true;
  }

  /**
   * Player Action: Defend (FF-style Guard + moves earlier next round)
   */
  executeHeroDefend() {
    const hero = this.activeUnit;
    if (!hero || hero.isEnemy || this.status !== 'ONGOING') return false;

    const boost = this.selectedBoost;
    if (boost > 0) {
      hero.bp -= boost;
      hero.spentBpLastTurn = true;
    }

    hero.defending = true;
    const mpGain = 3 + boost * 3;
    hero.mp = Math.min(hero.maxMp, hero.mp + mpGain);
    this.onLog(`${hero.name} takes a defensive stance (Damage halved, +${mpGain} MP)!`);
    this.onVisualEvent({ type: 'text', unit: hero, text: 'GUARD', color: '#38bdf8' });

    this.advanceTurn();
    return true;
  }

  /**
   * Player Action: Job Skill / Magic Spell
   */
  executeHeroSkill(skillId, targetIndex = this.selectedTargetIndex) {
    const hero = this.activeUnit;
    if (!hero || hero.isEnemy || this.status !== 'ONGOING') return false;

    const skill = SKILLS[skillId];
    if (!skill) return false;
    if (hero.mp < skill.mpCost) {
      this.onLog(`Not enough MP for ${skill.name}!`);
      return false;
    }

    const boost = this.selectedBoost;
    hero.mp -= skill.mpCost;
    if (boost > 0) {
      hero.bp -= boost;
      hero.spentBpLastTurn = true;
    }

    const boostScale = 1 + boost * 0.48;

    if (skill.type === 'heal') {
      const healAmount = Math.round((hero.mnd * 2.2 + 22) * skill.power * boostScale);
      for (const ally of this.livingHeroes()) {
        ally.hp = Math.min(ally.maxHp, ally.hp + healAmount);
        this.onVisualEvent({ type: 'heal', unit: ally, amount: healAmount });
      }
      this.onLog(
        `${hero.name} casts ${skill.name}${
          boost > 0 ? ` [BOOST +${boost}]` : ''
        }! Party recovers ${healAmount} HP!`
      );
      this.advanceTurn();
      return true;
    }

    if (skill.type === 'revive') {
      const healAmount = Math.round((hero.mnd * 1.9 + 18) * boostScale);
      for (const ally of this.party) {
        const wasDead = ally.hp <= 0;
        ally.hp = Math.min(ally.maxHp, ally.hp + healAmount);
        this.onVisualEvent({
          type: 'heal',
          unit: ally,
          amount: healAmount,
          tag: wasDead ? 'REVIVED!' : undefined,
        });
      }
      this.onLog(`${hero.name} invokes ${skill.name}! Fallen allies rise and party heals ${healAmount} HP!`);
      this.advanceTurn();
      return true;
    }

    if (skill.type === 'buff') {
      const healAmount = Math.round((hero.mnd * 1.2 + 12) * boostScale);
      for (const ally of this.livingHeroes()) {
        ally.defBuffTurns = 3 + boost;
        ally.hp = Math.min(ally.maxHp, ally.hp + healAmount);
        this.onVisualEvent({ type: 'heal', unit: ally, amount: healAmount, tag: 'DEF UP' });
      }
      this.onLog(`${hero.name} uses ${skill.name}! Party DEF raised and +${healAmount} HP!`);
      this.advanceTurn();
      return true;
    }

    if (skill.type === 'chakra') {
      const hpAmt = Math.round((hero.mnd * 1.5 + 15) * boostScale);
      const mpAmt = 8 + boost * 5;
      for (const ally of this.livingHeroes()) {
        ally.hp = Math.min(ally.maxHp, ally.hp + hpAmt);
        ally.mp = Math.min(ally.maxMp, ally.mp + mpAmt);
        this.onVisualEvent({ type: 'heal', unit: ally, amount: hpAmt, tag: `+${mpAmt} MP` });
      }
      this.onLog(`${hero.name} channels ${skill.name}! Party restores ${hpAmt} HP & ${mpAmt} MP!`);
      this.advanceTurn();
      return true;
    }

    if (skill.type === 'bp_boost') {
      const bpGain = 1 + boost;
      for (const ally of this.livingHeroes()) {
        if (ally.id !== hero.id) {
          ally.bp = Math.min(5, ally.bp + bpGain);
          this.onVisualEvent({ type: 'text', unit: ally, text: `+${bpGain} BP`, color: '#facc15' });
        }
      }
      this.onLog(`${hero.name} uses ${skill.name}! Allies gain +${bpGain} BP!`);
      this.advanceTurn();
      return true;
    }

    if (skill.type === 'scan') {
      const revealCount = 2 + boost;
      for (const enemy of this.livingEnemies()) {
        let revealed = 0;
        for (const w of enemy.weaknesses) {
          if (!enemy.revealedWeaknesses.has(w) && revealed < revealCount) {
            enemy.revealedWeaknesses.add(w);
            revealed++;
          }
        }
        this.onVisualEvent({ type: 'text', unit: enemy, text: 'SCANNED!', color: '#38bdf8' });
      }
      this.onLog(`${hero.name} uses ${skill.name}! Enemy weaknesses analyzed!`);
      this.advanceTurn();
      return true;
    }

    // Offensive skill (Single or All)
    const targets =
      skill.target === 'all'
        ? this.livingEnemies()
        : [
            this.enemies[targetIndex] && this.enemies[targetIndex].hp > 0
              ? this.enemies[targetIndex]
              : this.ensureValidTarget(),
          ].filter(Boolean);

    const hits = skill.hits || 1;
    const statVal = skill.stat === 'mag' ? hero.mag : hero.atk;
    const typeInfo = DAMAGE_TYPES[skill.type] || DAMAGE_TYPES.sword;

    this.onLog(
      `${hero.name} unleashes ${typeInfo.icon} ${skill.name}${
        boost > 0 ? ` [BOOST +${boost}!]` : ''
      }!`
    );

    let totalDealt = 0;
    for (const enemy of targets) {
      for (let h = 0; h < hits; h++) {
        if (enemy.hp <= 0) break;
        const dmg = this.applyHit({
          attacker: hero,
          target: enemy,
          damageType: skill.type,
          statValue: statVal,
          power: skill.power * boostScale,
        });
        totalDealt += dmg;
      }
    }

    if (skill.drain && totalDealt > 0) {
      const drained = Math.max(1, Math.round(totalDealt * skill.drain));
      hero.hp = Math.min(hero.maxHp, hero.hp + drained);
      this.onVisualEvent({ type: 'heal', unit: hero, amount: drained, tag: 'DRAIN' });
    }

    this.advanceTurn();
    return true;
  }

  /**
   * Player Action: Use Consumable Item
   */
  executeHeroItem(itemId) {
    const hero = this.activeUnit;
    if (!hero || hero.isEnemy || this.status !== 'ONGOING') return false;

    const count = this.inventory[itemId] || 0;
    const item = ITEMS[itemId];
    if (!item || count <= 0) return false;

    this.inventory[itemId] -= 1;

    if (item.effect === 'heal_party') {
      for (const ally of this.livingHeroes()) {
        ally.hp = Math.min(ally.maxHp, ally.hp + item.amount);
        this.onVisualEvent({ type: 'heal', unit: ally, amount: item.amount });
      }
      this.onLog(`${hero.name} uses ${item.name}! Party recovers ${item.amount} HP!`);
    } else if (item.effect === 'mp_party') {
      for (const ally of this.livingHeroes()) {
        ally.mp = Math.min(ally.maxMp, ally.mp + item.amount);
        this.onVisualEvent({ type: 'text', unit: ally, text: `+${item.amount} MP`, color: '#c084fc' });
      }
      this.onLog(`${hero.name} uses ${item.name}! Party recovers ${item.amount} MP!`);
    } else if (item.effect === 'bp_party') {
      for (const ally of this.livingHeroes()) {
        ally.bp = Math.min(5, ally.bp + item.amount);
        this.onVisualEvent({ type: 'text', unit: ally, text: `+${item.amount} BP!`, color: '#facc15' });
      }
      this.onLog(`${hero.name} uses ${item.name}! Party gains +${item.amount} BP!`);
    }

    this.advanceTurn();
    return true;
  }

  /**
   * Resolves a single hit against an enemy, checking Weaknesses, Shield Points, and BREAK! multiplier.
   */
  applyHit({ attacker, target, damageType, statValue, power }) {
    const isWeak = target.weaknesses.includes(damageType);
    if (isWeak) {
      target.revealedWeaknesses.add(damageType);
    }

    const wasBroken = target.broken;
    let triggeredBreak = false;

    if (!target.broken && isWeak) {
      target.shield = Math.max(0, target.shield - 1);
      if (target.shield === 0) {
        target.broken = true;
        target.recoverOnNextTurn = true;
        triggeredBreak = true;
      }
    }

    const variance = 0.94 + this.rng.next() * 0.12;
    const raw = (statValue * 2.15 - target.def * 0.7) * power * variance;
    let mult = 1.0;
    if (wasBroken || triggeredBreak) {
      mult = 2.0; // Octopath Break multiplier!
    } else if (isWeak) {
      mult = 1.35; // Weakness multiplier
    }

    const damage = Math.max(4, Math.round(raw * mult));
    target.hp = Math.max(0, target.hp - damage);

    this.onVisualEvent({
      type: 'damage',
      unit: target,
      amount: damage,
      isWeak,
      isBreak: triggeredBreak,
      isBrokenHit: wasBroken,
      damageType,
    });

    if (triggeredBreak) {
      this.onLog(`💥 BREAK! ${target.name}’s shield shatters! Stunned & vulnerable!`);
    }

    if (target.hp === 0) {
      this.onLog(`✨ ${target.name} is defeated!`);
    }

    return damage;
  }

  /**
   * Enemy Turn Execution:
   * - If broken, the enemy recovers its Shield Points and loses its action this turn!
   */
  processEnemyTurn(enemy) {
    if (enemy.hp <= 0) {
      this.advanceTurn();
      return;
    }

    if (enemy.broken) {
      enemy.broken = false;
      enemy.shield = enemy.maxShield;
      enemy.recoverOnNextTurn = false;
      this.onLog(`${enemy.name} recovers from BREAK (Shield restored to ${enemy.maxShield}).`);
      this.onVisualEvent({ type: 'text', unit: enemy, text: 'RECOVER', color: '#cbd5e1' });
      this.advanceTurn();
      return;
    }

    const aliveHeroes = this.livingHeroes();
    if (aliveHeroes.length === 0) {
      this.advanceTurn();
      return;
    }

    const action = this.rng.choice(enemy.actions) || {
      name: 'Strike',
      power: 1.0,
      target: 'single',
    };

    const targets =
      action.target === 'all' ? aliveHeroes : [this.rng.choice(aliveHeroes)];

    this.onLog(`${enemy.name} uses ${action.name}!`);

    for (const hero of targets) {
      const defEffective = hero.def + (hero.defBuffTurns > 0 ? 6 : 0);
      const variance = 0.92 + this.rng.next() * 0.16;
      let dmg = Math.max(
        3,
        Math.round((enemy.atk * 1.65 - defEffective * 0.75) * action.power * variance)
      );
      if (hero.defending) {
        dmg = Math.max(1, Math.round(dmg * 0.5));
      }
      hero.hp = Math.max(0, hero.hp - dmg);
      this.onVisualEvent({
        type: 'damage',
        unit: hero,
        amount: dmg,
        isEnemyAttack: true,
      });
      if (hero.hp === 0) {
        this.onLog(`⚠️ ${hero.name} has fallen!`);
      }
    }

    this.advanceTurn();
  }
}
