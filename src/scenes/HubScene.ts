import Phaser from 'phaser';
import { SceneKeys } from '@systems/SceneKeys';
import { GameViewport, type ViewportSnapshot } from '@systems/GameViewport';
import { AudioManager } from '@systems/AudioManager';
import { playDxBallThemeMusic } from '@entities/dx-ball/audioCues';
import { formatCreatorCredit, formatGameVersion, formatStudioCredit } from '@entities/dx-ball/Version';
import { getTheme } from '@entities/dx-ball/Theme';
import { loadPlayableThemeId } from '@entities/dx-ball/Progress';
import { ArcadeBackground } from '@ui/ArcadeBackground';
import { SelectMenu } from '@ui/SelectMenu';
import { bindOptionalMenuShortcuts } from '@scenes/menuNavigation';
import {
  createMenuHint,
  createMenuRule,
  createMenuSubtitle,
  createMenuTitle,
  layoutMenuHint,
  layoutMenuRule,
  layoutMenuSubtitle,
  layoutMenuTitle,
  menuOriginY,
} from '@ui/menuLayout';

/**
 * scenes/HubScene.ts
 *
 * DXB-18A/DXB-26: Visible main menu. Compact card rows, version chrome,
 * and a What's New destination. Owns no gameplay.
 */

type HubId =
  | 'play'
  | 'tutorial'
  | 'garage'
  | 'whats-new'
  | 'stats'
  | 'achievements'
  | 'settings'
  | 'credits';

export class HubScene extends Phaser.Scene {
  private background!: ArcadeBackground;
  private titleText!: Phaser.GameObjects.Text;
  private subtitleText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private rule!: Phaser.GameObjects.Graphics;
  private menu!: SelectMenu<HubId>;
  private unsubscribeViewport?: () => void;

  constructor() {
    super({ key: SceneKeys.Hub });
  }

  create(): void {
    const viewport = GameViewport.get();
    const snapshot = viewport.getSnapshot();
    const theme = getTheme(loadPlayableThemeId());

    this.cameras.main.setViewport(0, 0, snapshot.width, snapshot.height);
    this.cameras.main.setBackgroundColor(theme.backdrop.canvasBackground);
    this.background = new ArcadeBackground(this, snapshot.width, snapshot.height, theme.backdrop);
    playDxBallThemeMusic(theme.id);
    this.titleText = createMenuTitle(this, snapshot, theme.hud.title);
    this.subtitleText = createMenuSubtitle(
      this,
      snapshot,
      theme.hud.subtitle,
      formatGameVersion(),
    );
    this.rule = createMenuRule(this, snapshot, theme.overlay.panelStroke);
    this.hintText = createMenuHint(
      this,
      snapshot,
      theme.hud.hint,
      `${formatCreatorCredit()}  ·  ${formatStudioCredit()}`,
      'center',
    );
    const accent = Number.parseInt(theme.overlay.accent.replace('#', ''), 16) || 0xff2a6d;
    this.menu = new SelectMenu(
      this,
      snapshot.width,
      snapshot.height,
      menuOriginY(snapshot, true) + snapshot.height * 0.02,
      [
        { id: 'play', title: 'Play' },
        { id: 'tutorial', title: 'How To' },
        { id: 'garage', title: 'Garage' },
        { id: 'whats-new', title: "What's New" },
        { id: 'stats', title: 'Statistics' },
        { id: 'achievements', title: 'Achievements' },
        { id: 'settings', title: 'Settings' },
        { id: 'credits', title: 'Credits' },
      ],
      (id) => this.openHub(id),
      {
        color: theme.menu.color,
        highlightColor: theme.menu.highlightColor,
        descriptionColor: theme.menu.descriptionColor,
        mutedColor: theme.menu.mutedColor,
        panel: theme.overlay.panel,
        panelStroke: theme.overlay.panelStroke,
        accent,
        rowHeightRatio: 0.072,
        titleFontSizeRatio: 0.026,
      },
    );

    this.unsubscribeViewport = viewport.onChange((next) => this.handleViewportChange(next));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.unsubscribeViewport?.());

    this.input.keyboard?.on('keydown-M', () => {
      try {
        AudioManager.get().toggle();
      } catch {
        // ignore
      }
    });

    bindOptionalMenuShortcuts(this, SceneKeys.Hub);
  }

  private openHub(id: HubId): void {
    switch (id) {
      case 'play':
        this.scene.start(SceneKeys.ThemeSelect);
        return;
      case 'tutorial':
        this.scene.start(SceneKeys.Tutorial, { from: SceneKeys.Hub });
        return;
      case 'garage':
        this.scene.start(SceneKeys.Garage, { from: SceneKeys.Hub });
        return;
      case 'whats-new':
        this.scene.start(SceneKeys.ReleaseNotes, { from: SceneKeys.Hub });
        return;
      case 'stats':
        this.scene.start(SceneKeys.Stats, { from: SceneKeys.Hub });
        return;
      case 'achievements':
        this.scene.start(SceneKeys.Achievements, { from: SceneKeys.Hub });
        return;
      case 'settings':
        this.scene.start(SceneKeys.Settings, { from: SceneKeys.Hub });
        return;
      case 'credits':
        this.scene.start(SceneKeys.Credits, { from: SceneKeys.Hub });
        return;
    }
  }

  private handleViewportChange(snapshot: ViewportSnapshot): void {
    this.cameras.main.setViewport(0, 0, snapshot.width, snapshot.height);
    this.background.resize(snapshot.width, snapshot.height);

    const theme = getTheme(loadPlayableThemeId());
    layoutMenuTitle(this.titleText, snapshot);
    layoutMenuSubtitle(this.subtitleText, snapshot);
    layoutMenuRule(this.rule, snapshot, theme.overlay.panelStroke);
    layoutMenuHint(this.hintText, snapshot, 'center');
    this.menu.resize(snapshot.width, snapshot.height, menuOriginY(snapshot, true) + snapshot.height * 0.02);
  }
}
