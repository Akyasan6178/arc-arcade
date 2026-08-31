import Phaser from 'phaser';
import { SceneKeys } from '@systems/SceneKeys';
import { GameViewport, type ViewportSnapshot } from '@systems/GameViewport';
import { AudioManager } from '@systems/AudioManager';
import { GAME_MODES, type GameModeId } from '@entities/dx-ball/GameMode';
import { getTheme } from '@entities/dx-ball/Theme';
import { loadPlayableThemeId } from '@entities/dx-ball/Progress';
import { ArcadeBackground } from '@ui/ArcadeBackground';
import { SelectMenu } from '@ui/SelectMenu';

/**
 * scenes/ModeSelectScene.ts
 *
 * DXB-14: The pre-run mode picker. Sits between ThemeSelect (DXB-15)
 * and `MainScene` so every run starts with an explicit Classic / Time
 * Attack / Endless choice. Owns no gameplay — it only paints the
 * themed backdrop, a title, and a `SelectMenu`, then starts
 * `MainScene` with `{ mode }`.
 *
 * Esc returns to ThemeSelect. U opens unlockables (DXB-16). S opens
 * statistics / leaderboards (DXB-17). G opens the garage (DXB-18).
 * Space on an ended run in MainScene restarts the same mode instead.
 */
export class ModeSelectScene extends Phaser.Scene {
  private background!: ArcadeBackground;
  private titleText!: Phaser.GameObjects.Text;
  private subtitleText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private themeHintText!: Phaser.GameObjects.Text;
  private menu!: SelectMenu<GameModeId>;
  private unsubscribeViewport?: () => void;

  constructor() {
    super({ key: SceneKeys.ModeSelect });
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
    this.themeHintText = this.createThemeHint(
      snapshot.width,
      snapshot.height,
      theme.label,
      theme.hud.hint,
    );
    this.hintText = this.createHint(snapshot.width, snapshot.height, theme.hud.hint);
    this.menu = new SelectMenu(
      this,
      snapshot.width,
      snapshot.height,
      ModeSelectScene.menuOriginY(snapshot.height),
      GAME_MODES.map((mode) => ({
        id: mode.id,
        title: mode.label,
        description: mode.description,
      })),
      (mode) => this.scene.start(SceneKeys.Main, { mode }),
      {
        color: theme.menu.color,
        highlightColor: theme.menu.highlightColor,
        descriptionColor: theme.menu.descriptionColor,
        mutedColor: theme.menu.mutedColor,
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

    this.input.keyboard?.on('keydown-ESC', () => {
      this.scene.start(SceneKeys.ThemeSelect);
    });

    this.input.keyboard?.on('keydown-U', () => {
      this.scene.start(SceneKeys.Unlockables, { from: SceneKeys.ModeSelect });
    });

    this.input.keyboard?.on('keydown-S', () => {
      this.scene.start(SceneKeys.Stats, { from: SceneKeys.ModeSelect });
    });

    this.input.keyboard?.on('keydown-G', () => {
      this.scene.start(SceneKeys.Garage, { from: SceneKeys.ModeSelect });
    });
  }

  private createTitle(
    viewportWidth: number,
    viewportHeight: number,
    color: string,
  ): Phaser.GameObjects.Text {
    const fontSize = Math.round(viewportHeight * 0.08);
    return this.add
      .text(viewportWidth / 2, viewportHeight * 0.1, 'DX-BALL', {
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
    const fontSize = Math.round(viewportHeight * 0.032);
    return this.add
      .text(viewportWidth / 2, viewportHeight * 0.2, 'SELECT MODE', {
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

  private createThemeHint(
    viewportWidth: number,
    viewportHeight: number,
    themeLabel: string,
    color: string,
  ): Phaser.GameObjects.Text {
    const fontSize = Math.round(viewportHeight * 0.022);
    return this.add
      .text(viewportWidth / 2, viewportHeight * 0.255, `Theme: ${themeLabel}  ·  Esc to change`, {
        fontFamily: 'Trebuchet MS, Segoe UI, sans-serif',
        fontSize: `${fontSize}px`,
        color,
        align: 'center',
        stroke: '#0b1320',
        strokeThickness: 3,
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
    const fontSize = Math.round(viewportHeight * 0.022);
    return this.add
      .text(
        viewportWidth / 2,
        viewportHeight * 0.9,
        'Arrows to move  ·  Space / Enter / click to start  ·  U unlockables  ·  S stats  ·  G garage',
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

    this.titleText.setPosition(snapshot.width / 2, snapshot.height * 0.1);
    this.titleText.setFontSize(Math.round(snapshot.height * 0.08));

    this.subtitleText.setPosition(snapshot.width / 2, snapshot.height * 0.2);
    this.subtitleText.setFontSize(Math.round(snapshot.height * 0.032));

    this.themeHintText.setPosition(snapshot.width / 2, snapshot.height * 0.255);
    this.themeHintText.setFontSize(Math.round(snapshot.height * 0.022));

    this.hintText.setPosition(snapshot.width / 2, snapshot.height * 0.9);
    this.hintText.setFontSize(Math.round(snapshot.height * 0.022));

    this.menu.resize(
      snapshot.width,
      snapshot.height,
      ModeSelectScene.menuOriginY(snapshot.height),
    );
  }

  private static menuOriginY(viewportHeight: number): number {
    return viewportHeight * 0.36;
  }
}
