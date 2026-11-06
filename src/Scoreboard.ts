import { Container, Rectangle, Text } from 'pixi.js';
import { FONT, THEME, lerpColor } from './theme';

/**
 * The big scoreboard (feedback round): SCORE huge and centred, WORDS and BEST
 * flanking. WORDS doubles as the tap target for the found-words review — a
 * chevron appears once there is a word to review. The daily streak caption
 * sits in the gap under the score (ADR-0004), with the word ration below it
 * (ADR-0007).
 */
export class Scoreboard {
  readonly view = new Container();
  /** Tapping the WORDS stat opens the found-words review. */
  onWordsTap: (() => void) | null = null;

  private targetScore = 0;
  private shownScore = 0;
  private pulse = 0;
  private readonly scoreT: Text;
  private readonly wordsT: Text;
  private readonly bestT: Text;
  private readonly streakT: Text;
  private readonly rationT: Text;
  private readonly chevron: Text;
  private readonly labels: Text[] = [];
  private lastPulseFill = -1;
  private scoreSize = 64;
  /** Remaining words in the ration; −1 until the first board sets it. */
  private rationLeft = -1;

  constructor() {
    const stat = (labelText: string, x: number): Text => {
      const label = new Text({
        text: labelText,
        style: {
          fontFamily: FONT,
          fontSize: 10,
          fontWeight: '700',
          letterSpacing: 3,
          fill: THEME.stripDim,
        },
      });
      label.anchor.set(0.5);
      label.position.set(x, 34);
      this.labels.push(label);
      this.view.addChild(label);
      const value = new Text({
        text: '0',
        style: {
          fontFamily: FONT,
          fontSize: 20,
          fontWeight: '700',
          fill: THEME.stripInk,
        },
      });
      value.anchor.set(0.5);
      value.position.set(x, 62);
      this.view.addChild(value);
      return value;
    };

    this.wordsT = stat('WORDS', 88);
    this.bestT = stat('BEST', 302);

    this.chevron = new Text({
      text: '›',
      style: { fontFamily: FONT, fontSize: 15, fontWeight: '700', fill: THEME.stripDim },
    });
    this.chevron.anchor.set(0.5);
    this.chevron.position.set(122, 34);
    this.chevron.alpha = 0;
    this.view.addChild(this.chevron);

    this.scoreT = new Text({
      text: '0',
      style: {
        fontFamily: FONT,
        fontSize: 64,
        fontWeight: '800',
        fill: THEME.stripInk,
      },
    });
    this.scoreT.anchor.set(0.5);
    this.scoreT.position.set(195, 60);
    this.view.addChild(this.scoreT);

    this.streakT = new Text({
      text: '',
      style: {
        fontFamily: FONT,
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 2,
        fill: THEME.ember,
      },
    });
    this.streakT.anchor.set(0.5);
    this.streakT.position.set(195, 104);
    this.view.addChild(this.streakT);

    // Word ration caption (ADR-0007): "7 WORDS LEFT", ember once it runs out.
    this.rationT = new Text({
      text: '',
      style: {
        fontFamily: FONT,
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 2,
        fill: THEME.stripDim,
      },
    });
    this.rationT.anchor.set(0.5);
    this.rationT.position.set(195, 116);
    this.view.addChild(this.rationT);

    // WORDS stat hit area: wider than the label so a thumb can find it.
    const wordsHit = new Container();
    wordsHit.eventMode = 'static';
    wordsHit.hitArea = new Rectangle(36, 14, 104, 64);
    wordsHit.on('pointerdown', (e) => {
      e.stopPropagation();
      this.onWordsTap?.();
    });
    this.view.addChild(wordsHit);
  }

  update(score: number, words: number, best: number): void {
    this.targetScore = score;
    this.wordsT.text = String(words);
    this.bestT.text = String(best);
    this.chevron.alpha = words > 0 ? 1 : 0;
  }

  /** Daily-board marker and consecutive-day streak (ADR-0004). */
  setStreak(streak: number, daily: boolean): void {
    if (daily) {
      this.streakT.text = streak > 0 ? `DAILY · STREAK ${streak}` : 'DAILY BOARD';
    } else {
      this.streakT.text = streak > 0 ? `STREAK ${streak}` : '';
    }
  }

  /** Words still in the ration (ADR-0007); zero completes the board. */
  setRation(left: number): void {
    this.rationLeft = left;
    this.rationT.text =
      left > 0 ? `${left} WORD${left === 1 ? '' : 'S'} LEFT` : left === 0 ? 'BOARD COMPLETE' : '';
    this.rationT.style.fill = left > 0 ? THEME.stripDim : THEME.ember;
  }

  flash(): void {
    this.pulse = 1;
  }

  /** Fresh board: snap the score to zero instead of unwinding the count-up. */
  resetScore(): void {
    this.targetScore = 0;
    this.shownScore = 0;
    this.pulse = 0;
    this.scoreT.text = '0';
    this.scoreT.scale.set(1);
    if (this.scoreSize !== 64) {
      this.scoreSize = 64;
      this.scoreT.style.fontSize = 64;
    }
  }

  refreshTheme(): void {
    for (const label of this.labels) label.style.fill = THEME.stripDim;
    this.wordsT.style.fill = THEME.stripInk;
    this.bestT.style.fill = THEME.stripInk;
    this.streakT.style.fill = THEME.ember;
    this.setRation(this.rationLeft);
    this.chevron.style.fill = THEME.stripDim;
    this.lastPulseFill = -1;
  }

  step(dt: number): void {
    this.shownScore += (this.targetScore - this.shownScore) * Math.min(1, dt * 7);
    if (Math.abs(this.targetScore - this.shownScore) < 0.5) {
      this.shownScore = this.targetScore;
    }
    const shown = Math.round(this.shownScore);
    const text = String(shown);
    if (this.scoreT.text !== text) {
      this.scoreT.text = text;
      // Keep wide scores clear of the flanking WORDS/BEST stats.
      const size = text.length >= 6 ? 38 : text.length === 5 ? 42 : text.length === 4 ? 50 : 64;
      if (size !== this.scoreSize) {
        this.scoreSize = size;
        this.scoreT.style.fontSize = size;
      }
    }

    if (this.pulse > 0) {
      this.pulse = Math.max(0, this.pulse - dt * 2.2);
      this.scoreT.scale.set(1 + 0.15 * this.pulse);
      const fill = lerpColor(THEME.stripInk, THEME.ember, this.pulse);
      if (fill !== this.lastPulseFill) {
        this.lastPulseFill = fill;
        this.scoreT.style.fill = fill;
      }
    } else if (this.scoreT.style.fill !== THEME.stripInk) {
      this.scoreT.style.fill = THEME.stripInk;
    }
  }
}
