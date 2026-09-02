import Phaser from 'phaser';
import { SceneKeys, type SceneKey } from '@systems/SceneKeys';
import { GameViewport, type ViewportSnapshot } from '@systems/GameViewport';
import { AudioManager } from '@systems/AudioManager';
import { playDxBallThemeMusic } from '@entities/dx-ball/audioCues';
import { getTheme } from '@entities/dx-ball/Theme';
import { loadPlayableThemeId } from '@entities/dx-ball/Progress';
import { ArcadeBackground } from '@ui/ArcadeBackground';
import { AudioPanel } from '@ui/AudioPanel';
import { TextButton } from '@ui/TextButton';
import { resolveMenuReturn } from '@scenes/menuNavigation';
import {
  MENU_LAYOUT,
  createMenuSubtitle,
  createMenuTitle,
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
 * DXB-18A/DXB-26: Settings panel. AUDIO group exposes Music / SFX
 * on-off plus volume meters on the existing AudioManager buses. No
 * invented gameplay settings. Esc / Back return to the Hub.
 */

export interface SettingsSceneData {
  from?: SceneKey;
}

export class SettingsScene extends Phaser.Scene {
  private background!: ArcadeBackground;
  private titleText!: Phaser.GameObjects.Text;
  private subtitleText!: Phaser.GameObjects.Text;
  private audioPanel?: AudioPanel;
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
    this.audioPanel = this.createAudioPanel(snapshot, theme.overlay.panel, theme.overlay.panelStroke, theme);
    this.backButton = this.createBackButton(snapshot, theme.menu.color);

    this.unsubscribeViewport = viewport.onChange((next) => this.handleViewportChange(next));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubscribeViewport?.();
      this.audioPanel?.destroy();
      this.audioPanel = undefined;
      this.backButton?.destroy();
      this.backButton = undefined;
    });

    this.input.keyboard?.on('keydown-M', () => {
      try {
        AudioManager.get().toggle();
      } catch {
        // ignore
      }
      this.audioPanel?.refresh();
    });
    this.input.keyboard?.on('keydown-ESC', () => this.goBack());
  }

  private goBack(): void {
    this.scene.start(this.returnTo);
  }

  private createAudioPanel(
    snapshot: ViewportSnapshot,
    panel: number,
    panelStroke: number,
    theme: ReturnType<typeof getTheme>,
  ): AudioPanel {
    const width = Math.min(snapshot.width * 0.72, 520);
    const x = (snapshot.width - width) / 2;
    const y = menuContentY(snapshot) + snapshot.height * 0.04;
    const accent = Number.parseInt(theme.overlay.accent.replace('#', ''), 16) || 0xff2a6d;
    const audio = new AudioPanel(
      this,
      x,
      y,
      width,
      {
        color: theme.menu.color,
        highlightColor: theme.menu.highlightColor,
        mutedColor: theme.menu.mutedColor,
        panel,
        panelStroke,
        accent,
        title: theme.hud.subtitle,
      },
      20,
    );
    audio.layout(x, y, width, snapshot.height);
    return audio;
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
    this.cameras.main.setViewport(0, 0, snapshot.width, snapshot.height);
    this.background.resize(snapshot.width, snapshot.height);
    layoutMenuTitle(this.titleText, snapshot);
    layoutMenuSubtitle(this.subtitleText, snapshot);
    const width = Math.min(snapshot.width * 0.72, 520);
    this.audioPanel?.layout(
      (snapshot.width - width) / 2,
      menuContentY(snapshot) + snapshot.height * 0.04,
      width,
      snapshot.height,
    );
    this.backButton?.setPosition(menuBackX(snapshot), menuHintY(snapshot));
    this.backButton?.setFontSize(
      menuFontSize(snapshot.height, MENU_LAYOUT.backFontRatio, MENU_LAYOUT.backMinPx),
    );
  }
}
