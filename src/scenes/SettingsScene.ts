import Phaser from 'phaser';
import { SceneKeys, type SceneKey } from '@systems/SceneKeys';
import { GameViewport, type ViewportSnapshot } from '@systems/GameViewport';
import { AudioManager } from '@systems/AudioManager';
import { playDxBallThemeMusic } from '@entities/dx-ball/audioCues';
import { getTheme, type ThemeDefinition } from '@entities/dx-ball/Theme';
import { loadPlayableThemeId } from '@entities/dx-ball/Progress';
import { ArcadeBackground } from '@ui/ArcadeBackground';
import { TextButton } from '@ui/TextButton';
import { resolveMenuReturn } from '@scenes/menuNavigation';
import {
  MENU_FONT_FAMILY,
  MENU_LAYOUT,
  MENU_STROKE,
  createMenuHint,
  createMenuSubtitle,
  createMenuTitle,
  layoutMenuHint,
  layoutMenuSubtitle,
  layoutMenuTitle,
  menuBackX,
  menuContentY,
  menuFontSize,
  menuHintY,
} from '@ui/menuLayout';

/**
 * scenes/SettingsScene.ts
 *
 * DXB-18A/DXB-25: Dedicated settings screen. Surfaces the existing
 * AudioManager mute flag plus user-facing music / SFX volume. No new
 * audio architecture — volumes multiply the DXB-22 buses. Esc / Back
 * return to the Hub.
 */

export interface SettingsSceneData {
  from?: SceneKey;
}

interface VolumeRow {
  label: Phaser.GameObjects.Text;
  minus: TextButton;
  plus: TextButton;
  value: Phaser.GameObjects.Text;
  chrome: Phaser.GameObjects.Graphics;
  cardX: number;
  cardY: number;
  cardW: number;
  cardH: number;
  meterX: number;
  meterY: number;
  meterW: number;
  meterH: number;
}

export class SettingsScene extends Phaser.Scene {
  private background!: ArcadeBackground;
  private titleText!: Phaser.GameObjects.Text;
  private subtitleText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private muteChrome!: Phaser.GameObjects.Graphics;
  private muteButton?: TextButton;
  private musicRow?: VolumeRow;
  private sfxRow?: VolumeRow;
  private backButton?: TextButton;
  private returnTo: SceneKey = SceneKeys.Hub;
  private unsubscribeViewport?: () => void;

  constructor() {
    super({ key: SceneKeys.Settings });
  }

  init(data: SettingsSceneData = {}): void {
    this.returnTo = resolveMenuReturn(data.from);
  }

  create(): void {
    const viewport = GameViewport.get();
    const snapshot = viewport.getSnapshot();
    const theme = getTheme(loadPlayableThemeId());

    this.cameras.main.setViewport(0, 0, snapshot.width, snapshot.height);
    this.cameras.main.setBackgroundColor(theme.backdrop.canvasBackground);
    this.background = new ArcadeBackground(this, snapshot.width, snapshot.height, theme.backdrop);
    playDxBallThemeMusic(theme.id);
    this.titleText = createMenuTitle(this, snapshot, theme.hud.title);
    this.subtitleText = createMenuSubtitle(this, snapshot, theme.hud.subtitle, 'SETTINGS');
    this.hintText = createMenuHint(this, snapshot, theme.hud.hint, 'M still mutes');
    this.muteChrome = this.add.graphics().setDepth(19);
    this.muteButton = new TextButton(
      this,
      snapshot.width / 2,
      0,
      this.muteLabel(),
      () => this.toggleAudio(),
      {
        color: theme.menu.highlightColor,
        originX: 0.5,
        originY: 0.5,
        fontSize: menuFontSize(snapshot.height, 0.032, 16),
      },
    );
    this.musicRow = this.createVolumeRow(theme, 'MUSIC', () => this.nudgeMusic(-0.1), () => this.nudgeMusic(0.1));
    this.sfxRow = this.createVolumeRow(theme, 'SFX', () => this.nudgeSfx(-0.1), () => this.nudgeSfx(0.1));
    this.backButton = this.createBackButton(snapshot, theme.menu.color);
    this.layoutSettings(snapshot, theme);
    this.refreshAudio();

    this.unsubscribeViewport = viewport.onChange((next) => this.handleViewportChange(next));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubscribeViewport?.();
      this.muteButton?.destroy();
      this.muteButton = undefined;
      this.muteChrome.destroy();
      this.destroyVolumeRow(this.musicRow);
      this.musicRow = undefined;
      this.destroyVolumeRow(this.sfxRow);
      this.sfxRow = undefined;
      this.backButton?.destroy();
      this.backButton = undefined;
    });

    this.input.keyboard?.on('keydown-M', () => {
      this.toggleAudio();
    });
    this.input.keyboard?.on('keydown-SPACE', () => this.toggleAudio());
    this.input.keyboard?.on('keydown-ENTER', () => this.toggleAudio());
    this.input.keyboard?.on('keydown-ESC', () => this.goBack());
  }

  private goBack(): void {
    this.scene.start(this.returnTo);
  }

  private audioEnabled(): boolean {
    try {
      return AudioManager.get().isEnabled();
    } catch {
      return true;
    }
  }

  private muteLabel(): string {
    return this.audioEnabled() ? 'MUTE  OFF' : 'MUTE  ON';
  }

  private toggleAudio(): void {
    try {
      AudioManager.get().toggle();
    } catch {
      // AudioManager missing/unavailable — ignore the toggle.
    }
    this.refreshAudio();
  }

  private nudgeMusic(delta: number): void {
    try {
      const audio = AudioManager.get();
      audio.setMusicVolume(audio.getMusicVolume() + delta);
    } catch {
      return;
    }
    this.refreshAudio();
  }

  private nudgeSfx(delta: number): void {
    try {
      const audio = AudioManager.get();
      audio.setSfxVolume(audio.getSfxVolume() + delta);
    } catch {
      return;
    }
    this.refreshAudio();
  }

  private refreshAudio(): void {
    this.muteButton?.setText(this.muteLabel());
    this.redrawVolumeRow(this.musicRow, this.readMusicVolume());
    this.redrawVolumeRow(this.sfxRow, this.readSfxVolume());
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

  private createVolumeRow(
    theme: ThemeDefinition,
    label: string,
    onMinus: () => void,
    onPlus: () => void,
  ): VolumeRow {
    return {
      label: this.add
        .text(0, 0, label, {
          fontFamily: MENU_FONT_FAMILY,
          fontSize: '14px',
          color: theme.menu.highlightColor,
          fontStyle: 'bold',
          align: 'left',
          stroke: MENU_STROKE,
          strokeThickness: 3,
        })
        .setOrigin(0, 0.5)
        .setDepth(20),
      minus: new TextButton(this, 0, 0, '−', onMinus, {
        color: theme.menu.color,
        originX: 0.5,
        originY: 0.5,
        fontSize: 18,
      }),
      plus: new TextButton(this, 0, 0, '+', onPlus, {
        color: theme.menu.color,
        originX: 0.5,
        originY: 0.5,
        fontSize: 18,
      }),
      value: this.add
        .text(0, 0, '100%', {
          fontFamily: MENU_FONT_FAMILY,
          fontSize: '14px',
          color: theme.menu.color,
          fontStyle: 'bold',
          align: 'right',
          stroke: MENU_STROKE,
          strokeThickness: 3,
        })
        .setOrigin(1, 0.5)
        .setDepth(20),
      chrome: this.add.graphics().setDepth(19),
      cardX: 0,
      cardY: 0,
      cardW: 0,
      cardH: 0,
      meterX: 0,
      meterY: 0,
      meterW: 0,
      meterH: 0,
    };
  }

  private destroyVolumeRow(row: VolumeRow | undefined): void {
    if (!row) {
      return;
    }
    row.label.destroy();
    row.minus.destroy();
    row.plus.destroy();
    row.value.destroy();
    row.chrome.destroy();
  }

  private layoutSettings(snapshot: ViewportSnapshot, theme: ThemeDefinition): void {
    const originY = menuContentY(snapshot);
    const cardW = Math.min(snapshot.width * 0.78, 560);
    const cardX = (snapshot.width - cardW) / 2;
    const muteH = snapshot.height * 0.12;
    const rowH = snapshot.height * 0.13;
    const accent = Number.parseInt(theme.overlay.accent.replace('#', ''), 16) || 0xff2a6d;

    this.muteChrome.clear();
    this.muteChrome.fillStyle(theme.overlay.panel, 0.92);
    this.muteChrome.fillRoundedRect(cardX, originY, cardW, muteH, 10);
    this.muteChrome.lineStyle(2, theme.overlay.panelStroke, 1);
    this.muteChrome.strokeRoundedRect(cardX, originY, cardW, muteH, 10);
    this.muteChrome.fillStyle(accent, 1);
    this.muteChrome.fillRect(cardX + cardW * 0.34, originY, cardW * 0.32, 3);
    this.muteButton?.setPosition(snapshot.width / 2, originY + muteH / 2);
    this.muteButton?.setFontSize(menuFontSize(snapshot.height, 0.032, 16));

    this.layoutVolumeRow(this.musicRow, snapshot, theme, cardX, originY + muteH + snapshot.height * 0.03, cardW, rowH);
    this.layoutVolumeRow(this.sfxRow, snapshot, theme, cardX, originY + muteH + snapshot.height * 0.03 + rowH + 12, cardW, rowH);
    this.refreshAudio();
  }

  private layoutVolumeRow(
    row: VolumeRow | undefined,
    snapshot: ViewportSnapshot,
    theme: ThemeDefinition,
    x: number,
    y: number,
    width: number,
    height: number,
  ): void {
    if (!row) {
      return;
    }
    const radius = 10;
    const meterX = x + 56;
    const meterW = width - 112;
    const meterH = Math.max(8, height * 0.16);
    const meterY = y + height * 0.62;
    row.cardX = x;
    row.cardY = y;
    row.cardW = width;
    row.cardH = height;
    row.meterX = meterX;
    row.meterY = meterY;
    row.meterW = meterW;
    row.meterH = meterH;
    row.label.setPosition(x + 18, y + height * 0.32);
    row.label.setFontSize(menuFontSize(snapshot.height, 0.02, 12));
    row.minus.setPosition(x + 28, y + height * 0.7);
    row.minus.setFontSize(menuFontSize(snapshot.height, 0.028, 16));
    row.plus.setPosition(x + width - 28, y + height * 0.7);
    row.plus.setFontSize(menuFontSize(snapshot.height, 0.028, 16));
    row.value.setPosition(x + width - 18, y + height * 0.32);
    row.value.setFontSize(menuFontSize(snapshot.height, 0.02, 12));
    row.chrome.clear();
    row.chrome.fillStyle(theme.overlay.panel, 0.92);
    row.chrome.fillRoundedRect(x, y, width, height, radius);
    row.chrome.lineStyle(1.5, theme.overlay.panelStroke, 1);
    row.chrome.strokeRoundedRect(x, y, width, height, radius);
  }

  private redrawVolumeRow(row: VolumeRow | undefined, volume: number): void {
    if (!row) {
      return;
    }
    const pct = Math.round(volume * 100);
    row.value.setText(`${pct}%`);
    const theme = getTheme(loadPlayableThemeId());
    const accent = Number.parseInt(theme.overlay.accent.replace('#', ''), 16) || 0x2de2e6;
    row.chrome.clear();
    row.chrome.fillStyle(theme.overlay.panel, 0.92);
    row.chrome.fillRoundedRect(row.cardX, row.cardY, row.cardW, row.cardH, 10);
    row.chrome.lineStyle(1.5, theme.overlay.panelStroke, 1);
    row.chrome.strokeRoundedRect(row.cardX, row.cardY, row.cardW, row.cardH, 10);
    row.chrome.fillStyle(0x0b1320, 0.9);
    row.chrome.fillRoundedRect(row.meterX, row.meterY, row.meterW, row.meterH, 3);
    row.chrome.fillStyle(accent, 0.95);
    row.chrome.fillRoundedRect(row.meterX, row.meterY, row.meterW * volume, row.meterH, 3);
  }

  private createBackButton(snapshot: ViewportSnapshot, color: string): TextButton {
    return new TextButton(
      this,
      menuBackX(snapshot),
      menuHintY(snapshot),
      '← Back',
      () => this.goBack(),
      {
        color,
        originX: 0,
        originY: 1,
        fontSize: menuFontSize(snapshot.height, MENU_LAYOUT.backFontRatio, MENU_LAYOUT.backMinPx),
        align: 'left',
      },
    );
  }

  private handleViewportChange(snapshot: ViewportSnapshot): void {
    const theme = getTheme(loadPlayableThemeId());
    this.cameras.main.setViewport(0, 0, snapshot.width, snapshot.height);
    this.background.resize(snapshot.width, snapshot.height);

    layoutMenuTitle(this.titleText, snapshot);
    layoutMenuSubtitle(this.subtitleText, snapshot);
    this.layoutSettings(snapshot, theme);
    layoutMenuHint(this.hintText, snapshot);
    this.backButton?.setPosition(menuBackX(snapshot), menuHintY(snapshot));
    this.backButton?.setFontSize(
      menuFontSize(snapshot.height, MENU_LAYOUT.backFontRatio, MENU_LAYOUT.backMinPx),
    );
  }
}
