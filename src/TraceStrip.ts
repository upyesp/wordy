import { Container, Graphics, Text } from 'pixi.js';
import { FONT, THEME } from './theme';

const MAX_LETTERS = 12;
const SLOT = 26;
const UNDERLINE_WIDTH = 320;

/**
 * The trace strip (GLOSSARY): echoes the trace's letters in visit order and
 * persists after release until the next slide begins (Round 2, Q3).
 */
export class TraceStrip {
  readonly view = new Container();
  private letters: Text[] = [];

  constructor() {
    const underline = new Graphics();
    underline.rect(-UNDERLINE_WIDTH / 2, 20, UNDERLINE_WIDTH, 1.5);
    underline.fill({ color: THEME.stripDim, alpha: 0.45 });
    this.view.addChild(underline);
  }

  /** Clears for a new slide (called on every press). */
  reset(): void {
    for (const t of this.letters) t.destroy();
    this.letters = [];
  }

  append(letter: string): void {
    const t = new Text({
      text: letter,
      style: {
        fontFamily: FONT,
        fontSize: 30,
        fontWeight: '800',
        fill: THEME.stripInk,
      },
    });
    t.anchor.set(0.5);
    t.scale.set(0.4);
    this.letters.push(t);
    this.view.addChild(t);
    if (this.letters.length > MAX_LETTERS) {
      this.letters.shift()!.destroy();
    }
    this.layout();
  }

  step(dt: number): void {
    for (const t of this.letters) {
      if (t.scale.x < 0.995) {
        t.scale.set(t.scale.x + (1 - t.scale.x) * Math.min(1, dt * 14));
      }
    }
  }

  private layout(): void {
    const n = this.letters.length;
    for (let i = 0; i < n; i++) {
      const t = this.letters[i]!;
      t.x = (i - (n - 1) / 2) * SLOT;
      t.y = 0;
    }
  }
}
