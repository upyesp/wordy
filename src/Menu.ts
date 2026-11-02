import { Container, Graphics, Rectangle, Text } from 'pixi.js';
import { FONT, THEME, lerpColor } from './theme';

export interface MenuCallbacks {
  onSound(on: boolean): void;
  onTheme(light: boolean): void;
  onNewGame(): void;
}

const PANEL_W = 236;
const ROW_H = 52;
const PANEL_H = ROW_H * 3 + 16;
const SWITCH_W = 46;
const SWITCH_H = 26;
const KNOB = 10;
const TARGET_Y = 52;

/**
 * Hamburger button + drop-down panel (feedback round 3): sound and theme
 * toggles plus new-game, tucked into the top-right of the safe band. Every row
 * tap stops propagation so it can never start a slide on the board beneath.
 */
export class Menu {
  readonly button = new Container();
  readonly layer = new Container();
  private readonly panel = new Container();
  private readonly backdrop = new Graphics();
  private readonly panelG = new Graphics();
  private readonly bars = new Graphics();
  private readonly soundKnob = new Graphics();
  private readonly themeKnob = new Graphics();
  private readonly labels: Text[] = [];
  private readonly cb: MenuCallbacks;
  private open = false;
  private openT = 0;
  private soundOn = true;
  private themeLight = false;
  private soundT = 0;
  private themeT = 0;
  private lastSoundT = -1;
  private lastThemeT = -1;

  constructor(cb: MenuCallbacks) {
    this.cb = cb;

    // Hamburger: three bars, generous 44pt hit area, always visible.
    this.drawBars();
    this.button.addChild(this.bars);
    this.button.eventMode = 'static';
    this.button.hitArea = new Rectangle(-22, -22, 44, 44);
    this.button.on('pointerdown', (e) => {
      e.stopPropagation();
      this.toggle();
    });

    // Backdrop: dims the stage; tap to close.
    this.backdrop.rect(0, 0, 390, 844).fill({ color: 0x000000, alpha: 1 });
    this.backdrop.eventMode = 'static';
    this.backdrop.on('pointerdown', (e) => {
      e.stopPropagation();
      if (!this.open) return; // closing: ignore taps during the cosmetic fade
      this.close();
    });

    // Panel chrome + rows.
    this.panelG.eventMode = 'none';
    this.panel.addChild(this.panelG);

    const row = (index: number): Container => {
      const c = new Container();
      c.eventMode = 'static';
      c.hitArea = new Rectangle(8, 8 + index * ROW_H, PANEL_W - 16, ROW_H);
      c.on('pointerdown', (e) => {
        e.stopPropagation();
        if (!this.open) return; // closing: ignore taps during the cosmetic fade
        this.onRow(index);
      });
      this.panel.addChild(c);
      return c;
    };

    const label = (text: string, index: number): Text => {
      const t = new Text({
        text,
        style: { fontFamily: FONT, fontSize: 17, fontWeight: '600', fill: THEME.stripInk },
      });
      t.anchor.set(0, 0.5);
      t.position.set(18, 8 + index * ROW_H + ROW_H / 2);
      this.labels.push(t);
      this.panel.addChild(t);
      return t;
    };

    label('Sound', 0);
    this.soundKnob.position.set(PANEL_W - SWITCH_W - 18, 0);
    this.panel.addChild(this.soundKnob);
    row(0);

    label('Theme', 1);
    this.themeKnob.position.set(PANEL_W - SWITCH_W - 18, 0);
    this.panel.addChild(this.themeKnob);
    row(1);

    const ng = label('New game', 2);
    const glyph = new Text({
      text: '↻',
      style: { fontFamily: FONT, fontSize: 22, fontWeight: '700', fill: THEME.ember },
    });
    glyph.anchor.set(0.5);
    glyph.position.set(PANEL_W - 36, 8 + 2 * ROW_H + ROW_H / 2);
    glyph.eventMode = 'none';
    this.labels.push(glyph);
    this.panel.addChild(glyph);
    row(2);
    void ng;

    this.layer.addChild(this.backdrop, this.panel);
    this.layer.visible = false;
    this.layer.eventMode = 'static';
    this.layer.hitArea = new Rectangle(0, 0, 390, 844);

    this.rebuildChrome();
  }

  setSound(on: boolean): void {
    this.soundOn = on;
  }

  setThemeLight(light: boolean): void {
    this.themeLight = light;
  }

  get debugState(): {
    open: boolean;
    buttonX: number;
    buttonY: number;
    panelY: number;
    layerVisible: boolean;
  } {
    return {
      open: this.open,
      buttonX: this.button.x,
      buttonY: this.button.y,
      panelY: this.panel.y,
      layerVisible: this.layer.visible,
    };
  }

  toggle(): void {
    if (this.open) {
      this.close();
    } else {
      this.open = true;
      // Interactive from the first frame; children are 'auto' so they follow.
      this.layer.eventMode = 'static';
      this.layer.visible = true;
    }
  }

  close(): void {
    this.open = false;
    // Stop intercepting taps the moment closing begins — the fade is cosmetic.
    // Without this, a quick second tap lands on the fading panel and fires rows.
    this.layer.eventMode = 'none';
  }

  refreshTheme(): void {
    this.drawBars();
    this.rebuildChrome();
    for (const t of this.labels) t.style.fill = t.text === '↻' ? THEME.ember : THEME.stripInk;
    this.lastSoundT = -1;
    this.lastThemeT = -1;
  }

  step(dt: number): void {
    this.openT = Math.max(0, Math.min(1, this.openT + (this.open ? 1 : -1) * dt * 6));
    const ease = 1 - Math.pow(1 - this.openT, 3);
    this.layer.visible = this.openT > 0.005;
    if (!this.layer.visible) return;
    this.backdrop.alpha = 0.45 * ease;
    this.panel.alpha = ease;
    this.panel.x = 390 - PANEL_W - 10;
    this.panel.y = TARGET_Y - (1 - ease) * 28;

    this.soundT += ((this.soundOn ? 1 : 0) - this.soundT) * Math.min(1, dt * 12);
    this.themeT += ((this.themeLight ? 1 : 0) - this.themeT) * Math.min(1, dt * 12);
    if (Math.abs(this.soundT - this.lastSoundT) > 0.003) {
      this.lastSoundT = this.soundT;
      this.drawSwitch(this.soundKnob, 8 + ROW_H / 2 - SWITCH_H / 2, this.soundT);
    }
    if (Math.abs(this.themeT - this.lastThemeT) > 0.003) {
      this.lastThemeT = this.themeT;
      this.drawSwitch(this.themeKnob, 8 + ROW_H + ROW_H / 2 - SWITCH_H / 2, this.themeT);
    }
  }

  private onRow(index: number): void {
    if (index === 0) {
      this.soundOn = !this.soundOn;
      this.cb.onSound(this.soundOn);
    } else if (index === 1) {
      this.themeLight = !this.themeLight;
      this.cb.onTheme(this.themeLight);
    } else {
      this.close();
      this.cb.onNewGame();
    }
  }

  private drawBars(): void {
    this.bars.clear();
    for (let i = -1; i <= 1; i++) {
      this.bars.roundRect(-11, i * 7 - 1.5, 22, 3, 1.5);
      this.bars.fill({ color: THEME.stripInk });
    }
  }

  private drawSwitch(g: Graphics, y: number, t: number): void {
    g.clear();
    g.roundRect(0, y, SWITCH_W, SWITCH_H, SWITCH_H / 2);
    g.fill({ color: lerpColor(THEME.toggleOff, THEME.ember, t) });
    g.circle(SWITCH_H / 2 + t * (SWITCH_W - SWITCH_H), y + SWITCH_H / 2, KNOB);
    g.fill({ color: 0xf7f1e3 });
  }

  private rebuildChrome(): void {
    this.panelG.clear();
    this.panelG.roundRect(0, 0, PANEL_W, PANEL_H, 14);
    this.panelG.fill({ color: THEME.panel });
    this.panelG.stroke({ width: 1.5, color: THEME.panelBorder });
    for (let i = 1; i <= 2; i++) {
      const y = 8 + i * ROW_H;
      this.panelG.moveTo(16, y);
      this.panelG.lineTo(PANEL_W - 16, y);
      this.panelG.stroke({ width: 1, color: THEME.panelBorder, alpha: 0.6 });
    }
  }
}
