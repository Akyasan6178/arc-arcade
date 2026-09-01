import Phaser from 'phaser';
import { SceneKeys } from '@systems/SceneKeys';
import { GameViewport, type ViewportSnapshot } from '@systems/GameViewport';
import { AudioManager } from '@systems/AudioManager';
import { playDxBallThemeMusic } from '@entities/dx-ball/audioCues';
import { formatGameVersion } from '@entities/dx-ball/Version';
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
 * DXB-18A: Visible main menu. Sits after `PreloadScene` so every session
 * starts on a tappable Play / Garage / Statistics / Achievements /
 * Settings list instead of keyboard-only side screens. Owns no gameplay.
 * Optional G / S / U shortcuts still open Garage / Stats / Achievements.
 *
 * DXB-20: shared menu chrome (title / subtitle / hint spacing and type).
 * DXB-23: Tutorial / Credits rows, version caption, tighter hierarchy.
 */

type HubId = 'play' | 'garage' | 'tutorial' | 'stats' | 'achievements' | 'credits' | 'settings';

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
      `MAIN MENU  ·  ${formatGameVersion()}`,
    );
    this.rule = createMenuRule(this, snapshot, theme.overlay.panelStroke);
    this.hintText = createMenuHint(this, snapshot, theme.hud.hint, 'Tap a row to open', 'center');
    this.menu = new SelectMenu(
      this,
      snapshot.width,
      snapshot.height,
      menuOriginY(snapshot, true),
      [
        {
          id: 'play',
          title: 'Play',
          description: 'Theme, mode, then Classic level previews',
        },
        {
          id: 'garage',
          title: 'Garage',
          description: 'Equip themes, paddles, and balls',
        },
        {
          id: 'tutorial',
          title: 'Tutorial',
          description: 'Paddle, bricks, powerups, modes, unlocks',
        },
        {
          id: 'stats',
          title: 'Statistics',
          description: 'Lifetime stats, boards, and progress',
        },
        {
          id: 'achievements',
          title: 'Achievements',
          description: 'Lifetime unlocks and completion',
        },
        {
          id: 'credits',
          title: 'Credits',
          description: 'Title, version, and development',
        },
        {
          id: 'settings',
          title: 'Settings',
          description: 'Sound on or off',
        },
      ],
      (id) => this.openHub(id),
      {
        color: theme.menu.color,
        highlightColor: theme.menu.highlightColor,
        descriptionColor: theme.menu.descriptionColor,
        mutedColor: theme.menu.mutedColor,
        rowHeightRatio: 0.078,
        titleFontSizeRatio: 0.032,
        descriptionFontSizeRatio: 0.016,
      },
    );

    this.unsubscribeViewport = viewport.onChange((next) => this.handleViewportChange(next));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.unsubscribeViewport?.());

    this.input.keyboard?.on('keydown-M', () => {
      try {
        AudioManager.get().toggle();
      } catch {
        // AudioManager missing/unavailable — ignore the toggle.
      }
    });

    bindOptionalMenuShortcuts(this, SceneKeys.Hub);
  }

  private openHub(id: HubId): void {
    switch (id) {
      case 'play':
        this.scene.start(SceneKeys.ThemeSelect);
        return;
      case 'garage':
        this.scene.start(SceneKeys.Garage, { from: SceneKeys.Hub });
        return;
      case 'tutorial':
        this.scene.start(SceneKeys.Tutorial, { from: SceneKeys.Hub });
        return;
      case 'stats':
        this.scene.start(SceneKeys.Stats, { from: SceneKeys.Hub });
        return;
      case 'achievements':
        this.scene.start(SceneKeys.Achievements, { from: SceneKeys.Hub });
        return;
      case 'credits':
        this.scene.start(SceneKeys.Credits, { from: SceneKeys.Hub });
        return;
      case 'settings':
        this.scene.start(SceneKeys.Settings, { from: SceneKeys.Hub });
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
    this.menu.resize(snapshot.width, snapshot.height, menuOriginY(snapshot, true));
  }
}
