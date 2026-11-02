import { Container, Text } from 'pixi.js';
import { FONT, THEME } from './theme';

const MAX_LETTERS = 12;
const SLOT = 26;

export type WordStatus = 'new' | 'dup' | 'invalid' | 'short';

interface Popup {
  text: Text;
  age: number;
}

/**
 * The trace strip (GLOSSARY): echoes the trace's letters in visit order and
 * persists after release until the next slide begins (Round 2, Q3). Result
 * marking recolours the held word — no underlines or bars, ever.
 */
export class TraceStrip {
  readonly view = new Container();
  private letters: Text[] = [];
  private pops: Popup[] = [];
  private lastStatus: WordStatus | null = null;
  private hintMode = false;

  reset(): void {
    for (const t of this.letters) t.destroy();
    this.letters = [];
    for (const p of this.pops) p.text.destroy();
    this.pops = [];
    this.lastStatus = null;
    this.hintMode = false;
  }

  /**
   * A slide is starting. A judged word is cleared straight away, but a hint
   * word stays visible until the first tile actually joins the new trace.
   */
  beginSlide(): void {
    if (!this.hintMode) this.reset();
  }

  append(letter: string): void {
    if (this.hintMode) this.reset();
    this.addLetter(letter);
  }

  private addLetter(letter: string): void {
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
    t.alpha = 1;
    this.letters.push(t);
    this.view.addChild(t);
    if (this.letters.length > MAX_LETTERS) {
      this.letters.shift()!.destroy();
    }
    this.layout();
  }

  /** Recolour the held word once the word has been judged. */
  markResult(status: WordStatus, points: number): void {
    this.hintMode = false;
    this.lastStatus = status;
    this.applyStatus();
    if (status === 'new') {
      const popup = new Text({
        text: `+${points}`,
        style: {
          fontFamily: FONT,
          fontSize: 24,
          fontWeight: '800',
          fill: THEME.ember,
        },
      });
      popup.anchor.set(0);
      const right = this.letters.length
        ? this.letters[this.letters.length - 1]!.x + SLOT * 1.5
        : 0;
      popup.position.set(right, -6);
      this.pops.push({ text: popup, age: 0 });
      this.view.addChild(popup);
    }
  }

  /** Echo a hint word (dim ember) until the next slide's first tile. */
  showHint(word: string): void {
    this.reset();
    for (const letter of word) this.addLetter(letter);
    this.hintMode = true;
    this.applyStatus();
  }

  /** Re-apply the held result colours after a palette swap. */
  refreshTheme(): void {
    this.applyStatus();
  }

  private applyStatus(): void {
    if (this.hintMode) {
      for (const t of this.letters) {
        t.style.fill = THEME.ember;
        t.alpha = 0.55;
      }
      return;
    }
    for (const t of this.letters) {
      switch (this.lastStatus) {
        case 'new':
          t.style.fill = THEME.ember;
          t.alpha = 1;
          break;
        case 'dup':
          t.style.fill = THEME.stripInk;
          t.alpha = 0.45;
          break;
        case 'invalid':
        case 'short':
          t.style.fill = THEME.stripDim;
          t.alpha = 0.6;
          break;
        default:
          t.style.fill = THEME.stripInk;
          t.alpha = 1;
      }
    }
  }

  step(dt: number): void {
    for (const t of this.letters) {
      const s = t.scale.x;
      if (Math.abs(s - 1) > 0.004) {
        t.scale.set(s + (1 - s) * Math.min(1, dt * 10));
      }
    }
    for (let i = this.pops.length - 1; i >= 0; i--) {
      const p = this.pops[i]!;
      p.age += dt;
      p.text.y = -6 - p.age * 26;
      p.text.alpha = Math.max(0, 1 - p.age / 0.9);
      if (p.age >= 0.9) {
        p.text.destroy();
        this.pops.splice(i, 1);
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
