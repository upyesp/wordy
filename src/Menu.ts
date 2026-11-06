import { Container, Graphics, Rectangle, Text } from 'pixi.js';
import { FONT, THEME, lerpColor } from './theme';

export interface MenuCallbacks {
  /** The menu just opened — other overlays should close. */
  onOpen(): void;
  onSound(on: boolean): void;
  onTheme(light: boolean): void;
  onHint(): void;
  onNewGame(): void;
  onDaily(): void;
}

const PANEL_W = 236;
const ROW_H = 52;
const ROW_COUNT = 5;
const PANEL_H = ROW_H * ROW_COUNT + 16;
const SWITCH_W = 46;
const SWITCH_H = 26;
const KNOB = 10;
const SWITCH_X = PANEL_W - SWITCH_W - 18;
const SWITCH_Y = (ROW_H - SWITCH_H) / 2;
const LABEL_X = 56;
const ICON_X = 30;
const TARGET_Y = 52;

/**
 * Hamburger button + drop-down panel: sound and theme toggles (each with an
 * icon that names what it changes and reflects the current state), a hint
 * action with its remaining count, new game, and today's daily board.
 * Every row tap stops propagation so it can never start a slide beneath.
 */
export class Menu {
  readonly button = new Container();
  readonly layer = new Container();

  private readonly panel = new Container();
  private readonly backdrop = new Graphics();
  private readonly panelG = new Graphics();
  private readonly bars = new Graphics();
  private readonly rows: Container[] = [];
  private readonly labels: Text[] = [];

  private readonly soundOnG = new Graphics();
  private readonly soundOffG = new Graphics();
  private readonly soundSwitch = new Graphics();
  private readonly sunG = new Graphics();
  private readonly moonG = new Graphics();
  private readonly themeSwitch = new Graphics();
  private readonly bulbG = new Graphics();
  private readonly plusG = new Graphics();
  private readonly calG = new Graphics();
  private readonly hintCountT: Text;

  private readonly cb: MenuCallbacks;
  private open = false;
  private openT = 0;
  private soundOn = true;
  private themeLight = false;
  private hints = 3;
  private soundT = 1;
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

    this.panelG.eventMode = 'none';
    this.panel.addChild(this.panelG);

    // Row 0 — Sound.
    const soundRow = this.row(0);
    const soundIcons = this.iconSlot(soundRow);
    soundIcons.addChild(this.soundOnG, this.soundOffG);
    this.label(soundRow, 'Sound');
    this.soundSwitch.position.set(SWITCH_X, SWITCH_Y);
    this.soundSwitch.eventMode = 'none';
    soundRow.addChild(this.soundSwitch);

    // Row 1 — Theme.
    const themeRow = this.row(1);
    const themeIcons = this.iconSlot(themeRow);
    themeIcons.addChild(this.sunG, this.moonG);
    this.label(themeRow, 'Theme');
    this.themeSwitch.position.set(SWITCH_X, SWITCH_Y);
    this.themeSwitch.eventMode = 'none';
    themeRow.addChild(this.themeSwitch);

    // Row 2 — Hint (limited per board; the count sits where switches do).
    const hintRow = this.row(2);
    this.iconSlot(hintRow).addChild(this.bulbG);
    this.label(hintRow, 'Hint');
    this.hintCountT = new Text({
      text: '3 left',
      style: { fontFamily: FONT, fontSize: 11, fontWeight: '600', fill: THEME.ember },
    });
    this.hintCountT.anchor.set(1, 0.5);
    this.hintCountT.position.set(PANEL_W - 24, ROW_H / 2);
    hintRow.addChild(this.hintCountT);

    // Row 3 — New game.
    const newRow = this.row(3);
    this.iconSlot(newRow).addChild(this.plusG);
    this.label(newRow, 'New game');

    // Row 4 — Today's daily board.
    const dailyRow = this.row(4);
    this.iconSlot(dailyRow).addChild(this.calG);
    this.label(dailyRow, 'Daily board');

    this.layer.addChild(this.backdrop, this.panel);
    this.layer.visible = false;
    this.layer.eventMode = 'none';
    this.layer.hitArea = new Rectangle(0, 0, 390, 844);

    this.drawChrome();
    this.drawIcons();
  }

  setSound(on: boolean): void {
    this.soundOn = on;
    this.soundT = on ? 1 : 0;
    this.drawSwitch(this.soundSwitch, this.soundT);
    this.lastSoundT = this.soundT;
    this.applyIconAlphas();
  }

  setThemeLight(light: boolean): void {
    this.themeLight = light;
    this.themeT = light ? 1 : 0;
    this.drawSwitch(this.themeSwitch, this.themeT);
    this.lastThemeT = this.themeT;
    this.applyIconAlphas();
  }

  setHints(count: number): void {
    this.hints = count;
    this.hintCountT.text = count > 0 ? `${count} left` : 'none';
    this.hintCountT.style.fill = count > 0 ? THEME.ember : THEME.stripDim;
    this.rows[2]!.alpha = count > 0 ? 1 : 0.45;
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
      this.layer.eventMode = 'static';
      this.layer.visible = true;
      this.cb.onOpen();
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
    this.drawChrome();
    this.drawIcons();
    for (const t of this.labels) t.style.fill = THEME.stripInk;
    this.lastSoundT = -1;
    this.lastThemeT = -1;
    this.setHints(this.hints);
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
      this.drawSwitch(this.soundSwitch, this.soundT);
      this.applyIconAlphas();
    }
    if (Math.abs(this.themeT - this.lastThemeT) > 0.003) {
      this.lastThemeT = this.themeT;
      this.drawSwitch(this.themeSwitch, this.themeT);
      this.applyIconAlphas();
    }
  }

  private onRow(index: number): void {
    if (index === 0) {
      this.soundOn = !this.soundOn;
      this.cb.onSound(this.soundOn);
    } else if (index === 1) {
      this.themeLight = !this.themeLight;
      this.cb.onTheme(this.themeLight);
    } else if (index === 2) {
      if (this.hints <= 0) return;
      this.close();
      this.cb.onHint();
    } else if (index === 3) {
      this.close();
      this.cb.onNewGame();
    } else {
      this.close();
      this.cb.onDaily();
    }
  }

  private row(index: number): Container {
    const row = new Container();
    row.position.set(0, 8 + index * ROW_H);
    row.eventMode = 'static';
    // Inset from the panel face so the rounded top corners are not tappable.
    row.hitArea = new Rectangle(6, 0, PANEL_W - 12, ROW_H);
    row.on('pointerdown', (e) => {
      e.stopPropagation();
      if (!this.open) return; // closing: ignore taps during the cosmetic fade
      this.onRow(index);
    });
    this.panel.addChild(row);
    this.rows.push(row);
    return row;
  }

  private iconSlot(row: Container): Container {
    const slot = new Container();
    slot.position.set(ICON_X, ROW_H / 2);
    slot.eventMode = 'none';
    row.addChild(slot);
    return slot;
  }

  private label(row: Container, text: string): Text {
    const t = new Text({
      text,
      style: { fontFamily: FONT, fontSize: 16, fontWeight: '600', fill: THEME.stripInk },
    });
    t.anchor.set(0, 0.5);
    t.position.set(LABEL_X, ROW_H / 2);
    row.addChild(t);
    this.labels.push(t);
    return t;
  }

  private drawBars(): void {
    this.bars.clear();
    for (let i = -1; i <= 1; i++) {
      this.bars.roundRect(-11, i * 7 - 1.5, 22, 3, 1.5);
      this.bars.fill({ color: THEME.stripInk });
    }
  }

  private drawSwitch(g: Graphics, t: number): void {
    g.clear();
    g.roundRect(0, 0, SWITCH_W, SWITCH_H, SWITCH_H / 2);
    g.fill({ color: lerpColor(THEME.toggleOff, THEME.ember, t) });
    g.circle(SWITCH_H / 2 + t * (SWITCH_W - SWITCH_H), SWITCH_H / 2, KNOB);
    g.fill({ color: 0xf4f7ff }); // neutral knob — sits on ember in both themes
  }

  private applyIconAlphas(): void {
    this.soundOnG.alpha = this.soundT;
    this.soundOffG.alpha = 1 - this.soundT;
    this.sunG.alpha = this.themeT;
    this.moonG.alpha = 1 - this.themeT;
  }

  private drawIcons(): void {
    this.drawSpeaker(this.soundOnG, false);
    this.drawSpeaker(this.soundOffG, true);
    this.drawSun(this.sunG);
    this.drawMoon(this.moonG);
    this.drawBulb(this.bulbG);
    this.drawPlus(this.plusG);
    this.drawCalendar(this.calG);
    this.drawSwitch(this.soundSwitch, this.soundT);
    this.drawSwitch(this.themeSwitch, this.themeT);
    this.lastSoundT = this.soundT;
    this.lastThemeT = this.themeT;
    this.applyIconAlphas();
  }

  private drawSpeaker(g: Graphics, muted: boolean): void {
    g.clear();
    const c = muted ? THEME.stripDim : THEME.stripInk;
    g.roundRect(-9.5, -3.4, 4.4, 6.8, 1.4).fill({ color: c });
    g.poly([-5.2, -3.4, -5.2, 3.4, 1.6, 7.4, 1.6, -7.4]).fill({ color: c });
    if (muted) {
      g.moveTo(-1.2, -6.4).lineTo(8.6, 6.0).stroke({ width: 1.8, color: c, cap: 'round' });
    } else {
      g.arc(2.0, 0, 4.6, -0.62, 0.62).stroke({ width: 1.6, color: c, cap: 'round' });
      g.arc(2.0, 0, 7.8, -0.58, 0.58).stroke({ width: 1.6, color: c, cap: 'round' });
    }
  }

  private drawSun(g: Graphics): void {
    g.clear();
    g.circle(0, 0, 4.0).fill({ color: THEME.ember });
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      g.moveTo(Math.cos(a) * 6.0, Math.sin(a) * 6.0);
      g.lineTo(Math.cos(a) * 8.4, Math.sin(a) * 8.4);
      g.stroke({ width: 1.7, color: THEME.ember, cap: 'round' });
    }
  }

  private drawMoon(g: Graphics): void {
    g.clear();
    g.circle(-0.6, 0, 7.0).fill({ color: THEME.stripInk });
    // Carve the crescent with the panel colour; the panel face is flat.
    g.circle(3.2, -2.4, 6.4).fill({ color: THEME.panel });
  }

  private drawBulb(g: Graphics): void {
    g.clear();
    const c = THEME.ember;
    g.circle(0, -1.6, 4.8).stroke({ width: 1.7, color: c });
    g.moveTo(-2.3, 3.9).lineTo(2.3, 3.9);
    g.moveTo(-2.3, 6.3).lineTo(2.3, 6.3);
    g.stroke({ width: 1.7, color: c, cap: 'round' });
  }

  private drawPlus(g: Graphics): void {
    g.clear();
    const c = THEME.ember;
    g.roundRect(-7.5, -7.5, 15, 15, 4).stroke({ width: 1.7, color: c });
    g.moveTo(-3.7, 0).lineTo(3.7, 0);
    g.moveTo(0, -3.7).lineTo(0, 3.7);
    g.stroke({ width: 1.7, color: c, cap: 'round' });
  }

  private drawCalendar(g: Graphics): void {
    g.clear();
    const c = THEME.ember;
    g.roundRect(-8, -5.5, 16, 13.5, 3).stroke({ width: 1.7, color: c });
    g.moveTo(-8, -1.6).lineTo(8, -1.6);
    g.stroke({ width: 1.7, color: c });
    g.moveTo(-4.2, -8.6).lineTo(-4.2, -4.2);
    g.moveTo(4.2, -8.6).lineTo(4.2, -4.2);
    g.stroke({ width: 1.7, color: c, cap: 'round' });
    g.circle(0, 3.4, 1.7).fill({ color: c });
  }

  private drawChrome(): void {
    this.panelG.clear();
    this.panelG.roundRect(0, 0, PANEL_W, PANEL_H, 14);
    this.panelG.fill({ color: THEME.panel });
    this.panelG.stroke({ width: 1.5, color: THEME.panelBorder });
    for (let i = 1; i < ROW_COUNT; i++) {
      const y = 8 + i * ROW_H;
      this.panelG.moveTo(16, y);
      this.panelG.lineTo(PANEL_W - 16, y);
      this.panelG.stroke({ width: 1, color: THEME.panelBorder, alpha: 0.6 });
    }
  }
}
