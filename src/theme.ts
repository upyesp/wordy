/** Palette for the dark-honey stage (Q1, Round 3; ADR-0001 shading). */
export const THEME = {
  /** Must stay in sync with the CSS background in index.html. */
  backdrop: 0x181209,
  tile: 0xf0b24a,
  tilePressed: 0xb97e20,
  ember: 0xff8a3c,
  edgeLight: 0xffdf9e,
  edgeDark: 0x8a5a14,
  ink: 0x35220a,
  shadow: 0x000000,
  stripInk: 0xe9dcc3,
  stripDim: 0x77664e,
} as const;

export type Rgb = number;

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

export function lerpColor(a: Rgb, b: Rgb, t: number): Rgb {
  const ar = (a >> 16) & 0xff;
  const ag = (a >> 8) & 0xff;
  const ab = a & 0xff;
  const br = (b >> 16) & 0xff;
  const bg = (b >> 8) & 0xff;
  const bb = b & 0xff;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | bl;
}
