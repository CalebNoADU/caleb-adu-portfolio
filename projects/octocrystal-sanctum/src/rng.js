/**
 * Deterministic Seeded Pseudo-Random Number Generator (Mulberry32 + FNV-1a string hash).
 * Supports reproducible dungeon generation, loot drops, and combat rolls.
 */
export class SeededRNG {
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
