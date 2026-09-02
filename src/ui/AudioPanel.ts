import Phaser from 'phaser';
import { AudioManager } from '@systems/AudioManager';
import { TextButton } from '@ui/TextButton';

/**
 * ui/AudioPanel.ts
 *
 * DXB-26: Shared Music / SFX toggles and volume meters for Pause and
 * Settings. Reads and writes the existing AudioManager buses so both
 * screens stay synchronized. Not a new audio system.
 */

export interface AudioPanelColors {
  color: string;
  highlightColor: string;
  mutedColor: string;
  panel: number;
  panelStroke: number;
  accent: number;
  title: string;
}

const HUD_FONT_FAMILY = 'Trebuchet MS, Segoe UI, sans-serif';

interface AudioBusRow {
  label: Phaser.GameObjects.Text;
  toggle: TextButton;
  minus: TextButton;
  plus: TextButton;
  value: Phaser.GameObjects.Text;
}

export class AudioPanel {
  private readonly scene: Phaser.Scene;
  private readonly colors: AudioPanelColors;
  private readonly depth: number;
  private readonly chrome: Phaser.GameObjects.Graphics;
  private readonly heading: Phaser.GameObjects.Text;
  private readonly music: AudioBusRow;
  private readonly sfx: AudioBusRow;
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
    colors: AudioPanelColors,
    depth = 42,
  ) {
    this.scene = scene;
    this.colors = colors;
    this.depth = depth;
    this.chrome = scene.add.graphics().setDepth(depth);
    this.heading = scene.add
      .text(0, 0, 'AUDIO', {
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
    this.music = this.createRow('Music', () => this.toggleMusic(), () => this.nudgeMusic(-0.1), () => this.nudgeMusic(0.1));
    this.sfx = this.createRow('SFX', () => this.toggleSfx(), () => this.nudgeSfx(-0.1), () => this.nudgeSfx(0.1));
    this.layout(x, y, width);
  }

  static preferredHeight(viewportHeight: number): number {
    return Math.max(128, Math.round(viewportHeight * 0.24));
  }

  layout(x: number, y: number, width: number, viewportHeight?: number): void {
    if (this.destroyed) {
      return;
    }
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = AudioPanel.preferredHeight(viewportHeight ?? this.scene.scale.height);
    this.refresh();
  }

  refresh(): void {
    if (this.destroyed) {
      return;
    }
    this.music.toggle.setText(this.musicOn() ? 'Music On' : 'Music Off');
    this.sfx.toggle.setText(this.sfxOn() ? 'SFX On' : 'SFX Off');
    this.music.value.setText(`${Math.round(this.readMusicVolume() * 100)}%`);
    this.sfx.value.setText(`${Math.round(this.readSfxVolume() * 100)}%`);
    this.redrawMeters();
  }

  destroy(): void {
    if (this.destroyed) {
      return;
    }
    this.destroyed = true;
    this.chrome.destroy();
    this.heading.destroy();
    this.destroyRow(this.music);
    this.destroyRow(this.sfx);
  }

  private createRow(
    label: string,
    onToggle: () => void,
    onMinus: () => void,
    onPlus: () => void,
  ): AudioBusRow {
    return {
      label: this.scene.add
        .text(0, 0, label, {
          fontFamily: HUD_FONT_FAMILY,
          fontSize: '12px',
          color: this.colors.mutedColor,
          fontStyle: 'bold',
          align: 'left',
          stroke: '#0b1320',
          strokeThickness: 3,
        })
        .setOrigin(0, 0.5)
        .setDepth(this.depth + 1),
      toggle: new TextButton(this.scene, 0, 0, `${label} On`, onToggle, {
        color: this.colors.highlightColor,
        originX: 0,
        originY: 0.5,
        fontSize: 13,
        depth: this.depth + 2,
        align: 'left',
      }),
      minus: new TextButton(this.scene, 0, 0, '−', onMinus, {
        color: this.colors.color,
        originX: 0.5,
        originY: 0.5,
        fontSize: 16,
        depth: this.depth + 2,
      }),
      plus: new TextButton(this.scene, 0, 0, '+', onPlus, {
        color: this.colors.color,
        originX: 0.5,
        originY: 0.5,
        fontSize: 16,
        depth: this.depth + 2,
      }),
      value: this.scene.add
        .text(0, 0, '100%', {
          fontFamily: HUD_FONT_FAMILY,
          fontSize: '12px',
          color: this.colors.color,
          fontStyle: 'bold',
          align: 'right',
          stroke: '#0b1320',
          strokeThickness: 3,
        })
        .setOrigin(1, 0.5)
        .setDepth(this.depth + 1),
    };
  }

  private destroyRow(row: AudioBusRow): void {
    row.label.destroy();
    row.toggle.destroy();
    row.minus.destroy();
    row.plus.destroy();
    row.value.destroy();
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

    this.heading.setPosition(this.x + 16, this.y + 10);
    this.heading.setFontSize(Math.max(11, Math.round(this.height * 0.12)));

    this.placeRow(this.music, this.y + this.height * 0.34);
    this.placeRow(this.sfx, this.y + this.height * 0.7);
  }

  private placeRow(row: AudioBusRow, cy: number): void {
    const font = Math.max(11, Math.round(this.height * 0.11));
    row.label.setVisible(false);
    row.toggle.setPosition(this.x + 16, cy);
    row.toggle.setFontSize(font);
    row.minus.setPosition(this.x + this.width * 0.58, cy);
    row.minus.setFontSize(font + 2);
    row.plus.setPosition(this.x + this.width - 18, cy);
    row.plus.setFontSize(font + 2);
    row.value.setPosition(this.x + this.width - 42, cy);
    row.value.setFontSize(font);
  }

  private redrawMeters(): void {
    this.redraw();
    this.drawMeter(this.y + this.height * 0.46, this.readMusicVolume(), this.musicOn());
    this.drawMeter(this.y + this.height * 0.82, this.readSfxVolume(), this.sfxOn());
  }

  private drawMeter(y: number, volume: number, active: boolean): void {
    const meterX = this.x + this.width * 0.58 - 8;
    const meterW = this.width * 0.28;
    const meterH = Math.max(6, this.height * 0.07);
    this.chrome.fillStyle(0x0b1320, 0.9);
    this.chrome.fillRoundedRect(meterX, y, meterW, meterH, 2);
    this.chrome.fillStyle(this.colors.accent, active ? 0.95 : 0.35);
    this.chrome.fillRoundedRect(meterX, y, meterW * volume, meterH, 2);
  }

  private toggleMusic(): void {
    try {
      AudioManager.get().toggleMusic();
    } catch {
      return;
    }
    this.refresh();
  }

  private toggleSfx(): void {
    try {
      AudioManager.get().toggleSfx();
    } catch {
      return;
    }
    this.refresh();
  }

  private nudgeMusic(delta: number): void {
    try {
      const audio = AudioManager.get();
      audio.setMusicVolume(audio.getMusicVolume() + delta);
    } catch {
      return;
    }
    this.refresh();
  }

  private nudgeSfx(delta: number): void {
    try {
      const audio = AudioManager.get();
      audio.setSfxVolume(audio.getSfxVolume() + delta);
    } catch {
      return;
    }
    this.refresh();
  }

  private musicOn(): boolean {
    try {
      return AudioManager.get().isMusicEnabled();
    } catch {
      return true;
    }
  }

  private sfxOn(): boolean {
    try {
      return AudioManager.get().isSfxEnabled();
    } catch {
      return true;
    }
  }

  private readMusicVolume(): number {
    try {
      return AudioManager.get().getMusicVolume();
    } catch {
      return 1;
    }
  }

  private readSfxVolume(): number {
    try {
      return AudioManager.get().getSfxVolume();
    } catch {
      return 1;
    }
  }
}
