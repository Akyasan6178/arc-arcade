import Phaser from 'phaser';
import { SceneKeys, type SceneKey } from '@systems/SceneKeys';
import { GameViewport, type ViewportSnapshot } from '@systems/GameViewport';
import { AudioManager } from '@systems/AudioManager';
import { getAchievementRows, loadPlayableThemeId } from '@entities/dx-ball/Progress';
import { getTheme } from '@entities/dx-ball/Theme';
import { ArcadeBackground } from '@ui/ArcadeBackground';
import { ProgressList } from '@ui/ProgressList';
import { TextButton } from '@ui/TextButton';
import { resolveMenuReturn } from '@scenes/menuNavigation';

/**
 * scenes/AchievementsScene.ts
 *
 * DXB-18A: Dedicated achievements screen (the catalog that lived inside
 * Unlockables in DXB-16). Owns no gameplay — it paints the saved theme
 * and the locked / unlocked achievement list. The Back button and Esc
 * return to the Hub (or ThemeSelect / ModeSelect if opened from there).
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
    this.titleText = this.createTitle(snapshot.width, snapshot.height, theme.hud.title);
    this.subtitleText = this.createSubtitle(
      snapshot.width,
      snapshot.height,
      theme.hud.subtitle,
      complete,
      rows.length,
    );
    this.hintText = this.createHint(snapshot.width, snapshot.height, theme.hud.hint);
    this.backButton = this.createBackButton(snapshot.width, snapshot.height, theme.menu.color);
    this.catalogList = new ProgressList(
      this,
      snapshot.width,
      snapshot.height,
      AchievementsScene.catalogOriginY(snapshot.height),
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

  private createBackButton(viewportWidth: number, viewportHeight: number, color: string): TextButton {
    return new TextButton(
      this,
      viewportWidth * 0.08,
      viewportHeight * 0.955,
      '← Back',
      () => this.goBack(),
      {
        color,
        originX: 0,
        originY: 1,
        fontSize: Math.round(viewportHeight * 0.022),
        align: 'left',
      },
    );
  }

  private createTitle(
    viewportWidth: number,
    viewportHeight: number,
    color: string,
  ): Phaser.GameObjects.Text {
    const fontSize = Math.round(viewportHeight * 0.07);
    return this.add
      .text(viewportWidth / 2, viewportHeight * 0.05, 'DX-BALL', {
        fontFamily: 'Trebuchet MS, Segoe UI, sans-serif',
        fontSize: `${fontSize}px`,
        color,
        fontStyle: 'bold',
        align: 'center',
        stroke: '#0b1320',
        strokeThickness: 8,
      })
      .setOrigin(0.5, 0)
      .setShadow(1, 3, '#000000', 4, true, true)
      .setDepth(20);
  }

  private createSubtitle(
    viewportWidth: number,
    viewportHeight: number,
    color: string,
    complete: number,
    total: number,
  ): Phaser.GameObjects.Text {
    const fontSize = Math.round(viewportHeight * 0.026);
    return this.add
      .text(viewportWidth / 2, viewportHeight * 0.13, `ACHIEVEMENTS  ·  ${complete} / ${total}`, {
        fontFamily: 'Trebuchet MS, Segoe UI, sans-serif',
        fontSize: `${fontSize}px`,
        color,
        fontStyle: 'bold',
        align: 'center',
        stroke: '#0b1320',
        strokeThickness: 4,
      })
      .setOrigin(0.5, 0)
      .setShadow(1, 2, '#000000', 3, true, true)
      .setDepth(20);
  }

  private createHint(
    viewportWidth: number,
    viewportHeight: number,
    color: string,
  ): Phaser.GameObjects.Text {
    const fontSize = Math.round(viewportHeight * 0.018);
    return this.add
      .text(viewportWidth * 0.92, viewportHeight * 0.955, 'Arrows to move', {
        fontFamily: 'Trebuchet MS, Segoe UI, sans-serif',
        fontSize: `${fontSize}px`,
        color,
        align: 'right',
        stroke: '#0b1320',
        strokeThickness: 3,
      })
      .setOrigin(1, 1)
      .setShadow(1, 2, '#000000', 3, true, true)
      .setDepth(20);
  }

  private handleViewportChange(snapshot: ViewportSnapshot): void {
    this.cameras.main.setViewport(0, 0, snapshot.width, snapshot.height);
    this.background.resize(snapshot.width, snapshot.height);

    this.titleText.setPosition(snapshot.width / 2, snapshot.height * 0.05);
    this.titleText.setFontSize(Math.round(snapshot.height * 0.07));

    this.subtitleText.setPosition(snapshot.width / 2, snapshot.height * 0.13);
    this.subtitleText.setFontSize(Math.round(snapshot.height * 0.026));

    this.hintText.setPosition(snapshot.width * 0.92, snapshot.height * 0.955);
    this.hintText.setFontSize(Math.round(snapshot.height * 0.018));

    this.backButton?.setPosition(snapshot.width * 0.08, snapshot.height * 0.955);
    this.backButton?.setFontSize(Math.round(snapshot.height * 0.022));

    this.catalogList?.resize(
      snapshot.width,
      snapshot.height,
      AchievementsScene.catalogOriginY(snapshot.height),
    );
  }

  private static catalogOriginY(viewportHeight: number): number {
    return viewportHeight * 0.2;
  }
}
