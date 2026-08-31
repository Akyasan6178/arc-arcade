import Phaser from 'phaser';
import type { Paddle } from '@entities/dx-ball/Paddle';
import type { BrickGrid } from '@entities/dx-ball/BrickGrid';
import { playDxBallSfx } from '@entities/dx-ball/audioCues';

/**
 * entities/dx-ball/Ball.ts
 *
 * DXB-02: Core ball entity for DX-Ball. A circular game object that owns
 * its own visual representation, responsive sizing/positioning, and a
 * serve/launch state machine:
 *   - `attached` — the ball rests just above the paddle and tracks its
 *     horizontal position. It does not move on its own. Pressing Space
 *     launches it exactly once (subsequent presses while `launched` are
 *     ignored).
 *   - `launched` — the ball travels in a straight line, bouncing (elastic
 *     reflection) off the left, right, and top viewport edges, and off
 *     bricks (DXB-03: see `resolveBrickCollisions()`). If it exits past
 *     the bottom edge (missed by the paddle), it stops, returns to
 *     resting above the paddle, and waits for Space again.
 *
 * DXB-03 adds brick collision: the ball asks the `BrickGrid` it was
 * constructed with whether it's overlapping a brick, and if so bounces
 * off it — the same "this entity owns its own motion" pattern `Paddle`
 * established, just extended to react to another entity's state. Brick
 * removal itself is owned by `BrickGrid`, not here.
 *
 * DXB-04 adds the missing paddle collision in the same style: the ball
 * asks `Paddle.checkBallCollision()` whether it's overlapping the paddle
 * and, if so, bounces off it via `resolvePaddleCollision()`. Checked
 * every launched frame, right before the brick check.
 *
 * DXB-05 adds two gameplay-polish changes to a launched ball's motion:
 *   - Variable paddle bounce angle: a top/bottom paddle hit
 *     (`resolvePaddleCollision()`) no longer just flips vertical
 *     velocity — it asks `Paddle.computeHitOffset()` where on the paddle
 *     the ball landed and re-angles the bounce toward that edge (up to
 *     `MAX_PADDLE_BOUNCE_ANGLE_DEG` from straight up), preserving speed.
 *   - Tunneling fix: a launched frame's motion (`advanceLaunched()`) is
 *     now split into one or more collision-checked substeps
 *     (`stepLaunched()`), each capped to a small fraction of the ball's
 *     own radius, so a fast ball can no longer skip clean through a thin
 *     paddle/brick in a single frame without ever registering an
 *     overlap — a risk documented since DXB-03/DXB-04.
 *
 * No scoring, lives, levels, audio, UI, or powerups here — that's
 * explicitly out of scope, per this task's own restrictions.
 *
 * DXB-07 adds one trivial counter: `missCount`, incremented every time
 * a bottom-edge exit calls `returnToPaddle()` (i.e. every miss, not
 * every reset in general — there is no other caller of
 * `returnToPaddle()`). The ball still has no concept of lives or
 * game-over; `getMissCount()` exposes the running total so `MainScene`
 * can poll it the same "owning scene polls a getter" way it already
 * polls `BrickGrid.getScore()`/`isCleared()`, and turn misses into a
 * lives system without the ball knowing anything about lives itself.
 *
 * DXB-09 adds `applySlowEffect()`: a temporary speed multiplier the ball
 * applies to itself and counts down every `update()` frame (whether
 * `attached` or `launched`), reverting automatically on expiry. The
 * multiplier is folded into every place base speed is turned into an
 * actual velocity (`launch()`, `resize()`), so a slow effect caught
 * before a serve, mid-flight, or spanning a resize all behave correctly
 * without the ball needing three different code paths. Same "entity
 * owns its own state/behavior" pattern `Paddle.applyWidenBoost()` uses —
 * the ball still has no idea a "powerup" exists.
 *
 * DXB-10 adds one audio cue: `resolvePaddleCollision()` now plays the
 * "paddle hit" sound effect (`playDxBallSfx()`) the instant it detects a
 * real overlap, mirroring how this same method already reacts to a
 * paddle hit visually via velocity — the ball fires its own hit sound
 * the same way it already owns its own bounce, no new "audio system"
 * dependency threaded in from `MainScene`.
 *
 * DXB-11: brick collision still goes through `BrickGrid.resolveBallCollision()`
 * (same overlap math, still one brick per substep). The grid now also
 * returns a separation vector so a brick that survives the hit (metal,
 * cracked first hit) cannot be re-overlapped on the next substep. The
 * ball still only reflects its own velocity and never knows brick types.
 *
 * DXB-12 adds three more self-owned effects, still without the ball
 * knowing a "powerup" exists:
 *   - `applyFireEffect()` — a timed pierce flag. While active,
 *     `resolveBrickCollisions()` asks the grid `{ pierce: true }` so the
 *     ball travels through destructible bricks and can destroy metal;
 *     the ball itself still only decides whether to bounce.
 *   - `applyFastEffect()` — the speed-multiplier sibling of
 *     `applySlowEffect()`, mutually exclusive with it (applying one
 *     cancels the other) so slow and fast never stack.
 *   - Extra-ball miss behavior (`becomeExtra()` / `setMissBehavior()`):
 *     a Multi-Ball extra treats a bottom-edge exit as "spent" instead of
 *     re-serving, so `MainScene` can remove it without touching lives.
 *     The last remaining ball is flipped back to reserve-on-miss.
 *
 * DXB-13: Fire Ball is a distinct hot fill plus a larger translucent
 * glow circle behind the ball. Visual only — pierce timing and collision
 * are unchanged.
 *
 * DXB-14: `setProgressionMultiplier()` folds an extra speed scale into
 * launch / resize / travel speed (Endless ramp; DXB-21 also Time Attack's
 * constant fold). Slow / fast still apply on top. The ball does not know
 * game modes exist.
 *
 * DXB-16: `applySkin()` accepts visual tokens from the owning scene.
 * Fire Ball still overrides fill/glow while active, then restores the
 * equipped skin. Collision, pierce, and speed are unchanged.
 */

export interface BallSkinVisual {
  fill: number;
  stroke: number;
  strokeWidthRatio: number;
  glowColor: number;
  glowAlpha: number;
  glowScale: number;
  coreColor: number;
  coreAlpha: number;
  coreScale: number;
}

export interface BallConfig {
  color?: number;
  /** Ball radius, as a ratio of the smaller viewport dimension. */
  radiusRatio?: number;
  /** Travel speed, as a ratio of the smaller viewport dimension, per second. */
  speedRatio?: number;
}

const DEFAULT_CONFIG: Required<BallConfig> = {
  color: 0xffcc00,
  radiusRatio: 0.014,
  speedRatio: 0.6,
};

/** Launch angle, in degrees (Phaser convention: 0 = +x/right, 90 = +y/down). Up-and-right. */
const LAUNCH_ANGLE_DEG = -60;

/**
 * DXB-05: Max paddle-bounce deviation from straight up, in degrees,
 * reached at the paddle's edges. A center hit stays at 0deg (straight
 * up); hits toward an edge deviate toward that edge, up to this cap.
 */
const MAX_PADDLE_BOUNCE_ANGLE_DEG = 60;

/**
 * DXB-05: Per-substep travel cap, as a ratio of the ball's own radius.
 * Keeps each collision-checked motion step small enough that a fast ball
 * can't skip clean through a thin paddle/brick within one frame — the
 * tunneling risk documented since DXB-03/DXB-04.
 */
const MAX_STEP_DISTANCE_RATIO = 0.5;

/**
 * DXB-05: Defensive cap on substeps per frame, guarding against an
 * unbounded loop on an extreme delta spike (e.g. a backgrounded tab
 * regaining focus). A ball could in theory still tunnel within that one
 * extreme frame, but every ordinary frame stays far under this cap.
 */
const MAX_SUBSTEPS_PER_FRAME = 8;

/** DXB-09: Speed multiplier applied while a "slow ball" effect is active. */
const SLOW_EFFECT_MULTIPLIER = 0.6;

/** DXB-12: Speed multiplier applied while a "fast ball" effect is active. */
const FAST_EFFECT_MULTIPLIER = 1.45;

/** DXB-12/DXB-13: Fill / glow colors while a Fire Ball effect is active. */
const FIRE_BALL_COLOR = 0xff3d00;
const FIRE_BALL_STROKE = 0xffd166;
const FIRE_GLOW_COLOR = 0xff8c00;
const FIRE_GLOW_SCALE = 2.15;
const PLAYFIELD_DEPTH = 10;

type BallState = 'attached' | 'launched';
type MissBehavior = 'reserve' | 'spend';

export class Ball extends Phaser.GameObjects.Arc {
  private readonly config: Required<BallConfig>;
  private readonly paddle: Paddle;
  private readonly brickGrid: BrickGrid;
  private readonly spaceKey?: Phaser.Input.Keyboard.Key;

  private viewportWidth: number;
  private viewportHeight: number;
  private readonly velocity: Phaser.Math.Vector2;
  /** Named `serveState` (not `state`) to avoid colliding with `Phaser.GameObjects.GameObject#state`. */
  private serveState: BallState = 'attached';
  /** DXB-07: Running count of bottom-edge misses (see `returnToPaddle()`). */
  private missCount = 0;
  /** DXB-09/DXB-12: Current speed multiplier — slow, fast, or `1`. */
  private speedMultiplier = 1;
  /**
   * DXB-14/DXB-21: Extra speed fold from the owning scene (Endless ramp,
   * Time Attack constant). Classic leaves this at `1`. Independent of
   * slow/fast so those powerups still apply on top. The ball does not
   * know game modes.
   */
  private progressionMultiplier = 1;
  /** DXB-09: Milliseconds remaining on the current slow effect, if any. */
  private slowRemainingMs = 0;
  /** DXB-12: Milliseconds remaining on the current fast effect, if any. */
  private fastRemainingMs = 0;
  /** DXB-12: Milliseconds remaining on the current fire effect, if any. */
  private fireRemainingMs = 0;
  /**
   * DXB-12: How a bottom-edge miss is handled. `'reserve'` re-serves
   * above the paddle (the original DXB-02/DXB-07 path). `'spend'` marks
   * this ball finished so `MainScene` can destroy it — used for
   * Multi-Ball extras, and for the original ball while extras are still
   * in play.
   */
  private missBehavior: MissBehavior = 'reserve';
  /** DXB-12: True after a `'spend'` miss; `update()` becomes a no-op. */
  private spent = false;
  /**
   * DXB-10: True while the ball is currently overlapping the paddle.
   * Paddle-hit audio fires on the rising edge only, so a single contact
   * that spans several DXB-05 motion substeps (the paddle does not push
   * the ball out of overlap) does not replay the cue every substep.
   */
  private overlappingPaddle = false;
  /** DXB-13: Translucent halo shown only while Fire Ball is active. */
  private readonly glow: Phaser.GameObjects.Arc;
  /** DXB-19: Optional inner core for cosmetic skins. Hidden during Fire Ball. */
  private readonly core: Phaser.GameObjects.Arc;
  /** DXB-16: Equipped cosmetic; Fire Ball temporarily overrides it. */
  private skin: BallSkinVisual = {
    fill: DEFAULT_CONFIG.color,
    stroke: DEFAULT_CONFIG.color,
    strokeWidthRatio: 0,
    glowColor: FIRE_GLOW_COLOR,
    glowAlpha: 0,
    glowScale: FIRE_GLOW_SCALE,
    coreColor: DEFAULT_CONFIG.color,
    coreAlpha: 0,
    coreScale: 0.4,
  };

  constructor(
    scene: Phaser.Scene,
    viewportWidth: number,
    viewportHeight: number,
    paddle: Paddle,
    brickGrid: BrickGrid,
    config: BallConfig = {},
  ) {
    const resolvedConfig: Required<BallConfig> = { ...DEFAULT_CONFIG, ...config };
    const radius = Ball.computeRadius(viewportWidth, viewportHeight, resolvedConfig);
    const { x, y } = Ball.computeAttachedPosition(paddle, radius);

    super(scene, x, y, radius, 0, 360, false, resolvedConfig.color);

    this.config = resolvedConfig;
    this.paddle = paddle;
    this.brickGrid = brickGrid;
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;
    this.velocity = new Phaser.Math.Vector2(0, 0);

    scene.add.existing(this);
    this.setDepth(PLAYFIELD_DEPTH);

    this.glow = scene.add.circle(x, y, radius * FIRE_GLOW_SCALE, FIRE_GLOW_COLOR, 0.38);
    this.glow.setVisible(false);
    this.glow.setDepth(PLAYFIELD_DEPTH - 1);

    this.core = scene.add.circle(x, y, radius * 0.4, DEFAULT_CONFIG.color, 0);
    this.core.setVisible(false);
    this.core.setDepth(PLAYFIELD_DEPTH + 1);

    this.spaceKey = scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
  }

  /**
   * Advances the ball by one frame: while `attached`, tracks the paddle
   * and listens for the launch key; while `launched`, integrates position
   * by velocity and resolves edge collisions/misses. Must be called every
   * frame (e.g. from the owning scene's `update`), after the paddle has
   * already been updated for this frame.
   */
  update(deltaMs: number): void {
    if (this.spent) {
      return;
    }

    this.tickSpeedEffects(deltaMs);
    this.tickFireEffect(deltaMs);
    this.syncFireGlow();

    if (this.serveState === 'attached') {
      this.followPaddle();

      if (this.spaceKey && Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
        this.launch();
      }
      return;
    }

    this.advanceLaunched(deltaMs);
  }

  /**
   * DXB-09: Applies (or refreshes) a temporary speed multiplier of
   * `SLOW_EFFECT_MULTIPLIER`. Catching a second "slow" capsule while one
   * is already active just extends the timer back to the full duration
   * rather than stacking the multiplier again. Ticks down regardless of
   * `serveState`, so catching one while the ball happens to be `attached`
   * (waiting to be re-served after a miss) still counts down and is
   * already in effect the moment it launches.
   */
  applySlowEffect(durationMs: number): void {
    this.clearFastEffect();
    if (this.slowRemainingMs <= 0) {
      this.speedMultiplier = SLOW_EFFECT_MULTIPLIER;
      this.applySpeedMultiplier();
    }
    this.slowRemainingMs = durationMs;
  }

  /**
   * DXB-12: Applies (or refreshes) a temporary speed multiplier of
   * `FAST_EFFECT_MULTIPLIER`. Mutually exclusive with
   * `applySlowEffect()` — a fast-ball catch cancels an active slow
   * (and vice versa) rather than stacking `0.6 * 1.45`.
   */
  applyFastEffect(durationMs: number): void {
    this.clearSlowEffect();
    if (this.fastRemainingMs <= 0) {
      this.speedMultiplier = FAST_EFFECT_MULTIPLIER;
      this.applySpeedMultiplier();
    }
    this.fastRemainingMs = durationMs;
  }

  /**
   * DXB-12: Applies (or refreshes) a timed pierce flag. Catching a
   * second fire capsule while one is already active just extends the
   * timer. The ball tints itself and shows a glow while active so the
   * effect is readable without a new sprite; color and glow revert on
   * expiry.
   */
  applyFireEffect(durationMs: number): void {
    if (this.fireRemainingMs <= 0) {
      this.applyFireVisuals(true);
    }
    this.fireRemainingMs = durationMs;
  }

  /**
   * DXB-16: Applies cosmetic fill / stroke / idle glow. Fire Ball still
   * wins while its timer is running.
   */
  applySkin(visual: BallSkinVisual): void {
    this.skin = visual;
    if (this.fireRemainingMs <= 0) {
      this.applyIdleVisuals();
    }
  }

  /** DXB-12: Remaining slow-effect time, for the active-effects HUD. */
  getSlowRemainingMs(): number {
    return this.slowRemainingMs;
  }

  /** DXB-12: Remaining fast-effect time, for the active-effects HUD. */
  getFastRemainingMs(): number {
    return this.fastRemainingMs;
  }

  /** DXB-12: Remaining fire-effect time, for the active-effects HUD. */
  getFireRemainingMs(): number {
    return this.fireRemainingMs;
  }

  isLaunched(): boolean {
    return this.serveState === 'launched';
  }

  isSpent(): boolean {
    return this.spent;
  }

  /**
   * DXB-12: Copies this ball's current velocity into `out` so
   * `MainScene` can spawn Multi-Ball extras at a rotated heading
   * without reading `velocity` directly.
   */
  copyVelocityInto(out: Phaser.Math.Vector2): void {
    out.copy(this.velocity);
  }

  /** DXB-12/DXB-14: Current travel speed (base × powerup × progression). */
  getTravelSpeed(): number {
    return (
      Ball.computeSpeed(this.viewportWidth, this.viewportHeight, this.config) *
      this.speedMultiplier *
      this.progressionMultiplier
    );
  }

  /**
   * DXB-14: Sets the Endless-style progression fold. `1` is Classic /
   * Time Attack. Rescales a launched ball immediately. The ball still
   * does not know a "mode" exists.
   */
  setProgressionMultiplier(multiplier: number): void {
    const next = Number.isFinite(multiplier) ? Math.max(0.1, multiplier) : 1;
    if (next === this.progressionMultiplier) {
      return;
    }

    this.progressionMultiplier = next;
    this.applySpeedMultiplier();
  }

  /** DXB-14: Current progression fold, so Multi-Ball extras can inherit it. */
  getProgressionMultiplier(): number {
    return this.progressionMultiplier;
  }

  /**
   * DXB-12: Places this ball in play immediately at `(x, y)` with the
   * given velocity and treats a later bottom-edge miss as spent instead
   * of re-serving. Used for Multi-Ball extras.
   */
  becomeExtra(x: number, y: number, velocityX: number, velocityY: number): void {
    this.setPosition(x, y);
    this.velocity.set(velocityX, velocityY);
    this.serveState = 'launched';
    this.missBehavior = 'spend';
    this.spent = false;
    this.syncFireGlow();
  }

  /**
   * DXB-12: Switches miss handling. `'reserve'` is the original
   * re-serve path (last remaining ball); `'spend'` marks the ball
   * finished on a bottom-edge exit (extras, or the original while
   * extras are still in play).
   */
  setMissBehavior(behavior: MissBehavior): void {
    this.missBehavior = behavior;
  }

  /**
   * DXB-12: Copies remaining timed effects from `source` onto this
   * freshly constructed extra so a Multi-Ball split inherits fire /
   * slow / fast instead of resetting them.
   */
  copyEffectsFrom(source: Ball): void {
    const slow = source.getSlowRemainingMs();
    const fast = source.getFastRemainingMs();
    const fire = source.getFireRemainingMs();
    const progression = source.getProgressionMultiplier();
    if (slow > 0) {
      this.applySlowEffect(slow);
    }
    if (fast > 0) {
      this.applyFastEffect(fast);
    }
    if (fire > 0) {
      this.applyFireEffect(fire);
    }
    if (progression !== 1) {
      this.setProgressionMultiplier(progression);
    }
  }

  /** Counts down active speed effects by one frame, reverting speed the instant they expire. */
  private tickSpeedEffects(deltaMs: number): void {
    if (this.slowRemainingMs > 0) {
      this.slowRemainingMs -= deltaMs;
      if (this.slowRemainingMs <= 0) {
        this.slowRemainingMs = 0;
        this.revertSpeedMultiplier();
      }
    }

    if (this.fastRemainingMs > 0) {
      this.fastRemainingMs -= deltaMs;
      if (this.fastRemainingMs <= 0) {
        this.fastRemainingMs = 0;
        this.revertSpeedMultiplier();
      }
    }
  }

  private tickFireEffect(deltaMs: number): void {
    if (this.fireRemainingMs <= 0) {
      return;
    }

    this.fireRemainingMs -= deltaMs;
    if (this.fireRemainingMs <= 0) {
      this.fireRemainingMs = 0;
      this.applyFireVisuals(false);
    }
  }

  private applyFireVisuals(active: boolean): void {
    if (active) {
      this.setFillStyle(FIRE_BALL_COLOR);
      this.setStrokeStyle(Math.max(2, this.radius * 0.38), FIRE_BALL_STROKE);
      this.glow.setFillStyle(FIRE_GLOW_COLOR, 0.38);
      this.glow.setVisible(true);
    } else {
      this.applyIdleVisuals();
    }
    this.syncFireGlow();
  }

  private applyIdleVisuals(): void {
    this.setFillStyle(this.skin.fill);
    const strokeWidth = this.radius * this.skin.strokeWidthRatio;
    if (strokeWidth > 0) {
      this.setStrokeStyle(Math.max(1.5, strokeWidth), this.skin.stroke);
    } else {
      this.setStrokeStyle(0);
    }
    this.glow.setFillStyle(this.skin.glowColor, this.skin.glowAlpha);
    this.glow.setVisible(this.skin.glowAlpha > 0 && !this.spent);
    this.core.setFillStyle(this.skin.coreColor, this.skin.coreAlpha);
    this.syncFireGlow();
  }

  private syncFireGlow(): void {
    this.glow.setPosition(this.x, this.y);
    this.core.setPosition(this.x, this.y);
    const scale = this.fireRemainingMs > 0 ? FIRE_GLOW_SCALE : this.skin.glowScale;
    this.glow.setRadius(this.radius * scale);
    this.core.setRadius(this.radius * this.skin.coreScale);
    if (this.spent || !this.visible) {
      this.glow.setVisible(false);
      this.core.setVisible(false);
    } else if (this.fireRemainingMs > 0) {
      this.glow.setVisible(true);
      this.core.setVisible(false);
    } else {
      this.glow.setVisible(this.skin.glowAlpha > 0);
      this.core.setVisible(this.skin.coreAlpha > 0);
    }
  }

  private clearSlowEffect(): void {
    if (this.slowRemainingMs <= 0) {
      return;
    }
    this.slowRemainingMs = 0;
    this.revertSpeedMultiplier();
  }

  private clearFastEffect(): void {
    if (this.fastRemainingMs <= 0) {
      return;
    }
    this.fastRemainingMs = 0;
    this.revertSpeedMultiplier();
  }

  private revertSpeedMultiplier(): void {
    this.speedMultiplier = 1;
    this.applySpeedMultiplier();
  }

  /** Rescales current velocity (if launched) to the base speed times `speedMultiplier`, preserving direction. */
  private applySpeedMultiplier(): void {
    if (this.serveState !== 'launched') {
      return;
    }

    const baseSpeed = Ball.computeSpeed(this.viewportWidth, this.viewportHeight, this.config);
    this.velocity.setLength(baseSpeed * this.speedMultiplier * this.progressionMultiplier);
  }

  /**
   * DXB-05: Advances a launched ball across `deltaMs`, split into one or
   * more smaller substeps instead of a single position integration. At
   * high enough speed relative to the paddle's/a brick's thin height, a
   * single-step integration could move the ball clean through a solid in
   * one frame without its end-of-frame position ever overlapping it
   * (tunneling); capping each substep's travel distance to a small
   * fraction of the ball's own radius closes that gap, since every
   * intermediate position along the frame's motion now gets its own
   * collision check.
   */
  private advanceLaunched(deltaMs: number): void {
    let remainingMs = deltaMs;
    let substeps = 0;

    while (
      remainingMs > 0 &&
      this.serveState === 'launched' &&
      substeps < MAX_SUBSTEPS_PER_FRAME
    ) {
      const stepMs = this.computeSafeStepMs(remainingMs);
      this.stepLaunched(stepMs);
      remainingMs -= stepMs;
      substeps++;
    }
  }

  /**
   * Largest step (in ms, capped at `remainingMs`) the ball can travel
   * before its next collision check, bounded so it moves at most
   * `MAX_STEP_DISTANCE_RATIO * radius` during that step.
   */
  private computeSafeStepMs(remainingMs: number): number {
    const speed = this.velocity.length();
    if (speed <= 0) {
      return remainingMs;
    }

    const maxDistancePerStep = this.radius * MAX_STEP_DISTANCE_RATIO;
    const maxStepMs = (maxDistancePerStep / speed) * 1000;
    return Math.min(remainingMs, maxStepMs);
  }

  /**
   * One collision-checked motion step: integrates position by `stepMs`,
   * then resolves wall, paddle, and brick collisions in that order — the
   * same body a launched ball's full frame used to run once, now run
   * once per substep instead.
   */
  private stepLaunched(stepMs: number): void {
    const deltaSeconds = stepMs / 1000;
    this.x += this.velocity.x * deltaSeconds;
    this.y += this.velocity.y * deltaSeconds;

    this.resolveWallCollisions();

    // A wall miss may have just called `returnToPaddle()`, flipping
    // `serveState` back to `attached` — skip paddle/brick collision in
    // that case, since the ball's position/velocity are no longer
    // meaningful for this step.
    if (this.serveState === 'launched') {
      this.resolvePaddleCollision();
      this.resolveBrickCollisions();
    }
  }

  /** Recomputes size, position, and speed for a new viewport size (e.g. on resize). */
  resize(viewportWidth: number, viewportHeight: number): void {
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;

    this.setRadius(Ball.computeRadius(viewportWidth, viewportHeight, this.config));
    if (this.fireRemainingMs > 0) {
      this.setStrokeStyle(Math.max(2, this.radius * 0.38), FIRE_BALL_STROKE);
    } else if (this.skin.strokeWidthRatio > 0) {
      this.setStrokeStyle(Math.max(1.5, this.radius * this.skin.strokeWidthRatio), this.skin.stroke);
    }
    this.syncFireGlow();

    if (this.serveState === 'attached') {
      this.followPaddle();
      return;
    }

    const newSpeed =
      Ball.computeSpeed(viewportWidth, viewportHeight, this.config) *
      this.speedMultiplier *
      this.progressionMultiplier;
    this.velocity.setLength(newSpeed);

    this.setPosition(
      Phaser.Math.Clamp(this.x, this.radius, viewportWidth - this.radius),
      Phaser.Math.Clamp(this.y, this.radius, viewportHeight - this.radius),
    );
  }

  protected preDestroy(): void {
    // DXB-12: do not destroy the SPACE key. Phaser returns the same
    // Key instance for every `addKey(SPACE)` on this scene; destroying
    // it from an extra Multi-Ball would disarm launch on the remaining
    // serve ball. Scene shutdown already tears keyboard keys down.
    this.glow.destroy();
    this.core.destroy();
    super.preDestroy();
  }

  /** Snaps the ball to rest directly above the paddle's current position. */
  private followPaddle(): void {
    const { x, y } = Ball.computeAttachedPosition(this.paddle, this.radius);
    this.setPosition(x, y);
  }

  /** Transitions from `attached` to `launched`, applying the fixed launch velocity (scaled by any active slow effect). */
  private launch(): void {
    const speed =
      Ball.computeSpeed(this.viewportWidth, this.viewportHeight, this.config) *
      this.speedMultiplier *
      this.progressionMultiplier;
    this.velocity.copy(Ball.computeLaunchVelocity(speed));
    this.serveState = 'launched';
  }

  /**
   * Transitions from `launched` back to `attached`, stopping movement and
   * re-homing above the paddle. The only caller is the bottom-edge exit
   * check in `resolveWallCollisions()`, so every call here is a miss —
   * DXB-07 counts it accordingly.
   */
  private returnToPaddle(): void {
    this.velocity.set(0, 0);
    this.missCount++;
    this.overlappingPaddle = false;

    if (this.missBehavior === 'spend') {
      this.spent = true;
      this.setVisible(false);
      this.glow.setVisible(false);
      this.core.setVisible(false);
      return;
    }

    this.serveState = 'attached';
    this.followPaddle();
  }

  /** DXB-07: Running total of bottom-edge misses so far this level. */
  getMissCount(): number {
    return this.missCount;
  }

  /** Bounces off the left/right/top edges; a bottom exit ends the serve instead of bouncing. */
  private resolveWallCollisions(): void {
    const { radius } = this;
    const minX = radius;
    const maxX = this.viewportWidth - radius;
    const minY = radius;

    if (this.x < minX) {
      this.x = minX;
      this.velocity.x = Math.abs(this.velocity.x);
    } else if (this.x > maxX) {
      this.x = maxX;
      this.velocity.x = -Math.abs(this.velocity.x);
    }

    if (this.y < minY) {
      this.y = minY;
      this.velocity.y = Math.abs(this.velocity.y);
    }

    if (this.y - radius > this.viewportHeight) {
      this.returnToPaddle();
    }
  }

  /**
   * DXB-04: Asks the paddle whether this ball is overlapping it and, if
   * so, bounces off it. Same axis-of-least-overlap reaction as
   * `resolveBrickCollisions()`, just against a permanent target instead
   * of one that gets removed.
   *
   * DXB-05: a `'vertical'` hit (the paddle's top/bottom face — in
   * practice always the top, since the ball approaches from above) no
   * longer just flips vertical velocity. It now re-angles the bounce by
   * where on the paddle the ball landed, via `computePaddleBounceVelocity()`,
   * so the player has some control over where the ball goes next instead
   * of every top hit simply mirroring whatever angle it arrived at. A
   * `'horizontal'` hit (the paddle's side edge) is unchanged: still a
   * plain reflection, since there's no meaningful "hit position" to vary
   * on that axis.
   */
  private resolvePaddleCollision(): void {
    const axis = this.paddle.checkBallCollision(this.x, this.y, this.radius);

    if (axis === 'horizontal') {
      this.velocity.x = -this.velocity.x;
    } else if (axis === 'vertical') {
      const offset = this.paddle.computeHitOffset(this.x);
      this.velocity.copy(Ball.computePaddleBounceVelocity(offset, this.velocity.length()));
    }

    if (axis && !this.overlappingPaddle) {
      playDxBallSfx('paddle-hit');
    }
    this.overlappingPaddle = axis !== null;
  }

  /**
   * Asks the brick grid whether this ball is overlapping a brick and, if
   * so, bounces off it. `BrickGrid.resolveBallCollision()` still owns
   * hit-point / removal / scoring / drops (DXB-11: a hit no longer always
   * destroys the brick — metal and a cracked brick's first hit survive).
   * This method only ever reacts on the ball: reflect velocity on the
   * reported axis, then apply the grid's separation so a surviving brick
   * cannot be re-hit on the next motion substep. Never touches a brick
   * or the grid's internal list directly.
   */
  private resolveBrickCollisions(): void {
    const hit = this.brickGrid.resolveBallCollision(this.x, this.y, this.radius, {
      pierce: this.fireRemainingMs > 0,
    });

    if (!hit) {
      return;
    }

    if (hit.axis === 'horizontal') {
      this.velocity.x = -this.velocity.x;
    } else {
      this.velocity.y = -this.velocity.y;
    }

    this.x += hit.separateX;
    this.y += hit.separateY;
  }

  private static computeRadius(
    viewportWidth: number,
    viewportHeight: number,
    config: Required<BallConfig>,
  ): number {
    return Math.min(viewportWidth, viewportHeight) * config.radiusRatio;
  }

  private static computeSpeed(
    viewportWidth: number,
    viewportHeight: number,
    config: Required<BallConfig>,
  ): number {
    return Math.min(viewportWidth, viewportHeight) * config.speedRatio;
  }

  /** Ball center when resting above the paddle: horizontally centered on it, touching its top edge. */
  private static computeAttachedPosition(
    paddle: Paddle,
    radius: number,
  ): { x: number; y: number } {
    return { x: paddle.x, y: paddle.y - paddle.height / 2 - radius };
  }

  private static computeLaunchVelocity(speed: number): Phaser.Math.Vector2 {
    const angle = Phaser.Math.DegToRad(LAUNCH_ANGLE_DEG);
    return new Phaser.Math.Vector2(Math.cos(angle), Math.sin(angle)).scale(speed);
  }

  /**
   * DXB-05: Velocity for a paddle bounce at normalized hit `offset`
   * (-1 = left edge, 0 = center, 1 = right edge), preserving `speed` and
   * always angled upward. `offset` is scaled by
   * `MAX_PADDLE_BOUNCE_ANGLE_DEG` to get the angle from straight up, so a
   * center hit goes straight up and an edge hit deviates toward that edge.
   */
  private static computePaddleBounceVelocity(offset: number, speed: number): Phaser.Math.Vector2 {
    const angleFromVerticalDeg = offset * MAX_PADDLE_BOUNCE_ANGLE_DEG;
    const angleFromVerticalRad = Phaser.Math.DegToRad(angleFromVerticalDeg);

    return new Phaser.Math.Vector2(
      Math.sin(angleFromVerticalRad),
      -Math.cos(angleFromVerticalRad),
    ).scale(speed);
  }
}
