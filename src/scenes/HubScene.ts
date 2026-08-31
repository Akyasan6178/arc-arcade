import Phaser from 'phaser';
import { SceneKeys } from '@systems/SceneKeys';
import { GameViewport, type ViewportSnapshot } from '@systems/GameViewport';
import { AudioManager } from '@systems/AudioManager';
import { getTheme } from '@entities/dx-ball/Theme';
import { loadPlayableThemeId } from '@entities/dx-ball/Progress';
import { ArcadeBackground } from '@ui/ArcadeBackground';
import { SelectMenu } from '@ui/SelectMenu';
import { bindOptionalMenuShortcuts } from '@scenes/menuNavigation';

/**
 * scenes/HubScene.ts
 *
 * DXB-18A: Visible main menu. Sits after `PreloadScene` so every session
 * starts on a tappable Play / Garage / Statistics / Achievements /
 * Settings list instead of keyboard-only side screens. Owns no gameplay.
 * Optional G / S / U shortcuts still open Garage / Stats / Achievements.
 */

type HubId = 'play' | 'garage' | 'stats' | 'achievements' | 'settings';

export class HubScene extends Phaser.Scene {
  private background!: ArcadeBackground;
  private titleText!: Phaser.GameObjects.Text;
  private subtitleText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
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
    this.titleText = this.createTitle(snapshot.width, snapshot.height, theme.hud.title);
    this.subtitleText = this.createSubtitle(snapshot.width, snapshot.height, theme.hud.subtitle);
    this.hintText = this.createHint(snapshot.width, snapshot.height, theme.hud.hint);
    this.menu = new SelectMenu(
      this,
      snapshot.width,
      snapshot.height,
      HubScene.menuOriginY(snapshot.height),
      [
        {
          id: 'play',
          title: 'Play',
          description: 'Choose a theme and mode',
        },
        {
          id: 'garage',
          title: 'Garage',
          description: 'Themes, paddles, and balls',
        },
        {
          id: 'stats',
          title: 'Statistics',
          description: 'Lifetime stats, leaderboards, progress',
        },
        {
          id: 'achievements',
          title: 'Achievements',
          description: 'Lifetime unlocks and completion',
        },
        {
          id: 'settings',
          title: 'Settings',
          description: 'Audio mute',
        },
      ],
      (id) => this.openHub(id),
      {
        color: theme.menu.color,
        highlightColor: theme.menu.highlightColor,
        descriptionColor: theme.menu.descriptionColor,
        mutedColor: theme.menu.mutedColor,
        rowHeightRatio: 0.092,
        titleFontSizeRatio: 0.036,
        descriptionFontSizeRatio: 0.018,
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
      case 'stats':
        this.scene.start(SceneKeys.Stats, { from: SceneKeys.Hub });
        return;
      case 'achievements':
        this.scene.start(SceneKeys.Achievements, { from: SceneKeys.Hub });
        return;
      case 'settings':
        this.scene.start(SceneKeys.Settings, { from: SceneKeys.Hub });
        return;
    }
  }

  private createTitle(
    viewportWidth: number,
    viewportHeight: number,
    color: string,
  ): Phaser.GameObjects.Text {
    const fontSize = Math.round(viewportHeight * 0.075);
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
      .text(viewportWidth / 2, viewportHeight * 0.14, 'MAIN MENU', {
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
      .text(
        viewportWidth / 2,
        viewportHeight * 0.955,
        'Tap a button to open  ·  G garage  ·  S stats  ·  U achievements',
        {
          fontFamily: 'Trebuchet MS, Segoe UI, sans-serif',
          fontSize: `${fontSize}px`,
          color,
          align: 'center',
          stroke: '#0b1320',
          strokeThickness: 3,
        },
      )
      .setOrigin(0.5, 1)
      .setShadow(1, 2, '#000000', 3, true, true)
      .setDepth(20);
  }

  private handleViewportChange(snapshot: ViewportSnapshot): void {
    this.cameras.main.setViewport(0, 0, snapshot.width, snapshot.height);
    this.background.resize(snapshot.width, snapshot.height);

    this.titleText.setPosition(snapshot.width / 2, snapshot.height * 0.05);
    this.titleText.setFontSize(Math.round(snapshot.height * 0.075));

    this.subtitleText.setPosition(snapshot.width / 2, snapshot.height * 0.14);
    this.subtitleText.setFontSize(Math.round(snapshot.height * 0.028));

    this.hintText.setPosition(snapshot.width / 2, snapshot.height * 0.955);
    this.hintText.setFontSize(Math.round(snapshot.height * 0.018));

    this.menu.resize(snapshot.width, snapshot.height, HubScene.menuOriginY(snapshot.height));
  }

  private static menuOriginY(viewportHeight: number): number {
    return viewportHeight * 0.22;
  }
}
