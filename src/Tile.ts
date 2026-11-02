import { Container, Graphics, Text } from 'pixi.js';
import { clamp01, hexVertices } from './hex';
import { Spring } from './spring';
import { FONT, THEME, lerpColor } from './theme';

const DIP_SCALE = 0.1;
const LETTER_FONT_SIZE_RATIO = 0.82;

/**
 * One honeycomb tile. The resting surface is deliberately direction-neutral
 * (uniform rim, radial face, soft centred shadow) — connections can be made in
 * any direction, so nothing on the tile may suggest one. Directional shading
 * appears only while a dip is actively following the finger (ADR-0001).
 */
export class Tile {
  readonly view = new Container();
  readonly row: number;
  readonly col: number;
  readonly letter: string;
  readonly dip = new Spring();

  private selected = 0;
  private selectedTarget = 0;
  private leanX = 0;
  private leanY = 0;

  private readonly size: number;
  private readonly vertices: number[];
  private readonly faceVertices: number[];
  private readonly shadowG: Graphics;
  private readonly baseG: Graphics;
  private readonly sheenG: Graphics;
  private readonly letterT: Text;
  private lastDip = -1;
  private lastSelected = -1;
  private lastLeanX = -1;
  private lastLeanY = -1;

  constructor(row: number, col: number, letter: string, size: number) {
    this.row = row;
    this.col = col;
    this.letter = letter;
    this.size = size;
    this.vertices = hexVertices(size);
    this.faceVertices = hexVertices(size * 0.9);

    this.shadowG = new Graphics();
    this.baseG = new Graphics();
    this.sheenG = new Graphics();

    this.letterT = new Text({
      text: letter,
      style: {
        fontFamily: FONT,
        fontSize: size * LETTER_FONT_SIZE_RATIO,
        fontWeight: '800',
        fill: THEME.ink,
      },
    });
    this.letterT.anchor.set(0.5);

    this.view.addChild(this.shadowG, this.baseG, this.sheenG, this.letterT);
    this.redraw();
  }

  setDipTarget(v: number): void {
    this.dip.target = clamp01(v);
  }

  setLean(x: number, y: number): void {
    this.leanX = x;
    this.leanY = y;
  }

  setSelected(on: boolean): void {
    this.selectedTarget = on ? 1 : 0;
  }

  step(dt: number): void {
    this.dip.step(dt);
    if (this.dip.atRest()) {
      this.dip.value = this.dip.target;
      this.dip.velocity = 0;
    }
    this.selected += (this.selectedTarget - this.selected) * Math.min(1, dt * 12);
  }

  redraw(): void {
    const dip = clamp01(this.dip.value);
    const sel = this.selected;
    if (
      Math.abs(dip - this.lastDip) < 0.002 &&
      Math.abs(sel - this.lastSelected) < 0.002 &&
      Math.abs(this.leanX - this.lastLeanX) < 0.004 &&
      Math.abs(this.leanY - this.lastLeanY) < 0.004
    ) {
      return;
    }
    this.lastDip = dip;
    this.lastSelected = sel;
    this.lastLeanX = this.leanX;
    this.lastLeanY = this.leanY;

    const s = this.size;

    this.view.scale.set(1 - DIP_SCALE * dip);

    // Soft centred depth shadow: concentric, not offset — no direction cue.
    this.shadowG.clear();
    this.shadowG.poly(this.vertices);
    this.shadowG.scale.set(1.12 - 0.06 * dip);
    this.shadowG.fill({ color: THEME.shadow, alpha: 0.1 + 0.06 * dip });
    this.shadowG.poly(this.vertices);
    this.shadowG.scale.set(1.05 - 0.03 * dip);
    this.shadowG.fill({ color: THEME.shadow, alpha: 0.18 + 0.08 * dip });

    // Face: uniform dark rim, radial amber centre, no edge bias.
    let face = lerpColor(THEME.tile, THEME.tilePressed, 0.55 * dip);
    face = lerpColor(face, THEME.ember, 0.5 * sel);
    const rim = lerpColor(THEME.edgeDark, face, 0.25);

    this.baseG.clear();
    this.baseG.poly(this.vertices);
    this.baseG.fill({ color: rim });
    this.baseG.poly(this.faceVertices);
    this.baseG.fill({ color: face });
    this.baseG.circle(0, 0, s * 0.52);
    this.baseG.fill({ color: THEME.edgeLight, alpha: 0.16 - 0.1 * dip });
    this.baseG.poly(this.faceVertices);
    this.baseG.stroke({
      width: s * 0.05,
      color: THEME.edgeLight,
      alpha: 0.3 - 0.15 * dip,
      join: 'round',
    });

    if (sel > 0.01) {
      this.baseG.poly(this.vertices);
      this.baseG.stroke({
        width: s * 0.06,
        color: THEME.ember,
        alpha: 0.8 * sel,
        join: 'round',
      });
    }

    // Directional shading exists only while the finger is actively pressing
    // (ADR-0001): shadow pools toward the finger, light rims the far side.
    this.sheenG.clear();
    if (dip > 0.01) {
      const off = s * 0.22;
      const lx = this.leanX * off;
      const ly = this.leanY * off;
      this.sheenG.poly(this.translated(lx, ly));
      this.sheenG.stroke({
        width: s * 0.14,
        color: THEME.shadow,
        alpha: 0.45 * dip,
        join: 'round',
      });
      this.sheenG.poly(this.translated(-lx, -ly));
      this.sheenG.stroke({
        width: s * 0.1,
        color: THEME.edgeLight,
        alpha: 0.4 * dip,
        join: 'round',
      });
    }

    // The letter rides the tilting surface.
    this.letterT.position.set(this.leanX * s * 0.15, this.leanY * s * 0.15);
  }

  forceRedraw(): void {
    this.lastDip = -1;
    this.lastSelected = -1;
    this.lastLeanX = -1;
    this.lastLeanY = -1;
    this.redraw();
  }

  private translated(dx: number, dy: number): number[] {
    const out: number[] = [];
    for (let i = 0; i < 6; i++) {
      out.push(this.vertices[2 * i]! + dx, this.vertices[2 * i + 1]! + dy);
    }
    return out;
  }
}
