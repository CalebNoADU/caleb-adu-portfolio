// Auto-bundled from src/*.js so index.html works directly when double-clicked in Finder
(function () {

// --- src/rng.js ---
/**
 * Deterministic Seeded Pseudo-Random Number Generator (Mulberry32 + FNV-1a string hash).
 * Supports reproducible dungeon generation, loot drops, and combat rolls.
 */
class SeededRNG {
  constructor(seedInput = 'OCTOPATH-FF6') {
    this.seedString = String(seedInput);
    this.initialState = SeededRNG.hashString(this.seedString);
    this.state = this.initialState;
  }

  static hashString(str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0 || 1;
  }

  /** Returns a float in [0, 1) */
  next() {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Returns an integer in [min, max] inclusive */
  int(min, max) {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /** Picks a random element from a non-empty array */
  choice(arr) {
    if (!arr || arr.length === 0) return undefined;
    return arr[this.int(0, arr.length - 1)];
  }

  /** Returns a shallow shuffled copy of an array */
  shuffle(arr) {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = this.int(0, i);
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }
}


// --- src/data.js ---
/**
 * Declarative Data Tables for Tiles, Damage Types, Jobs, Heroes, Skills, Items, and Monsters.
 * Inspired by Octopath Traveler (Shields, Weaknesses, Boost) and Final Fantasy IV/V/VI (Jobs, Classic Spells).
 */
const TILE_TYPES = {
  WALL: {
    id: 'wall',
    name: 'Ancient Stone Wall',
    walkable: false,
    transparent: false,
    glyph: '#',
    color: '#2c2538',
    topColor: '#3f3652',
  },
  FLOOR: {
    id: 'floor',
    name: 'Cobblestone Floor',
    walkable: true,
    transparent: true,
    glyph: '.',
    color: '#1b1824',
  },
  STAIRS: {
    id: 'stairs',
    name: 'Descending Sanctum Stairs',
    walkable: true,
    transparent: true,
    glyph: '>',
    color: '#f5c542',
  },
  SHRINE: {
    id: 'shrine',
    name: 'Crystal of Light Shrine',
    walkable: true,
    transparent: true,
    glyph: '❖',
    color: '#5ce1e6',
  },
};
const DAMAGE_TYPES = {
  sword: { id: 'sword', label: 'Sword', icon: '⚔️', color: '#e2e8f0', category: 'weapon' },
  dagger: { id: 'dagger', label: 'Dagger', icon: '🗡️', color: '#cbd5e1', category: 'weapon' },
  bow: { id: 'bow', label: 'Bow', icon: '🏹', color: '#d9f99d', category: 'weapon' },
  staff: { id: 'staff', label: 'Staff', icon: '🪄', color: '#f5d0fe', category: 'weapon' },
  fist: { id: 'fist', label: 'Fist', icon: '🥊', color: '#fed7aa', category: 'weapon' },
  fire: { id: 'fire', label: 'Fire', icon: '🔥', color: '#fb7185', category: 'element' },
  ice: { id: 'ice', label: 'Ice', icon: '❄️', color: '#38bdf8', category: 'element' },
  lightning: { id: 'lightning', label: 'Lightning', icon: '⚡', color: '#facc15', category: 'element' },
  light: { id: 'light', label: 'Light', icon: '✨', color: '#fef08a', category: 'element' },
};
const SKILLS = {
  cross_slash: {
    id: 'cross_slash',
    name: 'Cross Slash',
    mpCost: 6,
    type: 'sword',
    target: 'single',
    hits: 2,
    power: 0.9,
    stat: 'atk',
    desc: 'Unleash 2 swift sword slashes at a single foe.',
  },
  holy_blade: {
    id: 'holy_blade',
    name: 'Saint Cross',
    mpCost: 10,
    type: 'light',
    target: 'all',
    hits: 1,
    power: 1.25,
    stat: 'atk',
    desc: 'Channel sacred light through your blade to strike all foes.',
  },
  aegis_guard: {
    id: 'aegis_guard',
    name: 'Sentinel Guard',
    mpCost: 5,
    type: 'buff',
    target: 'party',
    power: 1.0,
    stat: 'mnd',
    desc: 'Raise party DEF for 3 turns and restore a small amount of HP.',
  },
  fira: {
    id: 'fira',
    name: 'Fira',
    mpCost: 8,
    type: 'fire',
    target: 'all',
    hits: 1,
    power: 1.3,
    stat: 'mag',
    desc: 'Scorch all enemies with twin pillars of flame.',
  },
  blizzara: {
    id: 'blizzara',
    name: 'Blizzara',
    mpCost: 8,
    type: 'ice',
    target: 'single',
    hits: 2,
    power: 0.95,
    stat: 'mag',
    desc: 'Pierce a single enemy twice with razor-sharp icicles.',
  },
  thundara: {
    id: 'thundara',
    name: 'Thundara',
    mpCost: 9,
    type: 'lightning',
    target: 'all',
    hits: 1,
    power: 1.35,
    stat: 'mag',
    desc: 'Call down heavensward lightning across all enemies.',
  },
  analyze: {
    id: 'analyze',
    name: 'Study Foe (Scan)',
    mpCost: 2,
    type: 'scan',
    target: 'all',
    power: 0,
    stat: 'mag',
    desc: 'Reveal Weaknesses of all foes (+1 extra per Boost level).',
  },
  cura: {
    id: 'cura',
    name: 'Cura',
    mpCost: 8,
    type: 'heal',
    target: 'party',
    power: 1.4,
    stat: 'mnd',
    desc: 'Restore HP to the entire party with warm white magic.',
  },
  luminescence: {
    id: 'luminescence',
    name: 'Luminescence',
    mpCost: 7,
    type: 'light',
    target: 'all',
    hits: 1,
    power: 1.15,
    stat: 'mag',
    desc: 'Radiate blinding sacred light across all enemies.',
  },
  arise: {
    id: 'arise',
    name: 'Raise & Mend',
    mpCost: 12,
    type: 'revive',
    target: 'party',
    power: 1.0,
    stat: 'mnd',
    desc: 'Revive fallen allies and heal the entire party.',
  },
  hp_thief: {
    id: 'hp_thief',
    name: 'HP Thief (Mug)',
    mpCost: 6,
    type: 'dagger',
    target: 'single',
    hits: 2,
    power: 0.85,
    stat: 'atk',
    drain: 0.4,
    desc: 'Strike twice with a dagger and absorb 40% of damage as HP.',
  },
  arrowstorm: {
    id: 'arrowstorm',
    name: 'Arrowstorm',
    mpCost: 9,
    type: 'bow',
    target: 'all',
    hits: 2,
    power: 0.7,
    stat: 'atk',
    desc: 'Rain a volley of 2 bow hits upon every enemy.',
  },
  share_bp: {
    id: 'share_bp',
    name: 'Donate BP',
    mpCost: 4,
    type: 'bp_boost',
    target: 'party',
    power: 1,
    stat: 'spd',
    desc: 'Grant +1 BP to all other living party members.',
  },
  pummel: {
    id: 'pummel',
    name: 'Flurry Blitz',
    mpCost: 7,
    type: 'fist',
    target: 'single',
    hits: 3,
    power: 0.68,
    stat: 'atk',
    desc: 'Deliver a rapid 3-hit martial arts combo to shatter shields.',
  },
  aura_cannon: {
    id: 'aura_cannon',
    name: 'Aura Cannon',
    mpCost: 8,
    type: 'light',
    target: 'single',
    hits: 2,
    power: 1.05,
    stat: 'atk',
    desc: 'Sabon-style chi blast striking a foe twice with Light damage.',
  },
  chakra: {
    id: 'chakra',
    name: 'Chakra',
    mpCost: 0,
    type: 'chakra',
    target: 'party',
    power: 0.8,
    stat: 'mnd',
    desc: 'Meditate to restore minor HP and MP to the entire party.',
  },
};
const JOBS = {
  knight: {
    id: 'knight',
    name: 'Paladin Knight',
    weapon: 'sword',
    secondaryWeapon: 'light',
    bonuses: { maxHp: 35, maxMp: 5, atk: 6, def: 7, mag: 0, mnd: 3, spd: 0 },
    skills: ['cross_slash', 'holy_blade', 'aegis_guard'],
    palette: { primary: '#3b82f6', cape: '#f8fafc', trim: '#facc15' },
  },
  black_mage: {
    id: 'black_mage',
    name: 'Magitek Scholar',
    weapon: 'dagger',
    secondaryWeapon: 'fire',
    bonuses: { maxHp: -10, maxMp: 25, atk: -2, def: -1, mag: 9, mnd: 2, spd: 2 },
    skills: ['fira', 'blizzara', 'thundara', 'analyze'],
    palette: { primary: '#9333ea', cape: '#ef4444', trim: '#fde047' },
  },
  white_mage: {
    id: 'white_mage',
    name: 'Cleric Devout',
    weapon: 'staff',
    secondaryWeapon: 'light',
    bonuses: { maxHp: 5, maxMp: 22, atk: -2, def: 1, mag: 5, mnd: 9, spd: 1 },
    skills: ['cura', 'luminescence', 'arise'],
    palette: { primary: '#f8fafc', cape: '#ec4899', trim: '#38bdf8' },
  },
  thief: {
    id: 'thief',
    name: 'Hunter Thief',
    weapon: 'dagger',
    secondaryWeapon: 'bow',
    bonuses: { maxHp: 10, maxMp: 8, atk: 5, def: 1, mag: 0, mnd: 0, spd: 7 },
    skills: ['hp_thief', 'arrowstorm', 'share_bp'],
    palette: { primary: '#0d9488', cape: '#f59e0b', trim: '#e2e8f0' },
  },
  monk: {
    id: 'monk',
    name: 'Master Monk',
    weapon: 'fist',
    secondaryWeapon: 'light',
    bonuses: { maxHp: 30, maxMp: 4, atk: 8, def: 3, mag: 1, mnd: 3, spd: 4 },
    skills: ['pummel', 'aura_cannon', 'chakra'],
    palette: { primary: '#ea580c', cape: '#facc15', trim: '#fef08a' },
  },
};
const HERO_TEMPLATES = [
  {
    id: 'cecil',
    name: 'Cecil',
    title: 'Lunar Paladin',
    defaultJob: 'knight',
    hairColor: '#e2e8f0',
    baseStats: { maxHp: 115, maxMp: 24, atk: 18, def: 15, mag: 11, mnd: 13, spd: 11 },
  },
  {
    id: 'terra',
    name: 'Terra',
    title: 'Esper Scion',
    defaultJob: 'black_mage',
    hairColor: '#4ade80',
    baseStats: { maxHp: 85, maxMp: 42, atk: 11, def: 10, mag: 21, mnd: 15, spd: 14 },
  },
  {
    id: 'locke',
    name: 'Locke',
    title: 'Treasure Hunter',
    defaultJob: 'thief',
    hairColor: '#fbbf24',
    baseStats: { maxHp: 95, maxMp: 26, atk: 17, def: 12, mag: 12, mnd: 11, spd: 18 },
  },
  {
    id: 'lenna',
    name: 'Lenna',
    title: 'Wind Priestess',
    defaultJob: 'white_mage',
    hairColor: '#f472b6',
    baseStats: { maxHp: 88, maxMp: 40, atk: 10, def: 11, mag: 16, mnd: 20, spd: 13 },
  },
];
const ITEMS = {
  potion: {
    id: 'potion',
    name: 'Hi-Potion',
    kind: 'consumable',
    effect: 'heal_party',
    amount: 75,
    desc: 'Restores 75 HP to all living party members.',
  },
  ether: {
    id: 'ether',
    name: 'Turbo Ether',
    kind: 'consumable',
    effect: 'mp_party',
    amount: 25,
    desc: 'Restores 25 MP to all living party members.',
  },
  pomegranate: {
    id: 'pomegranate',
    name: 'Energizing Pomegranate',
    kind: 'consumable',
    effect: 'bp_party',
    amount: 2,
    desc: 'Octopath delicacy: Grants +2 BP to the entire party!',
  },
  relic_hero_ring: {
    id: 'relic_hero_ring',
    name: 'Hero’s Ring (FF6 Relic)',
    kind: 'relic',
    statBonuses: { atk: 4, mag: 4 },
    desc: 'Permanent Relic: Increases party ATK and MAG by +4.',
  },
  relic_crystal_helm: {
    id: 'relic_crystal_helm',
    name: 'Crystal Mail (FF4 Relic)',
    kind: 'relic',
    statBonuses: { def: 4, maxHp: 25 },
    desc: 'Permanent Relic: Increases party Max HP by +25 and DEF by +4.',
  },
  relic_hermes_sandals: {
    id: 'relic_hermes_sandals',
    name: 'Hermes Sandals (FF5 Relic)',
    kind: 'relic',
    statBonuses: { spd: 4, maxMp: 12 },
    desc: 'Permanent Relic: Increases party SPD by +4 and Max MP by +12.',
  },
};
const MONSTER_TEMPLATES = {
  goblin_guard: {
    id: 'goblin_guard',
    name: 'Goblin Vanguard',
    minFloor: 1,
    maxFloor: 2,
    glyph: 'g',
    color: '#ef4444',
    spriteType: 'goblin',
    hp: 95,
    shield: 2,
    atk: 17,
    def: 8,
    spd: 11,
    xp: 24,
    weaknesses: ['sword', 'bow', 'fire'],
    actions: [
      { name: 'Rusty Cleaver', power: 1.0, target: 'single' },
      { name: 'Goblin Punch', power: 1.25, target: 'single' },
    ],
  },
  flan_azure: {
    id: 'flan_azure',
    name: 'Azure Flan',
    minFloor: 1,
    maxFloor: 3,
    glyph: 'f',
    color: '#38bdf8',
    spriteType: 'flan',
    hp: 85,
    shield: 3,
    atk: 16,
    def: 16,
    spd: 9,
    xp: 28,
    weaknesses: ['fire', 'lightning', 'staff'],
    actions: [
      { name: 'Water Press', power: 1.0, target: 'single' },
      { name: 'Acid Mist', power: 0.75, target: 'all' },
    ],
  },
  cactuar_rogue: {
    id: 'cactuar_rogue',
    name: 'Dusk Cactuar',
    minFloor: 1,
    maxFloor: 4,
    glyph: 'c',
    color: '#4ade80',
    spriteType: 'cactuar',
    hp: 75,
    shield: 3,
    atk: 19,
    def: 12,
    spd: 19,
    xp: 35,
    weaknesses: ['dagger', 'bow', 'ice'],
    actions: [
      { name: '100 Needles', power: 1.15, target: 'single' },
      { name: 'Needle Spray', power: 0.7, target: 'all' },
    ],
  },
  magitek_armor: {
    id: 'magitek_armor',
    name: 'Imperial Magitek Armor',
    minFloor: 2,
    maxFloor: 4,
    glyph: 'M',
    color: '#a855f7',
    spriteType: 'magitek',
    hp: 165,
    shield: 4,
    atk: 23,
    def: 14,
    spd: 12,
    xp: 48,
    weaknesses: ['lightning', 'fist', 'sword', 'staff'],
    actions: [
      { name: 'Magitek Laser', power: 1.25, target: 'single' },
      { name: 'Diffractive Tek-Beam', power: 0.85, target: 'all' },
    ],
  },
  tonberry_stalker: {
    id: 'tonberry_stalker',
    name: 'Crypt Tonberry',
    minFloor: 2,
    maxFloor: 5,
    glyph: 'T',
    color: '#14b8a6',
    spriteType: 'tonberry',
    hp: 190,
    shield: 4,
    atk: 26,
    def: 13,
    spd: 10,
    xp: 56,
    weaknesses: ['light', 'ice', 'bow', 'dagger'],
    actions: [
      { name: 'Chef’s Knife', power: 1.4, target: 'single' },
      { name: 'Karma Lantern', power: 0.9, target: 'all' },
    ],
  },
  behemoth_shade: {
    id: 'behemoth_shade',
    name: 'Void Behemoth',
    minFloor: 3,
    maxFloor: 5,
    glyph: 'B',
    color: '#ec4899',
    spriteType: 'behemoth',
    hp: 250,
    shield: 5,
    atk: 29,
    def: 15,
    spd: 14,
    xp: 75,
    weaknesses: ['sword', 'fist', 'fire', 'light'],
    actions: [
      { name: 'Heave Horn', power: 1.35, target: 'single' },
      { name: 'Maelstrom Roar', power: 0.95, target: 'all' },
    ],
  },
  archfiend_zromus: {
    id: 'archfiend_zromus',
    name: 'Archfiend Galdera-Zemus',
    isBoss: true,
    minFloor: 3,
    maxFloor: 3,
    glyph: 'Ω',
    color: '#facc15',
    spriteType: 'boss',
    hp: 460,
    shield: 6,
    atk: 32,
    def: 16,
    spd: 15,
    xp: 250,
    weaknesses: ['sword', 'dagger', 'bow', 'fire', 'lightning', 'light'],
    actions: [
      { name: 'Big Bang Flare', power: 1.05, target: 'all' },
      { name: 'Dark Matter Spear', power: 1.45, target: 'single' },
      { name: 'Crystal Judgment', power: 0.95, target: 'all' },
    ],
  },
};


// --- src/fov.js ---
/**
 * Recursive Shadowcasting Field-of-View (FOV) calculator.
 * Maintains `visible` (current turn FOV) and `explored` (memory) 2D boolean grids.
 */

const MULT = [
  [1, 0, 0, -1, -1, 0, 0, 1],
  [0, 1, -1, 0, 0, -1, 1, 0],
  [0, 1, 1, 0, 0, -1, -1, 0],
  [1, 0, 0, 1, -1, 0, 0, -1],
];
function createVisibilityArrays(width, height) {
  const visible = Array.from({ length: height }, () => Array(width).fill(false));
  const explored = Array.from({ length: height }, () => Array(width).fill(false));
  return { visible, explored };
}
function computeFOV(dungeon, originX, originY, radius = 8) {
  const { width, height, tiles, visible, explored } = dungeon;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      visible[y][x] = false;
    }
  }

  if (originX >= 0 && originX < width && originY >= 0 && originY < height) {
    visible[originY][originX] = true;
    explored[originY][originX] = true;
  }

  function castLight(row, start, end, xx, xy, yx, yy) {
    if (start < end) return;
    let newStart = 0;
    const radiusSq = radius * radius;

    for (let i = row; i <= radius; i++) {
      let blocked = false;
      for (let dx = -i, dy = -i; dx <= 0; dx++) {
        const lSlope = (dx - 0.5) / (dy + 0.5);
        const rSlope = (dx + 0.5) / (dy - 0.5);
        if (start < rSlope) {
          continue;
        } else if (end > lSlope) {
          break;
        }

        const sax = dx * xx + dy * xy;
        const say = dx * yx + dy * yy;
        const mapX = originX + sax;
        const mapY = originY + say;

        if (mapX < 0 || mapX >= width || mapY < 0 || mapY >= height) {
          continue;
        }

        if (dx * dx + dy * dy <= radiusSq) {
          visible[mapY][mapX] = true;
          explored[mapY][mapX] = true;
        }

        const isOpaque = !tiles[mapY][mapX].transparent;
        if (blocked) {
          if (isOpaque) {
            newStart = rSlope;
            continue;
          } else {
            blocked = false;
            start = newStart;
          }
        } else if (isOpaque && i < radius) {
          blocked = true;
          castLight(i + 1, start, lSlope, xx, xy, yx, yy);
          newStart = rSlope;
        }
      }
      if (blocked) break;
    }
  }

  for (let octant = 0; octant < 8; octant++) {
    castLight(
      1,
      1.0,
      0.0,
      MULT[0][octant],
      MULT[1][octant],
      MULT[2][octant],
      MULT[3][octant]
    );
  }
}


// --- src/dungeon.js ---
/**
 * Procedural Dungeon Generator with deterministic RNG seeding, room/corridor carving,
 * entity placement (monsters, chests, Crystal Shrines, stairs), and BFS connectivity verification.
 */
class RectRoom {
  constructor(x, y, w, h) {
    this.x1 = x;
    this.y1 = y;
    this.x2 = x + w;
    this.y2 = y + h;
  }

  center() {
    return {
      x: Math.floor((this.x1 + this.x2) / 2),
      y: Math.floor((this.y1 + this.y2) / 2),
    };
  }

  intersects(other) {
    return (
      this.x1 <= other.x2 + 1 &&
      this.x2 >= other.x1 - 1 &&
      this.y1 <= other.y2 + 1 &&
      this.y2 >= other.y1 - 1
    );
  }
}
function generateDungeon({
  width = 44,
  height = 28,
  floor = 1,
  maxFloors = 3,
  rng,
}) {
  const tiles = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => ({ ...TILE_TYPES.WALL }))
  );

  const rooms = [];
  const maxRooms = 11;
  const minSize = 5;
  const maxSize = 9;

  function carveRoom(room) {
    for (let y = room.y1 + 1; y < room.y2; y++) {
      for (let x = room.x1 + 1; x < room.x2; x++) {
        tiles[y][x] = { ...TILE_TYPES.FLOOR };
      }
    }
  }

  function carveHTunnel(x1, x2, y) {
    const start = Math.min(x1, x2);
    const end = Math.max(x1, x2);
    for (let x = start; x <= end; x++) {
      tiles[y][x] = { ...TILE_TYPES.FLOOR };
    }
  }

  function carveVTunnel(y1, y2, x) {
    const start = Math.min(y1, y2);
    const end = Math.max(y1, y2);
    for (let y = start; y <= end; y++) {
      tiles[y][x] = { ...TILE_TYPES.FLOOR };
    }
  }

  for (let i = 0; i < maxRooms * 4 && rooms.length < maxRooms; i++) {
    const w = rng.int(minSize, maxSize);
    const h = rng.int(minSize, maxSize);
    const x = rng.int(1, width - w - 2);
    const y = rng.int(1, height - h - 2);

    const newRoom = new RectRoom(x, y, w, h);
    if (rooms.some((r) => newRoom.intersects(r))) {
      continue;
    }

    carveRoom(newRoom);

    if (rooms.length > 0) {
      const prev = rooms[rooms.length - 1].center();
      const curr = newRoom.center();
      if (rng.next() < 0.5) {
        carveHTunnel(prev.x, curr.x, prev.y);
        carveVTunnel(prev.y, curr.y, curr.x);
      } else {
        carveVTunnel(prev.y, curr.y, prev.x);
        carveHTunnel(prev.x, curr.x, curr.y);
      }
    }

    rooms.push(newRoom);
  }

  // Fallback guarantee if fewer than 2 rooms generated
  if (rooms.length < 2) {
    const r1 = new RectRoom(2, 2, 7, 7);
    const r2 = new RectRoom(width - 11, height - 10, 8, 7);
    carveRoom(r1);
    carveRoom(r2);
    carveHTunnel(r1.center().x, r2.center().x, r1.center().y);
    carveVTunnel(r1.center().y, r2.center().y, r2.center().x);
    rooms.push(r1, r2);
  }

  const startPos = rooms[0].center();
  const endPos = rooms[rooms.length - 1].center();

  // Place stairs on floors < maxFloors
  if (floor < maxFloors) {
    tiles[endPos.y][endPos.x] = { ...TILE_TYPES.STAIRS };
  }

  // Place a Crystal Shrine in a middle room
  if (rooms.length >= 3) {
    const shrineRoom = rooms[Math.floor(rooms.length / 2)];
    const sc = shrineRoom.center();
    tiles[sc.y][sc.x] = { ...TILE_TYPES.SHRINE, used: false };
  }

  const entities = [];
  const chests = [];

  // Pool of eligible non-boss monsters for this floor
  const eligibleMonsters = Object.values(MONSTER_TEMPLATES).filter(
    (m) => !m.isBoss && floor >= m.minFloor && floor <= m.maxFloor
  );
  const itemKeys = Object.keys(ITEMS);

  // Populate rooms 1..N-1
  for (let i = 1; i < rooms.length; i++) {
    const room = rooms[i];
    const center = room.center();
    const isLastRoom = i === rooms.length - 1;

    if (isLastRoom && floor === maxFloors) {
      // Final floor Boss in last room!
      const bossTemplate = MONSTER_TEMPLATES.archfiend_zromus;
      entities.push({
        id: `boss_${floor}`,
        kind: 'monster',
        isBoss: true,
        templateId: bossTemplate.id,
        name: bossTemplate.name,
        glyph: bossTemplate.glyph,
        color: bossTemplate.color,
        spriteType: bossTemplate.spriteType,
        x: center.x,
        y: center.y,
        packSize: 1,
      });
      continue;
    }

    // Spawn a monster encounter in most rooms
    if (eligibleMonsters.length > 0 && (i < rooms.length - 1 || rng.next() < 0.75)) {
      const mx = rng.int(room.x1 + 1, room.x2 - 1);
      const my = rng.int(room.y1 + 1, room.y2 - 1);
      if (
        (mx !== startPos.x || my !== startPos.y) &&
        (mx !== endPos.x || my !== endPos.y) &&
        tiles[my][mx].id === 'floor'
      ) {
        const chosen = rng.choice(eligibleMonsters);
        entities.push({
          id: `mob_${floor}_${i}`,
          kind: 'monster',
          isBoss: false,
          templateId: chosen.id,
          name: chosen.name,
          glyph: chosen.glyph,
          color: chosen.color,
          spriteType: chosen.spriteType,
          x: mx,
          y: my,
          packSize: rng.int(1, Math.min(3, 1 + floor)),
        });
      }
    }

    // Spawn a Treasure Chest in ~55% of rooms
    if (rng.next() < 0.55) {
      const cx = rng.int(room.x1 + 1, room.x2 - 1);
      const cy = rng.int(room.y1 + 1, room.y2 - 1);
      const occupied =
        (cx === startPos.x && cy === startPos.y) ||
        (cx === endPos.x && cy === endPos.y) ||
        tiles[cy][cx].id !== 'floor' ||
        entities.some((e) => e.x === cx && e.y === cy) ||
        chests.some((c) => c.x === cx && c.y === cy);

      if (!occupied) {
        const itemId = rng.choice(itemKeys);
        chests.push({
          id: `chest_${floor}_${i}`,
          x: cx,
          y: cy,
          opened: false,
          itemId,
        });
      }
    }
  }

  const { visible, explored } = createVisibilityArrays(width, height);

  return {
    width,
    height,
    floor,
    maxFloors,
    tiles,
    rooms,
    startPos,
    endPos,
    entities,
    chests,
    visible,
    explored,
  };
}

/**
 * Verifies via Breadth-First Search (BFS) that `targetPos` is reachable from `startPos`
 * walking only on walkable tiles.
 */
function verifyConnectivity(dungeon, startPos = dungeon.startPos, targetPos = dungeon.endPos) {
  const { width, height, tiles } = dungeon;
  const visited = Array.from({ length: height }, () => Array(width).fill(false));
  const queue = [{ x: startPos.x, y: startPos.y }];
  visited[startPos.y][startPos.x] = true;

  const dirs = [
    { dx: 0, dy: -1 },
    { dx: 1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: -1, dy: 0 },
  ];

  while (queue.length > 0) {
    const curr = queue.shift();
    if (curr.x === targetPos.x && curr.y === targetPos.y) {
      return true;
    }
    for (const { dx, dy } of dirs) {
      const nx = curr.x + dx;
      const ny = curr.y + dy;
      if (
        nx >= 0 &&
        nx < width &&
        ny >= 0 &&
        ny < height &&
        !visited[ny][nx] &&
        tiles[ny][nx].walkable
      ) {
        visited[ny][nx] = true;
        queue.push({ x: nx, y: ny });
      }
    }
  }

  return false;
}


// --- src/combat.js ---
/**
 * Turn-Based Combat Engine combining:
 * - Octopath Traveler's Break & Boost (Shield Points, Weaknesses, BP 0..5, 1..4x Boost)
 * - Final Fantasy IV/V/VI Party Jobs, Spells, Relics, and Turn Timeline
 */
class CombatEncounter {
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


// --- src/engine.js ---
/**
 * Core Game Engine & State Machine (strictly decoupled from DOM/Canvas rendering).
 * Enforces a strict turn-based loop:
 *   Player Input -> Validate Action -> Update State -> Process Monster/Environment Turns -> Recompute FOV.
 */
class GameEngine {
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


// --- src/renderer.js ---
/**
 * HD-2D / 16-Bit JRPG Canvas Renderer
 * Renders both the Shadowcast Dungeon Exploration View and the Side-View Octopath/FF Battle Scene.
 */
class GameRenderer {
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


// --- src/main.js ---
/**
 * UI & Input Controller connecting DOM / Keyboard / Canvas events to GameEngine & GameRenderer.
 */



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

})();
