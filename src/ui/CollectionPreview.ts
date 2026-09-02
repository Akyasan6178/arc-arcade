import Phaser from 'phaser';
import type { ArcadeBackdropStyle } from '@ui/ArcadeBackground';
import { drawPaddleCosmetic } from '@entities/dx-ball/paddleCosmetic';

/**
 * ui/CollectionPreview.ts
 *
 * DXB-18: Reusable live-preview stage for a theme backdrop swatch plus
 * a paddle / ball cosmetic pair. Not a gameplay system — this widget
 * never moves, collides, or launches.
 *
 * DXB-22: the stage ticks lightweight Phaser animations so Garage
 * shows paddle motifs, ball glow/shell, and theme atmosphere instead
 * of a static swatch. Still no GIFs and no gameplay.
 *
 * DXB-27: paddle preview is larger, drifts, and names the motion
 * identity so Robot / Alien / Reactor / Pulse read as unlock goals.
 */

export type CollectionPreviewPaddleMotif =
  | 'flat'
  | 'bands'
  | 'glow'
  | 'core'
  | 'crystal'
  | 'plates'
  | 'pulse'
  | 'shard';

export type CollectionPreviewBallFx =
  | 'none'
  | 'plasma'
  | 'ember'
  | 'quantum'
  | 'frost'
  | 'void'
  | 'corona'
  | 'nova';

export interface CollectionPreviewPaddleVisual {
  fill: number;
  stroke: number;
  strokeWidthRatio: number;
  motif: CollectionPreviewPaddleMotif;
  motifColor: number;
}

export interface CollectionPreviewBallVisual {
  fill: number;
  stroke: number;
  strokeWidthRatio: number;
  glowColor: number;
  glowAlpha: number;
  glowScale: number;
  coreColor?: number;
  coreAlpha?: number;
  coreScale?: number;
  fx?: CollectionPreviewBallFx;
}

export interface CollectionPreviewBackdrop {
  topColor: number;
  bottomColor: number;
  style?: ArcadeBackdropStyle;
  gridColor?: number;
  starColor?: number;
}

export interface CollectionPreviewColors {
  panel: number;
  panelStroke: number;
  accent: number;
  body: string;
  muted: string;
}

export interface CollectionPreviewContent {
  themeLabel: string;
  paddleLabel: string;
  ballLabel: string;
  motionHint?: string;
  locked?: boolean;
  paddle: CollectionPreviewPaddleVisual;
  ball: CollectionPreviewBallVisual;
  backdrop: CollectionPreviewBackdrop;
}

const HUD_FONT_FAMILY = 'Trebuchet MS, Segoe UI, sans-serif';
const HUD_DEPTH = 18;

const DEFAULT_COLORS: CollectionPreviewColors = {
  panel: 0x12182c,
  panelStroke: 0x2de2e6,
  accent: 0xff2a6d,
  body: '#c5d0dc',
  muted: '#6c7a89',
};

export class CollectionPreview {
  private readonly scene: Phaser.Scene;
  private readonly panel: Phaser.GameObjects.Graphics;
  private readonly playfield: Phaser.GameObjects.Graphics;
  private readonly atmosphere: Phaser.GameObjects.Graphics;
  private readonly paddle: Phaser.GameObjects.Graphics;
  private readonly ballGlow: Phaser.GameObjects.Graphics;
  private readonly ball: Phaser.GameObjects.Graphics;
  private readonly caption: Phaser.GameObjects.Text;
  private colors: CollectionPreviewColors = { ...DEFAULT_COLORS };
  private content: CollectionPreviewContent | null = null;
  private viewportWidth = 0;
  private viewportHeight = 0;
  private originY = 0;
  private destroyed = false;
  private fxTimeMs = 0;
  private playfieldBounds = { x: 0, y: 0, w: 0, h: 0 };
  private readonly onSceneUpdate = (_time: number, delta: number): void => {
    this.tick(delta);
  };

  constructor(
    scene: Phaser.Scene,
    viewportWidth: number,
    viewportHeight: number,
    originY: number,
  ) {
    this.scene = scene;
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;
    this.originY = originY;

    this.panel = scene.add.graphics().setDepth(HUD_DEPTH);
    this.playfield = scene.add.graphics().setDepth(HUD_DEPTH + 1);
    this.atmosphere = scene.add.graphics().setDepth(HUD_DEPTH + 2);
    this.paddle = scene.add.graphics().setDepth(HUD_DEPTH + 3);
    this.ballGlow = scene.add.graphics().setDepth(HUD_DEPTH + 4);
    this.ball = scene.add.graphics().setDepth(HUD_DEPTH + 5);
    this.caption = scene.add
      .text(viewportWidth / 2, originY, '', {
        fontFamily: HUD_FONT_FAMILY,
        fontSize: '12px',
        color: DEFAULT_COLORS.body,
        align: 'center',
        stroke: '#0b1320',
        strokeThickness: 3,
      })
      .setOrigin(0.5, 0)
      .setShadow(1, 2, '#000000', 2, true, true)
      .setDepth(HUD_DEPTH + 6);

    this.redrawStatic();
    scene.events.on(Phaser.Scenes.Events.UPDATE, this.onSceneUpdate);
  }

  applyTheme(colors: CollectionPreviewColors): void {
    if (this.destroyed) {
      return;
    }
    this.colors = { ...this.colors, ...colors };
    this.redrawStatic();
  }

  setContent(content: CollectionPreviewContent): void {
    if (this.destroyed) {
      return;
    }
    if (this.content && collectionPreviewSame(this.content, content)) {
      return;
    }
    this.content = content;
    this.redrawStatic();
    this.redrawAnimated();
  }

  resize(viewportWidth: number, viewportHeight: number, originY: number): void {
    if (this.destroyed) {
      return;
    }
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;
    this.originY = originY;
    this.redrawStatic();
    this.redrawAnimated();
  }

  destroy(): void {
    if (this.destroyed) {
      return;
    }
    this.destroyed = true;
    this.scene.events.off(Phaser.Scenes.Events.UPDATE, this.onSceneUpdate);
    this.panel.destroy();
    this.playfield.destroy();
    this.atmosphere.destroy();
    this.paddle.destroy();
    this.ballGlow.destroy();
    this.ball.destroy();
    this.caption.destroy();
  }

  private tick(deltaMs: number): void {
    if (this.destroyed) {
      return;
    }
    this.fxTimeMs += deltaMs;
    this.redrawAnimated();
  }

  private wave(periodMs: number): number {
    return 0.5 + 0.5 * Math.sin(this.fxTimeMs / periodMs);
  }

  private redrawStatic(): void {
    const panelWidth = this.viewportWidth * 0.72;
    const panelHeight = this.viewportHeight * 0.26;
    const panelX = (this.viewportWidth - panelWidth) / 2;
    const panelY = this.originY;
    const inset = Math.max(8, this.viewportHeight * 0.012);
    const playfieldX = panelX + inset;
    const playfieldY = panelY + inset;
    const playfieldW = panelWidth - inset * 2;
    const playfieldH = panelHeight * 0.68;
    const radius = Math.max(6, this.viewportHeight * 0.012);
    this.playfieldBounds = { x: playfieldX, y: playfieldY, w: playfieldW, h: playfieldH };

    this.panel.clear();
    this.panel.fillStyle(this.colors.panel, 0.92);
    this.panel.fillRoundedRect(panelX, panelY, panelWidth, panelHeight, radius);
    this.panel.lineStyle(2, this.colors.panelStroke, 0.95);
    this.panel.strokeRoundedRect(panelX, panelY, panelWidth, panelHeight, radius);
    this.panel.fillStyle(this.colors.accent, 1);
    this.panel.fillRect(panelX + panelWidth * 0.18, panelY, panelWidth * 0.64, 3);

    this.playfield.clear();
    const backdrop = this.content?.backdrop;
    const top = backdrop?.topColor ?? 0x0a1128;
    const bottom = backdrop?.bottomColor ?? 0x1b0a3a;
    const bands = 8;
    const bandH = Math.ceil(playfieldH / bands) + 1;
    for (let i = 0; i < bands; i++) {
      const t = i / (bands - 1);
      this.playfield.fillStyle(lerpColor(top, bottom, t), 1);
      this.playfield.fillRect(playfieldX, playfieldY + (playfieldH / bands) * i, playfieldW, bandH);
    }
    this.drawPlayfieldMotif(playfieldX, playfieldY, playfieldW, playfieldH);
    this.playfield.lineStyle(1, this.colors.panelStroke, 0.45);
    this.playfield.strokeRect(playfieldX, playfieldY, playfieldW, playfieldH);

    const captionSize = Math.round(this.viewportHeight * 0.018);
    const locked = this.content?.locked === true;
    const themeLabel = this.content?.themeLabel ?? 'Theme';
    const paddleLabel = this.content?.paddleLabel ?? 'Paddle';
    const ballLabel = this.content?.ballLabel ?? 'Ball';
    const prefix = locked ? 'LOCKED PREVIEW  ·  ' : 'LIVE PREVIEW  ·  ';
    const motion = this.content?.motionHint ? `  ·  ${this.content.motionHint}` : '';
    this.caption.setPosition(this.viewportWidth / 2, panelY + playfieldH + inset * 1.4);
    this.caption.setFontSize(captionSize);
    this.caption.setColor(locked ? this.colors.muted : this.colors.body);
    this.caption.setWordWrapWidth(panelWidth * 0.92);
    this.caption.setText(`${prefix}${themeLabel}  ·  ${paddleLabel}  ·  ${ballLabel}${motion}`);
  }

  private drawPlayfieldMotif(x: number, y: number, w: number, h: number): void {
    const style = this.content?.backdrop.style ?? 'neon';
    const grid = this.content?.backdrop.gridColor ?? this.colors.panelStroke;
    const star = this.content?.backdrop.starColor ?? this.colors.accent;

    if (style === 'space') {
      this.playfield.fillStyle(grid, 0.16);
      this.playfield.fillCircle(x + w * 0.22, y + h * 0.38, h * 0.28);
      for (let i = 0; i < 10; i++) {
        this.playfield.fillStyle(star, 0.35 + hash(i, 3) * 0.4);
        this.playfield.fillCircle(x + hash(i, 1) * w, y + hash(i, 2) * h, 1.2);
      }
      return;
    }
    if (style === 'laboratory') {
      this.playfield.lineStyle(1, grid, 0.28);
      this.playfield.strokeCircle(x + w * 0.3, y + h * 0.4, h * 0.18);
      this.playfield.strokeCircle(x + w * 0.7, y + h * 0.45, h * 0.14);
      return;
    }
    if (style === 'retro') {
      this.playfield.lineStyle(1, grid, 0.22);
      for (let row = 0; row < 6; row++) {
        const ly = y + (h / 6) * row;
        this.playfield.beginPath();
        this.playfield.moveTo(x, ly);
        this.playfield.lineTo(x + w, ly);
        this.playfield.strokePath();
      }
      return;
    }
    if (style === 'frozen') {
      this.playfield.lineStyle(1, grid, 0.3);
      this.playfield.strokeCircle(x + w * 0.5, y + h * 0.35, h * 0.16);
      this.playfield.beginPath();
      this.playfield.moveTo(x + w * 0.5 - 18, y + h * 0.35);
      this.playfield.lineTo(x + w * 0.5 + 18, y + h * 0.35);
      this.playfield.moveTo(x + w * 0.5, y + h * 0.35 - 18);
      this.playfield.lineTo(x + w * 0.5, y + h * 0.35 + 18);
      this.playfield.strokePath();
      return;
    }
    if (style === 'inferno') {
      this.playfield.fillStyle(grid, 0.16);
      this.playfield.fillCircle(x + w * 0.5, y + h * 1.05, h * 0.42);
      return;
    }
    this.playfield.lineStyle(1, grid, 0.22);
    const gap = Math.max(16, w * 0.16);
    for (let gx = x; gx <= x + w; gx += gap) {
      this.playfield.beginPath();
      this.playfield.moveTo(gx, y);
      this.playfield.lineTo(gx, y + h);
      this.playfield.strokePath();
    }
  }

  private redrawAnimated(): void {
    const { x, y, w, h } = this.playfieldBounds;
    if (w <= 0) {
      return;
    }
    this.drawAtmosphere(x, y, w, h);
    this.drawPaddle(x, y, w, h);
    this.drawBall(x, y, w, h);
  }

  private drawAtmosphere(x: number, y: number, w: number, h: number): void {
    this.atmosphere.clear();
    const style = this.content?.backdrop.style ?? 'neon';
    const star = this.content?.backdrop.starColor ?? this.colors.accent;
    const grid = this.content?.backdrop.gridColor ?? this.colors.panelStroke;
    const t = this.fxTimeMs;

    if (style === 'retro') {
      const scanY = y + ((t * 0.04) % (h + 8)) - 4;
      this.atmosphere.fillStyle(star, 0.12);
      this.atmosphere.fillRect(x, scanY, w, 2);
    }

    const count = style === 'space' ? 8 : 6;
    for (let i = 0; i < count; i++) {
      const drift = (t * (0.012 + hash(i, 2) * 0.02) + hash(i, 1) * w) % (w + 12);
      let px = x + drift - 6;
      let py = y + hash(i, 3) * h;
      if (style === 'frozen') {
        py = y + ((t * 0.03 + hash(i, 3) * h) % (h + 10)) - 5;
        px = x + hash(i, 1) * w + Math.sin(t / 280 + i) * 6;
      } else if (style === 'inferno') {
        py = y + h - ((t * 0.04 + hash(i, 3) * h) % (h + 10));
        px = x + hash(i, 1) * w + Math.sin(t / 180 + i) * 5;
      } else if (style === 'laboratory') {
        px = x + ((hash(i, 1) * w + Math.sin(t / 400 + i) * 10) % w);
        py = y + ((hash(i, 3) * h + Math.cos(t / 360 + i) * 8) % h);
        this.atmosphere.fillStyle(star, 0.28 + 0.2 * this.wave(240));
        this.atmosphere.fillRect(px, py, 3, 3);
        continue;
      }
      const alpha = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(t / 260 + i));
      this.atmosphere.fillStyle(i % 2 === 0 ? star : grid, alpha);
      this.atmosphere.fillCircle(px, py, style === 'space' ? 1.4 : 1.8);
    }
  }

  private drawPaddle(playfieldX: number, playfieldY: number, playfieldW: number, playfieldH: number): void {
    this.paddle.clear();
    const visual = this.content?.paddle;
    if (!visual) {
      return;
    }

    const width = playfieldW * 0.58;
    const height = Math.max(12, playfieldH * 0.16);
    const drift = Math.sin(this.fxTimeMs / 420) * playfieldW * 0.08;
    const x = playfieldX + playfieldW / 2 + drift;
    const y = playfieldY + playfieldH * 0.7;
    drawPaddleCosmetic(this.paddle, visual, width, height, this.fxTimeMs, x, y);
  }

  private drawBall(playfieldX: number, playfieldY: number, playfieldW: number, playfieldH: number): void {
    this.ballGlow.clear();
    this.ball.clear();
    const visual = this.content?.ball;
    if (!visual) {
      return;
    }

    const paddleHeight = Math.max(12, playfieldH * 0.16);
    const radius = Math.max(7, paddleHeight * 0.7);
    const x = playfieldX + playfieldW / 2 + Math.sin(this.fxTimeMs / 420) * playfieldW * 0.08;
    const y = playfieldY + playfieldH * 0.7 - paddleHeight * 1.85;
    const fx = visual.fx ?? 'none';
    const wave = this.wave.bind(this);
    let glowScale = visual.glowScale;
    let glowAlpha = visual.glowAlpha;
    let coreAlpha = visual.coreAlpha ?? 0;
    let shellScale = 0;
    let shellAlpha = 0;

    switch (fx) {
      case 'plasma':
        glowScale *= 1 + 0.08 * wave(260);
        glowAlpha *= 0.75 + 0.35 * wave(260);
        break;
      case 'ember':
        glowScale *= 1.04 + 0.14 * wave(150);
        glowAlpha *= 0.7 + 0.4 * wave(150);
        break;
      case 'quantum':
        glowScale *= 1 + 0.1 * wave(320);
        glowAlpha *= 0.72 + 0.38 * wave(200);
        break;
      case 'frost':
        glowScale *= 1.06 + 0.16 * wave(280);
        glowAlpha *= 0.7 + 0.4 * wave(280);
        shellScale = 1.85 + 0.2 * wave(280);
        shellAlpha = 0.22 + 0.2 * wave(280);
        break;
      case 'void':
        glowScale *= 1.1 + 0.2 * wave(340);
        glowAlpha *= 0.65 + 0.45 * wave(340);
        shellScale = 2.15 + 0.18 * wave(340);
        shellAlpha = 0.18 + 0.22 * wave(220);
        break;
      case 'corona':
        glowScale *= 1.12 + 0.22 * wave(160);
        glowAlpha *= 0.68 + 0.42 * wave(160);
        shellScale = 2.05 + 0.28 * wave(160);
        shellAlpha = 0.2 + 0.28 * wave(160);
        break;
      case 'nova':
        glowScale *= 1.08 + 0.2 * wave(140);
        glowAlpha *= 0.65 + 0.5 * wave(140);
        shellScale = 1.95 + 0.35 * wave(140);
        shellAlpha = 0.28 + 0.4 * wave(140);
        break;
      default:
        break;
    }

    if (glowAlpha > 0) {
      this.ballGlow.fillStyle(visual.glowColor, glowAlpha);
      this.ballGlow.fillCircle(x, y, radius * glowScale);
    }
    if (shellAlpha > 0) {
      this.ballGlow.lineStyle(Math.max(1.5, radius * 0.18), visual.glowColor, shellAlpha);
      this.ballGlow.strokeCircle(x, y, radius * shellScale);
    }

    this.ball.fillStyle(visual.fill, 1);
    this.ball.fillCircle(x, y, radius);
    const strokeWidth = radius * visual.strokeWidthRatio;
    if (strokeWidth > 0) {
      this.ball.lineStyle(Math.max(1.5, strokeWidth), visual.stroke, 1);
      this.ball.strokeCircle(x, y, radius);
    }
    if (coreAlpha > 0) {
      this.ball.fillStyle(visual.coreColor ?? visual.fill, coreAlpha);
      this.ball.fillCircle(x, y, radius * (visual.coreScale ?? 0.4));
    }
  }
}

function collectionPreviewSame(a: CollectionPreviewContent, b: CollectionPreviewContent): boolean {
  return (
    a.themeLabel === b.themeLabel &&
    a.paddleLabel === b.paddleLabel &&
    a.ballLabel === b.ballLabel &&
    a.motionHint === b.motionHint &&
    a.locked === b.locked &&
    a.backdrop.topColor === b.backdrop.topColor &&
    a.backdrop.bottomColor === b.backdrop.bottomColor &&
    a.backdrop.style === b.backdrop.style &&
    a.paddle.fill === b.paddle.fill &&
    a.paddle.stroke === b.paddle.stroke &&
    a.paddle.motif === b.paddle.motif &&
    a.paddle.motifColor === b.paddle.motifColor &&
    a.ball.fill === b.ball.fill &&
    a.ball.stroke === b.ball.stroke &&
    a.ball.glowColor === b.ball.glowColor &&
    a.ball.coreColor === b.ball.coreColor &&
    a.ball.fx === b.ball.fx
  );
}

function lerpColor(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 0xff;
  const ag = (a >> 8) & 0xff;
  const ab = a & 0xff;
  const br = (b >> 16) & 0xff;
  const bg = (b >> 8) & 0xff;
  const bb = b & 0xff;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bCh = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | bCh;
}

function hash(index: number, salt: number): number {
  const n = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
  return n - Math.floor(n);
}
