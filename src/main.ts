import { Application, Text, type FederatedPointerEvent } from 'pixi.js';
import { Board } from './Board';
import { boardBounds } from './hex';
import { generateLetters } from './letters';
import { Menu } from './Menu';
import { Scoreboard } from './Scoreboard';
import { Score } from './score';
import { Sound } from './sound';
import { TraceStrip } from './TraceStrip';
import { FONT, THEME, applyPalette, paletteFor, type ThemeName } from './theme';

/** Strict portrait stage: letterboxed with bars on desktop, full-bleed on phones (Round 2, Q5). */
const STAGE_W = 390;
const STAGE_H = 844;
const TILE_SIZE = 39;
/** iOS fullscreen covers the stage top with status bar + Dynamic Island (≈59pt).
 *  Nothing interactive or informational lives above this line (feedback round 2). */
const SAFE_TOP = 56;
const STRIP_Y = 190;
const BOARD_TOP_GAP = 230;

function pref(key: string, fallback: string): string {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function setPref(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private mode: preferences stay in-memory */
  }
}

async function boot(): Promise<void> {
  const themeName: ThemeName = pref('wordy.theme', 'dark') === 'light' ? 'light' : 'dark';
  const soundOn = pref('wordy.sound', '1') !== '0';
  applyPalette(paletteFor(themeName));

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

  const lists = Promise.all([
    fetch(`${import.meta.env.BASE_URL}words.txt`)
      .then((r) => {
        if (!r.ok) throw new Error(`words.txt ${r.status}`);
        return r.text();
      })
      .then((t) => new Set(t.split('\n').filter(Boolean))),
    fetch(`${import.meta.env.BASE_URL}words-common.txt`)
      .then((r) => {
        if (!r.ok) throw new Error(`words-common.txt ${r.status}`);
        return r.text();
      })
      .then((t) => t.split('\n').filter(Boolean)),
  ]);

  const scoreboard = new Scoreboard();
  scoreboard.view.position.set(0, SAFE_TOP);
  app.stage.addChild(scoreboard.view);

  const strip = new TraceStrip();
  strip.view.position.set(STAGE_W / 2, STRIP_Y);
  app.stage.addChild(strip.view);

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

  const sound = new Sound();
  sound.muted = !soundOn;

  let slideToken = 0;
  let score: Score | null = null;
  let board: Board | null = null;
  let dictionary: Set<string> = new Set();
  let common: string[] = [];

  function newGame(): void {
    if (!board || !score) return;
    slideToken += 1;
    score = new Score(dictionary);
    board.newGame(generateLetters(common, dictionary));
    strip.reset();
    scoreboard.update(0, 0, score.best);
  }

  function restyle(): void {
    app.renderer.background.color = THEME.backdrop;
    document.body.style.background = THEME.cssBackdrop;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME.cssBackdrop);
    hint.style.fill = THEME.stripDim;
    scoreboard.refreshTheme();
    strip.refreshTheme();
    board?.refreshTheme();
    menu.refreshTheme();
  }

  const menu = new Menu({
    onSound: (on) => {
      sound.muted = !on;
      setPref('wordy.sound', on ? '1' : '0');
    },
    onTheme: (light) => {
      const name: ThemeName = light ? 'light' : 'dark';
      applyPalette(paletteFor(name));
      setPref('wordy.theme', name);
      restyle();
    },
    onNewGame: () => newGame(),
  });
  menu.setSound(soundOn);
  menu.setThemeLight(themeName === 'light');
  menu.button.position.set(STAGE_W - 42, SAFE_TOP + 30);

  async function evaluateSlide(): Promise<void> {
    const token = slideToken;
    const word = board?.currentWord() ?? '';
    if (word.length === 0 || !score) return;
    if (token !== slideToken) return; // a new slide/game began meanwhile
    const result = score.submit(word);
    strip.markResult(result.status, result.points);
    scoreboard.update(score.score, score.words, score.best);
    if (result.status === 'new') {
      scoreboard.flash();
      sound.success();
    } else if (result.status === 'invalid' || result.status === 'short') {
      sound.fail();
    }
  }

  let activePointer: number | null = null;
  app.stage.eventMode = 'static';
  app.stage.hitArea = app.screen;
  app.stage.on('pointerdown', (e) => {
    sound.resume();
    if (activePointer !== null) return; // single finger only (Round 1)
    if (e.target !== app.stage) return; // menu chrome never starts a slide
    activePointer = e.pointerId;
    board?.press(e.global.x, e.global.y);
  });
  app.stage.on('pointermove', (e) => {
    if (e.pointerId !== activePointer) return;
    board?.move(e.global.x, e.global.y);
  });
  const end = (e: FederatedPointerEvent): void => {
    if (e.pointerId !== activePointer) return;
    activePointer = null;
    board?.release();
    void evaluateSlide();
  };
  app.stage.on('pointerup', end);
  app.stage.on('pointerupoutside', end);
  app.stage.on('pointercancel', end);

  const fit = (): void => {
    const scale = Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H);
    const res = Math.min(Math.max(window.devicePixelRatio * scale, 1), 3);
    // resize first — autoDensity rewrites the canvas style to logical size, so
    // the letterbox style must be (re)asserted after it (feedback round 3).
    app.renderer.resize(STAGE_W, STAGE_H, res);
    app.canvas.style.width = `${Math.floor(STAGE_W * scale)}px`;
    app.canvas.style.height = `${Math.floor(STAGE_H * scale)}px`;
  };
  window.addEventListener('resize', fit);
  window.addEventListener('orientationchange', fit);
  window.visualViewport?.addEventListener('resize', fit);
  fit();

  app.ticker.add((ticker) => {
    const dt = Math.min(ticker.deltaMS / 1000, 1 / 30);
    board?.step(dt);
    strip.step(dt);
    scoreboard.step(dt);
    menu.step(dt);
  });

  // Word lists land, then the first game begins on a fresh arrangement.
  const [dictSet, commonList] = await lists;
  dictionary = dictSet;
  common = commonList;
  score = new Score(dictionary);
  scoreboard.update(0, 0, score.best);
  board = new Board(TILE_SIZE, generateLetters(common, dictionary), {
    onSlideStart: () => {
      hint.visible = false;
      slideToken += 1;
      strip.reset();
    },
    onTileJoin: (letter, index) => {
      strip.append(letter);
      sound.tick(index);
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
  // Menu chrome sits above the board so its taps never reach the stage.
  app.stage.addChild(menu.button, menu.layer);

  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      /* offline support is progressive — ignore failures */
    });
  }

  // Debug/e2e hooks (tiny, harmless in production).
  (window as unknown as Record<string, unknown>).__wordyNewGame = newGame;
  (window as unknown as Record<string, unknown>).__wordyLetters = () =>
    board?.tiles.map((t) => t.letter).join('') ?? '';
  (window as unknown as Record<string, unknown>).__wordyDebug = () => ({
    ...menu.debugState,
    theme: document.body.style.background,
  });
}

void boot();
