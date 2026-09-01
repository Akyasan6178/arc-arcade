import Phaser from 'phaser';
import {
  BRICK_TYPE_SPECS,
  type BrickPowerupDrop,
  type BrickType,
} from '@entities/dx-ball/BrickType';
import type { ThemeBrickTypeVisual } from '@entities/dx-ball/Theme';

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
 * sibling `Graphics` overlay — clean bevel, crack lines, metallic bands,
 * gold bonus pip. Gameplay fields and `takeHit()` are untouched.
 *
 * DXB-23: richer type recipes on that same overlay (3D bevel, split
 * cracked damage, riveted steel, gem bonus). Mechanics are unchanged.
 */

export type { BrickType } from '@entities/dx-ball/BrickType';

const PLAYFIELD_DEPTH = 10;

/** DXB-24: Laser bolts needed to destroy a metal brick. Normal balls still bounce forever. */
const METAL_LASER_HITS = 3;

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
  /** DXB-24: Laser-only durability for metal. Unused for other types. */
  private laserHitsRemaining: number;
  /** DXB-15: Theme-driven type colors; gameplay specs stay in BrickType. */
  private typeVisual: ThemeBrickTypeVisual;
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
    typeVisual: ThemeBrickTypeVisual = {},
  ) {
    const spec = BRICK_TYPE_SPECS[brickType];
    super(scene, x, y, width, height, typeVisual.fillColor ?? spec.fillColor ?? color);

    this.row = row;
    this.column = column;
    this.points = points;
    this.brickType = brickType;
    this.awardsScore = spec.awardsScore;
    this.powerupDrop = spec.powerupDrop;
    this.rowColor = color;
    this.typeVisual = typeVisual;
    this.remainingHits = spec.hitsToDestroy;
    this.laserHitsRemaining = brickType === 'metal' ? METAL_LASER_HITS : 0;

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
   * destroyed in one hit, including metal. The ball still does not know
   * brick types exist; `BrickGrid` decides whether to pass this flag.
   *
   * DXB-24: `{ laser: true }` on metal spends one of `METAL_LASER_HITS`
   * instead of bouncing forever. Destructible types take a normal hit.
   */
  takeHit(options?: { fire?: boolean; laser?: boolean }): boolean {
    if (options?.fire) {
      this.remainingHits = 0;
      this.laserHitsRemaining = 0;
      this.applyVisuals();
      return true;
    }

    if (options?.laser && this.brickType === 'metal') {
      this.laserHitsRemaining = Math.max(0, this.laserHitsRemaining - 1);
      this.applyVisuals();
      return this.laserHitsRemaining <= 0;
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
    const visual = this.typeVisual;
    const isCrackedDamaged = this.brickType === 'cracked' && this.remainingHits === 1;
    const fill = isCrackedDamaged
      ? darkenColor(this.rowColor, visual.crackedFillDarken ?? spec.crackedFillDarken ?? 0.42)
      : (visual.fillColor ?? spec.fillColor ?? this.rowColor);

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
      this.drawMetal(g, x, y, width, height, radius, visual.strokeColor ?? spec.strokeColor ?? 0xe9ecef);
      return;
    }

    if (this.brickType === 'bonus') {
      this.drawBonus(g, x, y, width, height, radius, visual.strokeColor ?? spec.strokeColor ?? 0xffe66d);
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
          ? (visual.crackedStrokeColor ?? spec.crackedStrokeColor ?? 0xffc857)
          : (visual.strokeColor ?? spec.strokeColor ?? 0xf1f3f5),
      );
      return;
    }

    this.drawNormal(g, x, y, width, height, fill);
  }

  /** Clean 3D body: left catch-light, top sheen, right/bottom shade. */
  private drawNormal(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    width: number,
    height: number,
    fill: number,
  ): void {
    const radius = Math.max(1, height * 0.14);
    const highlightH = Math.max(1, height * 0.32);
    const shadeW = Math.max(2, width * 0.14);
    g.fillStyle(lightenColor(fill, 0.38), 0.7);
    g.fillRoundedRect(x + 1, y + 1, width - 2, highlightH, radius * 0.6);
    g.fillStyle(0x000000, 0.22);
    g.fillRect(x + width - shadeW - 1, y + 2, shadeW, height - 4);
    g.fillRect(x + 1, y + height * 0.68, width - 2, Math.max(1, height * 0.28));
    g.fillStyle(lightenColor(fill, 0.55), 0.35);
    g.fillRect(x + 3, y + 2, Math.max(2, width * 0.08), height * 0.55);
    g.lineStyle(Math.max(1, height * 0.06), 0x000000, 0.28);
    g.strokeRoundedRect(x + 0.5, y + 0.5, width - 1, height - 1, radius);
  }

  /** Healthy shows a hairline fissure; damaged splits open with chips. */
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
    g.fillStyle(lightenColor(this.rowColor, damaged ? 0.08 : 0.22), damaged ? 0.18 : 0.4);
    g.fillRoundedRect(x + 2, y + 1, width - 4, height * 0.3, radius * 0.5);
    g.lineStyle(Math.max(2, height * 0.12), strokeColor, 1);
    g.strokeRoundedRect(x, y, width, height, radius);

    if (!damaged) {
      g.lineStyle(Math.max(1, height * 0.06), 0x1b1b1b, 0.45);
      g.beginPath();
      g.moveTo(x + width * 0.22, y + height * 0.2);
      g.lineTo(x + width * 0.42, y + height * 0.55);
      g.lineTo(x + width * 0.36, y + height * 0.88);
      g.strokePath();
      return;
    }

    g.fillStyle(0x0b0b0b, 0.55);
    g.beginPath();
    g.moveTo(x + width * 0.4, y + height * 0.08);
    g.lineTo(x + width * 0.52, y + height * 0.48);
    g.lineTo(x + width * 0.38, y + height * 0.95);
    g.lineTo(x + width * 0.28, y + height * 0.92);
    g.lineTo(x + width * 0.44, y + height * 0.48);
    g.closePath();
    g.fillPath();

    g.lineStyle(Math.max(2, height * 0.14), 0x1b1b1b, 0.95);
    g.beginPath();
    g.moveTo(x + width * 0.12, y + height * 0.18);
    g.lineTo(x + width * 0.48, y + height * 0.5);
    g.lineTo(x + width * 0.28, y + height * 0.95);
    g.strokePath();
    g.beginPath();
    g.moveTo(x + width * 0.78, y + height * 0.08);
    g.lineTo(x + width * 0.58, y + height * 0.46);
    g.lineTo(x + width * 0.88, y + height * 0.92);
    g.strokePath();
    g.beginPath();
    g.moveTo(x + width * 0.5, y + height * 0.22);
    g.lineTo(x + width * 0.7, y + height * 0.7);
    g.strokePath();

    g.fillStyle(0x1b1b1b, 0.85);
    g.fillTriangle(
      x + width * 0.86,
      y + height * 0.08,
      x + width * 0.98,
      y + height * 0.22,
      x + width * 0.78,
      y + height * 0.28,
    );
    g.lineStyle(Math.max(1.5, height * 0.08), 0xffe066, 0.55);
    g.strokeRoundedRect(x + 1, y + 1, width - 2, height - 2, radius);
  }

  /** Steel plate: brushed bands, corner rivets, specular streak. Never a row color. */
  private drawMetal(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
    strokeColor: number,
  ): void {
    g.fillStyle(0x6d7680, 1);
    g.fillRoundedRect(x, y, width, height, radius);
    g.fillStyle(0xb8c0c8, 0.95);
    g.fillRect(x + 2, y + 2, width - 4, Math.max(2, height * 0.28));
    g.fillStyle(0x3d454d, 0.9);
    g.fillRect(x + 2, y + height * 0.62, width - 4, Math.max(2, height * 0.3));

    g.fillStyle(0x9aa3ad, 0.55);
    const bandH = Math.max(1, height * 0.08);
    for (let i = 1; i < 4; i++) {
      g.fillRect(x + 3, y + height * (0.22 * i), width - 6, bandH);
    }

    g.fillStyle(0xf8f9fa, 0.7);
    const streakX = x + width * 0.18;
    g.fillRect(streakX, y + height * 0.12, Math.max(2, width * 0.1), Math.max(1, height * 0.18));

    const rivet = Math.max(1.6, Math.min(width, height) * 0.12);
    const insetX = Math.max(4, width * 0.12);
    const insetY = Math.max(3, height * 0.22);
    g.fillStyle(0xdfe3e8, 1);
    g.fillCircle(x + insetX, y + insetY, rivet);
    g.fillCircle(x + width - insetX, y + insetY, rivet);
    g.fillCircle(x + insetX, y + height - insetY, rivet);
    g.fillCircle(x + width - insetX, y + height - insetY, rivet);
    g.fillStyle(0x2f353b, 0.55);
    g.fillCircle(x + insetX, y + insetY, rivet * 0.4);
    g.fillCircle(x + width - insetX, y + insetY, rivet * 0.4);
    g.fillCircle(x + insetX, y + height - insetY, rivet * 0.4);
    g.fillCircle(x + width - insetX, y + height - insetY, rivet * 0.4);

    g.lineStyle(Math.max(2.5, height * 0.16), strokeColor, 1);
    g.strokeRoundedRect(x, y, width, height, radius);
    g.lineStyle(Math.max(1, height * 0.06), 0x1c2126, 0.55);
    g.strokeRoundedRect(x + 1.5, y + 1.5, width - 3, height - 3, radius * 0.8);

    const laserTaken = METAL_LASER_HITS - this.laserHitsRemaining;
    if (laserTaken > 0) {
      g.fillStyle(0x1c2126, 0.45 + laserTaken * 0.12);
      g.fillRect(x + width * 0.18, y + height * 0.35, width * 0.22, Math.max(2, height * 0.12));
      if (laserTaken >= 2) {
        g.fillRect(x + width * 0.58, y + height * 0.22, width * 0.18, Math.max(2, height * 0.16));
      }
      if (laserTaken >= 3) {
        g.fillStyle(0xff6b35, 0.35);
        g.fillRoundedRect(x + 2, y + 2, width - 4, height - 4, radius * 0.7);
      }
    }
  }

  /** Gold frame, gem facets, and a bright pip — reads as a special cell. */
  private drawBonus(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
    strokeColor: number,
  ): void {
    g.fillStyle(strokeColor, 0.28);
    g.fillRoundedRect(x + width * 0.08, y + height * 0.1, width * 0.84, height * 0.36, radius);
    g.lineStyle(Math.max(2.5, height * 0.16), strokeColor, 1);
    g.strokeRoundedRect(x, y, width, height, radius);
    g.lineStyle(Math.max(1.2, height * 0.08), 0xffffff, 0.35);
    g.strokeRoundedRect(x + 2, y + 2, width - 4, height - 4, radius * 0.7);

    const gem = Math.min(width, height) * 0.28;
    g.fillStyle(strokeColor, 1);
    g.fillTriangle(0, -gem, -gem * 0.72, gem * 0.2, gem * 0.72, gem * 0.2);
    g.fillStyle(0xffffff, 0.55);
    g.fillTriangle(0, -gem * 0.55, -gem * 0.28, gem * 0.05, gem * 0.12, -gem * 0.1);
    g.fillStyle(strokeColor, 0.9);
    g.fillCircle(width * 0.28, -height * 0.18, Math.max(1.2, gem * 0.18));
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
