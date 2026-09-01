import Phaser from 'phaser';
import { drawPaddleCosmetic, type PaddleCosmeticVisual } from '@entities/dx-ball/paddleCosmetic';

/**
 * entities/dx-ball/Paddle.ts
 *
 * DXB-01: Core paddle entity for DX-Ball. A rectangle game object that
 * owns its own visual representation, responsive sizing/positioning, and
 * horizontal movement controls:
 *   - Mouse (desktop) / touch (mobile) — the paddle follows the pointer's
 *     x position. Phaser's unified pointer events cover both without
 *     separate code paths.
 *   - Keyboard fallback — Left/Right arrow keys.
 * Movement is speed-capped (smooth, not an instant teleport to the
 * pointer) and always clamped within the current viewport width.
 *
 * DXB-04 adds one piece of collision logic: `checkBallCollision()`, which
 * answers whether a given ball circle overlaps the paddle and along which
 * axis it should bounce (mirroring `BrickGrid.resolveBallCollision()`).
 * The paddle only reports the overlap — reflecting velocity remains the
 * ball's own responsibility, same as it is for walls and bricks.
 *
 * DXB-05 adds `computeHitOffset()`, used by `Ball` to vary its paddle
 * bounce angle by where on the paddle it landed (center vs edges) instead
 * of always leaving at a fixed angle — the paddle still only reports
 * geometry, it never touches velocity itself.
 *
 * DXB-06A (balance pass) narrows the default `widthRatio` by ~20% — no
 * behavior/architecture change, just a tuning value.
 *
 * DXB-09 adds `applyWidenBoost()`: a temporary width multiplier the
 * paddle applies to itself and counts down every `update()` frame,
 * reverting automatically on expiry. The paddle still has no idea a
 * "powerup" exists — `PowerupManager`/`MainScene` decide *when* to call
 * this and for how long; the paddle only ever owns its own size, the
 * same "entity owns its own state/behavior" pattern established since
 * DXB-01.
 *
 * DXB-12 adds `applyShrinkEffect()` (Small Paddle): the same multiplier
 * + remaining-ms shape, with a `< 1` multiplier. Widen and shrink are
 * mutually exclusive — applying one cancels the other — so the paddle
 * never stacks `1.5 * 0.65`. Catching a second capsule of the same
 * effect still only refreshes the timer, never the multiplier.
 *
 * DXB-16: `applySkin()` accepts visual tokens from the owning scene
 * (fill / stroke / a light motif overlay). Size, speed, and collision
 * are unchanged — this paddle still does not know unlocks exist.
 *
 * DXB-22: motif overlays animate with Phaser Graphics (no GIF files).
 * Crystal shimmers, Titan gets a metallic sweep, Pulse rings beat,
 * Reactor's core glows, Obsidian has a dark aura. Collision is unchanged.
 *
 * DXB-23: each motif paints a unique silhouette (robot pistons, alien
 * waves, reactor core, pulse slug) via `paddleCosmetic.ts`. The
 * rectangle stays the collision body and is hidden; size is unchanged.
 */
export type PaddleSkinVisual = PaddleCosmeticVisual;

export interface PaddleConfig {
  color?: number;
  widthRatio?: number;
  heightRatio?: number;
  bottomOffsetRatio?: number;
  /** Max travel speed, in viewport-widths per second. */
  speedRatio?: number;
}

const DEFAULT_CONFIG: Required<PaddleConfig> = {
  color: 0xffffff,
  // DXB-06A: reduced from 0.16 (~20% narrower) as part of a balance pass —
  // a slimmer paddle demands more precise positioning under the ball.
  widthRatio: 0.128,
  heightRatio: 0.025,
  bottomOffsetRatio: 0.05,
  speedRatio: 1.2,
};

/** DXB-09: Width multiplier applied while a "widen paddle" boost is active. */
const WIDEN_BOOST_MULTIPLIER = 1.5;

/** DXB-12: Width multiplier applied while a "small paddle" effect is active. */
const SMALL_PADDLE_MULTIPLIER = 0.65;

/** DXB-24: Laser Paddle fire interval while the timed effect is active. */
const LASER_FIRE_INTERVAL_MS = 280;

export interface LaserShot {
  x: number;
  y: number;
}

export class Paddle extends Phaser.GameObjects.Rectangle {
  private readonly config: Required<PaddleConfig>;
  private readonly cursorKeys?: Phaser.Types.Input.Keyboard.CursorKeys;
  private readonly handlePointerMove: (pointer: Phaser.Input.Pointer) => void;

  private viewportWidth: number;
  private viewportHeight: number;
  /** Desired paddle center x, driven by pointer/touch/keyboard input. */
  private targetX: number;
  /** DXB-09/DXB-12: Current width multiplier — widen, shrink, or `1`. */
  private widthMultiplier = 1;
  /** DXB-09: Milliseconds remaining on the current widen boost, if any. */
  private widenRemainingMs = 0;
  /** DXB-12: Milliseconds remaining on the current small-paddle effect, if any. */
  private smallRemainingMs = 0;
  /** DXB-24: Milliseconds remaining on Laser Paddle. */
  private laserRemainingMs = 0;
  private laserCooldownMs = 0;
  private readonly pendingLaserShots: LaserShot[] = [];
  /** DXB-16: Cosmetic overlay; the rectangle remains the collision body. */
  private readonly overlay: Phaser.GameObjects.Graphics;
  /** DXB-22: Idle motif animation clock. */
  private fxTimeMs = 0;
  private skin: PaddleSkinVisual = {
    fill: DEFAULT_CONFIG.color,
    stroke: DEFAULT_CONFIG.color,
    strokeWidthRatio: 0,
    motif: 'flat',
    motifColor: DEFAULT_CONFIG.color,
  };

  constructor(
    scene: Phaser.Scene,
    viewportWidth: number,
    viewportHeight: number,
    config: PaddleConfig = {},
  ) {
    const resolvedConfig: Required<PaddleConfig> = { ...DEFAULT_CONFIG, ...config };
    const { width, height } = Paddle.computeSize(viewportWidth, viewportHeight, resolvedConfig);
    const { x, y } = Paddle.computePosition(viewportWidth, viewportHeight, height, resolvedConfig);

    super(scene, x, y, width, height, resolvedConfig.color);

    this.config = resolvedConfig;
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;
    this.targetX = x;

    scene.add.existing(this);
    this.setDepth(10);
    this.overlay = scene.add.graphics();
    this.overlay.setDepth(11);
    this.overlay.setPosition(x, y);

    // `pointermove` covers mouse movement on desktop and finger drags on
    // touch devices alike — Phaser normalizes both into the same event.
    this.handlePointerMove = (pointer: Phaser.Input.Pointer): void => {
      this.targetX = pointer.x;
    };
    scene.input.on(Phaser.Input.Events.POINTER_MOVE, this.handlePointerMove);

    this.cursorKeys = scene.input.keyboard?.createCursorKeys();
  }

  /**
   * Advances paddle movement by one frame. Must be called every frame
   * (e.g. from the owning scene's `update`) for pointer-follow, keyboard
   * input, and speed-capped smoothing to work.
   */
  update(deltaMs: number): void {
    this.tickWidthEffects(deltaMs);
    this.tickLaser(deltaMs);

    const deltaSeconds = deltaMs / 1000;
    const maxSpeed = this.viewportWidth * this.config.speedRatio;
    const halfWidth = this.width / 2;
    const minX = halfWidth;
    const maxX = this.viewportWidth - halfWidth;

    if (this.cursorKeys?.left.isDown) {
      this.targetX -= maxSpeed * deltaSeconds;
    } else if (this.cursorKeys?.right.isDown) {
      this.targetX += maxSpeed * deltaSeconds;
    }
    this.targetX = Phaser.Math.Clamp(this.targetX, minX, maxX);

    const maxStep = maxSpeed * deltaSeconds;
    const step = Phaser.Math.Clamp(this.targetX - this.x, -maxStep, maxStep);
    this.setX(Phaser.Math.Clamp(this.x + step, minX, maxX));
    this.overlay.setPosition(this.x, this.y);
    this.tickMotif(deltaMs);
  }

  /**
   * DXB-16: Applies cosmetic fill / stroke / motif. Collision size and
   * movement are untouched.
   */
  applySkin(visual: PaddleSkinVisual): void {
    this.skin = visual;
    this.refreshSkin();
  }

  /**
   * DXB-09: Applies (or refreshes) a temporary width boost of
   * `WIDEN_BOOST_MULTIPLIER`. Catching a second "widen" capsule while one
   * is already active just extends the timer back to the full duration
   * rather than stacking the multiplier again — the paddle only ever
   * re-applies the size change the moment it transitions from inactive to
   * active.
   */
  applyWidenBoost(durationMs: number): void {
    this.clearShrinkEffect();
    if (this.widenRemainingMs <= 0) {
      this.widthMultiplier = WIDEN_BOOST_MULTIPLIER;
      this.applySize();
    }
    this.widenRemainingMs = durationMs;
  }

  /**
   * DXB-12: Applies (or refreshes) a temporary width shrink of
   * `SMALL_PADDLE_MULTIPLIER`. Mutually exclusive with
   * `applyWidenBoost()` — a small-paddle catch cancels an active widen
   * (and vice versa) rather than stacking the two multipliers.
   */
  applyShrinkEffect(durationMs: number): void {
    this.clearWidenBoost();
    if (this.smallRemainingMs <= 0) {
      this.widthMultiplier = SMALL_PADDLE_MULTIPLIER;
      this.applySize();
    }
    this.smallRemainingMs = durationMs;
  }

  /** DXB-12: Remaining widen-boost time, for the active-effects HUD. */
  getWidenRemainingMs(): number {
    return this.widenRemainingMs;
  }

  /** DXB-12: Remaining small-paddle time, for the active-effects HUD. */
  getSmallRemainingMs(): number {
    return this.smallRemainingMs;
  }

  /**
   * DXB-24: Applies (or refreshes) Laser Paddle. Catching a second
   * capsule extends the timer; the paddle still does not know bricks
   * exist — shots are queued for the owning scene.
   */
  applyLaserEffect(durationMs: number): void {
    if (this.laserRemainingMs <= 0) {
      this.laserCooldownMs = 0;
    }
    this.laserRemainingMs = durationMs;
    this.redrawMotif();
  }

  /** DXB-24: Remaining Laser Paddle time, for the active-effects HUD. */
  getLaserRemainingMs(): number {
    return this.laserRemainingMs;
  }

  /** DXB-24: Drains muzzle points queued since the last call (two per volley). */
  consumePendingLaserShots(): LaserShot[] {
    if (this.pendingLaserShots.length === 0) {
      return [];
    }
    const shots = this.pendingLaserShots.slice();
    this.pendingLaserShots.length = 0;
    return shots;
  }

  /** Counts down an active width effect by one frame, reverting the width the instant it expires. */
  private tickWidthEffects(deltaMs: number): void {
    if (this.widenRemainingMs > 0) {
      this.widenRemainingMs -= deltaMs;
      if (this.widenRemainingMs <= 0) {
        this.widenRemainingMs = 0;
        this.revertWidthMultiplier();
      }
    }

    if (this.smallRemainingMs > 0) {
      this.smallRemainingMs -= deltaMs;
      if (this.smallRemainingMs <= 0) {
        this.smallRemainingMs = 0;
        this.revertWidthMultiplier();
      }
    }
  }

  private clearWidenBoost(): void {
    if (this.widenRemainingMs <= 0) {
      return;
    }
    this.widenRemainingMs = 0;
    this.revertWidthMultiplier();
  }

  private clearShrinkEffect(): void {
    if (this.smallRemainingMs <= 0) {
      return;
    }
    this.smallRemainingMs = 0;
    this.revertWidthMultiplier();
  }

  private tickLaser(deltaMs: number): void {
    if (this.laserRemainingMs <= 0) {
      return;
    }

    this.laserRemainingMs -= deltaMs;
    this.laserCooldownMs -= deltaMs;
    if (this.laserCooldownMs <= 0) {
      this.queueLaserVolley();
      this.laserCooldownMs = LASER_FIRE_INTERVAL_MS;
    }
    if (this.laserRemainingMs <= 0) {
      this.laserRemainingMs = 0;
      this.laserCooldownMs = 0;
      this.redrawMotif();
    }
  }

  private queueLaserVolley(): void {
    const offsetX = this.width * 0.32;
    const muzzleY = this.y - this.height / 2;
    this.pendingLaserShots.push({ x: this.x - offsetX, y: muzzleY });
    this.pendingLaserShots.push({ x: this.x + offsetX, y: muzzleY });
  }

  private revertWidthMultiplier(): void {
    this.widthMultiplier = 1;
    this.applySize();
  }

  /**
   * DXB-04: Checks whether a ball's circle (center + radius) overlaps this
   * paddle's rectangle and, if so, returns the axis to bounce along —
   * mirroring `BrickGrid.resolveBallCollision()`'s axis-of-least-overlap
   * approach. Unlike a brick, the paddle is never removed, so this only
   * ever reports the axis; the ball (which owns velocity) is responsible
   * for reflecting it.
   */
  checkBallCollision(ballX: number, ballY: number, ballRadius: number): 'horizontal' | 'vertical' | null {
    const halfWidth = this.width / 2;
    const halfHeight = this.height / 2;

    const overlapX = halfWidth + ballRadius - Math.abs(ballX - this.x);
    const overlapY = halfHeight + ballRadius - Math.abs(ballY - this.y);

    if (overlapX <= 0 || overlapY <= 0) {
      return null;
    }

    return overlapX < overlapY ? 'horizontal' : 'vertical';
  }

  /**
   * DXB-05: Normalized horizontal position of `x` relative to this
   * paddle's center, from -1 (left edge) to 1 (right edge). Clamped so a
   * hit anywhere on the paddle (including right at an edge, where overlap
   * tolerance could put `x` a hair past it) always yields a valid,
   * bounded offset. Used by `Ball` to vary its paddle-bounce angle by hit
   * position — this method only reports geometry, same as
   * `checkBallCollision()`.
   */
  computeHitOffset(x: number): number {
    const halfWidth = this.width / 2;
    return Phaser.Math.Clamp((x - this.x) / halfWidth, -1, 1);
  }

  /** Recomputes size and position for a new viewport size (e.g. on resize). */
  resize(viewportWidth: number, viewportHeight: number): void {
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;
    this.applySize();
  }

  /**
   * DXB-09: Recomputes size/position from the current viewport plus
   * `widthMultiplier`, and re-clamps `x`/`targetX` into the new bounds.
   * Shared by `resize()` (viewport changed) and the widen-boost
   * apply/expire paths (viewport unchanged, only the multiplier did) so
   * there is exactly one place that turns "base size + multiplier" into
   * an actual on-screen size.
   */
  private applySize(): void {
    const base = Paddle.computeSize(this.viewportWidth, this.viewportHeight, this.config);
    const width = base.width * this.widthMultiplier;
    const { y } = Paddle.computePosition(this.viewportWidth, this.viewportHeight, base.height, this.config);

    this.setSize(width, base.height);
    const halfWidth = width / 2;
    this.setPosition(Phaser.Math.Clamp(this.x, halfWidth, this.viewportWidth - halfWidth), y);
    this.targetX = Phaser.Math.Clamp(this.targetX, halfWidth, this.viewportWidth - halfWidth);
    this.overlay.setPosition(this.x, this.y);
    this.refreshSkin();
  }

  protected preDestroy(): void {
    this.scene.input.off(Phaser.Input.Events.POINTER_MOVE, this.handlePointerMove);
    this.overlay.destroy();
    super.preDestroy();
  }

  private refreshSkin(): void {
    this.setFillStyle(this.skin.fill, 0);
    this.setStrokeStyle(0);
    this.redrawMotif();
  }

  private tickMotif(deltaMs: number): void {
    if (this.skin.motif === 'flat' || this.skin.motif === 'bands') {
      return;
    }
    this.fxTimeMs += deltaMs;
    this.redrawMotif();
  }

  private redrawMotif(): void {
    this.overlay.clear();
    drawPaddleCosmetic(this.overlay, this.skin, this.width, this.height, this.fxTimeMs);
    if (this.laserRemainingMs > 0) {
      this.drawLaserCannons();
    }
  }

  private drawLaserCannons(): void {
    const g = this.overlay;
    const halfW = this.width / 2;
    const halfH = this.height / 2;
    const barrelW = Math.max(3, this.width * 0.07);
    const barrelH = Math.max(6, this.height * 1.15);
    const offset = this.width * 0.32;
    g.fillStyle(0x7df9ff, 0.95);
    g.fillRect(-offset - barrelW / 2, -halfH - barrelH * 0.35, barrelW, barrelH);
    g.fillRect(offset - barrelW / 2, -halfH - barrelH * 0.35, barrelW, barrelH);
    g.fillStyle(0xffffff, 0.55);
    g.fillRect(-offset - barrelW * 0.2, -halfH - barrelH * 0.35, barrelW * 0.4, barrelH * 0.45);
    g.fillRect(offset - barrelW * 0.2, -halfH - barrelH * 0.35, barrelW * 0.4, barrelH * 0.45);
    g.fillStyle(0x2de2e6, 0.35);
    g.fillRoundedRect(-halfW, -halfH, this.width, this.height, Math.max(2, this.height * 0.2));
  }

  private static computeSize(
    viewportWidth: number,
    viewportHeight: number,
    config: Required<PaddleConfig>,
  ): { width: number; height: number } {
    return {
      width: viewportWidth * config.widthRatio,
      height: viewportHeight * config.heightRatio,
    };
  }

  private static computePosition(
    viewportWidth: number,
    viewportHeight: number,
    paddleHeight: number,
    config: Required<PaddleConfig>,
  ): { x: number; y: number } {
    return {
      x: viewportWidth / 2,
      y: viewportHeight - viewportHeight * config.bottomOffsetRatio - paddleHeight / 2,
    };
  }
}
