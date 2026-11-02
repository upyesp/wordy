import { Container, Graphics, Rectangle, Text } from 'pixi.js';
import type { FoundWord } from './score';
import { FONT, THEME } from './theme';

const CARD_W = 342;
const MAX_CARD_H = 452;
const MIN_CARD_H = 150;
const EMPTY_CARD_H = 230;
const CARD_X = (390 - CARD_W) / 2;
const CARD_Y = 216;
const PAD = 16;
const HEADER_H = 60;
const FOOTER_PAD = 14;
const INNER_W = CARD_W - PAD * 2;
const CHIP_H = 34;
const CHIP_GAP = 8;
const ROW_GAP = 9;

/**
 * Found-words review (feedback round 4): tapping the WORDS stat lifts a card
 * over the board listing every word scored this board, newest first, with the
 * points it earned. Drag (or wheel) to scroll when the list outgrows the card.
 *
 * The panel is presentation only — it is handed a snapshot of the score's
 * found words each time it opens.
 */
export class WordsPanel {
  readonly view = new Container();

  private readonly backdrop = new Graphics();
  private readonly card = new Container();
  private readonly cardG = new Graphics();
  private readonly maskG = new Graphics();
  private readonly viewport = new Container();
  private readonly content = new Container();
  private readonly titleT: Text;
  private readonly subT: Text;
  private readonly closeT: Text;
  private readonly closeHit = new Container();

  private words: FoundWord[] = [];
  private cardH = MAX_CARD_H;
  private bodyH = MAX_CARD_H - HEADER_H - FOOTER_PAD;
  private open = false;
  private openT = 0;
  private scroll = 0;
  private maxScroll = 0;
  private velocity = 0;
  private dragging = false;
  private dragStartY = 0;
  private dragStartScroll = 0;
  private lastY = 0;
  private lastT = 0;

  constructor() {
    this.backdrop.rect(0, 0, 390, 844).fill({ color: 0x000000 });
    this.backdrop.alpha = 0;
    this.backdrop.eventMode = 'static';
    this.backdrop.on('pointerdown', (e) => {
      e.stopPropagation();
      if (this.open) this.close();
    });

    this.card.position.set(CARD_X, CARD_Y);
    this.card.addChild(this.cardG);

    this.titleT = new Text({
      text: 'WORDS FOUND',
      style: {
        fontFamily: FONT,
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 2.5,
        fill: THEME.stripDim,
      },
    });
    this.titleT.anchor.set(0, 0.5);
    this.titleT.position.set(PAD, 26);

    this.subT = new Text({
      text: '',
      style: { fontFamily: FONT, fontSize: 11, fontWeight: '500', fill: THEME.stripDim },
    });
    this.subT.anchor.set(0, 0.5);
    this.subT.position.set(PAD, 44);

    this.closeT = new Text({
      text: 'CLOSE',
      style: {
        fontFamily: FONT,
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 2,
        fill: THEME.stripDim,
      },
    });
    this.closeT.anchor.set(1, 0.5);
    this.closeT.position.set(CARD_W - PAD, 28);
    this.closeHit.position.set(CARD_W - PAD, 28);
    this.closeHit.eventMode = 'static';
    this.closeHit.hitArea = new Rectangle(-72, -24, 84, 48);
    this.closeHit.on('pointerdown', (e) => {
      e.stopPropagation();
      if (this.open) this.close();
    });

    this.viewport.position.set(PAD, HEADER_H);
    this.viewport.eventMode = 'static';
    this.viewport.hitArea = new Rectangle(0, 0, INNER_W, this.bodyH);
    this.viewport.mask = this.maskG;
    this.viewport.addChild(this.content);

    this.viewport.on('pointerdown', (e) => {
      e.stopPropagation();
      if (!this.open) return;
      this.dragging = true;
      this.dragStartY = e.global.y;
      this.dragStartScroll = this.scroll;
      this.lastY = e.global.y;
      this.lastT = performance.now();
      this.velocity = 0;
    });
    this.viewport.on('pointermove', (e) => {
      if (!this.dragging) return;
      e.stopPropagation();
      const now = performance.now();
      const dt = Math.max(1, now - this.lastT) / 1000;
      this.velocity = Math.max(-2600, Math.min(2600, (e.global.y - this.lastY) / dt));
      this.lastY = e.global.y;
      this.lastT = now;
      this.setScroll(this.dragStartScroll + (e.global.y - this.dragStartY));
    });
    const stopDrag = (): void => {
      this.dragging = false;
    };
    this.viewport.on('pointerup', stopDrag);
    this.viewport.on('pointerupoutside', stopDrag);
    this.viewport.on('pointercancel', stopDrag);
    this.viewport.on('wheel', (e) => {
      if (!this.open) return;
      e.stopPropagation();
      this.velocity = 0;
      this.setScroll(this.scroll - e.deltaY);
    });

    this.card.addChild(this.titleT, this.subT, this.closeT, this.closeHit, this.maskG, this.viewport);
    this.view.addChild(this.backdrop, this.card);
    this.view.visible = false;

    this.rebuild();
  }

  get isOpen(): boolean {
    return this.open;
  }

  show(words: readonly FoundWord[]): void {
    this.words = [...words];
    this.rebuild();
    this.open = true;
    this.openT = Math.max(this.openT, 0.001);
    this.view.visible = true;
    this.dragging = false;
    this.velocity = 0;
    this.setScroll(0);
  }

  close(): void {
    this.open = false;
    this.dragging = false;
    this.velocity = 0;
  }

  refreshTheme(): void {
    this.drawChrome();
    this.titleT.style.fill = THEME.stripDim;
    this.subT.style.fill = THEME.stripDim;
    this.closeT.style.fill = THEME.stripDim;
    this.rebuild();
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

    if (!this.dragging && this.velocity !== 0) {
      this.setScroll(this.scroll + this.velocity * dt);
      this.velocity *= Math.exp(-6 * dt);
      if (
        Math.abs(this.velocity) < 12 ||
        this.scroll === 0 ||
        this.scroll === -this.maxScroll
      ) {
        this.velocity = 0;
      }
    }
  }

  private setScroll(value: number): void {
    this.scroll = Math.min(0, Math.max(-this.maxScroll, value));
    this.content.y = this.scroll;
  }

  /** Size the card to its content (up to the max), then refit the mask. */
  private applyCardHeight(height: number): void {
    this.cardH = height;
    this.bodyH = height - HEADER_H - FOOTER_PAD;
    this.maskG.clear();
    this.maskG.roundRect(PAD, HEADER_H, INNER_W, this.bodyH, 8).fill({ color: 0xffffff });
    this.viewport.hitArea = new Rectangle(0, 0, INNER_W, this.bodyH);
    this.viewport.mask = this.maskG;
    this.drawChrome();
  }

  private drawChrome(): void {
    this.cardG.clear();
    // Soft lift shadow, then the card face and a hairline border.
    this.cardG.roundRect(-3, 7, CARD_W + 6, this.cardH, 20).fill({ color: THEME.shadow, alpha: 0.28 });
    this.cardG.roundRect(0, 0, CARD_W, this.cardH, 18).fill({ color: THEME.panel });
    this.cardG
      .roundRect(0, 0, CARD_W, this.cardH, 18)
      .stroke({ width: 1.5, color: THEME.panelBorder });
    this.cardG.moveTo(PAD, HEADER_H - 0.5);
    this.cardG.lineTo(CARD_W - PAD, HEADER_H - 0.5);
    this.cardG.stroke({ width: 1, color: THEME.panelBorder, alpha: 0.7 });
  }

  private rebuild(): void {
    for (const child of this.content.removeChildren()) child.destroy({ children: true });
    this.maxScroll = 0;
    this.velocity = 0;
    this.setScroll(0);

    if (this.words.length === 0) {
      this.subT.text = '';
      this.applyCardHeight(EMPTY_CARD_H);
      this.maxScroll = 0;
      const head = new Text({
        text: 'No words yet',
        style: { fontFamily: FONT, fontSize: 18, fontWeight: '700', fill: THEME.stripInk },
      });
      head.anchor.set(0.5);
      head.position.set(INNER_W / 2, this.bodyH / 2 - 18);
      const body = new Text({
        text: 'Slide across the honeycomb to find your first word.',
        style: {
          fontFamily: FONT,
          fontSize: 12,
          fontWeight: '500',
          fill: THEME.stripDim,
          wordWrap: true,
          wordWrapWidth: INNER_W - 80,
          align: 'center',
          lineHeight: 18,
        },
      });
      body.anchor.set(0.5);
      body.position.set(INNER_W / 2, this.bodyH / 2 + 14);
      this.content.addChild(head, body);
      return;
    }

    let x = 0;
    let y = 0;
    let total = 0;
    for (const entry of [...this.words].reverse()) {
      total += entry.points;
      const wordT = new Text({
        text: entry.word,
        style: { fontFamily: FONT, fontSize: 15, fontWeight: '700', fill: THEME.stripInk },
      });
      const ptsT = new Text({
        text: `+${entry.points}`,
        style: { fontFamily: FONT, fontSize: 12, fontWeight: '700', fill: THEME.ember },
      });
      wordT.anchor.set(0, 0.5);
      ptsT.anchor.set(1, 0.5);
      const chipW = Math.ceil(10 + wordT.width + 10 + ptsT.width + 10);
      if (x > 0 && x + chipW > INNER_W) {
        x = 0;
        y += CHIP_H + ROW_GAP;
      }
      const chip = new Container();
      chip.position.set(x, y);
      const chipG = new Graphics();
      chipG.roundRect(0, 0, chipW, CHIP_H, 10).fill({ color: THEME.panelBorder, alpha: 0.32 });
      wordT.position.set(10, CHIP_H / 2);
      ptsT.position.set(chipW - 10, CHIP_H / 2);
      chip.addChild(chipG, wordT, ptsT);
      this.content.addChild(chip);
      x += chipW + CHIP_GAP;
    }
    const contentH = y + CHIP_H;
    this.applyCardHeight(
      Math.min(MAX_CARD_H, Math.max(MIN_CARD_H, HEADER_H + contentH + FOOTER_PAD)),
    );
    this.maxScroll = Math.max(0, contentH - this.bodyH);
    this.setScroll(0);
    const count = this.words.length;
    this.subT.text = `${count} WORD${count === 1 ? '' : 'S'} · ${total} PTS`;
  }
}
