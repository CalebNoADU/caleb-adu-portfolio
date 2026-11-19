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

export function createVisibilityArrays(width, height) {
  const visible = Array.from({ length: height }, () => Array(width).fill(false));
  const explored = Array.from({ length: height }, () => Array(width).fill(false));
  return { visible, explored };
}

export function computeFOV(dungeon, originX, originY, radius = 8) {
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
