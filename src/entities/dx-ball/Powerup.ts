import Phaser from 'phaser';
import type { ThemePowerupVisual } from '@entities/dx-ball/Theme';

/**
 * entities/dx-ball/Powerup.ts
 *
 * DXB-09: A single falling powerup capsule. Purely visual plus
 * straight-line downward motion — like `Brick`, all "what happens when
 * this is caught" logic lives in the owner (`PowerupManager`), not here.
 *
 * DXB-15: identity is an icon first (heart / flame / spheres / expand /
 * shrink / slow / fast). The one-letter label remains as a small
 * secondary cue. Colors come from the active theme palette passed in by
 * `PowerupManager`; this class still does not decide effects.
 */
export type PowerupType =
  | 'widen-paddle'
  | 'slow-ball'
  | 'extra-life'
  | 'fire-ball'
  | 'multi-ball'
  | 'small-paddle'
  | 'fast-ball';

interface PowerupVisual extends ThemePowerupVisual {
  letter: string;
}

const POWERUP_LETTERS: Record<PowerupType, string> = {
  'widen-paddle': 'W',
  'slow-ball': 'S',
  'extra-life': 'L',
  'fire-ball': 'F',
  'multi-ball': 'M',
  'small-paddle': 'N',
  'fast-ball': 'T',
};

const DEFAULT_POWERUP_COLORS: Record<PowerupType, ThemePowerupVisual> = {
  'widen-paddle': { color: 0x2d6a4f, stroke: 0xb7e4c7 },
  'slow-ball': { color: 0x40916c, stroke: 0xd8f3dc },
  'extra-life': { color: 0x52b788, stroke: 0xedf6f0 },
  'fire-ball': { color: 0x1b4332, stroke: 0x95d5b2 },
  'multi-ball': { color: 0x74c69d, stroke: 0xf0fff4 },
  'small-paddle': { color: 0xe85d04, stroke: 0xffd166 },
  'fast-ball': { color: 0xc1121f, stroke: 0xffba08 },
};

/** Corner radius of the capsule background, as a ratio of its own height. */
const CORNER_RADIUS_RATIO = 0.3;

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
    palette: ThemePowerupVisual = DEFAULT_POWERUP_COLORS[type],
  ) {
    super(scene, x, y);

    this.type = type;
    this.halfWidth = width / 2;
    this.halfHeight = height / 2;
    this.fallSpeed = fallSpeed;

    const visual: PowerupVisual = {
      ...palette,
      letter: POWERUP_LETTERS[type],
    };
    const corner = height * CORNER_RADIUS_RATIO;
    const background = scene.add.graphics();
    background.fillStyle(visual.color, 1);
    background.fillRoundedRect(-this.halfWidth, -this.halfHeight, width, height, corner);
    background.lineStyle(Math.max(2, height * 0.12), visual.stroke, 1);
    background.strokeRoundedRect(-this.halfWidth, -this.halfHeight, width, height, corner);

    const icon = scene.add.graphics();
    drawPowerupIcon(icon, type, visual.stroke, width, height);

    const letterSize = Math.max(8, Math.round(height * 0.34));
    const label = scene.add
      .text(this.halfWidth * 0.62, this.halfHeight * 0.42, visual.letter, {
        fontFamily: 'Trebuchet MS, Segoe UI, sans-serif',
        fontSize: `${letterSize}px`,
        color: '#ffffff',
        fontStyle: 'bold',
        stroke: '#0b1320',
        strokeThickness: Math.max(1, Math.round(height * 0.08)),
      })
      .setOrigin(0.5)
      .setAlpha(0.72);

    this.add([background, icon, label]);
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

function drawPowerupIcon(
  g: Phaser.GameObjects.Graphics,
  type: PowerupType,
  color: number,
  width: number,
  height: number,
): void {
  const s = Math.min(width, height) * 0.72;
  g.lineStyle(Math.max(1.6, s * 0.1), color, 1);
  g.fillStyle(color, 1);

  switch (type) {
    case 'extra-life':
      drawHeart(g, s * 0.42);
      break;
    case 'fire-ball':
      drawFlame(g, s * 0.4);
      break;
    case 'multi-ball':
      drawMultiSpheres(g, s * 0.38);
      break;
    case 'widen-paddle':
      drawExpand(g, s * 0.4);
      break;
    case 'small-paddle':
      drawShrink(g, s * 0.4);
      break;
    case 'slow-ball':
      drawSlow(g, s * 0.4);
      break;
    case 'fast-ball':
      drawFast(g, s * 0.4);
      break;
  }
}

function drawHeart(g: Phaser.GameObjects.Graphics, r: number): void {
  g.beginPath();
  g.moveTo(0, r * 0.55);
  g.lineTo(-r * 0.92, -r * 0.15);
  g.arc(-r * 0.42, -r * 0.38, r * 0.42, Math.PI * 0.85, Math.PI * 1.95, false);
  g.arc(r * 0.42, -r * 0.38, r * 0.42, Math.PI * 1.05, Math.PI * 0.15, false);
  g.closePath();
  g.fillPath();
}

function drawFlame(g: Phaser.GameObjects.Graphics, r: number): void {
  g.beginPath();
  g.moveTo(0, -r);
  g.lineTo(r * 0.55, r * 0.15);
  g.arc(0, r * 0.2, r * 0.58, 0.15, Math.PI - 0.15, false);
  g.closePath();
  g.fillPath();
  g.fillStyle(0xffffff, 0.35);
  g.fillTriangle(0, -r * 0.25, -r * 0.18, r * 0.35, r * 0.18, r * 0.35);
}

function drawMultiSpheres(g: Phaser.GameObjects.Graphics, r: number): void {
  const rad = r * 0.38;
  g.fillCircle(-r * 0.42, r * 0.2, rad);
  g.fillCircle(r * 0.42, r * 0.2, rad);
  g.fillCircle(0, -r * 0.38, rad);
  g.strokeCircle(-r * 0.42, r * 0.2, rad);
  g.strokeCircle(r * 0.42, r * 0.2, rad);
  g.strokeCircle(0, -r * 0.38, rad);
}

function drawExpand(g: Phaser.GameObjects.Graphics, r: number): void {
  g.fillRect(-r * 0.55, -r * 0.16, r * 1.1, r * 0.32);
  g.fillTriangle(-r * 0.95, 0, -r * 0.5, -r * 0.42, -r * 0.5, r * 0.42);
  g.fillTriangle(r * 0.95, 0, r * 0.5, -r * 0.42, r * 0.5, r * 0.42);
}

function drawShrink(g: Phaser.GameObjects.Graphics, r: number): void {
  g.fillRect(-r * 0.28, -r * 0.16, r * 0.56, r * 0.32);
  g.fillTriangle(-r * 0.35, 0, -r * 0.85, -r * 0.4, -r * 0.85, r * 0.4);
  g.fillTriangle(r * 0.35, 0, r * 0.85, -r * 0.4, r * 0.85, r * 0.4);
}

function drawSlow(g: Phaser.GameObjects.Graphics, r: number): void {
  g.strokeCircle(0, 0, r * 0.72);
  g.beginPath();
  g.moveTo(0, -r * 0.42);
  g.lineTo(0, 0);
  g.lineTo(r * 0.38, r * 0.18);
  g.strokePath();
  g.fillTriangle(0, r * 0.85, -r * 0.28, r * 0.48, r * 0.28, r * 0.48);
}

function drawFast(g: Phaser.GameObjects.Graphics, r: number): void {
  g.fillTriangle(-r * 0.15, -r * 0.7, r * 0.7, 0, -r * 0.15, r * 0.7);
  g.fillTriangle(-r * 0.75, -r * 0.55, 0.05 * r, 0, -r * 0.75, r * 0.55);
}
