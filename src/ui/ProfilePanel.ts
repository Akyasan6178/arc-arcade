import Phaser from 'phaser';
import { TextButton } from '@ui/TextButton';

/**
 * ui/ProfilePanel.ts
 *
 * DXB-28: Settings card for the local player-name setting. The caller
 * owns persistence; this widget only displays and asks to edit.
 */

export interface ProfilePanelColors {
  color: string;
  highlightColor: string;
  mutedColor: string;
  panel: number;
  panelStroke: number;
  accent: number;
  title: string;
}

const HUD_FONT_FAMILY = 'Trebuchet MS, Segoe UI, sans-serif';

export class ProfilePanel {
  private readonly scene: Phaser.Scene;
  private readonly colors: ProfilePanelColors;
  private readonly chrome: Phaser.GameObjects.Graphics;
  private readonly heading: Phaser.GameObjects.Text;
  private readonly label: Phaser.GameObjects.Text;
  private readonly value: Phaser.GameObjects.Text;
  private readonly edit: TextButton;
  private playerName: string;
  private x = 0;
  private y = 0;
  private width = 0;
  private height = 0;
  private destroyed = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    playerName: string,
    onEdit: () => void,
    colors: ProfilePanelColors,
    depth = 20,
  ) {
    this.scene = scene;
    this.colors = colors;
    this.playerName = playerName;
    this.chrome = scene.add.graphics().setDepth(depth);
    this.heading = scene.add
      .text(0, 0, 'PROFILE', {
        fontFamily: HUD_FONT_FAMILY,
        fontSize: '12px',
        color: colors.title,
        fontStyle: 'bold',
        align: 'left',
        stroke: '#0b1320',
        strokeThickness: 3,
      })
      .setOrigin(0, 0)
      .setDepth(depth + 1);
    this.label = scene.add
      .text(0, 0, 'Player Name', {
        fontFamily: HUD_FONT_FAMILY,
        fontSize: '12px',
        color: colors.mutedColor,
        fontStyle: 'bold',
        align: 'left',
        stroke: '#0b1320',
        strokeThickness: 3,
      })
      .setOrigin(0, 0.5)
      .setDepth(depth + 1);
    this.value = scene.add
      .text(0, 0, playerName, {
        fontFamily: HUD_FONT_FAMILY,
        fontSize: '16px',
        color: colors.highlightColor,
        fontStyle: 'bold',
        align: 'left',
        stroke: '#0b1320',
        strokeThickness: 4,
      })
      .setOrigin(0, 0.5)
      .setDepth(depth + 1);
    this.edit = new TextButton(scene, 0, 0, 'Edit', onEdit, {
      color: colors.highlightColor,
      originX: 1,
      originY: 0.5,
      fontSize: 14,
      depth: depth + 2,
      align: 'right',
    });
    this.layout(x, y, width);
  }

  static preferredHeight(viewportHeight: number): number {
    return Math.max(92, Math.round(viewportHeight * 0.16));
  }

  setPlayerName(name: string): void {
    if (this.destroyed) {
      return;
    }
    this.playerName = name;
    this.value.setText(name);
  }

  layout(x: number, y: number, width: number, viewportHeight?: number): void {
    if (this.destroyed) {
      return;
    }
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = ProfilePanel.preferredHeight(viewportHeight ?? this.scene.scale.height);
    this.redraw();
  }

  destroy(): void {
    if (this.destroyed) {
      return;
    }
    this.destroyed = true;
    this.chrome.destroy();
    this.heading.destroy();
    this.label.destroy();
    this.value.destroy();
    this.edit.destroy();
  }

  private redraw(): void {
    const radius = 10;
    this.chrome.clear();
    this.chrome.fillStyle(this.colors.panel, 0.94);
    this.chrome.fillRoundedRect(this.x, this.y, this.width, this.height, radius);
    this.chrome.lineStyle(1.5, this.colors.panelStroke, 1);
    this.chrome.strokeRoundedRect(this.x, this.y, this.width, this.height, radius);
    this.chrome.fillStyle(this.colors.accent, 1);
    this.chrome.fillRect(this.x, this.y + 8, 4, this.height - 16);

    const headingSize = Math.max(11, Math.round(this.height * 0.14));
    const labelSize = Math.max(11, Math.round(this.height * 0.13));
    const valueSize = Math.max(14, Math.round(this.height * 0.18));
    this.heading.setPosition(this.x + 16, this.y + 10);
    this.heading.setFontSize(headingSize);
    this.label.setPosition(this.x + 16, this.y + this.height * 0.52);
    this.label.setFontSize(labelSize);
    this.value.setPosition(this.x + 16, this.y + this.height * 0.76);
    this.value.setFontSize(valueSize);
    this.value.setText(this.playerName);
    this.edit.setPosition(this.x + this.width - 16, this.y + this.height * 0.64);
    this.edit.setFontSize(Math.max(13, labelSize + 1));
  }
}
