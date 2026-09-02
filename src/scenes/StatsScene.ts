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
import { getLeaderboardRows, getOnlineComingSoonRows } from '@entities/dx-ball/Leaderboards';
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
  menuBoardOriginY,
  menuContentY,
  menuFontSize,
  menuHintY,
  menuSubTabY,
  menuTabY,
} from '@ui/menuLayout';

/**
 * scenes/StatsScene.ts
 *
 * DXB-17: Dedicated statistics / leaderboards hub. DXB-18A: visible
 * Lifetime Stats / Leaderboards / Progress tabs plus a Back button.
 * DXB-28: Leaderboards host Local / Online (Coming Soon) tabs. Online
 * is a placeholder — no fabricated ranks. Esc and Back return to the
 * Hub (or ThemeSelect / ModeSelect).
 */

type TabId = 'stats' | 'boards' | 'summary';
type BoardScope = 'local' | 'online';
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
  private boardScopeBar?: TabBar<BoardScope>;
  private boardsMenu?: SelectMenu<GameModeId>;
  private statsList?: StatsList;
  private backButton?: TextButton;
  private view: View = 'stats';
  private boardScope: BoardScope = 'local';
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
    this.boardScope = 'local';
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
      this.showLocalBoards();
      return;
    }

    this.goBack();
  }

  private goBack(): void {
    this.scene.start(this.returnTo);
  }

  private openTab(id: TabId): void {
    if (id === 'boards') {
      this.showLeaderboards();
      return;
    }

    this.showList(id);
  }

  private showLeaderboards(): void {
    if (this.boardScope === 'online') {
      this.showOnlineComingSoon();
      return;
    }
    this.showLocalBoards();
  }

  private ensureBoardScopeBar(): void {
    if (this.boardScopeBar) {
      return;
    }

    const snapshot = GameViewport.get().getSnapshot();
    const theme = getTheme(loadPlayableThemeId());
    this.boardScopeBar = new TabBar(
      this,
      snapshot.width,
      snapshot.height,
      menuSubTabY(snapshot),
      [
        { id: 'local', title: 'Local' },
        { id: 'online', title: 'Online (Coming Soon)' },
      ],
      (id) => this.setBoardScope(id),
      {
        initialId: this.boardScope,
        color: theme.menu.color,
        highlightColor: theme.menu.highlightColor,
        mutedColor: theme.menu.mutedColor,
        fontSizeRatio: 0.018,
        sideRatio: 0.22,
        bindKeyboard: false,
      },
    );
  }

  private setBoardScope(scope: BoardScope): void {
    this.boardScope = scope;
    if (scope === 'online') {
      this.showOnlineComingSoon();
      return;
    }
    this.showLocalBoards();
  }

  private showLocalBoards(): void {
    this.clearContent({ keepScopeBar: true });
    this.ensureBoardScopeBar();
    this.view = 'boards';
    this.boardScope = 'local';
    this.subtitleText.setText('LOCAL LEADERBOARDS');
    this.hintText.setText('');

    const snapshot = GameViewport.get().getSnapshot();
    const theme = getTheme(loadPlayableThemeId());

    this.boardsMenu = new SelectMenu(
      this,
      snapshot.width,
      snapshot.height,
      menuBoardOriginY(snapshot),
      GAME_MODES.map((mode) => ({
        id: mode.id,
        title: mode.label,
      })),
      (mode) => this.showBoard(mode),
      {
        color: theme.menu.color,
        highlightColor: theme.menu.highlightColor,
        descriptionColor: theme.menu.descriptionColor,
        mutedColor: theme.menu.mutedColor,
        panel: theme.overlay.panel,
        panelStroke: theme.overlay.panelStroke,
        accent: Number.parseInt(theme.overlay.accent.replace('#', ''), 16) || 0xff2a6d,
        rowHeightRatio: 0.1,
        titleFontSizeRatio: 0.032,
      },
    );
  }

  private showOnlineComingSoon(): void {
    this.clearContent({ keepScopeBar: true });
    this.ensureBoardScopeBar();
    this.view = 'boards';
    this.boardScope = 'online';
    this.subtitleText.setText('ONLINE LEADERBOARDS');
    this.hintText.setText('');
    this.createStatsList(getOnlineComingSoonRows(), 0.08, menuBoardOriginY(GameViewport.get().getSnapshot()));
  }

  private showBoard(mode: GameModeId): void {
    this.clearContent({ keepScopeBar: true });
    this.ensureBoardScopeBar();
    this.view = mode;
    this.subtitleText.setText(getGameModeInfo(mode).label.toUpperCase());
    this.hintText.setText('');
    this.createStatsList(getLeaderboardRows(mode), 0.058, menuBoardOriginY(GameViewport.get().getSnapshot()));
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

  private createStatsList(items: readonly StatDisplayRow[], rowHeightRatio: number, originY?: number): void {
    const snapshot = GameViewport.get().getSnapshot();
    const theme = getTheme(loadPlayableThemeId());
    this.statsList = new StatsList(
      this,
      snapshot.width,
      snapshot.height,
      originY ?? menuContentY(snapshot),
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

  private clearContent(options: { keepScopeBar?: boolean } = {}): void {
    this.boardsMenu?.destroy();
    this.boardsMenu = undefined;
    this.statsList?.destroy();
    this.statsList = undefined;
    if (!options.keepScopeBar) {
      this.boardScopeBar?.destroy();
      this.boardScopeBar = undefined;
    }
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
    this.boardScopeBar?.resize(snapshot.width, snapshot.height, menuSubTabY(snapshot));
    this.backButton?.setPosition(menuBackX(snapshot), menuHintY(snapshot));
    this.backButton?.setFontSize(
      menuFontSize(snapshot.height, MENU_LAYOUT.backFontRatio, MENU_LAYOUT.backMinPx),
    );

    if (this.view === 'boards' && this.boardScope === 'local' && this.boardsMenu) {
      this.boardsMenu.resize(snapshot.width, snapshot.height, menuBoardOriginY(snapshot));
      return;
    }

    if (this.view === 'boards' || this.view === 'classic' || this.view === 'time-attack' || this.view === 'endless') {
      this.statsList?.resize(snapshot.width, snapshot.height, menuBoardOriginY(snapshot));
      return;
    }

    this.statsList?.resize(snapshot.width, snapshot.height, menuContentY(snapshot));
  }
}
