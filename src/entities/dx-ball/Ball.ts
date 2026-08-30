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
 */
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

type BallState = 'attached' | 'launched';

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
  /** DXB-09: Current speed multiplier — `SLOW_EFFECT_MULTIPLIER` while a slow effect is active, `1` otherwise. */
  private speedMultiplier = 1;
  /** DXB-09: Milliseconds remaining on the current slow effect, if any. */
  private slowRemainingMs = 0;
  /**
   * DXB-10: True while the ball is currently overlapping the paddle.
   * Paddle-hit audio fires on the rising edge only, so a single contact
   * that spans several DXB-05 motion substeps (the paddle does not push
   * the ball out of overlap) does not replay the cue every substep.
   */
  private overlappingPaddle = false;

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
    this.tickSlowEffect(deltaMs);

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
    if (this.slowRemainingMs <= 0) {
      this.speedMultiplier = SLOW_EFFECT_MULTIPLIER;
      this.applySpeedMultiplier();
    }
    this.slowRemainingMs = durationMs;
  }

  /** Counts down an active slow effect by one frame, reverting speed the instant it expires. */
  private tickSlowEffect(deltaMs: number): void {
    if (this.slowRemainingMs <= 0) {
      return;
    }

    this.slowRemainingMs -= deltaMs;
    if (this.slowRemainingMs <= 0) {
      this.slowRemainingMs = 0;
      this.speedMultiplier = 1;
      this.applySpeedMultiplier();
    }
  }

  /** Rescales current velocity (if launched) to the base speed times `speedMultiplier`, preserving direction. */
  private applySpeedMultiplier(): void {
    if (this.serveState !== 'launched') {
      return;
    }

    const baseSpeed = Ball.computeSpeed(this.viewportWidth, this.viewportHeight, this.config);
    this.velocity.setLength(baseSpeed * this.speedMultiplier);
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

    if (this.serveState === 'attached') {
      this.followPaddle();
      return;
    }

    const newSpeed = Ball.computeSpeed(viewportWidth, viewportHeight, this.config) * this.speedMultiplier;
    this.velocity.setLength(newSpeed);

    this.setPosition(
      Phaser.Math.Clamp(this.x, this.radius, viewportWidth - this.radius),
      Phaser.Math.Clamp(this.y, this.radius, viewportHeight - this.radius),
    );
  }

  protected preDestroy(): void {
    this.spaceKey?.destroy();
    super.preDestroy();
  }

  /** Snaps the ball to rest directly above the paddle's current position. */
  private followPaddle(): void {
    const { x, y } = Ball.computeAttachedPosition(this.paddle, this.radius);
    this.setPosition(x, y);
  }

  /** Transitions from `attached` to `launched`, applying the fixed launch velocity (scaled by any active slow effect). */
  private launch(): void {
    const speed = Ball.computeSpeed(this.viewportWidth, this.viewportHeight, this.config) * this.speedMultiplier;
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
    this.serveState = 'attached';
    this.missCount++;
    this.overlappingPaddle = false;
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
   * so, bounces off it. `BrickGrid.resolveBallCollision()` already
   * removed the brick (safely) by the time this returns, so this method
   * only ever needs to react on the ball's own velocity — it never
   * touches a brick or the grid's internal list directly.
   */
  private resolveBrickCollisions(): void {
    const axis = this.brickGrid.resolveBallCollision(this.x, this.y, this.radius);

    if (axis === 'horizontal') {
      this.velocity.x = -this.velocity.x;
    } else if (axis === 'vertical') {
      this.velocity.y = -this.velocity.y;
    }
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
