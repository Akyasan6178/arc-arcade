import Phaser from 'phaser';
import { SceneKeys, type SceneKey } from '@systems/SceneKeys';
import { GameViewport, type ViewportSnapshot } from '@systems/GameViewport';
import { AudioManager } from '@systems/AudioManager';
import {
  getLifetimeStatRows,
  getPersonalBestRows,
  getProgressSummaryRows,
  loadPlayableThemeId,
  type StatDisplayRow,
} from '@entities/dx-ball/Progress';
import { getLeaderboardRows, LEADERBOARD_SIZE } from '@entities/dx-ball/Leaderboards';
import { GAME_MODES, getGameModeInfo, type GameModeId } from '@entities/dx-ball/GameMode';
import { getTheme } from '@entities/dx-ball/Theme';
import { ArcadeBackground } from '@ui/ArcadeBackground';
import { SelectMenu } from '@ui/SelectMenu';
import { StatsList } from '@ui/StatsList';
import { TabBar } from '@ui/TabBar';
import { TextButton } from '@ui/TextButton';
import { resolveMenuReturn } from '@scenes/menuNavigation';

/**
 * scenes/StatsScene.ts
 *
 * DXB-17: Dedicated statistics / leaderboards hub. DXB-18A: visible
 * Lifetime Stats / Leaderboards / Progress tabs plus a Back button so
 * every catalog is reachable without a nested hub or keyboard. Personal
 * bests stay on the Lifetime Stats tab. Leaderboards still open a
 * per-mode Top 10; Back from a board returns to the mode list first.
 * Esc and Back return to the Hub (or ThemeSelect / ModeSelect).
 */

type TabId = 'stats' | 'boards' | 'summary';
type View = TabId | GameModeId;

export interface StatsSceneData {
  from?: SceneKey;
}

export class StatsScene extends Phaser.Scene {
  private background!: ArcadeBackground;
  private titleText!: Phaser.GameObjects.Text;
  private subtitleText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private tabBar?: TabBar<TabId>;
  private boardsMenu?: SelectMenu<GameModeId>;
  private statsList?: StatsList;
  private backButton?: TextButton;
  private view: View = 'stats';
  private returnTo: SceneKey = SceneKeys.Hub;
  private unsubscribeViewport?: () => void;

  constructor() {
    super({ key: SceneKeys.Stats });
  }

  init(data: StatsSceneData = {}): void {
    this.returnTo = resolveMenuReturn(data.from);
  }

  create(): void {
    const viewport = GameViewport.get();
    const snapshot = viewport.getSnapshot();
    const theme = getTheme(loadPlayableThemeId());

    this.view = 'stats';
    this.cameras.main.setViewport(0, 0, snapshot.width, snapshot.height);
    this.cameras.main.setBackgroundColor(theme.backdrop.canvasBackground);
    this.background = new ArcadeBackground(this, snapshot.width, snapshot.height, theme.backdrop);
    this.titleText = this.createTitle(snapshot.width, snapshot.height, theme.hud.title);
    this.subtitleText = this.createSubtitle(snapshot.width, snapshot.height, theme.hud.subtitle);
    this.hintText = this.createHint(snapshot.width, snapshot.height, theme.hud.hint);
    this.tabBar = new TabBar(
      this,
      snapshot.width,
      snapshot.height,
      StatsScene.tabOriginY(snapshot.height),
      [
        { id: 'stats', title: 'Lifetime Stats' },
        { id: 'boards', title: 'Leaderboards' },
        { id: 'summary', title: 'Progress' },
      ],
      (id) => this.openTab(id),
      {
        initialId: 'stats',
        color: theme.menu.color,
        highlightColor: theme.menu.highlightColor,
        mutedColor: theme.menu.mutedColor,
        fontSizeRatio: 0.022,
      },
    );
    this.backButton = this.createBackButton(snapshot.width, snapshot.height, theme.menu.color);

    this.openTab('stats');

    this.unsubscribeViewport = viewport.onChange((next) => this.handleViewportChange(next));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubscribeViewport?.();
      this.clearContent();
      this.tabBar?.destroy();
      this.tabBar = undefined;
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

    this.input.keyboard?.on('keydown-ESC', () => this.handleEscape());
  }

  private handleEscape(): void {
    if (this.view === 'classic' || this.view === 'time-attack' || this.view === 'endless') {
      this.showBoards();
      return;
    }

    this.goBack();
  }

  private goBack(): void {
    this.scene.start(this.returnTo);
  }

  private openTab(id: TabId): void {
    if (id === 'boards') {
      this.showBoards();
      return;
    }

    this.showList(id);
  }

  private showBoards(): void {
    this.clearContent();
    this.view = 'boards';
    this.subtitleText.setText('LEADERBOARDS');
    this.hintText.setText('Tap a mode  ·  Esc back');

    const { width, height } = GameViewport.get().getSnapshot();
    const theme = getTheme(loadPlayableThemeId());

    this.boardsMenu = new SelectMenu(
      this,
      width,
      height,
      StatsScene.menuOriginY(height),
      GAME_MODES.map((mode) => ({
        id: mode.id,
        title: mode.label,
        description: `Top ${LEADERBOARD_SIZE} local scores`,
      })),
      (mode) => this.showBoard(mode),
      {
        color: theme.menu.color,
        highlightColor: theme.menu.highlightColor,
        descriptionColor: theme.menu.descriptionColor,
        mutedColor: theme.menu.mutedColor,
        rowHeightRatio: 0.1,
        titleFontSizeRatio: 0.032,
        descriptionFontSizeRatio: 0.018,
      },
    );
  }

  private showBoard(mode: GameModeId): void {
    this.clearContent();
    this.view = mode;
    this.subtitleText.setText(getGameModeInfo(mode).label.toUpperCase());
    this.hintText.setText('Back returns to modes');
    this.createStatsList(getLeaderboardRows(mode), 0.058);
  }

  private showList(id: Exclude<TabId, 'boards'>): void {
    this.clearContent();
    this.view = id;

    switch (id) {
      case 'stats':
        this.subtitleText.setText('LIFETIME STATS');
        this.hintText.setText('Arrows to move');
        this.createStatsList([...getPersonalBestRows(), ...getLifetimeStatRows()], 0.044);
        break;
      case 'summary':
        this.subtitleText.setText('PROGRESS');
        this.hintText.setText('Arrows to move');
        this.createStatsList(getProgressSummaryRows(), 0.07);
        break;
    }
  }

  private createStatsList(items: readonly StatDisplayRow[], rowHeightRatio: number): void {
    const { width, height } = GameViewport.get().getSnapshot();
    const theme = getTheme(loadPlayableThemeId());
    this.statsList = new StatsList(
      this,
      width,
      height,
      StatsScene.listOriginY(height),
      items,
      {
        color: theme.menu.color,
        highlightColor: theme.menu.highlightColor,
        valueColor: theme.menu.descriptionColor,
        mutedColor: theme.menu.mutedColor,
        rowHeightRatio,
        titleFontSizeRatio: 0.022,
        valueFontSizeRatio: 0.018,
      },
    );
  }

  private clearContent(): void {
    this.boardsMenu?.destroy();
    this.boardsMenu = undefined;
    this.statsList?.destroy();
    this.statsList = undefined;
  }

  private createBackButton(viewportWidth: number, viewportHeight: number, color: string): TextButton {
    return new TextButton(
      this,
      viewportWidth * 0.08,
      viewportHeight * 0.955,
      '← Back',
      () => this.handleEscape(),
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
    const fontSize = Math.round(viewportHeight * 0.06);
    return this.add
      .text(viewportWidth / 2, viewportHeight * 0.04, 'DX-BALL', {
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
    const fontSize = Math.round(viewportHeight * 0.024);
    return this.add
      .text(viewportWidth / 2, viewportHeight * 0.11, 'STATISTICS', {
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
      .text(viewportWidth * 0.92, viewportHeight * 0.955, '', {
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

    this.titleText.setPosition(snapshot.width / 2, snapshot.height * 0.04);
    this.titleText.setFontSize(Math.round(snapshot.height * 0.06));

    this.subtitleText.setPosition(snapshot.width / 2, snapshot.height * 0.11);
    this.subtitleText.setFontSize(Math.round(snapshot.height * 0.024));

    this.hintText.setPosition(snapshot.width * 0.92, snapshot.height * 0.955);
    this.hintText.setFontSize(Math.round(snapshot.height * 0.018));

    this.tabBar?.resize(snapshot.width, snapshot.height, StatsScene.tabOriginY(snapshot.height));
    this.backButton?.setPosition(snapshot.width * 0.08, snapshot.height * 0.955);
    this.backButton?.setFontSize(Math.round(snapshot.height * 0.022));

    if (this.view === 'boards') {
      this.boardsMenu?.resize(
        snapshot.width,
        snapshot.height,
        StatsScene.menuOriginY(snapshot.height),
      );
      return;
    }

    this.statsList?.resize(snapshot.width, snapshot.height, StatsScene.listOriginY(snapshot.height));
  }

  private static tabOriginY(viewportHeight: number): number {
    return viewportHeight * 0.16;
  }

  private static menuOriginY(viewportHeight: number): number {
    return viewportHeight * 0.24;
  }

  private static listOriginY(viewportHeight: number): number {
    return viewportHeight * 0.22;
  }
}
