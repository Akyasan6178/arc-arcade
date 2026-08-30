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
 *
 * DXB-13: the collision body stays this `Rectangle` (so `BrickGrid`'s
 * x/y/width/height math is unchanged); type-specific drawing lives on a
 * sibling `Graphics` overlay — clean bevel for normal, crack lines for
 * a damaged cracked brick, metallic bands for metal, gold highlight for
 * bonus. Gameplay fields and `takeHit()` are untouched.
 */

export type { BrickType } from '@entities/dx-ball/BrickType';

const PLAYFIELD_DEPTH = 10;

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
  /** DXB-13: type-specific drawing layered on top of the collision rect. */
  private readonly overlay: Phaser.GameObjects.Graphics;

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

    this.overlay = scene.add.graphics();
    this.overlay.setPosition(x, y);
    this.overlay.setDepth(PLAYFIELD_DEPTH);
    this.setDepth(PLAYFIELD_DEPTH);
    // The rectangle is the collision body only — the overlay draws the
    // visible brick so corners can be rounded without changing bounds.
    this.setFillStyle(spec.fillColor ?? color, 0);

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
    this.overlay.setPosition(this.x, this.y);
    this.applyVisuals();
  }

  setPosition(x?: number, y?: number, z?: number, w?: number): this {
    super.setPosition(x, y, z, w);
    this.overlay?.setPosition(this.x, this.y);
    return this;
  }

  protected preDestroy(): void {
    this.overlay.destroy();
    super.preDestroy();
  }

  private applyVisuals(): void {
    const spec = BRICK_TYPE_SPECS[this.brickType];
    const isCrackedDamaged = this.brickType === 'cracked' && this.remainingHits === 1;
    const fill = isCrackedDamaged
      ? darkenColor(this.rowColor, spec.crackedFillDarken ?? 0.42)
      : (spec.fillColor ?? this.rowColor);

    const width = this.width;
    const height = this.height;
    const x = -width / 2;
    const y = -height / 2;
    const radius = Math.max(1, height * 0.14);
    const g = this.overlay;

    g.clear();
    g.fillStyle(fill, 1);
    g.fillRoundedRect(x, y, width, height, radius);

    if (this.brickType === 'metal') {
      this.drawMetal(g, x, y, width, height, radius, spec.strokeColor ?? 0xe9ecef);
      return;
    }

    if (this.brickType === 'bonus') {
      this.drawBonus(g, x, y, width, height, radius, spec.strokeColor ?? 0xffe66d);
      return;
    }

    if (this.brickType === 'cracked') {
      this.drawCracked(
        g,
        x,
        y,
        width,
        height,
        radius,
        isCrackedDamaged,
        isCrackedDamaged
          ? (spec.crackedStrokeColor ?? 0xffc857)
          : (spec.strokeColor ?? 0xf1f3f5),
      );
      return;
    }

    this.drawNormal(g, x, y, width, height, fill);
  }

  /** Clean solid body: a short top highlight and a thin bottom shade. */
  private drawNormal(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    width: number,
    height: number,
    fill: number,
  ): void {
    const highlightH = Math.max(1, height * 0.28);
    const shadeH = Math.max(1, height * 0.22);
    g.fillStyle(lightenColor(fill, 0.28), 0.55);
    g.fillRect(x + 1, y + 1, width - 2, highlightH);
    g.fillStyle(0x000000, 0.2);
    g.fillRect(x + 1, y + height - shadeH - 1, width - 2, shadeH);
  }

  /** Healthy = pale outline; damaged = darker body already applied + cracks. */
  private drawCracked(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
    damaged: boolean,
    strokeColor: number,
  ): void {
    g.lineStyle(Math.max(2, height * 0.12), strokeColor, 1);
    g.strokeRoundedRect(x, y, width, height, radius);

    if (!damaged) {
      return;
    }

    g.lineStyle(Math.max(1.5, height * 0.1), 0x1b1b1b, 0.9);
    g.beginPath();
    g.moveTo(x + width * 0.18, y + height * 0.15);
    g.lineTo(x + width * 0.48, y + height * 0.52);
    g.lineTo(x + width * 0.32, y + height * 0.9);
    g.strokePath();
    g.beginPath();
    g.moveTo(x + width * 0.72, y + height * 0.12);
    g.lineTo(x + width * 0.58, y + height * 0.48);
    g.lineTo(x + width * 0.84, y + height * 0.88);
    g.strokePath();
  }

  /** Steel body + highlight band + silver rim, never a row color. */
  private drawMetal(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
    strokeColor: number,
  ): void {
    g.fillStyle(0xcfd4da, 0.85);
    g.fillRect(x + 2, y + 2, width - 4, Math.max(2, height * 0.32));
    g.fillStyle(0x4a5560, 0.7);
    g.fillRect(x + 2, y + height * 0.58, width - 4, Math.max(2, height * 0.32));
    g.fillStyle(0xf8f9fa, 0.55);
    g.fillRect(x + width * 0.14, y + height * 0.16, width * 0.16, Math.max(1, height * 0.14));
    g.lineStyle(Math.max(2, height * 0.14), strokeColor, 1);
    g.strokeRoundedRect(x, y, width, height, radius);
  }

  /** Gold rim, inner wash, and center pip — reads as a special cell. */
  private drawBonus(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
    strokeColor: number,
  ): void {
    g.fillStyle(strokeColor, 0.32);
    g.fillRoundedRect(x + width * 0.1, y + height * 0.12, width * 0.8, height * 0.38, radius);
    g.lineStyle(Math.max(2.5, height * 0.16), strokeColor, 1);
    g.strokeRoundedRect(x, y, width, height, radius);
    g.fillStyle(strokeColor, 1);
    g.fillCircle(0, 0, Math.min(width, height) * 0.18);
  }
}

function darkenColor(color: number, factor: number): number {
  const r = Math.round(((color >> 16) & 0xff) * factor);
  const g = Math.round(((color >> 8) & 0xff) * factor);
  const b = Math.round((color & 0xff) * factor);
  return (r << 16) | (g << 8) | b;
}

function lightenColor(color: number, amount: number): number {
  const r = Math.min(255, Math.round(((color >> 16) & 0xff) + 255 * amount));
  const g = Math.min(255, Math.round(((color >> 8) & 0xff) + 255 * amount));
  const b = Math.min(255, Math.round((color & 0xff) + 255 * amount));
  return (r << 16) | (g << 8) | b;
}
