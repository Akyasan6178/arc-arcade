import Phaser from 'phaser';
import { SceneKeys, type SceneKey } from '@systems/SceneKeys';
import { GameViewport, type ViewportSnapshot } from '@systems/GameViewport';
import { AudioManager } from '@systems/AudioManager';
import { playDxBallThemeMusic } from '@entities/dx-ball/audioCues';
import { getAchievementRows, loadPlayableThemeId } from '@entities/dx-ball/Progress';
import { getTheme } from '@entities/dx-ball/Theme';
import { ArcadeBackground } from '@ui/ArcadeBackground';
import { ProgressList } from '@ui/ProgressList';
import { TextButton } from '@ui/TextButton';
import { resolveMenuReturn } from '@scenes/menuNavigation';
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
 * scenes/AchievementsScene.ts
 *
 * DXB-18A: Dedicated achievements screen (the catalog that lived inside
 * Unlockables in DXB-16). Owns no gameplay — it paints the saved theme
 * and the locked / unlocked achievement list. The Back button and Esc
 * return to the Hub (or ThemeSelect / ModeSelect if opened from there).
 *
 * DXB-20: shared menu chrome.
 */

export interface AchievementsSceneData {
  from?: SceneKey;
}

export class AchievementsScene extends Phaser.Scene {
  private background!: ArcadeBackground;
  private titleText!: Phaser.GameObjects.Text;
  private subtitleText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private catalogList?: ProgressList;
  private backButton?: TextButton;
  private returnTo: SceneKey = SceneKeys.Hub;
  private unsubscribeViewport?: () => void;

  constructor() {
    super({ key: SceneKeys.Achievements });
  }

  init(data: AchievementsSceneData = {}): void {
    this.returnTo = resolveMenuReturn(data.from);
  }

  create(): void {
    const viewport = GameViewport.get();
    const snapshot = viewport.getSnapshot();
    const theme = getTheme(loadPlayableThemeId());
    const rows = getAchievementRows();
    const complete = rows.filter((row) => row.complete).length;

    this.cameras.main.setViewport(0, 0, snapshot.width, snapshot.height);
    this.cameras.main.setBackgroundColor(theme.backdrop.canvasBackground);
    this.background = new ArcadeBackground(this, snapshot.width, snapshot.height, theme.backdrop);
    playDxBallThemeMusic(theme.id);
    this.titleText = createMenuTitle(this, snapshot, theme.hud.title);
    this.subtitleText = createMenuSubtitle(
      this,
      snapshot,
      theme.hud.subtitle,
      `ACHIEVEMENTS  ·  ${complete} / ${rows.length}`,
    );
    this.hintText = createMenuHint(this, snapshot, theme.hud.hint, 'Tap a row to read it');
    this.backButton = this.createBackButton(snapshot, theme.menu.color);
    this.catalogList = new ProgressList(
      this,
      snapshot.width,
      snapshot.height,
      menuContentY(snapshot),
      rows,
      () => undefined,
      {
        selectable: false,
        color: theme.menu.color,
        highlightColor: theme.menu.highlightColor,
        descriptionColor: theme.menu.descriptionColor,
        mutedColor: theme.menu.mutedColor,
        completeColor: theme.hud.lives,
        completeLabel: 'COMPLETE',
        rowHeightRatio: 0.078,
        titleFontSizeRatio: 0.026,
        descriptionFontSizeRatio: 0.015,
      },
    );

    this.unsubscribeViewport = viewport.onChange((next) => this.handleViewportChange(next));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubscribeViewport?.();
      this.catalogList?.destroy();
      this.catalogList = undefined;
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
  }

  private goBack(): void {
    this.scene.start(this.returnTo);
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

    this.catalogList?.resize(snapshot.width, snapshot.height, menuContentY(snapshot));
  }
}
