import Phaser from 'phaser';
import type { Paddle } from '@entities/dx-ball/Paddle';
import type { BrickGrid } from '@entities/dx-ball/BrickGrid';

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
 * No scoring, lives, levels, audio, UI, or powerups here — that's
 * explicitly out of scope, per this task's own restrictions.
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
    if (this.serveState === 'attached') {
      this.followPaddle();

      if (this.spaceKey && Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
        this.launch();
      }
      return;
    }

    const deltaSeconds = deltaMs / 1000;
    this.x += this.velocity.x * deltaSeconds;
    this.y += this.velocity.y * deltaSeconds;

    this.resolveWallCollisions();

    // A wall miss may have just called `returnToPaddle()`, flipping
    // `serveState` back to `attached` — skip paddle/brick collision in
    // that case, since the ball's position/velocity are no longer
    // meaningful for this frame.
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

    const newSpeed = Ball.computeSpeed(viewportWidth, viewportHeight, this.config);
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

  /** Transitions from `attached` to `launched`, applying the fixed launch velocity. */
  private launch(): void {
    const speed = Ball.computeSpeed(this.viewportWidth, this.viewportHeight, this.config);
    this.velocity.copy(Ball.computeLaunchVelocity(speed));
    this.serveState = 'launched';
  }

  /** Transitions from `launched` back to `attached`, stopping movement and re-homing above the paddle. */
  private returnToPaddle(): void {
    this.velocity.set(0, 0);
    this.serveState = 'attached';
    this.followPaddle();
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
   */
  private resolvePaddleCollision(): void {
    const axis = this.paddle.checkBallCollision(this.x, this.y, this.radius);

    if (axis === 'horizontal') {
      this.velocity.x = -this.velocity.x;
    } else if (axis === 'vertical') {
      this.velocity.y = -this.velocity.y;
    }
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
}
