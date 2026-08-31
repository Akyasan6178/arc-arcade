import Phaser from 'phaser';
import { SceneKeys, type SceneKey } from '@systems/SceneKeys';
import { GameViewport, type ViewportSnapshot } from '@systems/GameViewport';
import { AudioManager } from '@systems/AudioManager';
import {
  getLifetimeStatRows,
  getPersonalBestRows,
  getProgressSummary,
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

/**
 * scenes/StatsScene.ts
 *
 * DXB-17: Dedicated statistics / leaderboards hub. Owns no gameplay —
 * it paints the saved theme, a hub of four catalogs (lifetime stats,
 * personal bests, local leaderboards, progress summary), and a
 * read-only list for each. Esc from a catalog returns to the hub
 * (leaderboard mode lists return to the boards picker first); Esc
 * from the hub returns to ThemeSelect or ModeSelect.
 */

type HubId = 'stats' | 'bests' | 'boards' | 'summary';
type View = 'hub' | HubId | GameModeId;

export interface StatsSceneData {
  from?: SceneKey;
}

export class StatsScene extends Phaser.Scene {
  private background!: ArcadeBackground;
  private titleText!: Phaser.GameObjects.Text;
  private subtitleText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private hubMenu?: SelectMenu<HubId>;
  private boardsMenu?: SelectMenu<GameModeId>;
  private statsList?: StatsList;
  private view: View = 'hub';
  private returnTo: SceneKey = SceneKeys.ThemeSelect;
  private unsubscribeViewport?: () => void;

  constructor() {
    super({ key: SceneKeys.Stats });
  }

  init(data: StatsSceneData = {}): void {
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
    if (this.view === 'classic' || this.view === 'time-attack' || this.view === 'endless') {
      this.showBoards();
      return;
    }

    if (this.view !== 'hub') {
      this.showHub();
      return;
    }

    this.scene.start(this.returnTo);
  }

  private showHub(): void {
    this.clearMenus();
    this.view = 'hub';
    this.subtitleText.setText('STATISTICS');
    this.hintText.setText('Arrows to move  ·  Space / Enter / click to open  ·  Esc to return');

    const { width, height } = GameViewport.get().getSnapshot();
    const theme = getTheme(loadPlayableThemeId());
    const summary = getProgressSummary();

    this.hubMenu = new SelectMenu(
      this,
      width,
      height,
      StatsScene.menuOriginY(height),
      [
        {
          id: 'stats',
          title: 'Lifetime Stats',
          description: 'Games, score, bricks, powerups, play time',
        },
        {
          id: 'bests',
          title: 'Personal Bests',
          description: 'Best Classic / Time Attack / Endless',
        },
        {
          id: 'boards',
          title: 'Local Leaderboards',
          description: 'Top 10 scores per mode',
        },
        {
          id: 'summary',
          title: 'Progress Summary',
          description: `${summary.completionPercent}% complete  ·  ${summary.achievementsComplete} / ${summary.achievementsTotal} achievements`,
        },
      ],
      (id) => this.openHub(id),
      {
        color: theme.menu.color,
        highlightColor: theme.menu.highlightColor,
        descriptionColor: theme.menu.descriptionColor,
        mutedColor: theme.menu.mutedColor,
        rowHeightRatio: 0.1,
      },
    );
  }

  private openHub(id: HubId): void {
    if (id === 'boards') {
      this.showBoards();
      return;
    }

    this.showList(id);
  }

  private showBoards(): void {
    this.clearMenus();
    this.view = 'boards';
    this.subtitleText.setText('LEADERBOARDS');
    this.hintText.setText('Arrows to move  ·  Space / Enter / click to open  ·  Esc back');

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
        rowHeightRatio: 0.12,
      },
    );
  }

  private showBoard(mode: GameModeId): void {
    this.clearMenus();
    this.view = mode;
    this.subtitleText.setText(getGameModeInfo(mode).label.toUpperCase());
    this.hintText.setText('Arrows to move  ·  Esc back');
    this.createStatsList(getLeaderboardRows(mode), 0.058);
  }

  private showList(id: Exclude<HubId, 'boards'>): void {
    this.clearMenus();
    this.view = id;

    switch (id) {
      case 'stats':
        this.subtitleText.setText('LIFETIME STATS');
        this.hintText.setText('Arrows to move  ·  Esc back');
        this.createStatsList(getLifetimeStatRows(), 0.055);
        break;
      case 'bests':
        this.subtitleText.setText('PERSONAL BESTS');
        this.hintText.setText('Arrows to move  ·  Esc back');
        this.createStatsList(getPersonalBestRows(), 0.1);
        break;
      case 'summary':
        this.subtitleText.setText('PROGRESS');
        this.hintText.setText('Arrows to move  ·  Esc back');
        this.createStatsList(getProgressSummaryRows(), 0.08);
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
        titleFontSizeRatio: 0.026,
        valueFontSizeRatio: 0.02,
      },
    );
  }

  private clearMenus(): void {
    this.hubMenu?.destroy();
    this.hubMenu = undefined;
    this.boardsMenu?.destroy();
    this.boardsMenu = undefined;
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
      .text(viewportWidth / 2, viewportHeight * 0.15, 'STATISTICS', {
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
      this.hubMenu?.resize(snapshot.width, snapshot.height, StatsScene.menuOriginY(snapshot.height));
      return;
    }

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

  private static menuOriginY(viewportHeight: number): number {
    return viewportHeight * 0.28;
  }

  private static listOriginY(viewportHeight: number): number {
    return viewportHeight * 0.22;
  }
}
