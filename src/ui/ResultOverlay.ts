import Phaser from 'phaser';

/**
 * ui/ResultOverlay.ts
 *
 * DXB-15: Reusable end/transition card (dim + framed panel + title +
 * body). Used for victory, game over, time-up, and level-clear.
 * Not a new gameplay system — the caller still owns Space / Esc.
 *
 * DXB-22: clearer hierarchy (kicker / title / reward / body), stronger
 * theme-colored panel treatment, and a dedicated reward line so scores
 * read first.
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
  /** Small mode/context label above the title. */
  kicker?: string;
  /** Primary reward (score / new best) — larger than body. */
  reward?: string;
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
  private readonly kicker: Phaser.GameObjects.Text;
  private readonly title: Phaser.GameObjects.Text;
  private readonly reward: Phaser.GameObjects.Text;
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

    this.kicker = scene.add
      .text(viewportWidth / 2, viewportHeight * 0.2, '', {
        fontFamily: HUD_FONT_FAMILY,
        fontSize: `${Math.max(11, Math.round(viewportHeight * 0.018))}px`,
        color: this.colors.body,
        align: 'center',
        stroke: '#0b1320',
        strokeThickness: 4,
      })
      .setOrigin(0.5, 0)
      .setShadow(1, 2, '#000000', 3, true, true)
      .setDepth(OVERLAY_DEPTH + 2)
      .setVisible(false);

    this.title = scene.add
      .text(viewportWidth / 2, viewportHeight * 0.24, '', {
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

    this.reward = scene.add
      .text(viewportWidth / 2, viewportHeight * 0.4, '', {
        fontFamily: HUD_FONT_FAMILY,
        fontSize: `${Math.max(16, Math.round(viewportHeight * 0.036))}px`,
        color: this.colors.victoryTitle,
        fontStyle: 'bold',
        align: 'center',
        stroke: '#0b1320',
        strokeThickness: 6,
      })
      .setOrigin(0.5, 0)
      .setShadow(1, 2, '#000000', 3, true, true)
      .setDepth(OVERLAY_DEPTH + 2)
      .setVisible(false);

    this.body = scene.add
      .text(viewportWidth / 2, viewportHeight * 0.46, '', {
        fontFamily: HUD_FONT_FAMILY,
        fontSize: `${Math.max(14, Math.round(viewportHeight * 0.026))}px`,
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
      .text(viewportWidth / 2, viewportHeight * 0.6, '', {
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

    this.bindPointer(this.kicker);
    this.bindPointer(this.title);
    this.bindPointer(this.reward);
    this.bindPointer(this.body);
    this.bindPointer(this.hint);
  }

  isVisible(): boolean {
    return this.visible;
  }

  applyTheme(colors: ResultOverlayColors): void {
    this.colors = { ...colors };
    this.dim.setFillStyle(this.colors.dim, this.colors.dimAlpha);
    this.accent.setFillStyle(this.toneAccent(), 1);
    this.kicker.setColor(this.colors.body);
    this.body.setColor(this.colors.body);
    this.hint.setColor(this.colors.body);
    this.title.setColor(this.titleColor());
    this.reward.setColor(this.rewardColor());
    if (this.visible) {
      this.redrawPanel();
    }
  }

  show(content: ResultOverlayContent, onContinue?: () => void): void {
    this.tone = content.tone ?? 'info';
    this.kicker.setText((content.kicker ?? '').toUpperCase());
    this.title.setText(content.title);
    this.title.setColor(this.titleColor());
    this.reward.setText(content.reward ?? '');
    this.reward.setColor(this.rewardColor());
    this.body.setText(content.body);
    this.hint.setText(content.hint ?? 'Tap to continue');
    this.accent.setFillStyle(this.toneAccent(), 1);
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
    this.kicker.setVisible(this.kicker.text.length > 0);
    this.title.setVisible(true);
    this.reward.setVisible(this.reward.text.length > 0);
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
    this.kicker.setVisible(false);
    this.title.setVisible(false);
    this.reward.setVisible(false);
    this.body.setVisible(false);
    this.hint.setVisible(false);
  }

  resize(viewportWidth: number, viewportHeight: number): void {
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;
    this.dim.setPosition(viewportWidth / 2, viewportHeight / 2);
    this.dim.setSize(viewportWidth, viewportHeight);
    this.kicker.setFontSize(Math.max(11, Math.round(viewportHeight * 0.018)));
    this.title.setFontSize(Math.max(24, Math.round(viewportHeight * 0.064)));
    this.reward.setFontSize(Math.max(16, Math.round(viewportHeight * 0.036)));
    this.body.setFontSize(Math.max(14, Math.round(viewportHeight * 0.026)));
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
    this.kicker.destroy();
    this.title.destroy();
    this.reward.destroy();
    this.body.destroy();
    this.hint.destroy();
  }

  private bindPointer(target: Phaser.GameObjects.Text): void {
    target.setInteractive({ useHandCursor: true });
    target.on('pointerup', this.handlePointerUp);
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

  private rewardColor(): string {
    if (this.tone === 'defeat') {
      return this.colors.accent;
    }
    return this.colors.victoryTitle;
  }

  private toneAccent(): number {
    if (this.tone === 'victory') {
      return numberFromHex(this.colors.victoryTitle);
    }
    if (this.tone === 'defeat') {
      return numberFromHex(this.colors.defeatTitle);
    }
    return numberFromHex(this.colors.infoTitle);
  }

  private layout(): void {
    const width = this.viewportWidth;
    const height = this.viewportHeight;
    const hasKicker = this.kicker.text.length > 0;
    const hasReward = this.reward.text.length > 0;
    this.kicker.setPosition(width / 2, height * 0.195);
    this.kicker.setVisible(hasKicker && this.visible);
    this.title.setPosition(width / 2, hasKicker ? height * 0.228 : height * 0.21);
    this.accent.setPosition(width / 2, height * 0.348);
    this.accent.setSize(width * 0.38, Math.max(3, height * 0.007));
    this.reward.setPosition(width / 2, height * 0.375);
    this.reward.setVisible(hasReward && this.visible);
    this.body.setPosition(width / 2, hasReward ? height * 0.445 : height * 0.385);
    this.body.setWordWrapWidth(width * 0.56);
    this.hint.setPosition(width / 2, height * 0.575);
    this.hint.setWordWrapWidth(width * 0.56);
    this.redrawPanel();
  }

  private redrawPanel(): void {
    const width = this.viewportWidth;
    const height = this.viewportHeight;
    const panelW = width * 0.74;
    const panelH = height * 0.52;
    const x = (width - panelW) / 2;
    const y = height * 0.15;
    const radius = Math.min(width, height) * 0.02;
    const glow = this.toneAccent();

    this.panel.clear();
    this.panel.fillStyle(glow, this.tone === 'victory' ? 0.16 : 0.1);
    this.panel.fillRoundedRect(x - 6, y - 6, panelW + 12, panelH + 12, radius + 4);
    this.panel.fillStyle(this.colors.panel, 0.94);
    this.panel.fillRoundedRect(x, y, panelW, panelH, radius);
    this.panel.lineStyle(Math.max(2, height * 0.006), this.colors.panelStroke, 1);
    this.panel.strokeRoundedRect(x, y, panelW, panelH, radius);
    this.panel.lineStyle(Math.max(2, height * 0.004), glow, 0.85);
    this.panel.strokeRoundedRect(x + 5, y + 5, panelW - 10, panelH - 10, Math.max(4, radius - 2));
    this.panel.fillStyle(glow, 1);
    this.panel.fillRect(x, y, Math.max(7, width * 0.012), panelH);
  }
}

function numberFromHex(hex: string): number {
  const raw = hex.startsWith('#') ? hex.slice(1) : hex;
  const value = Number.parseInt(raw, 16);
  return Number.isFinite(value) ? value : 0xffffff;
}
