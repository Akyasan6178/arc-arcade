import Phaser from 'phaser';
import { SceneKeys, type SceneKey } from '@systems/SceneKeys';
import { GameViewport, type ViewportSnapshot } from '@systems/GameViewport';
import { AudioManager } from '@systems/AudioManager';
import { playDxBallThemeMusic } from '@entities/dx-ball/audioCues';
import {
  getBallSkinLabel,
  getBallUnlockRows,
  getCollectionCompletion,
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
} from '@entities/dx-ball/Progress';
import { getTheme, isThemeId, saveThemeId, type ThemeId } from '@entities/dx-ball/Theme';
import { getBallSkinVisual, getPaddleMotionHint, getPaddleSkinVisual } from '@entities/dx-ball/Skins';
import { ArcadeBackground } from '@ui/ArcadeBackground';
import { ProgressList } from '@ui/ProgressList';
import { CollectionPreview } from '@ui/CollectionPreview';
import { TabBar } from '@ui/TabBar';
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
  menuHintX,
  menuHintY,
  menuTabY,
} from '@ui/menuLayout';

/**
 * scenes/GarageScene.ts
 *
 * DXB-18: Dedicated collection / customization hub. DXB-18A: visible
 * Themes / Paddles / Balls tabs plus a Back button so the catalogs are
 * reachable without a nested hub or keyboard. Owns no gameplay — it
 * paints a live preview, locked / unlocked / equip / favorite state, and
 * collection percents. Esc and Back return to the Hub (or ThemeSelect /
 * ModeSelect if opened from there).
 */

type CatalogId = 'themes' | 'paddles' | 'balls';

export interface GarageSceneData {
  from?: SceneKey;
}

export class GarageScene extends Phaser.Scene {
  private background!: ArcadeBackground;
  private titleText!: Phaser.GameObjects.Text;
  private subtitleText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private tabBar?: TabBar<CatalogId>;
  private catalogList?: ProgressList;
  private preview?: CollectionPreview;
  private backButton?: TextButton;
  private favoriteButton?: TextButton;
  private view: CatalogId = 'themes';
  private returnTo: SceneKey = SceneKeys.Hub;
  private previewThemeId: ThemeId = 'neon-arcade';
  private previewPaddleId: PaddleSkinId = 'classic';
  private previewBallId: BallSkinId = 'classic';
  private unsubscribeViewport?: () => void;

  constructor() {
    super({ key: SceneKeys.Garage });
  }

  init(data: GarageSceneData = {}): void {
    this.returnTo = resolveMenuReturn(data.from);
  }

  create(): void {
    const viewport = GameViewport.get();
    const snapshot = viewport.getSnapshot();
    this.resetPreviewToEquipped();
    const theme = getTheme(this.previewThemeId);

    this.view = 'themes';
    this.cameras.main.setViewport(0, 0, snapshot.width, snapshot.height);
    this.cameras.main.setBackgroundColor(theme.backdrop.canvasBackground);
    this.background = new ArcadeBackground(this, snapshot.width, snapshot.height, theme.backdrop);
    playDxBallThemeMusic(theme.id);
    this.titleText = createMenuTitle(this, snapshot, theme.hud.title);
    this.subtitleText = createMenuSubtitle(this, snapshot, theme.hud.subtitle, 'GARAGE');
    this.hintText = createMenuHint(this, snapshot, theme.hud.hint, '', 'center');
    this.preview = new CollectionPreview(
      this,
      snapshot.width,
      snapshot.height,
      GarageScene.previewOriginY(snapshot.height),
    );
    this.tabBar = new TabBar(
      this,
      snapshot.width,
      snapshot.height,
      menuTabY(snapshot),
      [
        { id: 'themes', title: 'Themes' },
        { id: 'paddles', title: 'Paddles' },
        { id: 'balls', title: 'Balls' },
      ],
      (id) => this.showCatalog(id),
      {
        initialId: 'themes',
        color: theme.menu.color,
        highlightColor: theme.menu.highlightColor,
        mutedColor: theme.menu.mutedColor,
      },
    );
    this.backButton = this.createBackButton(snapshot, theme.menu.color);
    this.favoriteButton = this.createFavoriteButton(snapshot, theme.menu.highlightColor);

    this.showCatalog('themes');

    this.unsubscribeViewport = viewport.onChange((next) => this.handleViewportChange(next));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubscribeViewport?.();
      this.clearCatalog();
      this.tabBar?.destroy();
      this.tabBar = undefined;
      this.backButton?.destroy();
      this.backButton = undefined;
      this.favoriteButton?.destroy();
      this.favoriteButton = undefined;
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

    this.input.keyboard?.on('keydown-ESC', () => this.goBack());
    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      if (event.key === 'f' || event.key === 'F') {
        this.handleFavorite();
      }
    });
  }

  private goBack(): void {
    this.scene.start(this.returnTo);
  }

  private handleFavorite(): void {
    const rowId = this.catalogList?.getSelectedId();
    if (!rowId) {
      return;
    }

    if (this.view === 'themes' && isThemeId(rowId)) {
      toggleFavoriteThemeId(rowId);
      this.catalogList?.setItems(this.catalogRows(this.view));
      this.refreshCollectionSubtitle();
      return;
    }

    if (this.view === 'paddles' && isPaddleSkinId(rowId)) {
      toggleFavoritePaddleSkinId(rowId);
      this.catalogList?.setItems(this.catalogRows(this.view));
      this.refreshCollectionSubtitle();
      return;
    }

    if (this.view === 'balls' && isBallSkinId(rowId)) {
      toggleFavoriteBallSkinId(rowId);
      this.catalogList?.setItems(this.catalogRows(this.view));
      this.refreshCollectionSubtitle();
    }
  }

  private showCatalog(id: CatalogId): void {
    this.clearCatalog();
    this.view = id;

    const snapshot = GameViewport.get().getSnapshot();
    const theme = getTheme(this.previewThemeId);
    const rows = this.catalogRows(id);
    const equippedIndex = Math.max(
      0,
      rows.findIndex((row) => row.equipped),
    );

    this.refreshCollectionSubtitle();
    this.hintText.setText('');

    this.catalogList = new ProgressList(
      this,
      snapshot.width,
      snapshot.height,
      menuContentY(snapshot),
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
        rowHeightRatio: 0.05,
        titleFontSizeRatio: 0.02,
        descriptionFontSizeRatio: 0.012,
      },
    );

    const selected = this.catalogList.getSelectedId();
    if (selected) {
      this.previewCatalogItem(id, selected);
    }
  }

  private refreshCollectionSubtitle(): void {
    const collection = getCollectionCompletion();
    this.subtitleText.setText(
      `GARAGE  ·  ${collection.totalPercent}%  (${collection.unlockedCount} / ${collection.totalCount})`,
    );
  }

  private equipFromCatalog(catalog: CatalogId, rowId: string): void {
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

  private previewCatalogItem(catalog: CatalogId, rowId: string): void {
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

  private catalogRows(id: CatalogId): ProgressRow[] {
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
    playDxBallThemeMusic(id);
    this.titleText.setColor(theme.hud.title);
    this.subtitleText.setColor(theme.hud.subtitle);
    this.hintText.setColor(theme.hud.hint);
    this.backButton?.setColor(theme.menu.color, theme.menu.highlightColor);
    this.favoriteButton?.setColor(theme.menu.highlightColor, theme.hud.title);
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
      motionHint: getPaddleMotionHint(this.previewPaddleId),
      locked,
      paddle: getPaddleSkinVisual(this.previewPaddleId),
      ball: getBallSkinVisual(this.previewBallId),
      backdrop: {
        topColor: theme.backdrop.topColor,
        bottomColor: theme.backdrop.bottomColor,
        style: theme.backdrop.style,
        gridColor: theme.backdrop.gridColor,
        starColor: theme.backdrop.starColor,
      },
    });
  }

  private clearCatalog(): void {
    this.catalogList?.destroy();
    this.catalogList = undefined;
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

  private createFavoriteButton(snapshot: ViewportSnapshot, color: string): TextButton {
    return new TextButton(
      this,
      menuHintX(snapshot),
      menuHintY(snapshot),
      '★ Favorite',
      () => this.handleFavorite(),
      {
        color,
        originX: 1,
        originY: 1,
        fontSize: menuFontSize(snapshot.height, MENU_LAYOUT.backFontRatio, MENU_LAYOUT.backMinPx),
        align: 'right',
      },
    );
  }

  private handleViewportChange(snapshot: ViewportSnapshot): void {
    this.cameras.main.setViewport(0, 0, snapshot.width, snapshot.height);
    this.background.resize(snapshot.width, snapshot.height);

    layoutMenuTitle(this.titleText, snapshot);
    layoutMenuSubtitle(this.subtitleText, snapshot);
    layoutMenuHint(this.hintText, snapshot, 'center');

    this.tabBar?.resize(snapshot.width, snapshot.height, menuTabY(snapshot));
    this.backButton?.setPosition(menuBackX(snapshot), menuHintY(snapshot));
    this.backButton?.setFontSize(
      menuFontSize(snapshot.height, MENU_LAYOUT.backFontRatio, MENU_LAYOUT.backMinPx),
    );
    this.favoriteButton?.setPosition(menuHintX(snapshot), menuHintY(snapshot));
    this.favoriteButton?.setFontSize(
      menuFontSize(snapshot.height, MENU_LAYOUT.backFontRatio, MENU_LAYOUT.backMinPx),
    );
    this.preview?.resize(snapshot.width, snapshot.height, GarageScene.previewOriginY(snapshot.height));
    this.catalogList?.resize(snapshot.width, snapshot.height, menuContentY(snapshot));
  }

  private static previewOriginY(viewportHeight: number): number {
    return viewportHeight * 0.655;
  }
}
