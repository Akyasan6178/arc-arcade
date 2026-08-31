import Phaser from 'phaser';

/**
 * ui/ArcadeBackground.ts
 *
 * DXB-13: A lightweight, asset-free arcade backdrop. The gradient and
 * motif are still drawn once from viewport size and only rebuilt on
 * resize / theme change.
 *
 * DXB-15: accepts a backdrop theme (colors + style). DXB-19 adds CRT
 * scanlines (retro), frost shards (frozen), and ember vents (inferno).
 *
 * DXB-22: a sibling Graphics overlay ticks a small particle field so
 * each theme feels alive without heavy assets. Particle count stays
 * under 20. Callers pass tokens; this widget does not import DX-Ball
 * theme data.
 */

export type ArcadeBackdropStyle =
  | 'neon'
  | 'space'
  | 'laboratory'
  | 'retro'
  | 'frozen'
  | 'inferno';

export interface ArcadeBackdropTheme {
  style?: ArcadeBackdropStyle;
  topColor?: number;
  bottomColor?: number;
  gridColor?: number;
  starColor?: number;
}

interface AtmosphereParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  phase: number;
}

const BAND_COUNT = 10;
const DEFAULT_THEME: Required<ArcadeBackdropTheme> = {
  style: 'neon',
  topColor: 0x0a1128,
  bottomColor: 0x16324f,
  gridColor: 0x2a6f97,
  starColor: 0xc8e7ff,
};

export class ArcadeBackground extends Phaser.GameObjects.Graphics {
  private theme: Required<ArcadeBackdropTheme> = { ...DEFAULT_THEME };
  private viewportWidth = 0;
  private viewportHeight = 0;
  private readonly atmosphere: Phaser.GameObjects.Graphics;
  private particles: AtmosphereParticle[] = [];
  private atmosphereTime = 0;
  private readonly onSceneUpdate = (_time: number, delta: number): void => {
    this.tickAtmosphere(delta);
  };

  constructor(
    scene: Phaser.Scene,
    viewportWidth: number,
    viewportHeight: number,
    theme: ArcadeBackdropTheme = {},
  ) {
    super(scene);
    scene.add.existing(this);
    this.setDepth(0);
    this.atmosphere = scene.add.graphics();
    this.atmosphere.setDepth(1);
    this.theme = { ...DEFAULT_THEME, ...theme };
    this.redraw(viewportWidth, viewportHeight);
    scene.events.on(Phaser.Scenes.Events.UPDATE, this.onSceneUpdate);
  }

  /** Rebuilds the backdrop for a new viewport size. */
  resize(viewportWidth: number, viewportHeight: number): void {
    this.redraw(viewportWidth, viewportHeight);
  }

  /** Replaces backdrop tokens and redraws at the last viewport size. */
  applyTheme(theme: ArcadeBackdropTheme): void {
    this.theme = { ...this.theme, ...theme };
    this.redraw(this.viewportWidth, this.viewportHeight);
  }

  protected preDestroy(): void {
    this.scene.events.off(Phaser.Scenes.Events.UPDATE, this.onSceneUpdate);
    this.atmosphere.destroy();
    super.preDestroy();
  }

  private redraw(width: number, height: number): void {
    this.viewportWidth = width;
    this.viewportHeight = height;
    this.clear();

    const { topColor, bottomColor, gridColor, starColor, style } = this.theme;
    const bandHeight = Math.ceil(height / BAND_COUNT) + 1;
    for (let i = 0; i < BAND_COUNT; i++) {
      const t = i / (BAND_COUNT - 1);
      this.fillStyle(lerpColor(topColor, bottomColor, t), 1);
      this.fillRect(0, (height / BAND_COUNT) * i, width, bandHeight);
    }

    if (style === 'space') {
      this.drawSpaceField(width, height, gridColor, starColor);
    } else if (style === 'laboratory') {
      this.drawLaboratoryField(width, height, gridColor, starColor);
    } else if (style === 'retro') {
      this.drawRetroField(width, height, gridColor, starColor);
    } else if (style === 'frozen') {
      this.drawFrozenField(width, height, gridColor, starColor);
    } else if (style === 'inferno') {
      this.drawInfernoField(width, height, gridColor, starColor);
    } else {
      this.drawNeonField(width, height, gridColor, starColor);
    }

    const vignette = Math.min(width, height) * 0.07;
    this.fillStyle(0x000000, style === 'space' ? 0.34 : 0.26);
    this.fillRect(0, 0, width, vignette);
    this.fillRect(0, height - vignette, width, vignette);
    this.fillRect(0, 0, vignette, height);
    this.fillRect(width - vignette, 0, vignette, height);

    this.seedParticles();
  }

  private seedParticles(): void {
    const { width, height, style } = { width: this.viewportWidth, height: this.viewportHeight, style: this.theme.style };
    const count = particleCount(style);
    this.particles = [];
    for (let i = 0; i < count; i++) {
      this.particles.push(makeParticle(i, width, height, style));
    }
  }

  private tickAtmosphere(deltaMs: number): void {
    const width = this.viewportWidth;
    const height = this.viewportHeight;
    if (width <= 0 || height <= 0) {
      return;
    }

    this.atmosphereTime += deltaMs;
    const dt = Math.min(0.05, deltaMs / 1000);
    const { style, starColor, gridColor } = this.theme;
    this.atmosphere.clear();

    for (const particle of this.particles) {
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      wrapParticle(particle, width, height, style);
      const twinkle = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(this.atmosphereTime / 280 + particle.phase));
      drawParticle(this.atmosphere, particle, style, starColor, gridColor, twinkle);
    }

    if (style === 'retro') {
      const scanY = ((this.atmosphereTime * 0.045) % (height + 24)) - 12;
      this.atmosphere.fillStyle(starColor, 0.08);
      this.atmosphere.fillRect(0, scanY, width, 3);
      this.atmosphere.fillStyle(gridColor, 0.05);
      this.atmosphere.fillRect(0, (scanY + height * 0.37) % height, width, 2);
    } else if (style === 'neon') {
      const pulse = 0.06 + 0.05 * (0.5 + 0.5 * Math.sin(this.atmosphereTime / 420));
      this.atmosphere.fillStyle(starColor, pulse);
      this.atmosphere.fillCircle(width * 0.12, height * 0.18, Math.min(width, height) * 0.035);
      this.atmosphere.fillStyle(gridColor, pulse * 0.85);
      this.atmosphere.fillCircle(width * 0.88, height * 0.22, Math.min(width, height) * 0.028);
    }
  }

  private drawNeonField(width: number, height: number, gridColor: number, starColor: number): void {
    const gap = Math.max(28, Math.min(width, height) * 0.048);
    this.lineStyle(1, gridColor, 0.18);
    for (let x = 0; x <= width; x += gap) {
      this.beginPath();
      this.moveTo(x, 0);
      this.lineTo(x, height);
      this.strokePath();
    }
    for (let y = 0; y <= height; y += gap) {
      this.beginPath();
      this.moveTo(0, y);
      this.lineTo(width, y);
      this.strokePath();
    }

    for (let i = 0; i < 32; i++) {
      this.fillStyle(starColor, 0.16 + hash(i, 3) * 0.36);
      this.fillCircle(hash(i, 1) * width, hash(i, 2) * height, hash(i, 4) < 0.18 ? 1.8 : 1);
    }
  }

  private drawSpaceField(width: number, height: number, gridColor: number, starColor: number): void {
    this.fillStyle(gridColor, 0.12);
    this.fillCircle(width * 0.18, height * 0.28, Math.min(width, height) * 0.22);
    this.fillStyle(lerpColor(gridColor, starColor, 0.35), 0.08);
    this.fillCircle(width * 0.78, height * 0.62, Math.min(width, height) * 0.3);

    for (let i = 0; i < 72; i++) {
      const bright = hash(i, 4) < 0.12;
      this.fillStyle(starColor, 0.2 + hash(i, 3) * 0.7);
      this.fillCircle(hash(i, 1) * width, hash(i, 2) * height, bright ? 2.1 : 1);
    }
  }

  private drawLaboratoryField(
    width: number,
    height: number,
    gridColor: number,
    starColor: number,
  ): void {
    const hex = Math.max(22, Math.min(width, height) * 0.042);
    const rowHeight = hex * 0.86;
    this.lineStyle(1, gridColor, 0.2);

    for (let row = 0, y = 0; y <= height + hex; row++, y += rowHeight) {
      const offset = row % 2 === 0 ? 0 : hex * 0.5;
      for (let x = -hex; x <= width + hex; x += hex) {
        this.strokeCircle(x + offset, y, hex * 0.42);
      }
    }

    this.lineStyle(1, starColor, 0.1);
    for (let i = 0; i < 8; i++) {
      const y = height * (0.12 + i * 0.1);
      this.beginPath();
      this.moveTo(0, y);
      this.lineTo(width, y);
      this.strokePath();
    }

    for (let i = 0; i < 20; i++) {
      this.fillStyle(starColor, 0.18 + hash(i, 3) * 0.28);
      this.fillRect(hash(i, 1) * width, hash(i, 2) * height, 3, 3);
    }
  }

  private drawRetroField(width: number, height: number, gridColor: number, starColor: number): void {
    const gap = Math.max(18, Math.min(width, height) * 0.036);
    this.lineStyle(2, gridColor, 0.16);
    for (let x = 0; x <= width; x += gap) {
      this.beginPath();
      this.moveTo(x, 0);
      this.lineTo(x, height);
      this.strokePath();
    }
    this.lineStyle(1, gridColor, 0.22);
    for (let y = 0; y <= height; y += Math.max(6, height * 0.018)) {
      this.beginPath();
      this.moveTo(0, y);
      this.lineTo(width, y);
      this.strokePath();
    }
    for (let i = 0; i < 28; i++) {
      this.fillStyle(starColor, 0.22 + hash(i, 3) * 0.4);
      this.fillRect(hash(i, 1) * width, hash(i, 2) * height, hash(i, 4) < 0.3 ? 4 : 2, 2);
    }
  }

  private drawFrozenField(width: number, height: number, gridColor: number, starColor: number): void {
    const size = Math.max(26, Math.min(width, height) * 0.07);
    this.lineStyle(1, gridColor, 0.22);
    for (let i = 0; i < 14; i++) {
      const x = hash(i, 1) * width;
      const y = hash(i, 2) * height;
      this.strokeCircle(x, y, size * (0.35 + hash(i, 3) * 0.45));
      this.beginPath();
      this.moveTo(x - size * 0.55, y);
      this.lineTo(x + size * 0.55, y);
      this.moveTo(x, y - size * 0.55);
      this.lineTo(x, y + size * 0.55);
      this.strokePath();
    }
    for (let i = 0; i < 40; i++) {
      this.fillStyle(starColor, 0.18 + hash(i, 4) * 0.5);
      this.fillCircle(hash(i, 1) * width, hash(i, 2) * height, hash(i, 3) < 0.2 ? 2.2 : 1);
    }
  }

  private drawInfernoField(width: number, height: number, gridColor: number, starColor: number): void {
    this.fillStyle(gridColor, 0.1);
    this.fillCircle(width * 0.5, height * 1.05, Math.min(width, height) * 0.42);
    this.fillStyle(starColor, 0.08);
    this.fillCircle(width * 0.22, height * 0.92, Math.min(width, height) * 0.18);
    this.fillCircle(width * 0.8, height * 0.88, Math.min(width, height) * 0.16);

    this.lineStyle(2, gridColor, 0.18);
    for (let i = 0; i < 6; i++) {
      const y = height * (0.55 + i * 0.08);
      this.beginPath();
      this.moveTo(0, y);
      this.lineTo(width * 0.5, y - height * 0.03);
      this.lineTo(width, y);
      this.strokePath();
    }

    for (let i = 0; i < 48; i++) {
      const lift = hash(i, 2);
      this.fillStyle(starColor, 0.2 + hash(i, 3) * 0.55);
      this.fillCircle(hash(i, 1) * width, height * (0.35 + lift * 0.65), hash(i, 4) < 0.25 ? 2.4 : 1.1);
    }
  }
}

function particleCount(style: ArcadeBackdropStyle): number {
  switch (style) {
    case 'space':
      return 18;
    case 'frozen':
      return 14;
    case 'inferno':
      return 16;
    case 'laboratory':
      return 12;
    case 'retro':
      return 8;
    default:
      return 10;
  }
}

function makeParticle(index: number, width: number, height: number, style: ArcadeBackdropStyle): AtmosphereParticle {
  const x = hash(index, 1) * width;
  const y = hash(index, 2) * height;
  const phase = hash(index, 5) * Math.PI * 2;
  switch (style) {
    case 'space':
      return { x, y, vx: 6 + hash(index, 6) * 10, vy: -2 + hash(index, 7) * 4, size: hash(index, 4) < 0.2 ? 2 : 1, phase };
    case 'frozen':
      return { x, y, vx: -10 + hash(index, 6) * 20, vy: 22 + hash(index, 7) * 18, size: 1.2 + hash(index, 4) * 1.6, phase };
    case 'inferno':
      return { x, y, vx: -8 + hash(index, 6) * 16, vy: -(32 + hash(index, 7) * 22), size: 1.1 + hash(index, 4) * 1.8, phase };
    case 'laboratory':
      return { x, y, vx: -12 + hash(index, 6) * 24, vy: -10 + hash(index, 7) * 20, size: 2.4, phase };
    case 'retro':
      return { x, y, vx: 0, vy: 8 + hash(index, 7) * 10, size: 2, phase };
    default:
      return { x, y, vx: 8 + hash(index, 6) * 12, vy: 0, size: 2.2, phase };
  }
}

function wrapParticle(
  particle: AtmosphereParticle,
  width: number,
  height: number,
  style: ArcadeBackdropStyle,
): void {
  if (style === 'frozen' && particle.y > height + 8) {
    particle.y = -8;
    particle.x = hash(Math.floor(particle.phase * 100), 8) * width;
    return;
  }
  if (style === 'inferno' && particle.y < -8) {
    particle.y = height + 8;
    particle.x = hash(Math.floor(particle.phase * 80), 9) * width;
    return;
  }
  if (particle.x < -10) {
    particle.x = width + 10;
  } else if (particle.x > width + 10) {
    particle.x = -10;
  }
  if (particle.y < -10) {
    particle.y = height + 10;
  } else if (particle.y > height + 10) {
    particle.y = -10;
  }
}

function drawParticle(
  graphics: Phaser.GameObjects.Graphics,
  particle: AtmosphereParticle,
  style: ArcadeBackdropStyle,
  starColor: number,
  gridColor: number,
  twinkle: number,
): void {
  if (style === 'laboratory') {
    graphics.fillStyle(starColor, 0.22 * twinkle);
    graphics.fillRect(particle.x, particle.y, particle.size, particle.size);
    return;
  }
  if (style === 'retro') {
    graphics.fillStyle(starColor, 0.28 * twinkle);
    graphics.fillRect(particle.x, particle.y, 3, 2);
    return;
  }
  if (style === 'neon') {
    graphics.fillStyle(particle.phase < Math.PI ? starColor : gridColor, 0.35 * twinkle);
  } else {
    graphics.fillStyle(starColor, 0.4 * twinkle);
  }
  graphics.fillCircle(particle.x, particle.y, particle.size);
}

function lerpColor(from: number, to: number, t: number): number {
  const fr = (from >> 16) & 0xff;
  const fg = (from >> 8) & 0xff;
  const fb = from & 0xff;
  const tr = (to >> 16) & 0xff;
  const tg = (to >> 8) & 0xff;
  const tb = to & 0xff;
  const r = Math.round(fr + (tr - fr) * t);
  const g = Math.round(fg + (tg - fg) * t);
  const b = Math.round(fb + (tb - fb) * t);
  return (r << 16) | (g << 8) | b;
}

/** Deterministic 0..1 so resize rebuilds the same star field. */
function hash(index: number, salt: number): number {
  const n = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
  return n - Math.floor(n);
}
