import Phaser from 'phaser';

/**
 * ui/CollectionPreview.ts
 *
 * DXB-18: Reusable live-preview stage for a theme backdrop swatch plus
 * a paddle / ball cosmetic pair. Not DX-Ball-specific — the caller
 * supplies visual tokens (fill / stroke / motif / glow) and labels.
 * No gameplay: this widget never moves, collides, or launches.
 */

export type CollectionPreviewPaddleMotif = 'flat' | 'bands' | 'glow' | 'core';

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
}

export interface CollectionPreviewBackdrop {
  topColor: number;
  bottomColor: number;
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
  private readonly panel: Phaser.GameObjects.Graphics;
  private readonly playfield: Phaser.GameObjects.Graphics;
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

  constructor(
    scene: Phaser.Scene,
    viewportWidth: number,
    viewportHeight: number,
    originY: number,
  ) {
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;
    this.originY = originY;

    this.panel = scene.add.graphics().setDepth(HUD_DEPTH);
    this.playfield = scene.add.graphics().setDepth(HUD_DEPTH + 1);
    this.paddle = scene.add.graphics().setDepth(HUD_DEPTH + 2);
    this.ballGlow = scene.add.graphics().setDepth(HUD_DEPTH + 3);
    this.ball = scene.add.graphics().setDepth(HUD_DEPTH + 4);
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
      .setDepth(HUD_DEPTH + 5);

    this.redraw();
  }

  applyTheme(colors: CollectionPreviewColors): void {
    if (this.destroyed) {
      return;
    }
    this.colors = { ...this.colors, ...colors };
    this.redraw();
  }

  setContent(content: CollectionPreviewContent): void {
    if (this.destroyed) {
      return;
    }
    this.content = content;
    this.redraw();
  }

  resize(viewportWidth: number, viewportHeight: number, originY: number): void {
    if (this.destroyed) {
      return;
    }
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;
    this.originY = originY;
    this.redraw();
  }

  destroy(): void {
    if (this.destroyed) {
      return;
    }
    this.destroyed = true;
    this.panel.destroy();
    this.playfield.destroy();
    this.paddle.destroy();
    this.ballGlow.destroy();
    this.ball.destroy();
    this.caption.destroy();
  }

  private redraw(): void {
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
    this.playfield.lineStyle(1, this.colors.panelStroke, 0.45);
    this.playfield.strokeRect(playfieldX, playfieldY, playfieldW, playfieldH);

    this.drawPaddle(playfieldX, playfieldY, playfieldW, playfieldH);
    this.drawBall(playfieldX, playfieldY, playfieldW, playfieldH);

    const captionSize = Math.round(this.viewportHeight * 0.018);
    const locked = this.content?.locked === true;
    const themeLabel = this.content?.themeLabel ?? 'Theme';
    const paddleLabel = this.content?.paddleLabel ?? 'Paddle';
    const ballLabel = this.content?.ballLabel ?? 'Ball';
    const prefix = locked ? 'LOCKED PREVIEW  ·  ' : 'PREVIEW  ·  ';
    this.caption.setPosition(this.viewportWidth / 2, panelY + playfieldH + inset * 1.4);
    this.caption.setFontSize(captionSize);
    this.caption.setColor(locked ? this.colors.muted : this.colors.body);
    this.caption.setWordWrapWidth(panelWidth * 0.92);
    this.caption.setText(`${prefix}${themeLabel}  ·  ${paddleLabel}  ·  ${ballLabel}`);
  }

  private drawPaddle(playfieldX: number, playfieldY: number, playfieldW: number, playfieldH: number): void {
    this.paddle.clear();
    const visual = this.content?.paddle;
    if (!visual) {
      return;
    }

    const width = playfieldW * 0.42;
    const height = Math.max(8, playfieldH * 0.11);
    const x = playfieldX + playfieldW / 2;
    const y = playfieldY + playfieldH - height * 1.45;
    const halfW = width / 2;
    const halfH = height / 2;

    this.paddle.fillStyle(visual.fill, 1);
    this.paddle.fillRect(x - halfW, y - halfH, width, height);
    const strokeWidth = height * visual.strokeWidthRatio;
    if (strokeWidth > 0) {
      this.paddle.lineStyle(strokeWidth, visual.stroke, 1);
      this.paddle.strokeRect(x - halfW, y - halfH, width, height);
    }

    switch (visual.motif) {
      case 'bands': {
        this.paddle.fillStyle(visual.motifColor, 0.85);
        this.paddle.fillRect(x - halfW * 0.82, y - halfH * 0.45, width * 0.82, Math.max(1, height * 0.18));
        this.paddle.fillRect(x - halfW * 0.7, y + halfH * 0.12, width * 0.7, Math.max(1, height * 0.14));
        break;
      }
      case 'glow': {
        this.paddle.fillStyle(visual.motifColor, 0.28);
        this.paddle.fillRoundedRect(
          x - halfW - 4,
          y - halfH - 4,
          width + 8,
          height + 8,
          Math.max(2, height * 0.35),
        );
        break;
      }
      case 'core': {
        this.paddle.fillStyle(visual.motifColor, 0.95);
        this.paddle.fillRect(
          x - halfW * 0.55,
          y - Math.max(1, height * 0.12),
          width * 0.55,
          Math.max(2, height * 0.24),
        );
        break;
      }
      default:
        break;
    }
  }

  private drawBall(playfieldX: number, playfieldY: number, playfieldW: number, playfieldH: number): void {
    this.ballGlow.clear();
    this.ball.clear();
    const visual = this.content?.ball;
    if (!visual) {
      return;
    }

    const paddleHeight = Math.max(8, playfieldH * 0.11);
    const radius = Math.max(7, paddleHeight * 0.85);
    const x = playfieldX + playfieldW / 2;
    const y = playfieldY + playfieldH - paddleHeight * 1.45 - paddleHeight - radius * 1.65;

    if (visual.glowAlpha > 0) {
      this.ballGlow.fillStyle(visual.glowColor, visual.glowAlpha);
      this.ballGlow.fillCircle(x, y, radius * visual.glowScale);
    }

    this.ball.fillStyle(visual.fill, 1);
    this.ball.fillCircle(x, y, radius);
    const strokeWidth = radius * visual.strokeWidthRatio;
    if (strokeWidth > 0) {
      this.ball.lineStyle(Math.max(1.5, strokeWidth), visual.stroke, 1);
      this.ball.strokeCircle(x, y, radius);
    }
  }
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
