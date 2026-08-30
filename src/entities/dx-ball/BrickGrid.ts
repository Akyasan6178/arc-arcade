import Phaser from 'phaser';
import { Brick } from '@entities/dx-ball/Brick';
import { parseBrickLayout, type BrickType } from '@entities/dx-ball/BrickType';
import { playDxBallSfx } from '@entities/dx-ball/audioCues';

/**
 * entities/dx-ball/BrickGrid.ts
 *
 * DXB-03: Owns the full grid of `Brick` entities for DX-Ball — a fixed
 * number of rows/columns of bricks laid out responsively across the top
 * of the viewport, each row given its own color. Mirrors how `Paddle`
 * and `Ball` own their own responsive sizing/positioning: this class is
 * the equivalent "owner" for the (many) brick entities, since no single
 * brick can compute its own grid cell in isolation.
 *
 * Also owns ball/brick collision: `resolveBallCollision()` checks a
 * ball's circle against every remaining brick, and safely removes
 * (destroys + drops from the tracked list) the first one it overlaps.
 * Deliberately excluded from this task: scoring, lives, levels, audio,
 * UI, and powerups — none of that exists here or anywhere else yet.
 *
 * DXB-04 adds `isCleared()`, a trivial query the owning scene polls to
 * detect the win condition (all bricks removed). No other state or
 * behavior change — the grid still doesn't know or care what happens
 * when it becomes empty.
 *
 * DXB-06 adds scoring: each brick is assigned a fixed `points` value at
 * creation (row-based — rows further from the paddle are worth more,
 * the classic Arkanoid/DX-Ball convention), and `resolveBallCollision()`
 * now also accumulates those points into a running total whenever it
 * removes a brick. `getScore()` is a trivial query for that total,
 * following the exact same "owning scene polls a getter" pattern
 * `isCleared()` already established — no event bus was introduced.
 *
 * DXB-06A (balance pass) nudges `gapRatio` up and `rowHeightRatio` down
 * slightly, shrinking each brick a bit — no behavior/architecture change,
 * just tuning values. Row/column count and the scoring formula are
 * unchanged.
 *
 * DXB-08 adds `loadLevel()`, which replaces every brick with a fresh grid
 * built from a new config *without* resetting `score` — this is what
 * lets a DX-Ball level transition carry the running score forward, since
 * the same `BrickGrid` instance (and its accumulated `score`) survives
 * across levels; only a full scene restart (a brand-new `BrickGrid`)
 * resets it back to 0. The constructor itself is now just `loadLevel()`
 * called once at construction time, so there is exactly one place that
 * builds a grid from a config.
 *
 * DXB-09 adds a powerup drop chance: whenever `resolveBallCollision()`
 * removes a brick, it rolls `powerupDropChance` and, on a hit, queues
 * that brick's position for a powerup spawn. This grid deliberately has
 * no idea what a "powerup" is beyond a spawn point to report — picking
 * which effect type drops, spawning the falling capsule, and reacting to
 * it being caught are all owned by `entities/dx-ball/PowerupManager.ts`
 * and `MainScene`, which poll `consumePendingPowerupSpawns()` every
 * frame the exact same way they already poll `getScore()`/`isCleared()`.
 *
 * DXB-10 adds one audio cue: `resolveBallCollision()` now plays the
 * "brick break" sound effect (`playDxBallSfx()`) the instant it removes
 * a brick, right alongside the scoring/powerup-roll side effects that
 * already happen at that exact point — the grid still has no idea an
 * "audio system" exists beyond that one fire-and-forget call, same as
 * it has no idea what a "powerup" is beyond a spawn point.
 *
 * DXB-11 adds brick types without replacing this collision loop: every
 * overlapping brick still bounces the ball (same axis-of-least-overlap
 * math), but `Brick.takeHit()` now decides whether that bounce also
 * destroys the brick. Metal never dies (and never scores); cracked
 * needs two hits and only scores on the second; bonus always queues a
 * powerup spawn on destroy; normal still rolls `powerupDropChance`.
 * `isCleared()` now means "no destructible bricks remain" so leftover
 * metal obstacles cannot lock a level. An optional `layout` of compact
 * row-strings selects types per cell; omitted, every cell is a normal
 * brick — the pre-DXB-11 default.
 *
 * DXB-12: `resolveBallCollision()` accepts an optional `{ pierce: true }`
 * from a Fire Ball. The overlap loop is unchanged; on a pierce hit the
 * brick is force-destroyed (including metal) and this method returns
 * `null` so the ball keeps travelling instead of bouncing. Score, the
 * `'brick-break'` cue, and the drop queue still run only on actual
 * destruction — same side-effect site as a normal hit.
 */
export interface BrickGridConfig {
  rows?: number;
  columns?: number;
  /** Row colors, cycled if `rows` exceeds the palette length. */
  colors?: number[];
  /** Top margin above the first row, as a ratio of viewport height. */
  topOffsetRatio?: number;
  /** Left/right margin around the grid, as a ratio of viewport width. */
  sideMarginRatio?: number;
  /** Gap between bricks (both axes), as a ratio of viewport width. */
  gapRatio?: number;
  /** Each brick's height, as a ratio of viewport height. */
  rowHeightRatio?: number;
  /**
   * DXB-06: Points awarded for destroying one brick in the row closest to
   * the paddle (row `rows - 1`), the lowest-value row. Each row further
   * from the paddle (lower row index) is worth one more multiple of this
   * — row 0 (the top/back row) is worth `rows * basePointsPerRow`.
   */
  basePointsPerRow?: number;
  /** DXB-09: Chance (0..1) that destroying one brick queues a powerup spawn at its position. */
  powerupDropChance?: number;
  /**
   * DXB-11: Optional per-cell brick types. Each string is one row;
   * characters are `N` normal, `C` cracked, `M` metal, `B` bonus, `.`
   * empty. When present, `rows`/`columns` are derived from it (those
   * fields are ignored). When omitted, the grid is a uniform field of
   * normal bricks — the pre-DXB-11 default.
   */
  layout?: readonly string[];
}

type ResolvedBrickGridConfig = Required<Omit<BrickGridConfig, 'layout'>> &
  Pick<BrickGridConfig, 'layout'>;

const DEFAULT_CONFIG: Required<Omit<BrickGridConfig, 'layout'>> = {
  rows: 5,
  columns: 8,
  colors: [0xe63946, 0xf3722c, 0xf9c74f, 0x90be6d, 0x4d96ff],
  topOffsetRatio: 0.08,
  sideMarginRatio: 0.05,
  // DXB-06A: both nudged up slightly (from 0.008/0.035) as part of a
  // balance pass — a slightly wider gap shrinks each brick's computed
  // width a bit, and a shorter row height shrinks its height, together
  // making bricks slightly smaller without changing the row/column count.
  gapRatio: 0.01,
  rowHeightRatio: 0.03,
  basePointsPerRow: 10,
  powerupDropChance: 0.15,
};

/** A queued powerup spawn point, reported once per brick a ball destroys that rolled a drop. */
export interface PowerupSpawnPoint {
  x: number;
  y: number;
}

/**
 * DXB-11: Result of one ball/brick overlap. Same axis the ball has
 * always bounced on, plus a position correction so a brick that
 * *survives* the hit (metal, or a cracked brick's first hit) cannot
 * re-overlap on the next motion substep and get hit twice in one frame.
 */
export interface BrickCollisionResult {
  axis: 'horizontal' | 'vertical';
  separateX: number;
  separateY: number;
}

interface GridLayout {
  sideMargin: number;
  topOffset: number;
  gap: number;
  brickWidth: number;
  brickHeight: number;
}

export class BrickGrid {
  private readonly scene: Phaser.Scene;
  private config: ResolvedBrickGridConfig = DEFAULT_CONFIG;
  private readonly bricks: Brick[] = [];
  private score = 0;
  /** DXB-09: Spawn points queued since the last `consumePendingPowerupSpawns()` call. */
  private pendingPowerupSpawns: PowerupSpawnPoint[] = [];

  constructor(
    scene: Phaser.Scene,
    viewportWidth: number,
    viewportHeight: number,
    config: BrickGridConfig = {},
  ) {
    this.scene = scene;
    this.loadLevel(config, viewportWidth, viewportHeight);
  }

  /**
   * DXB-08: Replaces every currently-tracked brick with a fresh grid
   * built from `config` (merged over `DEFAULT_CONFIG`, exactly the same
   * merge the constructor has always done) — without touching `score`.
   * Called by the constructor for the initial grid, and by `MainScene`
   * on every subsequent DX-Ball level transition, on the *same*
   * `BrickGrid` instance, so the running score keeps accumulating across
   * levels instead of resetting to 0 the way a brand-new `BrickGrid`
   * (e.g. on a full scene restart) would.
   *
   * DXB-11: when `config.layout` is present, `rows`/`columns` are taken
   * from that layout so the scoring formula and cell math stay in sync
   * with the authored pattern.
   */
  loadLevel(config: BrickGridConfig, viewportWidth: number, viewportHeight: number): void {
    this.config = { ...DEFAULT_CONFIG, ...config };

    if (this.config.layout && this.config.layout.length > 0) {
      this.config.rows = this.config.layout.length;
      this.config.columns = this.config.layout[0].length;
    }

    for (const brick of this.bricks) {
      brick.destroy();
    }
    this.bricks.length = 0;
    this.bricks.push(...this.createBricks(viewportWidth, viewportHeight));
  }

  /**
   * Checks a ball's circle (center + radius) against every remaining
   * brick and, on the first overlap found, asks that brick to take a
   * hit. A destroyed brick is dropped from the tracked list *and*
   * destroyed as a Phaser game object before this returns; a surviving
   * brick (metal, or a cracked brick's first hit) stays in the list.
   * Either way the ball bounces — this method always returns which axis
   * to reflect, plus a separation so the ball is no longer overlapping.
   * Returns `null` if the ball isn't overlapping any brick.
   *
   * Removing a destroyed brick from `this.bricks` before calling
   * `destroy()` (rather than after) guarantees no later step, in this
   * call or a future one, can ever iterate over or touch an already-
   * destroyed brick — this is what makes the removal collision-safe.
   *
   * At most one brick is *hit* per call. `Ball` calls this once per
   * collision-checked motion substep (DXB-05 splits a launched ball's
   * per-frame motion into substeps to avoid tunneling; see
   * `Ball.stepLaunched()`), so a fast ball *can* destroy more than one
   * brick within a single frame — one per substep — which is correct:
   * substeps exist precisely so every distinct overlap along the frame's
   * motion gets its own check.
   */
  resolveBallCollision(
    ballX: number,
    ballY: number,
    ballRadius: number,
    options?: { pierce?: boolean },
  ): BrickCollisionResult | null {
    for (let i = 0; i < this.bricks.length; i++) {
      const brick = this.bricks[i];
      const halfWidth = brick.width / 2;
      const halfHeight = brick.height / 2;

      const overlapX = halfWidth + ballRadius - Math.abs(ballX - brick.x);
      const overlapY = halfHeight + ballRadius - Math.abs(ballY - brick.y);

      if (overlapX <= 0 || overlapY <= 0) {
        continue;
      }

      const axis: 'horizontal' | 'vertical' = overlapX < overlapY ? 'horizontal' : 'vertical';
      const signX = ballX >= brick.x ? 1 : -1;
      const signY = ballY >= brick.y ? 1 : -1;
      const result: BrickCollisionResult = {
        axis,
        separateX: axis === 'horizontal' ? signX * overlapX : 0,
        separateY: axis === 'vertical' ? signY * overlapY : 0,
      };

      // DXB-12: a Fire Ball asks `takeHit({ fire: true })` so metal and
      // a cracked brick both die in one contact. Pierce then returns
      // `null` (no bounce / no separation) so the ball keeps travelling
      // through the cell; the next DXB-05 substep hits the next brick.
      const destroyed = brick.takeHit({ fire: options?.pierce });
      if (!destroyed) {
        return result;
      }

      this.bricks.splice(i, 1);
      if (brick.awardsScore) {
        this.score += brick.points;
      }
      playDxBallSfx('brick-break');

      // DXB-09/DXB-11: drop policy is per-type. Bonus always queues a
      // spawn; normal/cracked still roll `powerupDropChance`; metal
      // (`'never'`) can now reach here when a Fire Ball destroys it,
      // and still does not drop. Rolled independently of scoring, right
      // before the brick's own position is lost to `destroy()`.
      if (brick.powerupDrop === 'always') {
        this.pendingPowerupSpawns.push({ x: brick.x, y: brick.y });
      } else if (
        brick.powerupDrop === 'chance' &&
        Math.random() < this.config.powerupDropChance
      ) {
        this.pendingPowerupSpawns.push({ x: brick.x, y: brick.y });
      }

      brick.destroy();

      if (options?.pierce) {
        return null;
      }

      return result;
    }

    return null;
  }

  /**
   * DXB-04/DXB-11: True once every *destructible* brick has been
   * removed. Remaining metal bricks are obstacles, not a clear blocker
   * — a level with only metal left is cleared.
   */
  isCleared(): boolean {
    return this.bricks.every((brick) => brick.isIndestructible);
  }

  /** DXB-06: Running total of points earned from every brick destroyed so far this level. */
  getScore(): number {
    return this.score;
  }

  /**
   * DXB-09: Drains and returns every powerup spawn point queued since
   * the last call — one entry per brick destroyed that rolled a drop
   * (a ball's collision substeps, per DXB-05, can destroy more than one
   * brick in a single frame, so this can return more than one entry at
   * once). `MainScene` polls this every frame the same way it already
   * polls `getScore()`/`isCleared()`, and hands each point to
   * `PowerupManager.spawn()`.
   */
  consumePendingPowerupSpawns(): PowerupSpawnPoint[] {
    if (this.pendingPowerupSpawns.length === 0) {
      return [];
    }

    const spawns = this.pendingPowerupSpawns;
    this.pendingPowerupSpawns = [];
    return spawns;
  }

  /** Recomputes every brick's size and position for a new viewport size (e.g. on resize). */
  resize(viewportWidth: number, viewportHeight: number): void {
    const layout = BrickGrid.computeLayout(viewportWidth, viewportHeight, this.config);

    for (const brick of this.bricks) {
      const { x, y } = BrickGrid.computeCellPosition(brick.row, brick.column, layout);
      brick.setPosition(x, y);
      brick.setSize(layout.brickWidth, layout.brickHeight);
      brick.refreshAppearance();
    }
  }

  private createBricks(viewportWidth: number, viewportHeight: number): Brick[] {
    const layout = BrickGrid.computeLayout(viewportWidth, viewportHeight, this.config);
    const cells = this.config.layout
      ? parseBrickLayout(this.config.layout)
      : BrickGrid.uniformNormalLayout(this.config.rows, this.config.columns);
    const bricks: Brick[] = [];

    for (let row = 0; row < cells.length; row++) {
      const color = this.config.colors[row % this.config.colors.length];
      const points = BrickGrid.computePointsForRow(row, this.config);

      for (let column = 0; column < cells[row].length; column++) {
        const brickType = cells[row][column];
        if (brickType === null) {
          continue;
        }

        const { x, y } = BrickGrid.computeCellPosition(row, column, layout);
        bricks.push(
          new Brick(
            this.scene,
            row,
            column,
            x,
            y,
            layout.brickWidth,
            layout.brickHeight,
            color,
            points,
            brickType,
          ),
        );
      }
    }

    return bricks;
  }

  private static uniformNormalLayout(rows: number, columns: number): BrickType[][] {
    const cells: BrickType[][] = [];

    for (let row = 0; row < rows; row++) {
      const line: BrickType[] = [];
      for (let column = 0; column < columns; column++) {
        line.push('normal');
      }
      cells.push(line);
    }

    return cells;
  }

  /**
   * DXB-06: Points value for every brick in `row`. Row 0 (the back row,
   * furthest from the paddle) is worth the most, decreasing by one
   * `basePointsPerRow` multiple per row toward the paddle — the last row
   * (`rows - 1`) is worth exactly one multiple.
   */
  private static computePointsForRow(row: number, config: ResolvedBrickGridConfig): number {
    return (config.rows - row) * config.basePointsPerRow;
  }

  private static computeLayout(
    viewportWidth: number,
    viewportHeight: number,
    config: ResolvedBrickGridConfig,
  ): GridLayout {
    const sideMargin = viewportWidth * config.sideMarginRatio;
    const topOffset = viewportHeight * config.topOffsetRatio;
    const gap = viewportWidth * config.gapRatio;
    const brickWidth =
      (viewportWidth - sideMargin * 2 - gap * (config.columns - 1)) / config.columns;
    const brickHeight = viewportHeight * config.rowHeightRatio;

    return { sideMargin, topOffset, gap, brickWidth, brickHeight };
  }

  /** Center position of the brick at `(row, column)`, top-left-anchored by the grid's margins. */
  private static computeCellPosition(
    row: number,
    column: number,
    layout: GridLayout,
  ): { x: number; y: number } {
    return {
      x: layout.sideMargin + column * (layout.brickWidth + layout.gap) + layout.brickWidth / 2,
      y: layout.topOffset + row * (layout.brickHeight + layout.gap) + layout.brickHeight / 2,
    };
  }
}
