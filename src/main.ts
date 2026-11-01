import { Application, Text, type FederatedPointerEvent } from 'pixi.js';
import { Board } from './Board';
import { boardSize } from './hex';
import { TraceStrip } from './TraceStrip';
import { FONT, THEME } from './theme';

/** Strict portrait stage: letterboxed with bars on desktop, full-bleed on phones (Round 2, Q5). */
const STAGE_W = 390;
const STAGE_H = 844;
const TILE_SIZE = 32;
const STRIP_Y = 96;
const BOARD_TOP_GAP = 150;

async function boot(): Promise<void> {
  const app = new Application();
  await app.init({
    width: STAGE_W,
    height: STAGE_H,
    background: THEME.backdrop,
    preference: 'webgpu',
    antialias: true,
    resolution: window.devicePixelRatio,
    autoDensity: true,
  });
  document.querySelector('#app')!.appendChild(app.canvas);

  const strip = new TraceStrip();
  strip.view.position.set(STAGE_W / 2, STRIP_Y);
  app.stage.addChild(strip.view);

  const board = new Board(TILE_SIZE, {
    onSlideStart: () => {
      hint.visible = false;
      strip.reset();
    },
    onTileJoin: (letter) => {
      strip.append(letter);
    },
  });
  const { width: boardW, height: boardH } = boardSize(TILE_SIZE);
  board.view.position.set(
    (STAGE_W - boardW) / 2,
    BOARD_TOP_GAP + (STAGE_H - BOARD_TOP_GAP - boardH) / 2,
  );
  app.stage.addChild(board.view);

  const hint = new Text({
    text: 'slide your finger across the honeycomb',
    style: {
      fontFamily: FONT,
      fontSize: 13,
      fontWeight: '500',
      letterSpacing: 1,
      fill: THEME.stripDim,
    },
  });
  hint.anchor.set(0.5);
  hint.position.set(STAGE_W / 2, STAGE_H - 48);
  app.stage.addChild(hint);

  let activePointer: number | null = null;
  app.stage.eventMode = 'static';
  app.stage.hitArea = app.screen;
  app.stage.on('pointerdown', (e) => {
    if (activePointer !== null) return; // single finger only (Round 1)
    activePointer = e.pointerId;
    board.press(e.global.x, e.global.y);
  });
  app.stage.on('pointermove', (e) => {
    if (e.pointerId !== activePointer) return;
    board.move(e.global.x, e.global.y);
  });
  const end = (e: FederatedPointerEvent): void => {
    if (e.pointerId !== activePointer) return;
    activePointer = null;
    board.release();
  };
  app.stage.on('pointerup', end);
  app.stage.on('pointerupoutside', end);
  app.stage.on('pointercancel', end);

  const fit = (): void => {
    const scale = Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H);
    app.canvas.style.width = `${Math.floor(STAGE_W * scale)}px`;
    app.canvas.style.height = `${Math.floor(STAGE_H * scale)}px`;
    app.renderer.resize(STAGE_W, STAGE_H, Math.min(window.devicePixelRatio * scale, 3));
  };
  window.addEventListener('resize', fit);
  fit();

  app.ticker.add((ticker) => {
    const dt = Math.min(ticker.deltaMS / 1000, 1 / 30);
    board.step(dt);
    strip.step(dt);
  });
}

void boot();
