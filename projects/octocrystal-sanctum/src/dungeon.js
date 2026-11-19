/**
 * Procedural Dungeon Generator with deterministic RNG seeding, room/corridor carving,
 * entity placement (monsters, chests, Crystal Shrines, stairs), and BFS connectivity verification.
 */
import { TILE_TYPES, MONSTER_TEMPLATES, ITEMS } from './data.js';
import { createVisibilityArrays } from './fov.js';

export class RectRoom {
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

export function generateDungeon({
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
export function verifyConnectivity(dungeon, startPos = dungeon.startPos, targetPos = dungeon.endPos) {
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
