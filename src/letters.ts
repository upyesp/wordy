/**
 * Hand-placed letters (Round 1, Q6): real words embedded along the rows —
 * HONEY, BUZZ(ED), DIP(PED), HIVE(S), WORDY, SLIDE(R), TILES, WAX(ING), BEE(S).
 */
export const LETTERS: readonly string[] = [
  'HONEYS',
  'BUZZED',
  'DIPPED',
  'HIVESW',
  'WORDYA',
  'SLIDER',
  'TILESK',
  'WAXING',
  'BEESND',
];

export function letterAt(row: number, col: number): string {
  return LETTERS[row]![col]!;
}
