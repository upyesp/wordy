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

// Dark: neon on deep indigo — electric cyan tiles, hot magenta accents,
// cool ice-white text. The LIGHT palette stays warm paper.
const DARK: Palette = {
  backdrop: 0x0b0b16,
  cssBackdrop: '#0b0b16',
  tile: 0x36e2ff,
  tilePressed: 0x1899b8,
  ember: 0xff2fb9,
  edgeLight: 0xbdfaff,
  edgeDark: 0x0e5c70,
  ink: 0x06222b,
  shadow: 0x000000,
  stripInk: 0xeef6ff,
  stripDim: 0x6a7392,
  panel: 0x151527,
  panelBorder: 0x2e2e52,
  toggleOff: 0x2e2e52,
};

// Light: the same neon hues as DARK, deepened so they hold contrast on pale
// ice — electric cyan tiles, deep magenta accents, cool slate text.
const LIGHT: Palette = {
  backdrop: 0xebf3f9,
  cssBackdrop: '#ebf3f9',
  tile: 0x17c8e8,
  tilePressed: 0x0a8fae,
  ember: 0xc90e93,
  edgeLight: 0xd9f7ff,
  edgeDark: 0x0a7f9c,
  ink: 0x05242e,
  shadow: 0x16333e,
  stripInk: 0x1c2438,
  stripDim: 0x5d6a85,
  panel: 0xf9fcff,
  panelBorder: 0xc9d6e4,
  toggleOff: 0xc9d6e4,
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
