import { Container, Graphics, Rectangle, Text } from 'pixi.js';
import { FONT, THEME } from './theme';

const CARD_W = 300;
const CARD_H = 270;
const CARD_X = (390 - CARD_W) / 2;
const CARD_Y = 287;
const PAD = 16;
const PILL_W = 200;
const PILL_H = 44;
const PILL_X = (CARD_W - PILL_W) / 2;
const PILL_Y = 210;

export interface ResultsSnapshot {
  /** Final session score. */
  score: number;
  best: number;
  /** The session beat the all-time best that stood when the board was dealt. */
  newBest: boolean;
  streak: number;
  daily: boolean;
}

export interface ResultsCallbacks {
  /** Deal a fresh random board — the card's primary action. */
  onNewBoard(): void;
}

/**
 * End-of-game card (ADR-0007): the ration is spent, so the board is complete.
 * Rises over the board with the session score, best and streak; the daily
 * points at tomorrow, a random board offers another deal. Dismissing the card
 * leaves the finished board on show — slides stay off until a new board starts.
 */
export class Results {
  readonly view = new Container();

  private readonly backdrop = new Graphics();
  private readonly card = new Container();
  private readonly cardG = new Graphics();
  private readonly pill = new Graphics();
  private readonly titleT: Text;
  private readonly scoreT: Text;
  private readonly badgeT: Text;
  private readonly statsT: Text;
  private readonly subT: Text;
  private readonly pillT: Text;
  private readonly dismissT: Text;
  private readonly dismissHit = new Container();
  private readonly pillHit = new Container();
  private readonly cb: ResultsCallbacks;
  private open = false;
  private openT = 0;

  constructor(cb: ResultsCallbacks) {
    this.cb = cb;

    // Dim the stage; taps are swallowed so the finished board can't be slid.
    this.backdrop.rect(0, 0, 390, 844).fill({ color: 0x000000 });
    this.backdrop.alpha = 0;
    this.backdrop.eventMode = 'static';
    this.backdrop.on('pointerdown', (e) => {
      e.stopPropagation();
    });

    this.card.position.set(CARD_X, CARD_Y);
    this.card.addChild(this.cardG);

    this.titleT = new Text({
      text: '',
      style: {
        fontFamily: FONT,
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 3,
        fill: THEME.stripDim,
      },
    });
    this.titleT.anchor.set(0.5);
    this.titleT.position.set(CARD_W / 2, 54);

    this.scoreT = new Text({
      text: '',
      style: { fontFamily: FONT, fontSize: 52, fontWeight: '800', fill: THEME.ember },
    });
    this.scoreT.anchor.set(0.5);
    this.scoreT.position.set(CARD_W / 2, 104);

    this.badgeT = new Text({
      text: 'NEW BEST',
      style: {
        fontFamily: FONT,
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 3,
        fill: THEME.stripInk,
      },
    });
    this.badgeT.anchor.set(0.5);
    this.badgeT.position.set(CARD_W / 2, 140);
    this.badgeT.visible = false;

    this.statsT = new Text({
      text: '',
      style: {
        fontFamily: FONT,
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 1,
        fill: THEME.stripDim,
      },
    });
    this.statsT.anchor.set(0.5);
    this.statsT.position.set(CARD_W / 2, 166);

    this.subT = new Text({
      text: '',
      style: { fontFamily: FONT, fontSize: 11, fontWeight: '500', fill: THEME.stripDim },
    });
    this.subT.anchor.set(0.5);
    this.subT.position.set(CARD_W / 2, 188);

    this.pillT = new Text({
      text: 'NEW BOARD',
      style: {
        fontFamily: FONT,
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 2,
        fill: THEME.ink,
      },
    });
    this.pillT.anchor.set(0.5);
    this.pillT.position.set(CARD_W / 2, PILL_Y + PILL_H / 2);

    this.dismissT = new Text({
      text: 'VIEW BOARD',
      style: {
        fontFamily: FONT,
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 2,
        fill: THEME.stripDim,
      },
    });
    this.dismissT.anchor.set(1, 0.5);
    this.dismissT.position.set(CARD_W - PAD, 28);
    this.dismissHit.position.set(CARD_W - PAD, 28);
    this.dismissHit.eventMode = 'static';
    this.dismissHit.hitArea = new Rectangle(-90, -24, 102, 48);
    this.dismissHit.on('pointerdown', (e) => {
      e.stopPropagation();
      this.close();
    });

    this.pill.eventMode = 'none';
    this.pillHit.position.set(PILL_X + PILL_W / 2, PILL_Y + PILL_H / 2);
    this.pillHit.eventMode = 'static';
    this.pillHit.hitArea = new Rectangle(
      -PILL_W / 2 - 12,
      -PILL_H / 2 - 10,
      PILL_W + 24,
      PILL_H + 20,
    );
    this.pillHit.on('pointerdown', (e) => {
      e.stopPropagation();
      this.cb.onNewBoard();
    });

    this.card.addChild(
      this.titleT,
      this.scoreT,
      this.badgeT,
      this.statsT,
      this.subT,
      this.dismissT,
      this.dismissHit,
      this.pill,
      this.pillT,
      this.pillHit,
    );
    this.view.addChild(this.backdrop, this.card);
    this.view.visible = false;
    this.drawChrome();
  }

  get isOpen(): boolean {
    return this.open;
  }

  show(snap: ResultsSnapshot): void {
    this.titleT.text = snap.daily ? 'DAILY COMPLETE' : 'BOARD COMPLETE';
    this.scoreT.text = String(snap.score);
    this.badgeT.visible = snap.newBest;
    this.statsT.text = `BEST ${snap.best}${snap.streak > 0 ? ` · STREAK ${snap.streak}` : ''}`;
    this.subT.text = snap.daily ? 'a new board arrives tomorrow' : '';
    this.open = true;
    this.openT = Math.max(this.openT, 0.001);
    this.view.visible = true;
  }

  close(): void {
    this.open = false;
  }

  refreshTheme(): void {
    this.drawChrome();
    this.titleT.style.fill = THEME.stripDim;
    this.scoreT.style.fill = THEME.ember;
    this.badgeT.style.fill = THEME.stripInk;
    this.statsT.style.fill = THEME.stripDim;
    this.subT.style.fill = THEME.stripDim;
    // Pill label picks up the backdrop colour: near-black on neon magenta in
    // dark, pale ice on deep magenta in light — both sides stay readable.
    this.pillT.style.fill = THEME.backdrop;
    this.dismissT.style.fill = THEME.stripDim;
  }

  step(dt: number): void {
    const dir = this.open ? 1 : -1;
    this.openT = Math.max(0, Math.min(1, this.openT + dir * dt * 6));
    const ease = 1 - Math.pow(1 - this.openT, 3);
    this.view.visible = this.openT > 0.004;
    if (!this.view.visible) return;
    this.backdrop.alpha = 0.55 * ease;
    this.card.alpha = ease;
    this.card.y = CARD_Y - (1 - ease) * 14;
  }

  /** Card chrome and the primary pill — both palette-dependent. */
  private drawChrome(): void {
    this.cardG.clear();
    // Soft lift shadow, then the card face and a hairline border.
    this.cardG.roundRect(-3, 7, CARD_W + 6, CARD_H, 20).fill({ color: THEME.shadow, alpha: 0.28 });
    this.cardG.roundRect(0, 0, CARD_W, CARD_H, 18).fill({ color: THEME.panel });
    this.cardG
      .roundRect(0, 0, CARD_W, CARD_H, 18)
      .stroke({ width: 1.5, color: THEME.panelBorder });
    this.pill.clear();
    this.pill.roundRect(PILL_X, PILL_Y, PILL_W, PILL_H, PILL_H / 2).fill({ color: THEME.ember });
  }
}
