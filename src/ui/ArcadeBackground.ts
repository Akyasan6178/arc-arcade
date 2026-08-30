import Phaser from 'phaser';

/**
 * ui/ArcadeBackground.ts
 *
 * DXB-13: A lightweight, asset-free arcade backdrop. Drawn once from
 * viewport size (solid gradient bands, a faint grid, a few static
 * dots, a soft vignette) and only redrawn on resize — no per-frame
 * work. Not DX-Ball-specific.
 */

const BAND_COUNT = 10;
const STAR_COUNT = 32;
const TOP_COLOR = 0x0a1128;
const BOTTOM_COLOR = 0x16324f;
const GRID_COLOR = 0x2a6f97;
const STAR_COLOR = 0xc8e7ff;

export class ArcadeBackground extends Phaser.GameObjects.Graphics {
  constructor(scene: Phaser.Scene, viewportWidth: number, viewportHeight: number) {
    super(scene);
    scene.add.existing(this);
    this.setDepth(0);
    this.redraw(viewportWidth, viewportHeight);
  }

  /** Rebuilds the backdrop for a new viewport size. */
  resize(viewportWidth: number, viewportHeight: number): void {
    this.redraw(viewportWidth, viewportHeight);
  }

  private redraw(width: number, height: number): void {
    this.clear();

    const bandHeight = Math.ceil(height / BAND_COUNT) + 1;
    for (let i = 0; i < BAND_COUNT; i++) {
      const t = i / (BAND_COUNT - 1);
      this.fillStyle(lerpColor(TOP_COLOR, BOTTOM_COLOR, t), 1);
      this.fillRect(0, (height / BAND_COUNT) * i, width, bandHeight);
    }

    const gap = Math.max(28, Math.min(width, height) * 0.048);
    this.lineStyle(1, GRID_COLOR, 0.16);
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

    for (let i = 0; i < STAR_COUNT; i++) {
      const sx = hash(i, 1) * width;
      const sy = hash(i, 2) * height;
      const alpha = 0.14 + hash(i, 3) * 0.32;
      this.fillStyle(STAR_COLOR, alpha);
      this.fillCircle(sx, sy, hash(i, 4) < 0.18 ? 1.6 : 1);
    }

    const vignette = Math.min(width, height) * 0.07;
    this.fillStyle(0x000000, 0.26);
    this.fillRect(0, 0, width, vignette);
    this.fillRect(0, height - vignette, width, vignette);
    this.fillRect(0, 0, vignette, height);
    this.fillRect(width - vignette, 0, vignette, height);
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
