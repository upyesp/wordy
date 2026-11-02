/** Pointy-top honeycomb geometry; 6×9 offset-row board (ADR-0002). */

export const ROWS = 9;
export const COLS = 6;

const SQRT3 = Math.sqrt(3);

export const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

export interface TilePos {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface BoardBounds extends Size {
  /** Leftmost drawn point relative to the col-0 centre (hexes overhang left). */
  offsetX: number;
  /** Topmost drawn point relative to the row-0 centre (hexes overhang up). */
  offsetY: number;
}

export function tileCenter(row: number, col: number, s: number): TilePos {
  return {
    x: SQRT3 * s * (col + (row % 2 === 1 ? 0.5 : 0)),
    y: 1.5 * s * row,
  };
}

/** Flat vertex array for one pointy-top hex of circumradius `s`, centred on (0,0). */
export function hexVertices(s: number): number[] {
  const pts: number[] = [];
  for (let k = 0; k < 6; k++) {
    const a = ((60 * k - 90) * Math.PI) / 180;
    pts.push(s * Math.cos(a), s * Math.sin(a));
  }
  return pts;
}

/**
 * Drawn bounds of the whole board. Position the board container at
 * `((stageW - width) / 2 - offsetX, regionTop + (regionH - height) / 2 - offsetY)`
 * to centre the *drawn* box — the layout box alone is off-centre because hexes
 * overhang the outer centres by half a width (x) and a full radius (y).
 */
export function boardBounds(s: number): BoardBounds {
  return {
    width: SQRT3 * s * (COLS + 0.5),
    height: 1.5 * s * (ROWS - 1) + 2 * s,
    offsetX: (-SQRT3 / 2) * s,
    offsetY: -s,
  };
}

/** Pixel → tile via axial cube-rounding (odd-r offset layout), or null off-board. */
export function tileAt(s: number, px: number, py: number): { row: number; col: number } | null {
  const qf = ((SQRT3 / 3) * px - py / 3) / s;
  const rf = ((2 / 3) * py) / s;
  let q = Math.round(qf);
  let r = Math.round(rf);
  const sc = Math.round(-qf - rf);
  const dq = Math.abs(q - qf);
  const dr = Math.abs(r - rf);
  const ds = Math.abs(sc - (-qf - rf));
  if (dq > dr && dq > ds) q = -r - sc;
  else if (dr > ds) r = -q - sc;
  const col = q + (r - (r & 1)) / 2;
  if (r < 0 || r >= ROWS || col < 0 || col >= COLS) return null;
  return { row: r, col };
}

/**
 * Dip influence for a finger `dist` from a tile's centre: 1 across the tile's own
 * hex, easing to 0 just past neighbour centres so the wave crosses gaps smoothly.
 */
export function influence(s: number, dist: number): number {
  const t = clamp01((1.75 * s - dist) / (0.7 * s));
  return t * t * (3 - 2 * t);
}
