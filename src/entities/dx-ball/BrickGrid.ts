import Phaser from 'phaser';
import { Brick } from '@entities/dx-ball/Brick';

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
}

const DEFAULT_CONFIG: Required<BrickGridConfig> = {
  rows: 5,
  columns: 8,
  colors: [0xe63946, 0xf3722c, 0xf9c74f, 0x90be6d, 0x4d96ff],
  topOffsetRatio: 0.08,
  sideMarginRatio: 0.05,
  gapRatio: 0.008,
  rowHeightRatio: 0.035,
};

interface GridLayout {
  sideMargin: number;
  topOffset: number;
  gap: number;
  brickWidth: number;
  brickHeight: number;
}

export class BrickGrid {
  private readonly scene: Phaser.Scene;
  private readonly config: Required<BrickGridConfig>;
  private readonly bricks: Brick[];

  constructor(
    scene: Phaser.Scene,
    viewportWidth: number,
    viewportHeight: number,
    config: BrickGridConfig = {},
  ) {
    this.scene = scene;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.bricks = this.createBricks(viewportWidth, viewportHeight);
  }

  /**
   * Checks a ball's circle (center + radius) against every remaining
   * brick and, on the first overlap found, safely removes that brick —
   * dropping it from the tracked list *and* destroying its Phaser game
   * object — before returning which axis the ball should bounce along.
   * Returns `null` if the ball isn't overlapping any brick.
   *
   * Removing the brick from `this.bricks` before calling `destroy()`
   * (rather than after) guarantees no later step, in this call or a
   * future one, can ever iterate over or touch an already-destroyed
   * brick — this is what makes the removal collision-safe.
   *
   * At most one brick is removed per call, and a hit brick disappears
   * immediately, so the same brick can never be double-hit within a
   * call. `Ball` calls this once per collision-checked motion substep
   * (DXB-05 splits a launched ball's per-frame motion into substeps to
   * avoid tunneling; see `Ball.stepLaunched()`), so a fast ball *can*
   * destroy more than one brick within a single frame — one per
   * substep — which is correct: substeps exist precisely so every
   * distinct overlap along the frame's motion gets its own check.
   */
  resolveBallCollision(
    ballX: number,
    ballY: number,
    ballRadius: number,
  ): 'horizontal' | 'vertical' | null {
    for (let i = 0; i < this.bricks.length; i++) {
      const brick = this.bricks[i];
      const halfWidth = brick.width / 2;
      const halfHeight = brick.height / 2;

      const overlapX = halfWidth + ballRadius - Math.abs(ballX - brick.x);
      const overlapY = halfHeight + ballRadius - Math.abs(ballY - brick.y);

      if (overlapX <= 0 || overlapY <= 0) {
        continue;
      }

      this.bricks.splice(i, 1);
      brick.destroy();

      // The axis with the *smaller* overlap is the one the ball just
      // crossed into the brick along, so that's the axis to reflect.
      return overlapX < overlapY ? 'horizontal' : 'vertical';
    }

    return null;
  }

  /** DXB-04: True once every brick has been removed — the win condition for a level. */
  isCleared(): boolean {
    return this.bricks.length === 0;
  }

  /** Recomputes every brick's size and position for a new viewport size (e.g. on resize). */
  resize(viewportWidth: number, viewportHeight: number): void {
    const layout = BrickGrid.computeLayout(viewportWidth, viewportHeight, this.config);

    for (const brick of this.bricks) {
      const { x, y } = BrickGrid.computeCellPosition(brick.row, brick.column, layout);
      brick.setPosition(x, y);
      brick.setSize(layout.brickWidth, layout.brickHeight);
    }
  }

  private createBricks(viewportWidth: number, viewportHeight: number): Brick[] {
    const layout = BrickGrid.computeLayout(viewportWidth, viewportHeight, this.config);
    const bricks: Brick[] = [];

    for (let row = 0; row < this.config.rows; row++) {
      const color = this.config.colors[row % this.config.colors.length];

      for (let column = 0; column < this.config.columns; column++) {
        const { x, y } = BrickGrid.computeCellPosition(row, column, layout);
        bricks.push(
          new Brick(this.scene, row, column, x, y, layout.brickWidth, layout.brickHeight, color),
        );
      }
    }

    return bricks;
  }

  private static computeLayout(
    viewportWidth: number,
    viewportHeight: number,
    config: Required<BrickGridConfig>,
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
