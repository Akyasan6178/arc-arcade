import Phaser from 'phaser';
import {
  BRICK_TYPE_SPECS,
  type BrickPowerupDrop,
  type BrickType,
} from '@entities/dx-ball/BrickType';

/**
 * entities/dx-ball/Brick.ts
 *
 * DXB-03: A single brick in the DX-Ball brick field. Purely a visual
 * rectangle plus its fixed row/column identity within the grid — all
 * sizing/positioning/layout math lives in `BrickGrid`, which owns the
 * full set of bricks the same way `MainScene` owns `Paddle`/`Ball`.
 *
 * No destruction or ball collision here — that's owned by `BrickGrid`
 * (mirroring DXB-01/DXB-02's own precedent of leaving paddle/ball
 * collision out of their "core" entity tasks).
 *
 * DXB-06 adds `points`: this brick's fixed score value, assigned once at
 * construction by `BrickGrid` (which decides the row-based scoring rule)
 * and never mutated afterwards — the brick just carries it, the same way
 * it carries `row`/`column`.
 *
 * DXB-11 adds `brickType`: this brick's type identity (`normal` /
 * `cracked` / `metal` / `bonus`), looked up in `BRICK_TYPE_SPECS` rather
 * than switched on here. The brick owns remaining hit-points and its
 * own appearance (healthy vs. cracked fill/stroke; metal/bonus color
 * overrides) and reports `takeHit()` so `BrickGrid` can keep using the
 * same overlap loop — it still decides bounce/score/drop/removal, this
 * class only answers "did that hit destroy me?" and redraws itself.
 *
 * DXB-12: `takeHit({ fire: true })` destroys the brick in one hit,
 * including metal. The ball still does not know types exist —
 * `BrickGrid` is the only caller that passes that flag.
 */

export type { BrickType } from '@entities/dx-ball/BrickType';

export class Brick extends Phaser.GameObjects.Rectangle {
  readonly row: number;
  readonly column: number;
  readonly points: number;
  readonly brickType: BrickType;
  readonly awardsScore: boolean;
  readonly powerupDrop: BrickPowerupDrop;

  /** Row color assigned by the grid; cracked/normal fills start from this. */
  private readonly rowColor: number;
  private remainingHits: number;

  constructor(
    scene: Phaser.Scene,
    row: number,
    column: number,
    x: number,
    y: number,
    width: number,
    height: number,
    color: number,
    points: number,
    brickType: BrickType = 'normal',
  ) {
    const spec = BRICK_TYPE_SPECS[brickType];
    super(scene, x, y, width, height, spec.fillColor ?? color);

    this.row = row;
    this.column = column;
    this.points = points;
    this.brickType = brickType;
    this.awardsScore = spec.awardsScore;
    this.powerupDrop = spec.powerupDrop;
    this.rowColor = color;
    this.remainingHits = spec.hitsToDestroy;

    scene.add.existing(this);
    this.applyVisuals();
  }

  /**
   * True for types that can never be destroyed (metal). Remaining metal
   * bricks are obstacles, not a win-condition blocker — see
   * `BrickGrid.isCleared()`.
   */
  get isIndestructible(): boolean {
    return !Number.isFinite(this.remainingHits);
  }

  /** Hits still required before this brick is destroyed. */
  get remainingHitPoints(): number {
    return this.remainingHits;
  }

  /**
   * Apply one hit. Returns `true` when this hit destroyed the brick
   * (caller should then score/drop/remove it). Metal always returns
   * `false` and does not change appearance; a healthy cracked brick
   * enters its damaged visual state and returns `false`.
   *
   * DXB-12: `{ fire: true }` is the Fire Ball path — the brick is
   * destroyed in one hit, including metal (which a normal ball can
   * never remove). The ball still does not know brick types exist;
   * `BrickGrid` decides whether to pass this flag.
   */
  takeHit(options?: { fire?: boolean }): boolean {
    if (options?.fire) {
      this.remainingHits = 0;
      this.applyVisuals();
      return true;
    }

    if (!Number.isFinite(this.remainingHits)) {
      return false;
    }

    this.remainingHits -= 1;
    this.applyVisuals();
    return this.remainingHits <= 0;
  }

  /**
   * Re-applies fill/stroke after a size change (viewport resize). Hit
   * state is unchanged — only the stroke width needs to track the new
   * brick height.
   */
  refreshAppearance(): void {
    this.applyVisuals();
  }

  private applyVisuals(): void {
    const spec = BRICK_TYPE_SPECS[this.brickType];
    const isCrackedDamaged = this.brickType === 'cracked' && this.remainingHits === 1;

    const fill = isCrackedDamaged
      ? darkenColor(this.rowColor, spec.crackedFillDarken ?? 0.45)
      : (spec.fillColor ?? this.rowColor);
    this.setFillStyle(fill);

    const strokeColor = isCrackedDamaged
      ? (spec.crackedStrokeColor ?? spec.strokeColor)
      : spec.strokeColor;
    const strokeWidth = Math.max(2, this.height * 0.12);

    if (strokeColor !== undefined) {
      this.setStrokeStyle(strokeWidth, strokeColor);
    } else {
      this.setStrokeStyle(0);
    }
  }
}

function darkenColor(color: number, factor: number): number {
  const r = Math.round(((color >> 16) & 0xff) * factor);
  const g = Math.round(((color >> 8) & 0xff) * factor);
  const b = Math.round((color & 0xff) * factor);
  return (r << 16) | (g << 8) | b;
}
