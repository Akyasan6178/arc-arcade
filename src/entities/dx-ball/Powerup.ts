import Phaser from 'phaser';

/**
 * entities/dx-ball/Powerup.ts
 *
 * DXB-09: A single falling powerup capsule. Purely visual plus
 * straight-line downward motion — like `Brick`, all "what happens when
 * this is caught" logic lives in the owner (`PowerupManager`), not here.
 * Rendered as a small colored rounded rectangle with a one-letter label
 * identifying its effect, since no sprite/asset pipeline exists yet
 * (`src/assets/` is still empty) — the same "plain Phaser shape"
 * convention every other entity in this codebase follows (`Paddle`/
 * `Brick` are rectangles, `Ball` is a circle).
 */
export type PowerupType = 'widen-paddle' | 'slow-ball' | 'extra-life';

interface PowerupVisual {
  color: number;
  letter: string;
}

const POWERUP_VISUALS: Record<PowerupType, PowerupVisual> = {
  'widen-paddle': { color: 0x4d96ff, letter: 'W' },
  'slow-ball': { color: 0x90be6d, letter: 'S' },
  'extra-life': { color: 0xe63946, letter: 'L' },
};

/** Corner radius of the capsule background, as a ratio of its own height. */
const CORNER_RADIUS_RATIO = 0.3;

/** Label font size, as a ratio of the capsule's own height. */
const LABEL_FONT_SIZE_RATIO = 0.65;

export class Powerup extends Phaser.GameObjects.Container {
  readonly type: PowerupType;
  readonly halfWidth: number;
  readonly halfHeight: number;
  private fallSpeed: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    height: number,
    fallSpeed: number,
    type: PowerupType,
  ) {
    super(scene, x, y);

    this.type = type;
    this.halfWidth = width / 2;
    this.halfHeight = height / 2;
    this.fallSpeed = fallSpeed;

    const visual = POWERUP_VISUALS[type];
    const background = scene.add.graphics();
    background.fillStyle(visual.color, 1);
    background.fillRoundedRect(
      -this.halfWidth,
      -this.halfHeight,
      width,
      height,
      height * CORNER_RADIUS_RATIO,
    );

    const label = scene.add
      .text(0, 0, visual.letter, {
        fontFamily: 'sans-serif',
        fontSize: `${Math.round(height * LABEL_FONT_SIZE_RATIO)}px`,
        color: '#1a1a1a',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add([background, label]);
    scene.add.existing(this);
  }

  /**
   * Advances the capsule straight down by one frame. Checking it against
   * the paddle/bottom edge and removing it is the caller's
   * (`PowerupManager`'s) responsibility, not this entity's own — mirrors
   * how `Brick` never removes itself either.
   */
  update(deltaMs: number): void {
    this.y += this.fallSpeed * (deltaMs / 1000);
  }

  /** Rescales this capsule's fall speed for a new viewport size (e.g. on resize). Position is left alone. */
  setFallSpeed(fallSpeed: number): void {
    this.fallSpeed = fallSpeed;
  }
}
