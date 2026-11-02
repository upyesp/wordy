import { Container, Text } from 'pixi.js';
import { FONT, THEME, lerpColor } from './theme';

/**
 * The big scoreboard (feedback round): SCORE huge and centred, WORDS and BEST
 * flanking. The score counts up with an ember flash on every accepted word.
 */
export class Scoreboard {
  readonly view = new Container();
  private targetScore = 0;
  private shownScore = 0;
  private pulse = 0;
  private readonly scoreT: Text;
  private readonly wordsT: Text;
  private readonly bestT: Text;
  private lastPulseFill = -1;

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
  }

  update(score: number, words: number, best: number): void {
    this.targetScore = score;
    this.wordsT.text = String(words);
    this.bestT.text = String(best);
  }

  flash(): void {
    this.pulse = 1;
  }

  step(dt: number): void {
    this.shownScore += (this.targetScore - this.shownScore) * Math.min(1, dt * 7);
    if (Math.abs(this.targetScore - this.shownScore) < 0.5) {
      this.shownScore = this.targetScore;
    }
    const shown = Math.round(this.shownScore);
    if (this.scoreT.text !== String(shown)) {
      this.scoreT.text = String(shown);
    }

    if (this.pulse > 0) {
      this.pulse = Math.max(0, this.pulse - dt * 2.2);
      this.scoreT.scale.set(1 + 0.15 * this.pulse);
      const fill = lerpColor(THEME.stripInk, THEME.ember, this.pulse);
      if (fill !== this.lastPulseFill) {
        this.lastPulseFill = fill;
        this.scoreT.style.fill = fill;
      }
    }
  }
}
