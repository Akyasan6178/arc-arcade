import Phaser from 'phaser';
import { SceneKeys, type SceneKey } from '@systems/SceneKeys';
import { GameViewport, type ViewportSnapshot } from '@systems/GameViewport';
import { AudioManager } from '@systems/AudioManager';
import {
  countUnlocked,
  getAchievementRows,
  getBallUnlockRows,
  getPaddleUnlockRows,
  getThemeUnlockRows,
  isBallSkinId,
  isPaddleSkinId,
  loadBallSkinId,
  loadPaddleSkinId,
  loadPlayableThemeId,
  saveBallSkinId,
  savePaddleSkinId,
  type ProgressRow,
} from '@entities/dx-ball/Progress';
import { getTheme, isThemeId, saveThemeId, type ThemeId } from '@entities/dx-ball/Theme';
import { ArcadeBackground } from '@ui/ArcadeBackground';
import { SelectMenu } from '@ui/SelectMenu';
import { ProgressList } from '@ui/ProgressList';

/**
 * scenes/UnlockablesScene.ts
 *
 * DXB-16: Dedicated unlockables / achievements catalog. Owns no
 * gameplay — it paints the saved theme, a hub of four catalogs
 * (themes, paddle skins, ball skins, achievements), and a detail
 * list with locked / unlocked / percent / equipped state. Esc from
 * a catalog returns to the hub; Esc from the hub returns to the
 * scene that opened this one (`ThemeSelect` or `ModeSelect`).
 */

type CatalogId = 'themes' | 'paddles' | 'balls' | 'achievements';

export interface UnlockablesSceneData {
  from?: SceneKey;
}

export class UnlockablesScene extends Phaser.Scene {
  private background!: ArcadeBackground;
  private titleText!: Phaser.GameObjects.Text;
  private subtitleText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private hubMenu?: SelectMenu<CatalogId>;
  private catalogList?: ProgressList;
  private view: 'hub' | CatalogId = 'hub';
  private returnTo: SceneKey = SceneKeys.ThemeSelect;
  private unsubscribeViewport?: () => void;

  constructor() {
    super({ key: SceneKeys.Unlockables });
  }

  init(data: UnlockablesSceneData = {}): void {
    this.returnTo =
      data.from === SceneKeys.ModeSelect || data.from === SceneKeys.ThemeSelect
        ? data.from
        : SceneKeys.ThemeSelect;
  }

  create(): void {
    const viewport = GameViewport.get();
    const snapshot = viewport.getSnapshot();
    const theme = getTheme(loadPlayableThemeId());

    this.view = 'hub';
    this.cameras.main.setViewport(0, 0, snapshot.width, snapshot.height);
    this.cameras.main.setBackgroundColor(theme.backdrop.canvasBackground);
    this.background = new ArcadeBackground(this, snapshot.width, snapshot.height, theme.backdrop);
    this.titleText = this.createTitle(snapshot.width, snapshot.height, theme.hud.title);
    this.subtitleText = this.createSubtitle(snapshot.width, snapshot.height, theme.hud.subtitle);
    this.hintText = this.createHint(snapshot.width, snapshot.height, theme.hud.hint);

    this.showHub();

    this.unsubscribeViewport = viewport.onChange((next) => this.handleViewportChange(next));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubscribeViewport?.();
      this.clearMenus();
    });

    this.input.keyboard?.on('keydown-M', () => {
      try {
        AudioManager.get().toggle();
      } catch {
        // AudioManager missing/unavailable — ignore the toggle.
      }
    });

    this.input.keyboard?.on('keydown-ESC', () => this.handleEscape());
  }

  private handleEscape(): void {
    if (this.view !== 'hub') {
      this.showHub();
      return;
    }

    this.scene.start(this.returnTo);
  }

  private showHub(): void {
    this.clearMenus();
    this.view = 'hub';
    this.subtitleText.setText('UNLOCKABLES');
    this.hintText.setText('Arrows to move  ·  Space / Enter / click to open  ·  Esc to return');

    const { width, height } = GameViewport.get().getSnapshot();
    const theme = getTheme(loadPlayableThemeId());
    const themeRows = getThemeUnlockRows(loadPlayableThemeId());
    const paddleRows = getPaddleUnlockRows(loadPaddleSkinId());
    const ballRows = getBallUnlockRows(loadBallSkinId());
    const achievementRows = getAchievementRows();

    this.hubMenu = new SelectMenu(
      this,
      width,
      height,
      UnlockablesScene.menuOriginY(height),
      [
        {
          id: 'themes',
          title: 'Themes',
          description: `${countUnlocked(themeRows)} / ${themeRows.length} unlocked`,
        },
        {
          id: 'paddles',
          title: 'Paddle Skins',
          description: `${countUnlocked(paddleRows)} / ${paddleRows.length} unlocked`,
        },
        {
          id: 'balls',
          title: 'Ball Skins',
          description: `${countUnlocked(ballRows)} / ${ballRows.length} unlocked`,
        },
        {
          id: 'achievements',
          title: 'Achievements',
          description: `${countUnlocked(achievementRows)} / ${achievementRows.length} complete`,
        },
      ],
      (id) => this.showCatalog(id),
      {
        color: theme.menu.color,
        highlightColor: theme.menu.highlightColor,
        descriptionColor: theme.menu.descriptionColor,
        mutedColor: theme.menu.mutedColor,
        rowHeightRatio: 0.1,
      },
    );
  }

  private showCatalog(id: CatalogId): void {
    this.clearMenus();
    this.view = id;

    const { width, height } = GameViewport.get().getSnapshot();
    const theme = getTheme(loadPlayableThemeId());
    const selectable = id !== 'achievements';
    this.subtitleText.setText(UnlockablesScene.catalogTitle(id));
    this.hintText.setText(
      selectable
        ? 'Arrows to move  ·  Space to equip unlocked  ·  Esc back'
        : 'Arrows to move  ·  Esc back',
    );

    this.catalogList = new ProgressList(
      this,
      width,
      height,
      UnlockablesScene.catalogOriginY(height),
      this.catalogRows(id),
      (rowId) => this.equipFromCatalog(id, rowId),
      {
        selectable,
        color: theme.menu.color,
        highlightColor: theme.menu.highlightColor,
        descriptionColor: theme.menu.descriptionColor,
        mutedColor: theme.menu.mutedColor,
        completeColor: theme.hud.lives,
        completeLabel: id === 'achievements' ? 'COMPLETE' : 'UNLOCKED',
        rowHeightRatio: id === 'achievements' ? 0.078 : 0.1,
        titleFontSizeRatio: 0.03,
        descriptionFontSizeRatio: 0.017,
      },
    );
  }

  private equipFromCatalog(catalog: CatalogId, rowId: string): void {
    if (catalog === 'themes' && isThemeId(rowId)) {
      saveThemeId(rowId);
      this.applyThemePreview(rowId);
      this.catalogList?.setItems(this.catalogRows(catalog));
      return;
    }

    if (catalog === 'paddles' && isPaddleSkinId(rowId)) {
      savePaddleSkinId(rowId);
      this.catalogList?.setItems(this.catalogRows(catalog));
      return;
    }

    if (catalog === 'balls' && isBallSkinId(rowId)) {
      saveBallSkinId(rowId);
      this.catalogList?.setItems(this.catalogRows(catalog));
    }
  }

  private catalogRows(id: CatalogId): ProgressRow[] {
    switch (id) {
      case 'themes':
        return getThemeUnlockRows(loadPlayableThemeId());
      case 'paddles':
        return getPaddleUnlockRows(loadPaddleSkinId());
      case 'balls':
        return getBallUnlockRows(loadBallSkinId());
      case 'achievements':
        return getAchievementRows();
    }
  }

  private applyThemePreview(id: ThemeId): void {
    const theme = getTheme(id);
    this.cameras.main.setBackgroundColor(theme.backdrop.canvasBackground);
    this.background.applyTheme(theme.backdrop);
    this.titleText.setColor(theme.hud.title);
    this.subtitleText.setColor(theme.hud.subtitle);
    this.hintText.setColor(theme.hud.hint);
  }

  private clearMenus(): void {
    this.hubMenu?.destroy();
    this.hubMenu = undefined;
    this.catalogList?.destroy();
    this.catalogList = undefined;
  }

  private createTitle(
    viewportWidth: number,
    viewportHeight: number,
    color: string,
  ): Phaser.GameObjects.Text {
    const fontSize = Math.round(viewportHeight * 0.07);
    return this.add
      .text(viewportWidth / 2, viewportHeight * 0.06, 'DX-BALL', {
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
  ): Phaser.GameObjects.Text {
    const fontSize = Math.round(viewportHeight * 0.03);
    return this.add
      .text(viewportWidth / 2, viewportHeight * 0.15, 'UNLOCKABLES', {
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
    const fontSize = Math.round(viewportHeight * 0.02);
    return this.add
      .text(viewportWidth / 2, viewportHeight * 0.94, '', {
        fontFamily: 'Trebuchet MS, Segoe UI, sans-serif',
        fontSize: `${fontSize}px`,
        color,
        align: 'center',
        stroke: '#0b1320',
        strokeThickness: 3,
      })
      .setOrigin(0.5, 1)
      .setShadow(1, 2, '#000000', 3, true, true)
      .setDepth(20);
  }

  private handleViewportChange(snapshot: ViewportSnapshot): void {
    this.cameras.main.setViewport(0, 0, snapshot.width, snapshot.height);
    this.background.resize(snapshot.width, snapshot.height);

    this.titleText.setPosition(snapshot.width / 2, snapshot.height * 0.06);
    this.titleText.setFontSize(Math.round(snapshot.height * 0.07));

    this.subtitleText.setPosition(snapshot.width / 2, snapshot.height * 0.15);
    this.subtitleText.setFontSize(Math.round(snapshot.height * 0.03));

    this.hintText.setPosition(snapshot.width / 2, snapshot.height * 0.94);
    this.hintText.setFontSize(Math.round(snapshot.height * 0.02));

    if (this.view === 'hub') {
      this.hubMenu?.resize(snapshot.width, snapshot.height, UnlockablesScene.menuOriginY(snapshot.height));
    } else {
      this.catalogList?.resize(
        snapshot.width,
        snapshot.height,
        UnlockablesScene.catalogOriginY(snapshot.height),
      );
    }
  }

  private static catalogTitle(id: CatalogId): string {
    switch (id) {
      case 'themes':
        return 'THEMES';
      case 'paddles':
        return 'PADDLE SKINS';
      case 'balls':
        return 'BALL SKINS';
      case 'achievements':
        return 'ACHIEVEMENTS';
    }
  }

  private static menuOriginY(viewportHeight: number): number {
    return viewportHeight * 0.28;
  }

  private static catalogOriginY(viewportHeight: number): number {
    return viewportHeight * 0.24;
  }
}
