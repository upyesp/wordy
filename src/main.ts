import { Application, Text, type FederatedPointerEvent } from 'pixi.js';
import { Board } from './Board';
import { boardBounds } from './hex';
import { Scoreboard } from './Scoreboard';
import { Score, type WordStatus } from './score';
import { TraceStrip } from './TraceStrip';
import { FONT, THEME } from './theme';

/** Strict portrait stage: letterboxed with bars on desktop, full-bleed on phones (Round 2, Q5). */
const STAGE_W = 390;
const STAGE_H = 844;
const TILE_SIZE = 39;
/** iOS fullscreen covers the stage top with status bar + Dynamic Island (≈59pt).
 *  Nothing interactive or informational lives above this line (feedback round 2). */
const SAFE_TOP = 56;
const BOARD_TOP_GAP = 230;

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
  // The fixed logical stage is ours to letterbox — pixi's window-following
  // resize must never stretch it (it fights fit() when phone UI chrome resizes).
  (app as unknown as { resizeTo: unknown }).resizeTo = null;
  document.querySelector('#app')!.appendChild(app.canvas);

  const dictionary: Promise<Set<string>> = fetch(`${import.meta.env.BASE_URL}words.txt`)
    .then((r) => {
      if (!r.ok) throw new Error(`words.txt ${r.status}`);
      return r.text();
    })
    .then((t) => new Set(t.split('\n').filter((w) => w.length > 0)));

  const scoreboard = new Scoreboard();
  scoreboard.view.position.set(0, SAFE_TOP);
  app.stage.addChild(scoreboard.view);

  const strip = new TraceStrip();
  strip.view.position.set(STAGE_W / 2, 190);
  app.stage.addChild(strip.view);

  const board = new Board(TILE_SIZE, {
    onSlideStart: () => {
      hint.visible = false;
      slideToken += 1;
      strip.reset();
    },
    onTileJoin: (letter) => {
      strip.append(letter);
    },
  });
  // Centre the DRAWN box, not the layout box: hexes overhang the outer tile
  // centres, so boardBounds carries the overhang offsets (feedback round 1).
  const bounds = boardBounds(TILE_SIZE);
  board.view.position.set(
    (STAGE_W - bounds.width) / 2 - bounds.offsetX,
    BOARD_TOP_GAP + (STAGE_H - BOARD_TOP_GAP - bounds.height) / 2 - bounds.offsetY,
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

  let score: Score | null = null;
  let slideToken = 0;

  async function evaluateSlide(): Promise<void> {
    const token = slideToken;
    const word = board.currentWord();
    if (word.length === 0) return;
    const dict = await dictionary;
    score ??= new Score(dict);
    if (token !== slideToken) return; // a new slide began while we loaded
    const result = score.submit(word);
    strip.markResult(result.status, result.points);
    scoreboard.update(score.score, score.words, score.best);
    if (result.status === 'new') scoreboard.flash();
  }

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
    void evaluateSlide();
  };
  app.stage.on('pointerup', end);
  app.stage.on('pointerupoutside', end);
  app.stage.on('pointercancel', end);

  const fit = (): void => {
    const scale = Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H);
    app.canvas.style.width = `${Math.floor(STAGE_W * scale)}px`;
    app.canvas.style.height = `${Math.floor(STAGE_H * scale)}px`;
    const res = Math.min(Math.max(window.devicePixelRatio * scale, 1), 3);
    app.renderer.resize(STAGE_W, STAGE_H, res);
  };
  window.addEventListener('resize', fit);
  window.addEventListener('orientationchange', fit);
  window.visualViewport?.addEventListener('resize', fit);
  fit();

  app.ticker.add((ticker) => {
    const dt = Math.min(ticker.deltaMS / 1000, 1 / 30);
    board.step(dt);
    strip.step(dt);
    scoreboard.step(dt);
  });

  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      /* offline support is progressive — ignore failures */
    });
  }
}

void boot();
