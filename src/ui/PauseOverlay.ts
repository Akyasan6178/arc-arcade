import Phaser from 'phaser';
import { SelectMenu, type SelectMenuOption } from '@ui/SelectMenu';

/**
 * ui/PauseOverlay.ts
 *
 * DXB-13A: A reusable pause/menu overlay. Dims the playfield, shows a
 * title, and hosts a `SelectMenu`. Not DX-Ball-specific — the caller
 * supplies the option list and handles each selected id. Hidden until
 * `show()`; `hide()` tears down the menu so its Space / Enter bindings
 * cannot leak into gameplay.
 *
 * DXB-15: framed panel, accent bar, and theme tokens so pause matches
 * the rest of the identity system.
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

const DEFAULT_OPTIONS: readonly SelectMenuOption<PauseOverlayAction>[] = [
  { id: 'resume', title: 'Resume', description: 'Back to the run' },
  { id: 'restart', title: 'Restart Run', description: 'Same mode, same theme' },
  { id: 'mode-select', title: 'Leave Run', description: 'Return to mode select' },
];

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
  private menu?: SelectMenu<PauseOverlayAction>;
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
      .rectangle(viewportWidth / 2, viewportHeight * 0.3, viewportWidth * 0.36, 4, this.colors.panelStroke)
      .setDepth(OVERLAY_DEPTH + 2)
      .setVisible(false);

    this.title = scene.add
      .text(viewportWidth / 2, viewportHeight * 0.18, 'PAUSED', {
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

    this.hint = scene.add
      .text(viewportWidth / 2, viewportHeight * 0.86, 'Tap a row to choose  ·  Esc resumes', {
        fontFamily: HUD_FONT_FAMILY,
        fontSize: `${Math.round(viewportHeight * 0.02)}px`,
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
      this.rebuildMenu();
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
    this.rebuildMenu();
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
    this.menu?.destroy();
    this.menu = undefined;
    this.onSelect = undefined;
  }

  resize(viewportWidth: number, viewportHeight: number): void {
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;
    this.dim.setPosition(viewportWidth / 2, viewportHeight / 2);
    this.dim.setSize(viewportWidth, viewportHeight);
    this.title.setFontSize(Math.max(22, Math.round(viewportHeight * 0.06)));
    this.hint.setFontSize(Math.max(12, Math.round(viewportHeight * 0.02)));
    if (this.visible) {
      this.layout();
      this.menu?.resize(viewportWidth, viewportHeight, PauseOverlay.menuOriginY(viewportHeight));
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
    this.title.setPosition(width / 2, height * 0.18);
    this.accent.setPosition(width / 2, height * 0.3);
    this.accent.setSize(width * 0.36, Math.max(3, height * 0.006));
    this.hint.setPosition(width / 2, height * 0.86);
    this.hint.setWordWrapWidth(width * 0.62);
    this.redrawPanel();
  }

  private redrawPanel(): void {
    const width = this.viewportWidth;
    const height = this.viewportHeight;
    const panelW = width * 0.7;
    const panelH = height * 0.62;
    const x = (width - panelW) / 2;
    const y = height * 0.12;
    const radius = Math.min(width, height) * 0.02;

    this.panel.clear();
    this.panel.fillStyle(this.colors.panel, 0.94);
    this.panel.fillRoundedRect(x, y, panelW, panelH, radius);
    this.panel.lineStyle(Math.max(2, height * 0.006), this.colors.panelStroke, 1);
    this.panel.strokeRoundedRect(x, y, panelW, panelH, radius);
    this.panel.fillStyle(numberFromHex(this.colors.accent), 0.9);
    this.panel.fillRect(x, y, Math.max(6, width * 0.01), panelH);
  }

  private rebuildMenu(): void {
    this.menu?.destroy();
    const onSelect = this.onSelect;
    if (!onSelect) {
      return;
    }

    this.menu = new SelectMenu(
      this.scene,
      this.viewportWidth,
      this.viewportHeight,
      PauseOverlay.menuOriginY(this.viewportHeight),
      DEFAULT_OPTIONS,
      (action) => onSelect(action),
      {
        depth: OVERLAY_DEPTH + 2,
        titleFontSizeRatio: 0.036,
        descriptionFontSizeRatio: 0.018,
        rowHeightRatio: 0.09,
        color: this.colors.menuColor,
        highlightColor: this.colors.menuHighlight,
        descriptionColor: this.colors.menuDescription,
        mutedColor: this.colors.menuMuted,
      },
    );
  }

  private static menuOriginY(viewportHeight: number): number {
    return viewportHeight * 0.36;
  }
}

function numberFromHex(hex: string): number {
  const raw = hex.startsWith('#') ? hex.slice(1) : hex;
  const value = Number.parseInt(raw, 16);
  return Number.isFinite(value) ? value : 0xffffff;
}
