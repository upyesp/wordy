import { Container, Graphics, Text } from 'pixi.js';
import { clamp01, hexVertices } from './hex';
import { Spring } from './spring';
import { FONT, THEME, lerpColor } from './theme';

const DIP_SCALE = 0.1;
const LETTER_FONT_SIZE_RATIO = 0.82;

/**
 * One honeycomb tile: drop shadow, hex face with bevel edges, directional dip
 * shading (ADR-0001 level b), and the letter riding the surface.
 * All state changes go through step()/redraw() so the retained Graphics are
 * only rebuilt when the visible values actually moved.
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

    this.shadowG = new Graphics();
    this.shadowG.poly(this.vertices);
    this.shadowG.fill({ color: THEME.shadow, alpha: 1 });

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

    // Drop shadow tightens and shifts under the press.
    this.shadowG.position.set(
      -this.leanX * s * 0.09,
      s * 0.15 - this.leanY * s * 0.09 - dip * s * 0.06,
    );
    this.shadowG.alpha = 0.3 + 0.14 * dip;
    this.shadowG.scale.set(1 + 0.04 * dip);

    // Face: darken into the press, warm toward ember while selected.
    let fill = lerpColor(THEME.tile, THEME.tilePressed, 0.55 * dip);
    fill = lerpColor(fill, THEME.ember, 0.5 * sel);

    this.baseG.clear();
    this.baseG.poly(this.vertices);
    this.baseG.fill({ color: fill });

    // Static bevel: light catches the top edges, shade pools on the bottom.
    const v = this.vertices;
    this.baseG.poly([v[10]!, v[11]!, v[0]!, v[1]!, v[2]!, v[3]!]);
    this.baseG.stroke({
      width: s * 0.1,
      color: THEME.edgeLight,
      alpha: 0.85 - 0.4 * dip,
      join: 'round',
      cap: 'round',
    });
    this.baseG.poly([v[4]!, v[5]!, v[6]!, v[7]!, v[8]!, v[9]!]);
    this.baseG.stroke({
      width: s * 0.1,
      color: THEME.edgeDark,
      alpha: 0.9 - 0.5 * dip,
      join: 'round',
      cap: 'round',
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

    // Directional dip shading (ADR-0001): shadow pools toward the finger,
    // light rims the far side.
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

  private translated(dx: number, dy: number): number[] {
    const out: number[] = [];
    for (let i = 0; i < 6; i++) {
      out.push(this.vertices[2 * i]! + dx, this.vertices[2 * i + 1]! + dy);
    }
    return out;
  }
}
