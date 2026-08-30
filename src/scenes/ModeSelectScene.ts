import Phaser from 'phaser';
import { SceneKeys } from '@systems/SceneKeys';
import { GameViewport, type ViewportSnapshot } from '@systems/GameViewport';
import { AudioManager } from '@systems/AudioManager';
import { GAME_MODES, type GameModeId } from '@entities/dx-ball/GameMode';
import { ArcadeBackground } from '@ui/ArcadeBackground';
import { SelectMenu } from '@ui/SelectMenu';

/**
 * scenes/ModeSelectScene.ts
 *
 * DXB-14: The pre-run mode picker. Sits between `PreloadScene` and
 * `MainScene` so every run starts with an explicit Classic / Time
 * Attack / Endless choice. Owns no gameplay — it only paints the
 * arcade backdrop, a title, and a `SelectMenu`, then starts
 * `MainScene` with `{ mode }`.
 *
 * Returning here from an ended run is `MainScene`'s Esc path; Space
 * on those end screens restarts the same mode instead.
 */
export class ModeSelectScene extends Phaser.Scene {
  private background!: ArcadeBackground;
  private titleText!: Phaser.GameObjects.Text;
  private subtitleText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private menu!: SelectMenu<GameModeId>;
  private unsubscribeViewport?: () => void;

  constructor() {
    super({ key: SceneKeys.ModeSelect });
  }

  create(): void {
    const viewport = GameViewport.get();
    const snapshot = viewport.getSnapshot();

    this.cameras.main.setViewport(0, 0, snapshot.width, snapshot.height);
    this.background = new ArcadeBackground(this, snapshot.width, snapshot.height);
    this.titleText = this.createTitle(snapshot.width, snapshot.height);
    this.subtitleText = this.createSubtitle(snapshot.width, snapshot.height);
    this.hintText = this.createHint(snapshot.width, snapshot.height);
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
  }

  private createTitle(viewportWidth: number, viewportHeight: number): Phaser.GameObjects.Text {
    const fontSize = Math.round(viewportHeight * 0.08);
    return this.add
      .text(viewportWidth / 2, viewportHeight * 0.12, 'DX-BALL', {
        fontFamily: 'Trebuchet MS, Segoe UI, sans-serif',
        fontSize: `${fontSize}px`,
        color: '#f8f9fa',
        fontStyle: 'bold',
        align: 'center',
        stroke: '#0b1320',
        strokeThickness: 8,
      })
      .setOrigin(0.5, 0)
      .setShadow(1, 3, '#000000', 4, true, true)
      .setDepth(20);
  }

  private createSubtitle(viewportWidth: number, viewportHeight: number): Phaser.GameObjects.Text {
    const fontSize = Math.round(viewportHeight * 0.032);
    return this.add
      .text(viewportWidth / 2, viewportHeight * 0.22, 'SELECT MODE', {
        fontFamily: 'Trebuchet MS, Segoe UI, sans-serif',
        fontSize: `${fontSize}px`,
        color: '#c4b5fd',
        fontStyle: 'bold',
        align: 'center',
        stroke: '#0b1320',
        strokeThickness: 4,
      })
      .setOrigin(0.5, 0)
      .setShadow(1, 2, '#000000', 3, true, true)
      .setDepth(20);
  }

  private createHint(viewportWidth: number, viewportHeight: number): Phaser.GameObjects.Text {
    const fontSize = Math.round(viewportHeight * 0.022);
    return this.add
      .text(
        viewportWidth / 2,
        viewportHeight * 0.9,
        'Arrows to move  ·  Space / Enter / click to start',
        {
          fontFamily: 'Trebuchet MS, Segoe UI, sans-serif',
          fontSize: `${fontSize}px`,
          color: '#90e0ef',
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

    this.titleText.setPosition(snapshot.width / 2, snapshot.height * 0.12);
    this.titleText.setFontSize(Math.round(snapshot.height * 0.08));

    this.subtitleText.setPosition(snapshot.width / 2, snapshot.height * 0.22);
    this.subtitleText.setFontSize(Math.round(snapshot.height * 0.032));

    this.hintText.setPosition(snapshot.width / 2, snapshot.height * 0.9);
    this.hintText.setFontSize(Math.round(snapshot.height * 0.022));

    this.menu.resize(
      snapshot.width,
      snapshot.height,
      ModeSelectScene.menuOriginY(snapshot.height),
    );
  }

  private static menuOriginY(viewportHeight: number): number {
    return viewportHeight * 0.34;
  }
}
