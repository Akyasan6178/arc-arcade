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
 */

export type PauseOverlayAction = 'resume' | 'restart' | 'mode-select';

const OVERLAY_DEPTH = 40;
const HUD_FONT_FAMILY = 'Trebuchet MS, Segoe UI, sans-serif';

const DEFAULT_OPTIONS: readonly SelectMenuOption<PauseOverlayAction>[] = [
  { id: 'resume', title: 'Resume' },
  { id: 'restart', title: 'Restart Run' },
  { id: 'mode-select', title: 'Return To Mode Selection' },
];

export class PauseOverlay {
  private readonly scene: Phaser.Scene;
  private readonly dim: Phaser.GameObjects.Rectangle;
  private readonly title: Phaser.GameObjects.Text;
  private menu?: SelectMenu<PauseOverlayAction>;
  private onSelect?: (action: PauseOverlayAction) => void;
  private viewportWidth = 0;
  private viewportHeight = 0;
  private visible = false;

  constructor(scene: Phaser.Scene, viewportWidth: number, viewportHeight: number) {
    this.scene = scene;
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;

    this.dim = scene.add
      .rectangle(viewportWidth / 2, viewportHeight / 2, viewportWidth, viewportHeight, 0x000000, 0.58)
      .setDepth(OVERLAY_DEPTH)
      .setVisible(false);

    this.title = scene.add
      .text(viewportWidth / 2, viewportHeight * 0.22, 'PAUSED', {
        fontFamily: HUD_FONT_FAMILY,
        fontSize: `${Math.round(viewportHeight * 0.07)}px`,
        color: '#f8f9fa',
        fontStyle: 'bold',
        align: 'center',
        stroke: '#0b1320',
        strokeThickness: 8,
      })
      .setOrigin(0.5, 0)
      .setShadow(1, 3, '#000000', 4, true, true)
      .setDepth(OVERLAY_DEPTH + 1)
      .setVisible(false);
  }

  isVisible(): boolean {
    return this.visible;
  }

  show(onSelect: (action: PauseOverlayAction) => void): void {
    if (this.visible) {
      return;
    }

    this.onSelect = onSelect;
    this.visible = true;
    this.dim.setVisible(true);
    this.dim.setInteractive();
    this.title.setVisible(true);
    this.rebuildMenu();
  }

  hide(): void {
    if (!this.visible) {
      return;
    }

    this.visible = false;
    this.dim.setVisible(false);
    this.dim.disableInteractive();
    this.title.setVisible(false);
    this.menu?.destroy();
    this.menu = undefined;
    this.onSelect = undefined;
  }

  resize(viewportWidth: number, viewportHeight: number): void {
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;
    this.dim.setPosition(viewportWidth / 2, viewportHeight / 2);
    this.dim.setSize(viewportWidth, viewportHeight);
    this.title.setPosition(viewportWidth / 2, viewportHeight * 0.22);
    this.title.setFontSize(Math.round(viewportHeight * 0.07));
    this.menu?.resize(viewportWidth, viewportHeight, PauseOverlay.menuOriginY(viewportHeight));
  }

  destroy(): void {
    this.hide();
    this.dim.destroy();
    this.title.destroy();
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
        depth: OVERLAY_DEPTH + 1,
        titleFontSizeRatio: 0.038,
        descriptionFontSizeRatio: 0.018,
        rowHeightRatio: 0.08,
      },
    );
  }

  private static menuOriginY(viewportHeight: number): number {
    return viewportHeight * 0.4;
  }
}
