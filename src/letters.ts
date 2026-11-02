import { COLS, ROWS } from './hex';

/**
 * Board generator (feedback round 3): every game gets a fresh arrangement of
 * letters. A handful of common words are placed along *straight* lines (whole
 * rows, read forward or backward); most are placed along *winding* self-avoiding
 * walks that interlock crossword-style where letters coincide. Empty cells are
 * filled with frequency-weighted letters, then the board is quality-gated: a
 * capped depth-first search must find enough dictionary words, or we retry.
 */
const CELLS = ROWS * COLS;
const MAX_PATH = 6;
const MIN_FINDABLE = 14;
const MAX_ATTEMPTS = 30;

/** English-frequency weighted fill (vowel-heavy), so accidental words happen. */
const FILL = 'EEEEEEEAAAATTNNNIIIOOSSRRHHLLDDCUUMMWWYYFFGGPPBBVK';

function neighborsOf(r: number, c: number): number[] {
  const odd = r % 2 === 1;
  const dirs: Array<[number, number]> = [
    [0, -1], [0, 1],
    [-1, odd ? 1 : 0], [-1, odd ? 0 : -1],
    [1, odd ? 1 : 0], [1, odd ? 0 : -1],
  ];
  const out: number[] = [];
  for (const [dr, dc] of dirs) {
    const rr = r + dr;
    const cc = c + dc;
    if (rr >= 0 && rr < ROWS && cc >= 0 && cc < COLS) out.push(rr * COLS + cc);
  }
  return out;
}

const NEIGHBORS: number[][] = Array.from({ length: CELLS }, (_, i) =>
  neighborsOf(Math.floor(i / COLS), i % COLS),
);

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
  return arr;
}

function pickWords(common: string[], count: number, minLen: number, maxLen: number): string[] {
  const pool = shuffle(
    common.filter((w) => w.length >= minLen && w.length <= maxLen).map((w) => w.toUpperCase()),
  );
  const out: string[] = [];
  const seen = new Set<string>();
  for (const w of pool) {
    if (out.length === count) break;
    if (seen.has(w)) continue;
    seen.add(w);
    out.push(w);
  }
  return out;
}

/** Place `word` on a self-avoiding walk; cells may be reused only on letter match. */
function tryWinding(grid: string[], word: string): boolean {
  for (let attempt = 0; attempt < 12; attempt++) {
    const path: number[] = [];
    const used = new Set<number>();
    const dfs = (i: number, cell: number): boolean => {
      path.push(cell);
      used.add(cell);
      if (path.length === word.length) return true;
      for (const n of shuffle([...NEIGHBORS[cell]!])) {
        if (used.has(n)) continue;
        const ch = grid[n];
        if (ch !== null && ch !== word[i]) continue;
        if (dfs(i + 1, n)) return true;
      }
      path.pop();
      used.delete(cell);
      return false;
    };
    const starts = shuffle(
      Array.from({ length: CELLS }, (_, i) => i).filter(
        (i) => grid[i] === null || grid[i] === word[0],
      ),
    );
    for (const s of starts) {
      path.length = 0;
      used.clear();
      if (dfs(0, s)) {
        // Reject dead-straight paths — winding is the point (straight is the rarity).
        const dirs = new Set<string>();
        for (let i = 1; i < path.length; i++) {
          const a = path[i - 1]!;
          const b = path[i]!;
          dirs.add(`${Math.floor(b / COLS) - Math.floor(a / COLS)},${(b % COLS) - (a % COLS)}`);
        }
        if (dirs.size >= 2 || word.length <= 3) {
          path.forEach((cell, i) => {
            grid[cell] = word[i]!;
          });
          return true;
        }
      }
    }
  }
  return false;
}

function placeStraight(grid: string[], word: string, row: number, backward: boolean): boolean {
  const cells = Array.from({ length: COLS }, (_, c) => row * COLS + c);
  if (backward) cells.reverse();
  const path: number[] = [];
  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i]!;
    const ch = grid[cell];
    if (ch !== null && ch !== word[i]) return false;
    path.push(cell);
  }
  path.forEach((cell, i) => {
    grid[cell] = word[i]!;
  });
  return true;
}

function countFindable(grid: string[], dictionary: Set<string>): number {
  const found = new Set<string>();
  const seen = new Set<number>();
  const word: string[] = [];
  const dfs = (cell: number): void => {
    if (seen.size >= MAX_PATH) return;
    seen.add(cell);
    word.push(grid[cell]!);
    if (word.length >= 3) {
      const w = word.join('');
      if (dictionary.has(w.toLowerCase())) found.add(w);
    }
    if (seen.size < MAX_PATH) {
      for (const n of NEIGHBORS[cell]!) {
        if (!seen.has(n)) dfs(n);
      }
    }
    seen.delete(cell);
    word.pop();
  };
  for (let i = 0; i < CELLS; i++) dfs(i);
  return found.size;
}

export function generateLetters(common: string[], dictionary: Set<string>): string[][] {
  let best: string[] | null = null;
  let bestCount = -1;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const grid: string[] = Array<string>(CELLS).fill(null as unknown as string);
    const straight = pickWords(common, 2, COLS, COLS);
    const placed: string[] = [];
    const rows = shuffle(Array.from({ length: ROWS }, (_, r) => r));
    for (const word of straight) {
      for (const row of rows) {
        if (placeStraight(grid, word, row, Math.random() < 0.5)) {
          placed.push(word);
          break;
        }
      }
    }
    const winding = pickWords(common, 4, 3, 5).filter((w) => !placed.includes(w));
    for (const word of winding) {
      if (tryWinding(grid, word)) placed.push(word);
    }
    for (let i = 0; i < CELLS; i++) {
      if (grid[i] === null) {
        grid[i] = FILL[Math.floor(Math.random() * FILL.length)]!;
      }
    }
    const count = countFindable(grid, dictionary);
    if (count >= MIN_FINDABLE) {
      best = grid;
      break;
    }
    if (count > bestCount) {
      bestCount = count;
      best = grid;
    }
  }
  const flat = best!;
  return Array.from({ length: ROWS }, (_, r) => flat.slice(r * COLS, r * COLS + COLS));
}
