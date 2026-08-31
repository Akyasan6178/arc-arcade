import Phaser from 'phaser';
import { SceneKeys, type SceneKey } from '@systems/SceneKeys';
import { GameViewport, type ViewportSnapshot } from '@systems/GameViewport';
import { AudioManager } from '@systems/AudioManager';
import {
  getBallSkinLabel,
  getBallUnlockRows,
  getCollectionCompletion,
  getCollectionCompletionRows,
  getPaddleSkinLabel,
  getPaddleUnlockRows,
  getThemeLabel,
  getThemeUnlockRows,
  isBallSkinId,
  isBallSkinUnlocked,
  isPaddleSkinId,
  isPaddleSkinUnlocked,
  isThemeUnlocked,
  loadBallSkinId,
  loadFavoriteBallSkinId,
  loadFavoritePaddleSkinId,
  loadFavoriteThemeId,
  loadPaddleSkinId,
  loadPlayableThemeId,
  saveBallSkinId,
  savePaddleSkinId,
  toggleFavoriteBallSkinId,
  toggleFavoritePaddleSkinId,
  toggleFavoriteThemeId,
  type BallSkinId,
  type PaddleSkinId,
  type ProgressRow,
  type StatDisplayRow,
} from '@entities/dx-ball/Progress';
import { getTheme, isThemeId, saveThemeId, type ThemeId } from '@entities/dx-ball/Theme';
import { getBallSkinVisual, getPaddleSkinVisual } from '@entities/dx-ball/Skins';
import { ArcadeBackground } from '@ui/ArcadeBackground';
import { SelectMenu } from '@ui/SelectMenu';
import { ProgressList } from '@ui/ProgressList';
import { StatsList } from '@ui/StatsList';
import { CollectionPreview } from '@ui/CollectionPreview';

/**
 * scenes/GarageScene.ts
 *
 * DXB-18: Dedicated collection / customization hub. Owns no gameplay —
 * it paints the saved theme, a live preview of the highlighted theme /
 * paddle / ball, catalogs with locked / unlocked / equip / favorite
 * state, and collection completion percents. Esc from a catalog returns
 * to the hub; Esc from the hub returns to ThemeSelect or ModeSelect.
 */

type CatalogId = 'themes' | 'paddles' | 'balls' | 'collection';

export interface GarageSceneData {
  from?: SceneKey;
}

export class GarageScene extends Phaser.Scene {
  private background!: ArcadeBackground;
  private titleText!: Phaser.GameObjects.Text;
  private subtitleText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private hubMenu?: SelectMenu<CatalogId>;
  private catalogList?: ProgressList;
  private statsList?: StatsList;
  private preview?: CollectionPreview;
  private view: 'hub' | CatalogId = 'hub';
  private returnTo: SceneKey = SceneKeys.ThemeSelect;
  private previewThemeId: ThemeId = 'neon-arcade';
  private previewPaddleId: PaddleSkinId = 'classic';
  private previewBallId: BallSkinId = 'classic';
  private unsubscribeViewport?: () => void;

  constructor() {
    super({ key: SceneKeys.Garage });
  }

  init(data: GarageSceneData = {}): void {
    this.returnTo =
      data.from === SceneKeys.ModeSelect || data.from === SceneKeys.ThemeSelect
        ? data.from
        : SceneKeys.ThemeSelect;
  }

  create(): void {
    const viewport = GameViewport.get();
    const snapshot = viewport.getSnapshot();
    this.resetPreviewToEquipped();
    const theme = getTheme(this.previewThemeId);

    this.view = 'hub';
    this.cameras.main.setViewport(0, 0, snapshot.width, snapshot.height);
    this.cameras.main.setBackgroundColor(theme.backdrop.canvasBackground);
    this.background = new ArcadeBackground(this, snapshot.width, snapshot.height, theme.backdrop);
    this.titleText = this.createTitle(snapshot.width, snapshot.height, theme.hud.title);
    this.subtitleText = this.createSubtitle(snapshot.width, snapshot.height, theme.hud.subtitle);
    this.hintText = this.createHint(snapshot.width, snapshot.height, theme.hud.hint);
    this.preview = new CollectionPreview(
      this,
      snapshot.width,
      snapshot.height,
      GarageScene.previewOriginY(snapshot.height),
    );

    this.showHub();

    this.unsubscribeViewport = viewport.onChange((next) => this.handleViewportChange(next));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubscribeViewport?.();
      this.clearMenus();
      this.preview?.destroy();
      this.preview = undefined;
    });

    this.input.keyboard?.on('keydown-M', () => {
      try {
        AudioManager.get().toggle();
      } catch {
        // AudioManager missing/unavailable — ignore the toggle.
      }
    });

    this.input.keyboard?.on('keydown-ESC', () => this.handleEscape());
    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      if (event.key === 'f' || event.key === 'F') {
        this.handleFavorite();
      }
    });
  }

  private handleEscape(): void {
    if (this.view !== 'hub') {
      this.showHub();
      return;
    }

    this.scene.start(this.returnTo);
  }

  private handleFavorite(): void {
    if (this.view === 'hub' || this.view === 'collection') {
      return;
    }

    const rowId = this.catalogList?.getSelectedId();
    if (!rowId) {
      return;
    }

    if (this.view === 'themes' && isThemeId(rowId)) {
      toggleFavoriteThemeId(rowId);
      this.catalogList?.setItems(this.catalogRows(this.view));
      return;
    }

    if (this.view === 'paddles' && isPaddleSkinId(rowId)) {
      toggleFavoritePaddleSkinId(rowId);
      this.catalogList?.setItems(this.catalogRows(this.view));
      return;
    }

    if (this.view === 'balls' && isBallSkinId(rowId)) {
      toggleFavoriteBallSkinId(rowId);
      this.catalogList?.setItems(this.catalogRows(this.view));
    }
  }

  private showHub(): void {
    this.clearMenus();
    this.view = 'hub';
    this.resetPreviewToEquipped();
    this.applyThemePreview(this.previewThemeId);
    this.refreshPreview(false);
    this.subtitleText.setText('GARAGE');
    this.hintText.setText('Arrows to move  ·  Space / Enter / click to open  ·  Esc to return');

    const { width, height } = GameViewport.get().getSnapshot();
    const theme = getTheme(this.previewThemeId);
    const collection = getCollectionCompletion();
    const favoriteTheme = loadFavoriteThemeId();
    const favoritePaddle = loadFavoritePaddleSkinId();
    const favoriteBall = loadFavoriteBallSkinId();

    this.hubMenu = new SelectMenu(
      this,
      width,
      height,
      GarageScene.menuOriginY(height),
      [
        {
          id: 'themes',
          title: 'Theme Collection',
          description: GarageScene.hubDescription(
            collection.themesUnlocked,
            collection.themesTotal,
            collection.themesPercent,
            favoriteTheme ? getThemeLabel(favoriteTheme) : null,
          ),
        },
        {
          id: 'paddles',
          title: 'Paddle Collection',
          description: GarageScene.hubDescription(
            collection.paddlesUnlocked,
            collection.paddlesTotal,
            collection.paddlesPercent,
            favoritePaddle ? getPaddleSkinLabel(favoritePaddle) : null,
          ),
        },
        {
          id: 'balls',
          title: 'Ball Collection',
          description: GarageScene.hubDescription(
            collection.ballsUnlocked,
            collection.ballsTotal,
            collection.ballsPercent,
            favoriteBall ? getBallSkinLabel(favoriteBall) : null,
          ),
        },
        {
          id: 'collection',
          title: 'Collection Completion',
          description: `${collection.totalPercent}% total  ·  ${collection.unlockedCount} / ${collection.totalCount} cosmetics`,
        },
      ],
      (id) => this.openHub(id),
      {
        color: theme.menu.color,
        highlightColor: theme.menu.highlightColor,
        descriptionColor: theme.menu.descriptionColor,
        mutedColor: theme.menu.mutedColor,
        rowHeightRatio: 0.082,
        titleFontSizeRatio: 0.032,
        descriptionFontSizeRatio: 0.016,
      },
    );
  }

  private openHub(id: CatalogId): void {
    if (id === 'collection') {
      this.showCollection();
      return;
    }

    this.showCatalog(id);
  }

  private showCatalog(id: Exclude<CatalogId, 'collection'>): void {
    this.clearMenus();
    this.view = id;

    const { width, height } = GameViewport.get().getSnapshot();
    const theme = getTheme(this.previewThemeId);
    const rows = this.catalogRows(id);
    const equippedIndex = Math.max(
      0,
      rows.findIndex((row) => row.equipped),
    );

    this.subtitleText.setText(GarageScene.catalogTitle(id));
    this.hintText.setText('Arrows to preview  ·  Space to equip unlocked  ·  F to favorite  ·  Esc back');

    this.catalogList = new ProgressList(
      this,
      width,
      height,
      GarageScene.catalogOriginY(height),
      rows,
      (rowId) => this.equipFromCatalog(id, rowId),
      {
        selectable: true,
        initialIndex: equippedIndex,
        onHighlight: (rowId) => this.previewCatalogItem(id, rowId),
        color: theme.menu.color,
        highlightColor: theme.menu.highlightColor,
        descriptionColor: theme.menu.descriptionColor,
        mutedColor: theme.menu.mutedColor,
        completeColor: theme.hud.lives,
        completeLabel: 'UNLOCKED',
        rowHeightRatio: 0.078,
        titleFontSizeRatio: 0.026,
        descriptionFontSizeRatio: 0.015,
      },
    );

    const selected = this.catalogList.getSelectedId();
    if (selected) {
      this.previewCatalogItem(id, selected);
    }
  }

  private showCollection(): void {
    this.clearMenus();
    this.view = 'collection';
    this.resetPreviewToEquipped();
    this.applyThemePreview(this.previewThemeId);
    this.refreshPreview(false);
    this.subtitleText.setText('COLLECTION');
    this.hintText.setText('Arrows to move  ·  Esc back');
    this.createStatsList(getCollectionCompletionRows(), 0.07);
  }

  private createStatsList(items: readonly StatDisplayRow[], rowHeightRatio: number): void {
    const { width, height } = GameViewport.get().getSnapshot();
    const theme = getTheme(this.previewThemeId);
    this.statsList = new StatsList(
      this,
      width,
      height,
      GarageScene.catalogOriginY(height),
      items,
      {
        color: theme.menu.color,
        highlightColor: theme.menu.highlightColor,
        valueColor: theme.menu.descriptionColor,
        mutedColor: theme.menu.mutedColor,
        rowHeightRatio,
        titleFontSizeRatio: 0.026,
        valueFontSizeRatio: 0.02,
      },
    );
  }

  private equipFromCatalog(catalog: Exclude<CatalogId, 'collection'>, rowId: string): void {
    if (catalog === 'themes' && isThemeId(rowId)) {
      saveThemeId(rowId);
      this.previewThemeId = rowId;
      this.applyThemePreview(rowId);
      this.catalogList?.setItems(this.catalogRows(catalog));
      this.refreshPreview(false);
      return;
    }

    if (catalog === 'paddles' && isPaddleSkinId(rowId)) {
      savePaddleSkinId(rowId);
      this.previewPaddleId = rowId;
      this.catalogList?.setItems(this.catalogRows(catalog));
      this.refreshPreview(false);
      return;
    }

    if (catalog === 'balls' && isBallSkinId(rowId)) {
      saveBallSkinId(rowId);
      this.previewBallId = rowId;
      this.catalogList?.setItems(this.catalogRows(catalog));
      this.refreshPreview(false);
    }
  }

  private previewCatalogItem(catalog: Exclude<CatalogId, 'collection'>, rowId: string): void {
    if (catalog === 'themes' && isThemeId(rowId)) {
      this.previewThemeId = rowId;
      this.applyThemePreview(rowId);
      this.refreshPreview(!isThemeUnlocked(rowId));
      return;
    }

    if (catalog === 'paddles' && isPaddleSkinId(rowId)) {
      this.previewPaddleId = rowId;
      this.refreshPreview(!isPaddleSkinUnlocked(rowId));
      return;
    }

    if (catalog === 'balls' && isBallSkinId(rowId)) {
      this.previewBallId = rowId;
      this.refreshPreview(!isBallSkinUnlocked(rowId));
    }
  }

  private catalogRows(id: Exclude<CatalogId, 'collection'>): ProgressRow[] {
    switch (id) {
      case 'themes':
        return getThemeUnlockRows(loadPlayableThemeId());
      case 'paddles':
        return getPaddleUnlockRows(loadPaddleSkinId());
      case 'balls':
        return getBallUnlockRows(loadBallSkinId());
    }
  }

  private resetPreviewToEquipped(): void {
    this.previewThemeId = loadPlayableThemeId();
    this.previewPaddleId = loadPaddleSkinId();
    this.previewBallId = loadBallSkinId();
  }

  private applyThemePreview(id: ThemeId): void {
    const theme = getTheme(id);
    this.cameras.main.setBackgroundColor(theme.backdrop.canvasBackground);
    this.background.applyTheme(theme.backdrop);
    this.titleText.setColor(theme.hud.title);
    this.subtitleText.setColor(theme.hud.subtitle);
    this.hintText.setColor(theme.hud.hint);
    this.preview?.applyTheme({
      panel: theme.overlay.panel,
      panelStroke: theme.overlay.panelStroke,
      accent: Number.parseInt(theme.overlay.accent.replace('#', ''), 16) || theme.overlay.panelStroke,
      body: theme.overlay.body,
      muted: theme.menu.mutedColor,
    });
  }

  private refreshPreview(locked: boolean): void {
    const theme = getTheme(this.previewThemeId);
    this.preview?.setContent({
      themeLabel: getThemeLabel(this.previewThemeId),
      paddleLabel: getPaddleSkinLabel(this.previewPaddleId),
      ballLabel: getBallSkinLabel(this.previewBallId),
      locked,
      paddle: getPaddleSkinVisual(this.previewPaddleId),
      ball: getBallSkinVisual(this.previewBallId),
      backdrop: {
        topColor: theme.backdrop.topColor,
        bottomColor: theme.backdrop.bottomColor,
      },
    });
  }

  private clearMenus(): void {
    this.hubMenu?.destroy();
    this.hubMenu = undefined;
    this.catalogList?.destroy();
    this.catalogList = undefined;
    this.statsList?.destroy();
    this.statsList = undefined;
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
  ): Phaser.GameObjects.Text {
    const fontSize = Math.round(viewportHeight * 0.028);
    return this.add
      .text(viewportWidth / 2, viewportHeight * 0.135, 'GARAGE', {
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
      .text(viewportWidth / 2, viewportHeight * 0.955, '', {
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

    this.titleText.setPosition(snapshot.width / 2, snapshot.height * 0.05);
    this.titleText.setFontSize(Math.round(snapshot.height * 0.07));

    this.subtitleText.setPosition(snapshot.width / 2, snapshot.height * 0.135);
    this.subtitleText.setFontSize(Math.round(snapshot.height * 0.028));

    this.hintText.setPosition(snapshot.width / 2, snapshot.height * 0.955);
    this.hintText.setFontSize(Math.round(snapshot.height * 0.018));

    this.preview?.resize(snapshot.width, snapshot.height, GarageScene.previewOriginY(snapshot.height));

    if (this.view === 'hub') {
      this.hubMenu?.resize(snapshot.width, snapshot.height, GarageScene.menuOriginY(snapshot.height));
      return;
    }

    if (this.view === 'collection') {
      this.statsList?.resize(
        snapshot.width,
        snapshot.height,
        GarageScene.catalogOriginY(snapshot.height),
      );
      return;
    }

    this.catalogList?.resize(
      snapshot.width,
      snapshot.height,
      GarageScene.catalogOriginY(snapshot.height),
    );
  }

  private static catalogTitle(id: Exclude<CatalogId, 'collection'>): string {
    switch (id) {
      case 'themes':
        return 'THEMES';
      case 'paddles':
        return 'PADDLE SKINS';
      case 'balls':
        return 'BALL SKINS';
    }
  }

  private static hubDescription(
    unlocked: number,
    total: number,
    pct: number,
    favoriteLabel: string | null,
  ): string {
    const base = `${unlocked} / ${total} unlocked  ·  ${pct}%`;
    return favoriteLabel ? `${base}  ·  Favorite: ${favoriteLabel}` : base;
  }

  private static menuOriginY(viewportHeight: number): number {
    return viewportHeight * 0.2;
  }

  private static catalogOriginY(viewportHeight: number): number {
    return viewportHeight * 0.185;
  }

  private static previewOriginY(viewportHeight: number): number {
    return viewportHeight * 0.655;
  }
}
