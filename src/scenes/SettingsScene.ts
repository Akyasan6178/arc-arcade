import Phaser from 'phaser';
import { SceneKeys, type SceneKey } from '@systems/SceneKeys';
import { GameViewport, type ViewportSnapshot } from '@systems/GameViewport';
import { AudioManager } from '@systems/AudioManager';
import { playDxBallThemeMusic } from '@entities/dx-ball/audioCues';
import { getTheme } from '@entities/dx-ball/Theme';
import { loadPlayableThemeId } from '@entities/dx-ball/Progress';
import {
  MAX_PLAYER_NAME_LENGTH,
  loadPlayerName,
  savePlayerName,
} from '@entities/dx-ball/PlayerProfile';
import { ArcadeBackground } from '@ui/ArcadeBackground';
import { AudioPanel } from '@ui/AudioPanel';
import { ProfilePanel } from '@ui/ProfilePanel';
import { openNamePrompt } from '@ui/NamePrompt';
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
 * on-off plus volume meters on the existing AudioManager buses.
 * DXB-28: PROFILE group stores a local player name for future
 * leaderboard entries. No accounts. Esc / Back return to the Hub.
 */

export interface SettingsSceneData {
  from?: SceneKey;
}

export class SettingsScene extends Phaser.Scene {
  private background!: ArcadeBackground;
  private titleText!: Phaser.GameObjects.Text;
  private subtitleText!: Phaser.GameObjects.Text;
  private profilePanel?: ProfilePanel;
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
    this.profilePanel = this.createProfilePanel(snapshot, theme);
    this.audioPanel = this.createAudioPanel(snapshot, theme);
    this.backButton = this.createBackButton(snapshot, theme.menu.color);
    this.layoutPanels(snapshot);

    this.unsubscribeViewport = viewport.onChange((next) => this.handleViewportChange(next));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubscribeViewport?.();
      this.profilePanel?.destroy();
      this.profilePanel = undefined;
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

  private panelWidth(snapshot: ViewportSnapshot): number {
    return Math.min(snapshot.width * 0.72, 520);
  }

  private panelColors(theme: ReturnType<typeof getTheme>) {
    return {
      color: theme.menu.color,
      highlightColor: theme.menu.highlightColor,
      mutedColor: theme.menu.mutedColor,
      panel: theme.overlay.panel,
      panelStroke: theme.overlay.panelStroke,
      accent: Number.parseInt(theme.overlay.accent.replace('#', ''), 16) || 0xff2a6d,
      title: theme.hud.subtitle,
    };
  }

  private createProfilePanel(
    snapshot: ViewportSnapshot,
    theme: ReturnType<typeof getTheme>,
  ): ProfilePanel {
    const width = this.panelWidth(snapshot);
    const x = (snapshot.width - width) / 2;
    const y = menuContentY(snapshot);
    return new ProfilePanel(
      this,
      x,
      y,
      width,
      loadPlayerName(),
      () => this.editPlayerName(),
      this.panelColors(theme),
      20,
    );
  }

  private createAudioPanel(
    snapshot: ViewportSnapshot,
    theme: ReturnType<typeof getTheme>,
  ): AudioPanel {
    const width = this.panelWidth(snapshot);
    const x = (snapshot.width - width) / 2;
    const y = menuContentY(snapshot) + ProfilePanel.preferredHeight(snapshot.height) + snapshot.height * 0.02;
    return new AudioPanel(this, x, y, width, this.panelColors(theme), 20);
  }

  private layoutPanels(snapshot: ViewportSnapshot): void {
    const width = this.panelWidth(snapshot);
    const x = (snapshot.width - width) / 2;
    const profileY = menuContentY(snapshot);
    this.profilePanel?.layout(x, profileY, width, snapshot.height);
    this.audioPanel?.layout(
      x,
      profileY + ProfilePanel.preferredHeight(snapshot.height) + snapshot.height * 0.02,
      width,
      snapshot.height,
    );
  }

  private editPlayerName(): void {
    const theme = getTheme(loadPlayableThemeId());
    openNamePrompt(
      loadPlayerName(),
      (next) => {
        const saved = savePlayerName(next);
        this.profilePanel?.setPlayerName(saved);
      },
      {
        title: 'PLAYER NAME',
        label: 'Shown on future leaderboard entries',
        maxLength: MAX_PLAYER_NAME_LENGTH,
        accent: theme.overlay.accent,
      },
    );
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
    this.layoutPanels(snapshot);
    this.backButton?.setPosition(menuBackX(snapshot), menuHintY(snapshot));
    this.backButton?.setFontSize(
      menuFontSize(snapshot.height, MENU_LAYOUT.backFontRatio, MENU_LAYOUT.backMinPx),
    );
  }
}
