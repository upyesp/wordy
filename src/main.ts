import { Application, Text, type FederatedPointerEvent } from 'pixi.js';
import { Board } from './Board';
import { dailySeed, hasPlayedToday, markPlayed, mulberry32, streakNow } from './daily';
import { boardBounds } from './hex';
import { findHint, generateLetters } from './letters';
import { Menu } from './Menu';
import { Results } from './Results';
import { Scoreboard } from './Scoreboard';
import { Score } from './score';
import { Sound } from './sound';
import { TraceStrip } from './TraceStrip';
import { FONT, THEME, applyPalette, paletteFor, type ThemeName } from './theme';
import { WordsPanel } from './WordsPanel';

/** Strict portrait stage: letterboxed with bars on desktop, full-bleed on phones (Round 2, Q5). */
const STAGE_W = 390;
const STAGE_H = 844;
const TILE_SIZE = 39;
/** iOS fullscreen covers the stage top with status bar + Dynamic Island (≈59pt).
 *  Nothing interactive or informational lives above this line (feedback round 2). */
const SAFE_TOP = 56;
const STRIP_Y = 190;
const BOARD_TOP_GAP = 230;
const HINTS_PER_BOARD = 3;
/** Every board grants ten new words (GLOSSARY: Ration); spending the last one
 *  completes the board (ADR-0007). Invalid traces and repeats are free. */
const WORDS_PER_BOARD = 10;
/** Menu fade-out time (plus margin); a hint waits so its reveal is not hidden. */
const MENU_CLOSE_MS = 240;

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

/** Keep the page chrome (letterbox bars, status bar) in step with the palette. */
function applyThemeChrome(): void {
  document.documentElement.style.background = THEME.cssBackdrop;
  document.body.style.background = THEME.cssBackdrop;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME.cssBackdrop);
}

async function boot(): Promise<void> {
  const storedTheme = pref('wordy.theme', '');
  let themeExplicit = storedTheme === 'light' || storedTheme === 'dark';
  const lightQuery = window.matchMedia('(prefers-color-scheme: light)');
  const systemTheme = (): ThemeName => (lightQuery.matches ? 'light' : 'dark');
  // Default to the device's appearance; an explicit toggle wins from then on.
  const themeName: ThemeName = themeExplicit
    ? storedTheme === 'light'
      ? 'light'
      : 'dark'
    : systemTheme();
  const soundOn = pref('wordy.sound', '1') !== '0';
  applyPalette(paletteFor(themeName));
  applyThemeChrome();

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

  const hintLine = new Text({
    text: 'slide your finger across the honeycomb',
    style: {
      fontFamily: FONT,
      fontSize: 13,
      fontWeight: '500',
      letterSpacing: 1,
      fill: THEME.stripDim,
    },
  });
  hintLine.anchor.set(0.5);
  hintLine.position.set(STAGE_W / 2, STAGE_H - 48);
  app.stage.addChild(hintLine);

  const wordsPanel = new WordsPanel();
  const results = new Results({ onNewBoard: () => newGame() });

  const sound = new Sound();
  sound.muted = !soundOn;

  let slideToken = 0;
  let score: Score | null = null;
  let board: Board | null = null;
  let dictionary: Set<string> = new Set();
  let common: string[] = [];
  let hintsLeft = HINTS_PER_BOARD;
  let dailyMode = true;
  let streak = streakNow();
  let streakRecorded = hasPlayedToday();
  let wordsLeft = WORDS_PER_BOARD;
  let boardComplete = false;
  let bestAtStart = 0;

  /** Deal a board (daily or random) and start a fresh session on it. */
  function startBoard(letters: string[][], daily: boolean): void {
    if (!board || !score) return;
    slideToken += 1;
    dailyMode = daily;
    score = new Score(dictionary);
    bestAtStart = score.best;
    boardComplete = false;
    wordsLeft = WORDS_PER_BOARD;
    board.newGame(letters);
    strip.reset();
    scoreboard.resetScore();
    scoreboard.update(0, 0, score.best);
    scoreboard.setStreak(streak, dailyMode);
    scoreboard.setRation(wordsLeft);
    results.close();
    wordsPanel.close();
    hintsLeft = HINTS_PER_BOARD;
    menu.setHints(hintsLeft);
  }

  function newGame(): void {
    startBoard(generateLetters(common, dictionary), false);
  }

  function dailyGame(): void {
    startBoard(generateLetters(common, dictionary, mulberry32(dailySeed())), true);
  }

  function scheduleHint(): void {
    sound.resume();
    const token = slideToken;
    window.setTimeout(() => {
      if (token !== slideToken) return; // a slide or new board began meanwhile
      revealHint();
    }, MENU_CLOSE_MS);
  }

  function revealHint(): void {
    if (!board || !score || hintsLeft <= 0 || boardComplete) return;
    const hint = findHint(board.gridLetters(), dictionary, score.foundSet);
    if (!hint) {
      sound.fail();
      return;
    }
    hintsLeft -= 1;
    menu.setHints(hintsLeft);
    board.showHint(hint.path);
    strip.showHint(hint.word);
    hintLine.visible = false;
    sound.hint();
  }

  function restyle(): void {
    app.renderer.background.color = THEME.backdrop;
    applyThemeChrome();
    hintLine.style.fill = THEME.stripDim;
    scoreboard.refreshTheme();
    strip.refreshTheme();
    board?.refreshTheme();
    wordsPanel.refreshTheme();
    results.refreshTheme();
    menu.refreshTheme();
  }

  const menu = new Menu({
    onOpen: () => wordsPanel.close(),
    onSound: (on) => {
      sound.muted = !on;
      if (on) sound.resume();
      setPref('wordy.sound', on ? '1' : '0');
    },
    onTheme: (light) => {
      themeExplicit = true;
      const name: ThemeName = light ? 'light' : 'dark';
      applyPalette(paletteFor(name));
      setPref('wordy.theme', name);
      restyle();
    },
    onHint: () => scheduleHint(),
    onNewGame: () => newGame(),
    onDaily: () => dailyGame(),
  });
  menu.setSound(soundOn);
  menu.setThemeLight(themeName === 'light');
  menu.setHints(hintsLeft);
  menu.button.position.set(STAGE_W - 42, SAFE_TOP + 30);

  // Until the player picks a theme, keep following the device appearance live.
  lightQuery.addEventListener('change', (event) => {
    if (themeExplicit) return;
    const name: ThemeName = event.matches ? 'light' : 'dark';
    applyPalette(paletteFor(name));
    menu.setThemeLight(name === 'light');
    restyle();
  });

  scoreboard.onWordsTap = () => {
    menu.close();
    wordsPanel.show(score?.foundWords ?? []);
  };

  function evaluateSlide(): void {
    const token = slideToken;
    const word = board?.currentWord() ?? '';
    if (word.length === 0 || !score) return;
    if (token !== slideToken) return; // a new slide/game began meanwhile
    const result = score.submit(word);
    strip.markResult(result.status, result.points);
    scoreboard.update(score.score, score.words, score.best);
    if (result.status === 'new') {
      if (!streakRecorded) {
        streakRecorded = true;
        streak = markPlayed();
      }
      scoreboard.setStreak(streak, dailyMode);
      scoreboard.flash();
      sound.success();
      wordsLeft -= 1;
      scoreboard.setRation(wordsLeft);
      if (wordsLeft === 0) completeBoard(score);
    } else if (result.status === 'invalid' || result.status === 'short') {
      sound.fail();
    }
  }

  /** The ration is spent: stop slides and raise the results card (ADR-0007). */
  function completeBoard(final: Score): void {
    boardComplete = true;
    const token = slideToken;
    const snap = {
      score: final.score,
      best: final.best,
      newBest: final.score > bestAtStart,
      streak,
      daily: dailyMode,
    };
    window.setTimeout(() => {
      if (token !== slideToken) return; // a new board began meanwhile
      results.show(snap);
      sound.complete();
    }, 950);
  }

  let activePointer: number | null = null;
  app.stage.eventMode = 'static';
  app.stage.hitArea = app.screen;
  app.stage.on('pointerdown', (e) => {
    sound.resume();
    if (activePointer !== null) return; // single finger only (Round 1)
    if (e.target !== app.stage) return; // menu chrome never starts a slide
    if (boardComplete) return; // the ration is spent — the board is done (ADR-0007)
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
    evaluateSlide();
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
    wordsPanel.step(dt);
    results.step(dt);
  });

  // Word lists land, then today's board begins (ADR-0004).
  const [dictSet, commonList] = await lists;
  dictionary = dictSet;
  common = commonList;
  score = new Score(dictionary);
  bestAtStart = score.best;
  scoreboard.update(0, 0, score.best);
  scoreboard.setStreak(streak, dailyMode);
  scoreboard.setRation(wordsLeft);
  menu.setHints(hintsLeft);

  board = new Board(TILE_SIZE, generateLetters(common, dictionary, mulberry32(dailySeed())), {
    onSlideStart: () => {
      hintLine.visible = false;
      slideToken += 1;
      strip.beginSlide();
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
  // Overlays sit above the board; results above those; the menu above everything.
  app.stage.addChild(wordsPanel.view, results.view, menu.button, menu.layer);

  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      /* offline support is progressive — ignore failures */
    });
  }

  // Debug/e2e hooks (tiny, harmless in production).
  (window as unknown as Record<string, unknown>).__wordyNewGame = newGame;
  (window as unknown as Record<string, unknown>).__wordyDaily = dailyGame;
  (window as unknown as Record<string, unknown>).__wordyHint = () => revealHint();
  (window as unknown as Record<string, unknown>).__wordyLetters = () =>
    board?.tiles.map((t) => t.letter).join('') ?? '';
  (window as unknown as Record<string, unknown>).__wordyWords = () =>
    score?.foundWords.map((w) => w.word) ?? [];
  (window as unknown as Record<string, unknown>).__wordyDebug = () => ({
    ...menu.debugState,
    theme: document.body.style.background,
    hints: hintsLeft,
    daily: dailyMode,
    streak,
    playedToday: streakRecorded,
    words: score?.foundWords.length ?? 0,
    panel: wordsPanel.isOpen,
    wordsLeft,
    complete: boardComplete,
  });
}

void boot();
