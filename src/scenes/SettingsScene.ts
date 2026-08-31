import Phaser from 'phaser';
import { SceneKeys, type SceneKey } from '@systems/SceneKeys';
import { GameViewport, type ViewportSnapshot } from '@systems/GameViewport';
import { AudioManager } from '@systems/AudioManager';
import { getTheme } from '@entities/dx-ball/Theme';
import { loadPlayableThemeId } from '@entities/dx-ball/Progress';
import { ArcadeBackground } from '@ui/ArcadeBackground';
import { TextButton } from '@ui/TextButton';
import { resolveMenuReturn } from '@scenes/menuNavigation';
import {
  MENU_FONT_FAMILY,
  MENU_LAYOUT,
  MENU_STROKE,
  createMenuHint,
  createMenuSubtitle,
  createMenuTitle,
  layoutMenuHint,
  layoutMenuSubtitle,
  layoutMenuTitle,
  menuBackX,
  menuFontSize,
  menuHintY,
} from '@ui/menuLayout';

/**
 * scenes/SettingsScene.ts
 *
 * DXB-18A: Dedicated settings screen. Owns no gameplay — it surfaces the
 * existing AudioManager mute flag as a visible toggle. Esc and the Back
 * button return to the Hub (or ThemeSelect / ModeSelect if opened from
 * there). The M key still toggles mute globally.
 *
 * DXB-20: shared menu chrome.
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
    this.titleText = createMenuTitle(this, snapshot, theme.hud.title);
    this.subtitleText = createMenuSubtitle(this, snapshot, theme.hud.subtitle, 'SETTINGS');
    this.hintText = createMenuHint(this, snapshot, theme.hud.hint, 'Tap Sound to toggle');
    this.soundHint = this.createSoundHint(snapshot, theme.menu.descriptionColor);
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
        fontSize: menuFontSize(snapshot.height, 0.045, 20),
      },
    );
    this.backButton = this.createBackButton(snapshot, theme.menu.color);
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
    return this.audioEnabled() ? 'Tap to mute' : 'Tap to unmute';
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

  private createBackButton(snapshot: ViewportSnapshot, color: string): TextButton {
    return new TextButton(
      this,
      menuBackX(snapshot),
      menuHintY(snapshot),
      '← Back',
      () => this.goBack(),
      {
        color,
        originX: 0,
        originY: 1,
        fontSize: menuFontSize(snapshot.height, MENU_LAYOUT.backFontRatio, MENU_LAYOUT.backMinPx),
        align: 'left',
      },
    );
  }

  private createSoundHint(snapshot: ViewportSnapshot, color: string): Phaser.GameObjects.Text {
    return this.add
      .text(snapshot.width / 2, snapshot.height * 0.5, '', {
        fontFamily: MENU_FONT_FAMILY,
        fontSize: `${menuFontSize(snapshot.height, 0.022, 13)}px`,
        color,
        align: 'center',
        stroke: MENU_STROKE,
        strokeThickness: 3,
      })
      .setOrigin(0.5, 0)
      .setShadow(1, 2, '#000000', 3, true, true)
      .setDepth(20);
  }

  private handleViewportChange(snapshot: ViewportSnapshot): void {
    this.cameras.main.setViewport(0, 0, snapshot.width, snapshot.height);
    this.background.resize(snapshot.width, snapshot.height);

    layoutMenuTitle(this.titleText, snapshot);
    layoutMenuSubtitle(this.subtitleText, snapshot);

    this.soundButton?.setPosition(snapshot.width / 2, snapshot.height * 0.42);
    this.soundButton?.setFontSize(menuFontSize(snapshot.height, 0.045, 20));
    this.soundHint.setPosition(snapshot.width / 2, snapshot.height * 0.5);
    this.soundHint.setFontSize(menuFontSize(snapshot.height, 0.022, 13));

    layoutMenuHint(this.hintText, snapshot);
    this.backButton?.setPosition(menuBackX(snapshot), menuHintY(snapshot));
    this.backButton?.setFontSize(
      menuFontSize(snapshot.height, MENU_LAYOUT.backFontRatio, MENU_LAYOUT.backMinPx),
    );
  }
}
