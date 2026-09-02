import Phaser from 'phaser';
import { AudioPanel } from '@ui/AudioPanel';
import { TextButton } from '@ui/TextButton';

/**
 * ui/PauseOverlay.ts
 *
 * DXB-13A: A reusable pause/menu overlay. Dims the playfield, shows a
 * title, and hosts Resume / Restart / Leave actions. Hidden until
 * `show()`; `hide()` tears down interactive controls so they cannot
 * leak into gameplay.
 *
 * DXB-15: framed panel, accent bar, and theme tokens.
 * DXB-26: visible Music / SFX toggles and volume meters via AudioPanel
 * so the player never has to leave a run to silence audio.
 */

export type PauseOverlayAction = 'resume' | 'restart' | 'mode-select';

export interface PauseOverlayColors {
  dim: number;
  dimAlpha: number;
  panel: number;
  panelStroke: number;
  title: string;
  body: string;
  accent: string;
  menuColor?: string;
  menuHighlight?: string;
  menuDescription?: string;
  menuMuted?: string;
}

const OVERLAY_DEPTH = 40;
const HUD_FONT_FAMILY = 'Trebuchet MS, Segoe UI, sans-serif';

const DEFAULT_COLORS: PauseOverlayColors = {
  dim: 0x050814,
  dimAlpha: 0.64,
  panel: 0x12182c,
  panelStroke: 0x2de2e6,
  title: '#f8f9fa',
  body: '#c5d0dc',
  accent: '#ff2a6d',
};

export class PauseOverlay {
  private readonly scene: Phaser.Scene;
  private readonly dim: Phaser.GameObjects.Rectangle;
  private readonly panel: Phaser.GameObjects.Graphics;
  private readonly accent: Phaser.GameObjects.Rectangle;
  private readonly title: Phaser.GameObjects.Text;
  private readonly hint: Phaser.GameObjects.Text;
  private buttons: TextButton[] = [];
  private audioPanel?: AudioPanel;
  private onSelect?: (action: PauseOverlayAction) => void;
  private colors: PauseOverlayColors = { ...DEFAULT_COLORS };
  private viewportWidth = 0;
  private viewportHeight = 0;
  private visible = false;

  constructor(scene: Phaser.Scene, viewportWidth: number, viewportHeight: number) {
    this.scene = scene;
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;

    this.dim = scene.add
      .rectangle(viewportWidth / 2, viewportHeight / 2, viewportWidth, viewportHeight, this.colors.dim, this.colors.dimAlpha)
      .setDepth(OVERLAY_DEPTH)
      .setVisible(false);

    this.panel = scene.add.graphics().setDepth(OVERLAY_DEPTH + 1).setVisible(false);

    this.accent = scene.add
      .rectangle(viewportWidth / 2, viewportHeight * 0.22, viewportWidth * 0.28, 4, this.colors.panelStroke)
      .setDepth(OVERLAY_DEPTH + 2)
      .setVisible(false);

    this.title = scene.add
      .text(viewportWidth / 2, viewportHeight * 0.1, 'PAUSED', {
        fontFamily: HUD_FONT_FAMILY,
        fontSize: `${Math.round(viewportHeight * 0.055)}px`,
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

    this.hint = scene.add
      .text(viewportWidth / 2, viewportHeight * 0.93, 'Tap a control', {
        fontFamily: HUD_FONT_FAMILY,
        fontSize: `${Math.round(viewportHeight * 0.018)}px`,
        color: this.colors.body,
        align: 'center',
        stroke: '#0b1320',
        strokeThickness: 3,
      })
      .setOrigin(0.5, 1)
      .setShadow(1, 2, '#000000', 3, true, true)
      .setDepth(OVERLAY_DEPTH + 2)
      .setVisible(false);
  }

  isVisible(): boolean {
    return this.visible;
  }

  applyTheme(colors: PauseOverlayColors): void {
    this.colors = { ...this.colors, ...colors };
    this.dim.setFillStyle(this.colors.dim, this.colors.dimAlpha);
    this.accent.setFillStyle(this.colors.panelStroke, 1);
    this.title.setColor(this.colors.title);
    this.hint.setColor(this.colors.body);
    if (this.visible) {
      this.redrawPanel();
      this.rebuildControls();
    }
  }

  show(onSelect: (action: PauseOverlayAction) => void): void {
    if (this.visible) {
      return;
    }

    this.onSelect = onSelect;
    this.visible = true;
    this.dim.setVisible(true);
    this.dim.setInteractive();
    this.panel.setVisible(true);
    this.accent.setVisible(true);
    this.title.setVisible(true);
    this.hint.setVisible(true);
    this.layout();
    this.rebuildControls();
  }

  hide(): void {
    if (!this.visible) {
      return;
    }

    this.visible = false;
    this.dim.setVisible(false);
    this.dim.disableInteractive();
    this.panel.setVisible(false);
    this.accent.setVisible(false);
    this.title.setVisible(false);
    this.hint.setVisible(false);
    this.clearControls();
    this.onSelect = undefined;
  }

  resize(viewportWidth: number, viewportHeight: number): void {
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;
    this.dim.setPosition(viewportWidth / 2, viewportHeight / 2);
    this.dim.setSize(viewportWidth, viewportHeight);
    this.title.setFontSize(Math.max(20, Math.round(viewportHeight * 0.05)));
    this.hint.setFontSize(Math.max(11, Math.round(viewportHeight * 0.018)));
    if (this.visible) {
      this.layout();
      this.rebuildControls();
    }
  }

  destroy(): void {
    this.hide();
    this.dim.destroy();
    this.panel.destroy();
    this.accent.destroy();
    this.title.destroy();
    this.hint.destroy();
  }

  private layout(): void {
    const width = this.viewportWidth;
    const height = this.viewportHeight;
    this.title.setPosition(width / 2, height * 0.1);
    this.accent.setPosition(width / 2, height * 0.2);
    this.accent.setSize(width * 0.28, Math.max(3, height * 0.005));
    this.hint.setPosition(width / 2, height * 0.94);
    this.hint.setWordWrapWidth(width * 0.7);
    this.redrawPanel();
  }

  private redrawPanel(): void {
    const width = this.viewportWidth;
    const height = this.viewportHeight;
    const panelW = Math.min(width * 0.78, 560);
    const panelH = height * 0.82;
    const x = (width - panelW) / 2;
    const y = height * 0.06;
    const radius = Math.min(width, height) * 0.02;

    this.panel.clear();
    this.panel.fillStyle(this.colors.panel, 0.96);
    this.panel.fillRoundedRect(x, y, panelW, panelH, radius);
    this.panel.lineStyle(Math.max(2, height * 0.005), this.colors.panelStroke, 1);
    this.panel.strokeRoundedRect(x, y, panelW, panelH, radius);
    this.panel.fillStyle(numberFromHex(this.colors.accent), 0.9);
    this.panel.fillRect(x, y, Math.max(6, width * 0.01), panelH);
  }

  private rebuildControls(): void {
    this.clearControls();
    const onSelect = this.onSelect;
    if (!onSelect) {
      return;
    }

    const width = this.viewportWidth;
    const height = this.viewportHeight;
    const color = this.colors.menuColor ?? this.colors.body;
    const highlight = this.colors.menuHighlight ?? this.colors.title;
    const font = Math.max(14, Math.round(height * 0.028));
    const startY = height * 0.24;
    const gap = height * 0.075;
    const actions: Array<{ id: PauseOverlayAction; label: string }> = [
      { id: 'resume', label: 'Resume' },
      { id: 'restart', label: 'Restart Run' },
      { id: 'mode-select', label: 'Leave Run' },
    ];

    this.buttons = actions.map((action, index) =>
      new TextButton(this.scene, width / 2, startY + index * gap, action.label, () => onSelect(action.id), {
        color,
        highlightColor: highlight,
        originX: 0.5,
        originY: 0.5,
        fontSize: font,
        depth: OVERLAY_DEPTH + 3,
      }),
    );

    const panelW = Math.min(width * 0.66, 480);
    const audioY = startY + gap * 3.05;
    this.audioPanel = new AudioPanel(
      this.scene,
      (width - panelW) / 2,
      audioY,
      panelW,
      {
        color,
        highlightColor: highlight,
        mutedColor: this.colors.menuMuted ?? this.colors.body,
        panel: 0x0b1320,
        panelStroke: this.colors.panelStroke,
        accent: numberFromHex(this.colors.accent),
        title: this.colors.title,
      },
      OVERLAY_DEPTH + 3,
    );
    this.audioPanel.layout((width - panelW) / 2, audioY, panelW, height);
  }

  private clearControls(): void {
    for (const button of this.buttons) {
      button.destroy();
    }
    this.buttons = [];
    this.audioPanel?.destroy();
    this.audioPanel = undefined;
  }
}

function numberFromHex(hex: string): number {
  const raw = hex.startsWith('#') ? hex.slice(1) : hex;
  const value = Number.parseInt(raw, 16);
  return Number.isFinite(value) ? value : 0xffffff;
}
