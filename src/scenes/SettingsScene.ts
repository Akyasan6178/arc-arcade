import Phaser from 'phaser';
import { SceneKeys, type SceneKey } from '@systems/SceneKeys';
import { GameViewport, type ViewportSnapshot } from '@systems/GameViewport';
import { AudioManager } from '@systems/AudioManager';
import { getTheme } from '@entities/dx-ball/Theme';
import { loadPlayableThemeId } from '@entities/dx-ball/Progress';
import { ArcadeBackground } from '@ui/ArcadeBackground';
import { TextButton } from '@ui/TextButton';
import { resolveMenuReturn } from '@scenes/menuNavigation';

/**
 * scenes/SettingsScene.ts
 *
 * DXB-18A: Dedicated settings screen. Owns no gameplay — it surfaces the
 * existing AudioManager mute flag as a visible toggle. Esc and the Back
 * button return to the Hub (or ThemeSelect / ModeSelect if opened from
 * there). The M key still toggles mute globally.
 */

export interface SettingsSceneData {
  from?: SceneKey;
}

export class SettingsScene extends Phaser.Scene {
  private background!: ArcadeBackground;
  private titleText!: Phaser.GameObjects.Text;
  private subtitleText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private soundHint!: Phaser.GameObjects.Text;
  private soundButton?: TextButton;
  private backButton?: TextButton;
  private returnTo: SceneKey = SceneKeys.Hub;
  private unsubscribeViewport?: () => void;

  constructor() {
    super({ key: SceneKeys.Settings });
  }

  init(data: SettingsSceneData = {}): void {
    this.returnTo = resolveMenuReturn(data.from);
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
    this.soundHint = this.createSoundHint(
      snapshot.width,
      snapshot.height,
      theme.menu.descriptionColor,
    );
    this.soundButton = new TextButton(
      this,
      snapshot.width / 2,
      snapshot.height * 0.42,
      this.soundLabel(),
      () => this.toggleAudio(),
      {
        color: theme.menu.highlightColor,
        originX: 0.5,
        originY: 0.5,
        fontSize: Math.round(snapshot.height * 0.045),
      },
    );
    this.backButton = this.createBackButton(snapshot.width, snapshot.height, theme.menu.color);
    this.refreshSound();

    this.unsubscribeViewport = viewport.onChange((next) => this.handleViewportChange(next));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubscribeViewport?.();
      this.soundButton?.destroy();
      this.soundButton = undefined;
      this.backButton?.destroy();
      this.backButton = undefined;
    });

    this.input.keyboard?.on('keydown-M', () => {
      this.toggleAudio();
    });
    this.input.keyboard?.on('keydown-SPACE', () => this.toggleAudio());
    this.input.keyboard?.on('keydown-ENTER', () => this.toggleAudio());
    this.input.keyboard?.on('keydown-ESC', () => this.goBack());
  }

  private goBack(): void {
    this.scene.start(this.returnTo);
  }

  private audioEnabled(): boolean {
    try {
      return AudioManager.get().isEnabled();
    } catch {
      return true;
    }
  }

  private soundLabel(): string {
    return this.audioEnabled() ? 'Sound: On' : 'Sound: Off';
  }

  private soundDescription(): string {
    return this.audioEnabled() ? 'Tap to mute  ·  M also works' : 'Tap to unmute  ·  M also works';
  }

  private toggleAudio(): void {
    try {
      AudioManager.get().toggle();
    } catch {
      // AudioManager missing/unavailable — ignore the toggle.
    }
    this.refreshSound();
  }

  private refreshSound(): void {
    this.soundButton?.setText(this.soundLabel());
    this.soundHint.setText(this.soundDescription());
  }

  private createBackButton(viewportWidth: number, viewportHeight: number, color: string): TextButton {
    return new TextButton(
      this,
      viewportWidth * 0.08,
      viewportHeight * 0.955,
      '← Back',
      () => this.goBack(),
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
      .text(viewportWidth / 2, viewportHeight * 0.15, 'SETTINGS', {
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

  private createSoundHint(
    viewportWidth: number,
    viewportHeight: number,
    color: string,
  ): Phaser.GameObjects.Text {
    const fontSize = Math.round(viewportHeight * 0.022);
    return this.add
      .text(viewportWidth / 2, viewportHeight * 0.5, '', {
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
    const fontSize = Math.round(viewportHeight * 0.02);
    return this.add
      .text(viewportWidth * 0.92, viewportHeight * 0.955, 'Tap Sound to toggle', {
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

    this.titleText.setPosition(snapshot.width / 2, snapshot.height * 0.06);
    this.titleText.setFontSize(Math.round(snapshot.height * 0.07));

    this.subtitleText.setPosition(snapshot.width / 2, snapshot.height * 0.15);
    this.subtitleText.setFontSize(Math.round(snapshot.height * 0.03));

    this.soundButton?.setPosition(snapshot.width / 2, snapshot.height * 0.42);
    this.soundButton?.setFontSize(Math.round(snapshot.height * 0.045));
    this.soundHint.setPosition(snapshot.width / 2, snapshot.height * 0.5);
    this.soundHint.setFontSize(Math.round(snapshot.height * 0.022));

    this.hintText.setPosition(snapshot.width * 0.92, snapshot.height * 0.955);
    this.hintText.setFontSize(Math.round(snapshot.height * 0.02));

    this.backButton?.setPosition(snapshot.width * 0.08, snapshot.height * 0.955);
    this.backButton?.setFontSize(Math.round(snapshot.height * 0.022));
  }
}
