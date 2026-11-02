export interface Palette {
  backdrop: number;
  cssBackdrop: string;
  tile: number;
  tilePressed: number;
  ember: number;
  edgeLight: number;
  edgeDark: number;
  ink: number;
  shadow: number;
  stripInk: number;
  stripDim: number;
  panel: number;
  panelBorder: number;
  toggleOff: number;
}

const DARK: Palette = {
  backdrop: 0x181209,
  cssBackdrop: '#181209',
  tile: 0xf0b24a,
  tilePressed: 0xb97e20,
  ember: 0xff8a3c,
  edgeLight: 0xffdf9e,
  edgeDark: 0x8a5a14,
  ink: 0x35220a,
  shadow: 0x000000,
  stripInk: 0xe9dcc3,
  stripDim: 0x77664e,
  panel: 0x241b10,
  panelBorder: 0x4a3a22,
  toggleOff: 0x4a3a22,
};

const LIGHT: Palette = {
  backdrop: 0xf3ead6,
  cssBackdrop: '#f3ead6',
  tile: 0xf0b24a,
  tilePressed: 0xc08428,
  ember: 0xe07020,
  edgeLight: 0xfff3cd,
  edgeDark: 0xc09040,
  ink: 0x2a1a08,
  shadow: 0x5a4520,
  stripInk: 0x4a3a26,
  stripDim: 0xa59477,
  panel: 0xfffaf0,
  panelBorder: 0xd8c8a8,
  toggleOff: 0xd8c8a8,
};

export type ThemeName = 'dark' | 'light';

/** Live palette: modules read THEME.* at draw time, so a swap restyles everything. */
export let THEME: Palette = DARK;

export function paletteFor(name: ThemeName): Palette {
  return name === 'light' ? LIGHT : DARK;
}

export function applyPalette(palette: Palette): void {
  THEME = palette;
}

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

export function lerpColor(a: number, b: number, t: number): number {
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
