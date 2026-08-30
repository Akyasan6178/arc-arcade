import Phaser from 'phaser';
import { Paddle } from '@entities/dx-ball/Paddle';
import { Powerup, type PowerupType } from '@entities/dx-ball/Powerup';
import { playDxBallSfx } from '@entities/dx-ball/audioCues';

/**
 * entities/dx-ball/PowerupManager.ts
 *
 * DXB-09: Owns every currently-falling `Powerup` capsule for one DX-Ball
 * run — spawning one (via `spawn()`, called by `MainScene` whenever
 * `BrickGrid` reports a destroyed brick rolled a drop), advancing each
 * one every frame, and checking it against the paddle or the bottom
 * edge. Mirrors `BrickGrid`'s "owns a collection of entities, checks
 * them against one collider" shape, just capsules against the paddle
 * instead of a ball against bricks.
 *
 * Deliberately has no idea what a caught capsule's effect actually
 * *does*, and deliberately never touches `Ball`. A caught capsule's type
 * is only ever queued (`consumeCaughtPowerups()`) for `MainScene` to
 * react to — the same "owning scene polls a getter/queue every frame"
 * pattern already established by `BrickGrid.getScore()`/`isCleared()`
 * and `Ball.getMissCount()`. Not needing a `Ball` reference matters
 * specifically because `Ball` is replaced outright (not mutated) on
 * every DX-Ball level transition (DXB-08), while the paddle and this
 * manager both live for an entire run — holding onto a `Ball` reference
 * here would go stale the moment a level advanced.
 *
 * DXB-10 adds two audio cues: `spawn()` plays "powerup spawn" the instant
 * a capsule is created, and `update()` plays "powerup collect" the
 * instant one is caught — both fired directly at the point each event
 * actually happens, the same way `BrickGrid`/`Ball` fire their own
 * break/hit cues, rather than being inferred later by `MainScene` from
 * the caught-queue it drains afterward.
 *
 * DXB-12 expands the default spawn pool with Fire Ball, Multi Ball,
 * Small Paddle, and Fast Ball. Type picking is still a uniform random
 * draw from `config.types` — positives and negatives share the existing
 * drop pipeline; this manager still does not know what any type does.
 */
export interface PowerupManagerConfig {
  /** Which effect types can spawn; one is picked at random per `spawn()` call. */
  types?: PowerupType[];
  /** Capsule width, as a ratio of viewport width. */
  widthRatio?: number;
  /** Capsule height, as a ratio of viewport height. */
  heightRatio?: number;
  /** Fall speed, as a ratio of viewport height per second. */
  fallSpeedRatio?: number;
}

const DEFAULT_CONFIG: Required<PowerupManagerConfig> = {
  types: [
    'widen-paddle',
    'slow-ball',
    'extra-life',
    'fire-ball',
    'multi-ball',
    'small-paddle',
    'fast-ball',
  ],
  widthRatio: 0.05,
  heightRatio: 0.03,
  fallSpeedRatio: 0.22,
};

export class PowerupManager {
  private readonly scene: Phaser.Scene;
  private readonly paddle: Paddle;
  private readonly config: Required<PowerupManagerConfig>;
  private viewportWidth: number;
  private viewportHeight: number;
  private readonly capsules: Powerup[] = [];
  private readonly caughtQueue: PowerupType[] = [];

  constructor(
    scene: Phaser.Scene,
    viewportWidth: number,
    viewportHeight: number,
    paddle: Paddle,
    config: PowerupManagerConfig = {},
  ) {
    this.scene = scene;
    this.paddle = paddle;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;
  }

  /** Spawns one falling capsule of a randomly chosen configured type, centered at (x, y) — e.g. a just-destroyed brick's position. */
  spawn(x: number, y: number): void {
    const type = this.config.types[Math.floor(Math.random() * this.config.types.length)];
    const width = this.viewportWidth * this.config.widthRatio;
    const height = this.viewportHeight * this.config.heightRatio;
    const fallSpeed = this.viewportHeight * this.config.fallSpeedRatio;

    this.capsules.push(new Powerup(this.scene, x, y, width, height, fallSpeed, type));
    playDxBallSfx('powerup-spawn');
  }

  /**
   * Advances every falling capsule and checks it against the paddle and
   * the bottom edge: a caught capsule is queued (see
   * `consumeCaughtPowerups()`) and removed; one that falls past the
   * bottom edge uncaught is simply removed too, no penalty — exactly
   * like a ball missing the paddle just re-serves rather than costing
   * extra beyond the miss itself.
   */
  update(deltaMs: number): void {
    for (let i = this.capsules.length - 1; i >= 0; i--) {
      const capsule = this.capsules[i];
      capsule.update(deltaMs);

      if (this.overlapsPaddle(capsule)) {
        this.caughtQueue.push(capsule.type);
        playDxBallSfx('powerup-collect');
        this.removeCapsuleAt(i);
        continue;
      }

      if (capsule.y - capsule.halfHeight > this.viewportHeight) {
        this.removeCapsuleAt(i);
      }
    }
  }

  /** Drains and returns every powerup type caught since the last call — one entry per catch, in catch order. */
  consumeCaughtPowerups(): PowerupType[] {
    if (this.caughtQueue.length === 0) {
      return [];
    }

    const caught = this.caughtQueue.slice();
    this.caughtQueue.length = 0;
    return caught;
  }

  /** Recomputes every still-falling capsule's horizontal bound and fall speed for a new viewport size (e.g. on resize). Vertical fall position is left alone. */
  resize(viewportWidth: number, viewportHeight: number): void {
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;

    const fallSpeed = viewportHeight * this.config.fallSpeedRatio;
    for (const capsule of this.capsules) {
      capsule.x = Phaser.Math.Clamp(capsule.x, capsule.halfWidth, viewportWidth - capsule.halfWidth);
      capsule.setFallSpeed(fallSpeed);
    }
  }

  /** Destroys every currently-falling capsule — called on a DX-Ball level transition so a stray capsule from the just-cleared level can't carry into the next one. */
  clear(): void {
    for (const capsule of this.capsules) {
      capsule.destroy();
    }
    this.capsules.length = 0;
  }

  private removeCapsuleAt(index: number): void {
    const [capsule] = this.capsules.splice(index, 1);
    capsule.destroy();
  }

  private overlapsPaddle(capsule: Powerup): boolean {
    const halfPaddleWidth = this.paddle.width / 2;
    const halfPaddleHeight = this.paddle.height / 2;

    return (
      Math.abs(capsule.x - this.paddle.x) < halfPaddleWidth + capsule.halfWidth &&
      Math.abs(capsule.y - this.paddle.y) < halfPaddleHeight + capsule.halfHeight
    );
  }
}
