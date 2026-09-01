import Phaser from 'phaser';
import { SceneKeys } from '@systems/SceneKeys';
import { GameViewport, type ViewportSnapshot } from '@systems/GameViewport';
import { AudioManager } from '@systems/AudioManager';
import { playDxBallThemeMusic } from '@entities/dx-ball/audioCues';
import { getAllLevelPreviewModels } from '@entities/dx-ball/levels';
import { getTheme } from '@entities/dx-ball/Theme';
import { loadPlayableThemeId } from '@entities/dx-ball/Progress';
import { ArcadeBackground } from '@ui/ArcadeBackground';
import { LevelBrowser } from '@ui/LevelBrowser';
import { TextButton } from '@ui/TextButton';
import { bindOptionalMenuShortcuts } from '@scenes/menuNavigation';
import {
  MENU_LAYOUT,
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
 * scenes/LevelSelectScene.ts
 *
 * DXB-23: Classic campaign browser. Sits between Mode Select and
 * MainScene so the player can inspect every level's miniature layout
 * before starting. Time Attack / Endless skip this screen. Confirm
 * starts Classic at the highlighted index; Esc / Back return to Mode
 * Select. Owns no gameplay.
 */

export class LevelSelectScene extends Phaser.Scene {
  private background!: ArcadeBackground;
  private titleText!: Phaser.GameObjects.Text;
  private subtitleText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private backButton?: TextButton;
  private browser?: LevelBrowser;
  private unsubscribeViewport?: () => void;

  constructor() {
    super({ key: SceneKeys.LevelSelect });
  }

  create(): void {
    const viewport = GameViewport.get();
    const snapshot = viewport.getSnapshot();
    const theme = getTheme(loadPlayableThemeId());
    const levels = getAllLevelPreviewModels();

    this.cameras.main.setViewport(0, 0, snapshot.width, snapshot.height);
    this.cameras.main.setBackgroundColor(theme.backdrop.canvasBackground);
    this.background = new ArcadeBackground(this, snapshot.width, snapshot.height, theme.backdrop);
    playDxBallThemeMusic(theme.id);
    this.titleText = createMenuTitle(this, snapshot, theme.hud.title);
    this.subtitleText = createMenuSubtitle(this, snapshot, theme.hud.subtitle, 'SELECT LEVEL');
    this.hintText = createMenuHint(this, snapshot, theme.hud.hint, 'Tap a layout to start Classic');
    this.backButton = this.createBackButton(snapshot, theme.menu.color);
    this.browser = new LevelBrowser(
      this,
      snapshot.width,
      snapshot.height,
      menuContentY(snapshot),
      levels,
      (index) => this.startClassic(index),
      {
        color: theme.menu.color,
        highlightColor: theme.menu.highlightColor,
        mutedColor: theme.menu.mutedColor,
        panel: theme.overlay.panel,
        panelStroke: theme.overlay.panelStroke,
        accent: Number.parseInt(theme.overlay.accent.replace('#', ''), 16) || 0xff2a6d,
      },
    );

    this.unsubscribeViewport = viewport.onChange((next) => this.handleViewportChange(next));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubscribeViewport?.();
      this.browser?.destroy();
      this.browser = undefined;
      this.backButton?.destroy();
      this.backButton = undefined;
    });

    this.input.keyboard?.on('keydown-M', () => {
      try {
        AudioManager.get().toggle();
      } catch {
        // AudioManager missing/unavailable — ignore the toggle.
      }
    });
    this.input.keyboard?.on('keydown-ESC', () => this.goBack());
    bindOptionalMenuShortcuts(this, SceneKeys.ModeSelect);
  }

  private startClassic(index: number): void {
    this.scene.start(SceneKeys.Main, { mode: 'classic', startLevelIndex: index });
  }

  private goBack(): void {
    this.scene.start(SceneKeys.ModeSelect);
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
    layoutMenuHint(this.hintText, snapshot);
    this.backButton?.setPosition(menuBackX(snapshot), menuHintY(snapshot));
    this.backButton?.setFontSize(
      menuFontSize(snapshot.height, MENU_LAYOUT.backFontRatio, MENU_LAYOUT.backMinPx),
    );
    this.browser?.resize(snapshot.width, snapshot.height, menuContentY(snapshot));
  }
}
