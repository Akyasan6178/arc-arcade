import Phaser from 'phaser';

/**
 * ui/ArcadeBackground.ts
 *
 * DXB-13: A lightweight, asset-free arcade backdrop. Drawn once from
 * viewport size and only redrawn on resize — no per-frame work. Not
 * DX-Ball-specific.
 *
 * DXB-15: accepts a backdrop theme (colors + style). Neon keeps the
 * original grid; Space leans on a denser starfield; Laboratory uses a
 * hex/circuit motif. Callers pass tokens; this widget does not import
 * DX-Ball theme data.
 */

export type ArcadeBackdropStyle = 'neon' | 'space' | 'laboratory';

export interface ArcadeBackdropTheme {
  style?: ArcadeBackdropStyle;
  topColor?: number;
  bottomColor?: number;
  gridColor?: number;
  starColor?: number;
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

  constructor(
    scene: Phaser.Scene,
    viewportWidth: number,
    viewportHeight: number,
    theme: ArcadeBackdropTheme = {},
  ) {
    super(scene);
    scene.add.existing(this);
    this.setDepth(0);
    this.theme = { ...DEFAULT_THEME, ...theme };
    this.redraw(viewportWidth, viewportHeight);
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
    } else {
      this.drawNeonField(width, height, gridColor, starColor);
    }

    const vignette = Math.min(width, height) * 0.07;
    this.fillStyle(0x000000, style === 'space' ? 0.34 : 0.26);
    this.fillRect(0, 0, width, vignette);
    this.fillRect(0, height - vignette, width, vignette);
    this.fillRect(0, 0, vignette, height);
    this.fillRect(width - vignette, 0, vignette, height);
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
