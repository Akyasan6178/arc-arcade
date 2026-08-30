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
 *
 * DXB-12 adds four more types to the same visual map (`F` fire, `M`
 * multi, `N` narrow/small paddle, `T` turbo/fast). Effect logic still
 * lives entirely in `PowerupManager` / `MainScene`.
 *
 * DXB-13: positive types use a green family; negative types use a
 * red/orange family. Letter indicators are unchanged. Catch/motion
 * behavior is unchanged.
 */
export type PowerupType =
  | 'widen-paddle'
  | 'slow-ball'
  | 'extra-life'
  | 'fire-ball'
  | 'multi-ball'
  | 'small-paddle'
  | 'fast-ball';

interface PowerupVisual {
  color: number;
  stroke: number;
  letter: string;
}

const POWERUP_VISUALS: Record<PowerupType, PowerupVisual> = {
  'widen-paddle': { color: 0x2d6a4f, stroke: 0xb7e4c7, letter: 'W' },
  'slow-ball': { color: 0x40916c, stroke: 0xd8f3dc, letter: 'S' },
  'extra-life': { color: 0x52b788, stroke: 0xedf6f0, letter: 'L' },
  'fire-ball': { color: 0x1b4332, stroke: 0x95d5b2, letter: 'F' },
  'multi-ball': { color: 0x74c69d, stroke: 0xf0fff4, letter: 'M' },
  'small-paddle': { color: 0xe85d04, stroke: 0xffd166, letter: 'N' },
  'fast-ball': { color: 0xc1121f, stroke: 0xffba08, letter: 'T' },
};

/** Corner radius of the capsule background, as a ratio of its own height. */
const CORNER_RADIUS_RATIO = 0.3;

/** Label font size, as a ratio of the capsule's own height. */
const LABEL_FONT_SIZE_RATIO = 0.65;

const PLAYFIELD_DEPTH = 10;

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
    const corner = height * CORNER_RADIUS_RATIO;
    const background = scene.add.graphics();
    background.fillStyle(visual.color, 1);
    background.fillRoundedRect(
      -this.halfWidth,
      -this.halfHeight,
      width,
      height,
      corner,
    );
    background.lineStyle(Math.max(2, height * 0.12), visual.stroke, 1);
    background.strokeRoundedRect(
      -this.halfWidth,
      -this.halfHeight,
      width,
      height,
      corner,
    );

    const label = scene.add
      .text(0, 0, visual.letter, {
        fontFamily: 'Trebuchet MS, Segoe UI, sans-serif',
        fontSize: `${Math.round(height * LABEL_FONT_SIZE_RATIO)}px`,
        color: '#ffffff',
        fontStyle: 'bold',
        stroke: '#0b1320',
        strokeThickness: Math.max(2, Math.round(height * 0.12)),
      })
      .setOrigin(0.5);

    this.add([background, label]);
    this.setDepth(PLAYFIELD_DEPTH);
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
