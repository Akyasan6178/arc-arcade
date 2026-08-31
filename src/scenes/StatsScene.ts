import Phaser from 'phaser';
import { SceneKeys, type SceneKey } from '@systems/SceneKeys';
import { GameViewport, type ViewportSnapshot } from '@systems/GameViewport';
import { AudioManager } from '@systems/AudioManager';
import { playDxBallThemeMusic } from '@entities/dx-ball/audioCues';
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
  menuOriginY,
  menuTabY,
} from '@ui/menuLayout';

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
    playDxBallThemeMusic(theme.id);
    this.titleText = createMenuTitle(this, snapshot, theme.hud.title);
    this.subtitleText = createMenuSubtitle(this, snapshot, theme.hud.subtitle, 'STATISTICS');
    this.hintText = createMenuHint(this, snapshot, theme.hud.hint, '');
    this.tabBar = new TabBar(
      this,
      snapshot.width,
      snapshot.height,
      menuTabY(snapshot),
      [
        { id: 'stats', title: 'Stats' },
        { id: 'boards', title: 'Boards' },
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
    this.backButton = this.createBackButton(snapshot, theme.menu.color);

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
    this.hintText.setText('Tap a mode');

    const snapshot = GameViewport.get().getSnapshot();
    const theme = getTheme(loadPlayableThemeId());

    this.boardsMenu = new SelectMenu(
      this,
      snapshot.width,
      snapshot.height,
      menuOriginY(snapshot),
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
        this.hintText.setText('');
        this.createStatsList([...getPersonalBestRows(), ...getLifetimeStatRows()], 0.044);
        break;
      case 'summary':
        this.subtitleText.setText('PROGRESS');
        this.hintText.setText('');
        this.createStatsList(getProgressSummaryRows(), 0.07);
        break;
    }
  }

  private createStatsList(items: readonly StatDisplayRow[], rowHeightRatio: number): void {
    const snapshot = GameViewport.get().getSnapshot();
    const theme = getTheme(loadPlayableThemeId());
    this.statsList = new StatsList(
      this,
      snapshot.width,
      snapshot.height,
      menuContentY(snapshot),
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

  private createBackButton(snapshot: ViewportSnapshot, color: string): TextButton {
    return new TextButton(
      this,
      menuBackX(snapshot),
      menuHintY(snapshot),
      '← Back',
      () => this.handleEscape(),
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

    this.tabBar?.resize(snapshot.width, snapshot.height, menuTabY(snapshot));
    this.backButton?.setPosition(menuBackX(snapshot), menuHintY(snapshot));
    this.backButton?.setFontSize(
      menuFontSize(snapshot.height, MENU_LAYOUT.backFontRatio, MENU_LAYOUT.backMinPx),
    );

    if (this.view === 'boards') {
      this.boardsMenu?.resize(snapshot.width, snapshot.height, menuOriginY(snapshot));
      return;
    }

    this.statsList?.resize(snapshot.width, snapshot.height, menuContentY(snapshot));
  }
}
