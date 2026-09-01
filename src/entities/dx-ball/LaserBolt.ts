import Phaser from 'phaser';

/**
 * entities/dx-ball/LaserBolt.ts
 *
 * DXB-24: A single upward laser projectile fired while Laser Paddle is
 * active. Visual + motion only — brick overlap lives on `BrickGrid`
 * (`resolveProjectileCollision()`), the same split `Powerup` uses for
 * catch logic. `MainScene` owns the live list the way it owns extra balls.
 */

const PLAYFIELD_DEPTH = 12;
const CORE_COLOR = 0x7df9ff;
const GLOW_COLOR = 0x2de2e6;

export class LaserBolt extends Phaser.GameObjects.Container {
  readonly halfWidth: number;
  readonly halfHeight: number;
  private speed: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    height: number,
    speed: number,
  ) {
    super(scene, x, y);

    this.halfWidth = width / 2;
    this.halfHeight = height / 2;
    this.speed = speed;

    const glow = scene.add.graphics();
    glow.fillStyle(GLOW_COLOR, 0.28);
    glow.fillRoundedRect(-this.halfWidth * 1.7, -this.halfHeight * 1.15, width * 1.7, height * 1.3, height * 0.45);
    const core = scene.add.graphics();
    core.fillStyle(CORE_COLOR, 1);
    core.fillRoundedRect(-this.halfWidth, -this.halfHeight, width, height, height * 0.4);
    core.fillStyle(0xffffff, 0.7);
    core.fillRoundedRect(-this.halfWidth * 0.35, -this.halfHeight * 0.85, width * 0.35, height * 0.7, height * 0.2);

    this.add([glow, core]);
    this.setDepth(PLAYFIELD_DEPTH);
    scene.add.existing(this);
  }

  update(deltaMs: number): void {
    this.y -= this.speed * (deltaMs / 1000);
  }

  setSpeed(speed: number): void {
    this.speed = speed;
  }

  isOffPlayfield(): boolean {
    return this.y + this.halfHeight < 0;
  }
}
