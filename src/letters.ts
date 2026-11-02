/**
 * Hand-placed letters (Round 1, Q6; resized to 5×7 in ADR-0003). Every row is
 * a real word — HONEY, HIVES, WAXED, WORDY, SLIDE, TILES, BEEFY — and the
 * common prefixes (HONE, HIVE, WAX, WORD, TILE, BEE) all trace too.
 */
export const LETTERS: readonly string[] = [
  'HONEY',
  'HIVES',
  'WAXED',
  'WORDY',
  'SLIDE',
  'TILES',
  'BEEFY',
];

export function letterAt(row: number, col: number): string {
  return LETTERS[row]![col]!;
}
