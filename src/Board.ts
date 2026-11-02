import { Container } from 'pixi.js';
import { COLS, ROWS, influence, tileAt, tileCenter } from './hex';
import { Tile } from './Tile';

export interface BoardCallbacks {
  /** A new slide began (finger pressed): the trace was just cleared. */
  onSlideStart(): void;
  /** A tile joined the trace for the first time this slide. */
  onTileJoin(letter: string, index: number): void;
}

/**
 * The honeycomb plus the input model: press/move/release, the live dip wave,
 * and the trace (GLOSSARY: distinct tiles in visit order; revisits only re-dip).
 * The letter arrangement is injected, so every game can be a fresh board.
 */
export class Board {
  readonly view = new Container();
  readonly tiles: Tile[] = [];
  private readonly byIndex = new Map<number, Tile>();
  private readonly tileSize: number;
  private readonly cb: BoardCallbacks;
  private pressing = false;
  private trace: Tile[] = [];
  private readonly inTrace = new Set<Tile>();
  private hoveredKey: number | null = null;

  constructor(tileSize: number, letters: string[][], cb: BoardCallbacks) {
    this.tileSize = tileSize;
    this.cb = cb;
    this.build(letters);
  }

  /** Fresh arrangement: rebuild every tile, forget any trace in progress. */
  newGame(letters: string[][]): void {
    this.build(letters);
  }

  refreshTheme(): void {
    for (const tile of this.tiles) tile.forceRedraw();
  }

  step(dt: number): void {
    for (const tile of this.tiles) {
      tile.step(dt);
      tile.redraw();
    }
  }

  /** The trace's letters in visit order (GLOSSARY: trace). */
  currentWord(): string {
    return this.trace.map((t) => t.letter).join('');
  }

  private build(letters: string[][]): void {
    for (const child of this.view.removeChildren()) {
      child.destroy({ children: true });
    }
    this.tiles.length = 0;
    this.byIndex.clear();
    this.trace = [];
    this.inTrace.clear();
    this.hoveredKey = null;
    this.pressing = false;
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const tile = new Tile(row, col, letters[row]![col]!, this.tileSize);
        const pos = tileCenter(row, col, this.tileSize);
        tile.view.position.set(pos.x, pos.y);
        this.tiles.push(tile);
        this.byIndex.set(row * COLS + col, tile);
        this.view.addChild(tile.view);
      }
    }
  }

  press(gx: number, gy: number): void {
    this.pressing = true;
    for (const tile of this.trace) tile.setSelected(false);
    this.trace = [];
    this.inTrace.clear();
    this.hoveredKey = null;
    this.cb.onSlideStart();
    this.updatePointer(gx, gy);
  }

  move(gx: number, gy: number): void {
    if (this.pressing) this.updatePointer(gx, gy);
  }

  release(): void {
    this.pressing = false;
    this.hoveredKey = null;
    for (const tile of this.tiles) {
      tile.setDipTarget(0);
      tile.setLean(0, 0);
    }
  }

  private updatePointer(gx: number, gy: number): void {
    const p = this.view.toLocal({ x: gx, y: gy });
    const hit = tileAt(this.tileSize, p.x, p.y);
    if (hit) {
      const key = hit.row * COLS + hit.col;
      if (key !== this.hoveredKey) {
        this.hoveredKey = key;
        const tile = this.byIndex.get(key);
        if (tile && !this.inTrace.has(tile)) {
          this.inTrace.add(tile);
          this.trace.push(tile);
          tile.setSelected(true);
          this.cb.onTileJoin(tile.letter, this.trace.length - 1);
        }
      }
    } else {
      this.hoveredKey = null;
    }

    for (const tile of this.tiles) {
      const dx = p.x - tile.view.x;
      const dy = p.y - tile.view.y;
      const d = Math.hypot(dx, dy);
      const inf = influence(this.tileSize, d);
      tile.setDipTarget(inf);
      if (d > 1e-3) {
        tile.setLean((dx / d) * inf, (dy / d) * inf);
      } else {
        tile.setLean(0, 0);
      }
    }
  }
}
