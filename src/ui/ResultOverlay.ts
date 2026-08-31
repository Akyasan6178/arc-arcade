import Phaser from 'phaser';

/**
 * ui/ResultOverlay.ts
 *
 * DXB-15: Reusable end/transition card (dim + framed panel + title +
 * body). Used for victory, game over, time-up, and level-clear.
 * Not a new gameplay system — the caller still owns Space / Esc.
 */

export type ResultOverlayTone = 'victory' | 'defeat' | 'info';

export interface ResultOverlayColors {
  dim: number;
  dimAlpha: number;
  panel: number;
  panelStroke: number;
  title: string;
  body: string;
  accent: string;
  victoryTitle: string;
  defeatTitle: string;
  infoTitle: string;
}

export interface ResultOverlayContent {
  title: string;
  body: string;
  tone?: ResultOverlayTone;
  /** DXB-20: Shown under the body. Pointer-first; Space still works. */
  hint?: string;
}

const OVERLAY_DEPTH = 30;
const HUD_FONT_FAMILY = 'Trebuchet MS, Segoe UI, sans-serif';

const DEFAULT_COLORS: ResultOverlayColors = {
  dim: 0x050814,
  dimAlpha: 0.58,
  panel: 0x12182c,
  panelStroke: 0x2de2e6,
  title: '#f8f9fa',
  body: '#c5d0dc',
  accent: '#ff2a6d',
  victoryTitle: '#ffe066',
  defeatTitle: '#ff6b6b',
  infoTitle: '#2de2e6',
};

export class ResultOverlay {
  private readonly dim: Phaser.GameObjects.Rectangle;
  private readonly panel: Phaser.GameObjects.Graphics;
  private readonly accent: Phaser.GameObjects.Rectangle;
  private readonly title: Phaser.GameObjects.Text;
  private readonly body: Phaser.GameObjects.Text;
  private readonly hint: Phaser.GameObjects.Text;
  private colors: ResultOverlayColors = { ...DEFAULT_COLORS };
  private viewportWidth = 0;
  private viewportHeight = 0;
  private visible = false;
  private tone: ResultOverlayTone = 'info';
  private onContinue?: () => void;
  private readonly handlePointerUp = (): void => {
    if (this.visible) {
      this.onContinue?.();
    }
  };

  constructor(scene: Phaser.Scene, viewportWidth: number, viewportHeight: number) {
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;

    this.dim = scene.add
      .rectangle(viewportWidth / 2, viewportHeight / 2, viewportWidth, viewportHeight, this.colors.dim, this.colors.dimAlpha)
      .setDepth(OVERLAY_DEPTH)
      .setVisible(false);

    this.panel = scene.add.graphics().setDepth(OVERLAY_DEPTH + 1).setVisible(false);

    this.accent = scene.add
      .rectangle(viewportWidth / 2, viewportHeight * 0.32, viewportWidth * 0.42, 4, this.colors.panelStroke)
      .setDepth(OVERLAY_DEPTH + 2)
      .setVisible(false);

    this.title = scene.add
      .text(viewportWidth / 2, viewportHeight * 0.22, '', {
        fontFamily: HUD_FONT_FAMILY,
        fontSize: `${Math.round(viewportHeight * 0.07)}px`,
        color: this.colors.title,
        fontStyle: 'bold',
        align: 'center',
        stroke: '#0b1320',
        strokeThickness: 8,
      })
      .setOrigin(0.5, 0)
      .setShadow(1, 3, '#000000', 4, true, true)
      .setDepth(OVERLAY_DEPTH + 2)
      .setVisible(false);

    this.body = scene.add
      .text(viewportWidth / 2, viewportHeight * 0.38, '', {
        fontFamily: HUD_FONT_FAMILY,
        fontSize: `${Math.max(14, Math.round(viewportHeight * 0.028))}px`,
        color: this.colors.body,
        fontStyle: 'bold',
        align: 'center',
        stroke: '#0b1320',
        strokeThickness: 5,
        wordWrap: { width: viewportWidth * 0.58 },
      })
      .setOrigin(0.5, 0)
      .setShadow(1, 2, '#000000', 3, true, true)
      .setDepth(OVERLAY_DEPTH + 2)
      .setVisible(false);

    this.hint = scene.add
      .text(viewportWidth / 2, viewportHeight * 0.58, '', {
        fontFamily: HUD_FONT_FAMILY,
        fontSize: `${Math.max(12, Math.round(viewportHeight * 0.02))}px`,
        color: this.colors.body,
        align: 'center',
        stroke: '#0b1320',
        strokeThickness: 3,
        wordWrap: { width: viewportWidth * 0.58 },
      })
      .setOrigin(0.5, 0)
      .setShadow(1, 2, '#000000', 3, true, true)
      .setDepth(OVERLAY_DEPTH + 2)
      .setVisible(false);

    this.title.setInteractive({ useHandCursor: true });
    this.body.setInteractive({ useHandCursor: true });
    this.hint.setInteractive({ useHandCursor: true });
    this.title.on('pointerup', this.handlePointerUp);
    this.body.on('pointerup', this.handlePointerUp);
    this.hint.on('pointerup', this.handlePointerUp);
  }

  isVisible(): boolean {
    return this.visible;
  }

  applyTheme(colors: ResultOverlayColors): void {
    this.colors = { ...colors };
    this.dim.setFillStyle(this.colors.dim, this.colors.dimAlpha);
    this.accent.setFillStyle(this.colors.panelStroke, 1);
    this.body.setColor(this.colors.body);
    this.hint.setColor(this.colors.body);
    this.title.setColor(this.titleColor());
    if (this.visible) {
      this.redrawPanel();
    }
  }

  show(content: ResultOverlayContent, onContinue?: () => void): void {
    this.tone = content.tone ?? 'info';
    this.title.setText(content.title);
    this.title.setColor(this.titleColor());
    this.body.setText(content.body);
    this.hint.setText(content.hint ?? 'Tap to continue');
    this.onContinue = onContinue;
    this.visible = true;
    this.dim.setVisible(true);
    this.dim.setInteractive();
    this.dim.off('pointerup', this.handlePointerUp);
    if (onContinue) {
      this.dim.on('pointerup', this.handlePointerUp);
    }
    this.panel.setVisible(true);
    this.accent.setVisible(true);
    this.title.setVisible(true);
    this.body.setVisible(true);
    this.hint.setVisible(true);
    this.layout();
  }

  hide(): void {
    this.visible = false;
    this.onContinue = undefined;
    this.dim.off('pointerup', this.handlePointerUp);
    this.dim.disableInteractive();
    this.dim.setVisible(false);
    this.panel.setVisible(false);
    this.accent.setVisible(false);
    this.title.setVisible(false);
    this.body.setVisible(false);
    this.hint.setVisible(false);
  }

  resize(viewportWidth: number, viewportHeight: number): void {
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;
    this.dim.setPosition(viewportWidth / 2, viewportHeight / 2);
    this.dim.setSize(viewportWidth, viewportHeight);
    this.title.setFontSize(Math.max(22, Math.round(viewportHeight * 0.06)));
    this.body.setFontSize(Math.max(14, Math.round(viewportHeight * 0.028)));
    this.hint.setFontSize(Math.max(12, Math.round(viewportHeight * 0.02)));
    if (this.visible) {
      this.layout();
    }
  }

  destroy(): void {
    this.hide();
    this.dim.destroy();
    this.panel.destroy();
    this.accent.destroy();
    this.title.destroy();
    this.body.destroy();
    this.hint.destroy();
  }

  private titleColor(): string {
    if (this.tone === 'victory') {
      return this.colors.victoryTitle;
    }
    if (this.tone === 'defeat') {
      return this.colors.defeatTitle;
    }
    return this.colors.infoTitle;
  }

  private layout(): void {
    const width = this.viewportWidth;
    const height = this.viewportHeight;
    this.title.setPosition(width / 2, height * 0.22);
    this.accent.setPosition(width / 2, height * 0.335);
    this.accent.setSize(width * 0.42, Math.max(3, height * 0.006));
    this.body.setPosition(width / 2, height * 0.38);
    this.body.setWordWrapWidth(width * 0.58);
    this.hint.setPosition(width / 2, height * 0.58);
    this.hint.setWordWrapWidth(width * 0.58);
    this.redrawPanel();
  }

  private redrawPanel(): void {
    const width = this.viewportWidth;
    const height = this.viewportHeight;
    const panelW = width * 0.72;
    const panelH = height * 0.48;
    const x = (width - panelW) / 2;
    const y = height * 0.16;
    const radius = Math.min(width, height) * 0.02;

    this.panel.clear();
    this.panel.fillStyle(this.colors.panel, 0.92);
    this.panel.fillRoundedRect(x, y, panelW, panelH, radius);
    this.panel.lineStyle(Math.max(2, height * 0.006), this.colors.panelStroke, 1);
    this.panel.strokeRoundedRect(x, y, panelW, panelH, radius);
    this.panel.fillStyle(this.colors.accent ? numberFromHex(this.colors.accent) : this.colors.panelStroke, 0.85);
    this.panel.fillRect(x, y, Math.max(6, width * 0.01), panelH);
  }
}

function numberFromHex(hex: string): number {
  const raw = hex.startsWith('#') ? hex.slice(1) : hex;
  const value = Number.parseInt(raw, 16);
  return Number.isFinite(value) ? value : 0xffffff;
}
