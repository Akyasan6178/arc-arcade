import Phaser from 'phaser';
import { SceneKeys } from '@systems/SceneKeys';
import { GameViewport, type ViewportSnapshot } from '@systems/GameViewport';
import { AudioManager } from '@systems/AudioManager';
import { playDxBallThemeMusic } from '@entities/dx-ball/audioCues';
import { GAME_MODES, type GameModeId } from '@entities/dx-ball/GameMode';
import { getTheme } from '@entities/dx-ball/Theme';
import { loadPlayableThemeId } from '@entities/dx-ball/Progress';
import { ArcadeBackground } from '@ui/ArcadeBackground';
import { SelectMenu } from '@ui/SelectMenu';
import { TextButton } from '@ui/TextButton';
import { bindOptionalMenuShortcuts } from '@scenes/menuNavigation';
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
  menuExtraLineY,
  menuFontSize,
  menuHintY,
  menuOriginY,
} from '@ui/menuLayout';

/**
 * scenes/ModeSelectScene.ts
 *
 * DXB-14: The pre-run mode picker. Sits between ThemeSelect (DXB-15)
 * and `MainScene` so every run starts with an explicit Classic / Time
 * Attack / Endless choice. Owns no gameplay — it only paints the
 * themed backdrop, a title, a `SelectMenu`, and a visible Back button
 * to ThemeSelect, then starts `MainScene` with `{ mode }`.
 *
 * Esc and Back return to ThemeSelect. Optional G / S / U shortcuts
 * still open Garage / Stats / Achievements. DXB-20: shared menu chrome.
 */
export class ModeSelectScene extends Phaser.Scene {
  private background!: ArcadeBackground;
  private titleText!: Phaser.GameObjects.Text;
  private subtitleText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private themeHintText!: Phaser.GameObjects.Text;
  private backButton?: TextButton;
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
    playDxBallThemeMusic(theme.id);
    this.titleText = createMenuTitle(this, snapshot, theme.hud.title);
    this.subtitleText = createMenuSubtitle(this, snapshot, theme.hud.subtitle, 'SELECT MODE');
    this.themeHintText = this.createThemeHint(snapshot, theme.label, theme.hud.hint);
    this.hintText = createMenuHint(this, snapshot, theme.hud.hint, 'Tap a mode to start');
    this.backButton = this.createBackButton(snapshot, theme.menu.color);
    this.menu = new SelectMenu(
      this,
      snapshot.width,
      snapshot.height,
      menuOriginY(snapshot),
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
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubscribeViewport?.();
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

    this.input.keyboard?.on('keydown-ESC', () => {
      this.scene.start(SceneKeys.ThemeSelect);
    });

    bindOptionalMenuShortcuts(this, SceneKeys.ModeSelect);
  }

  private createThemeHint(
    snapshot: ViewportSnapshot,
    themeLabel: string,
    color: string,
  ): Phaser.GameObjects.Text {
    return this.add
      .text(
        snapshot.width / 2,
        menuExtraLineY(snapshot),
        `Theme: ${themeLabel}  ·  Back to change`,
        {
          fontFamily: MENU_FONT_FAMILY,
          fontSize: `${menuFontSize(snapshot.height, MENU_LAYOUT.extraLineFontRatio, MENU_LAYOUT.extraLineMinPx)}px`,
          color,
          align: 'center',
          stroke: MENU_STROKE,
          strokeThickness: 3,
        },
      )
      .setOrigin(0.5, 0)
      .setShadow(1, 2, '#000000', 3, true, true)
      .setDepth(20);
  }

  private createBackButton(snapshot: ViewportSnapshot, color: string): TextButton {
    return new TextButton(
      this,
      menuBackX(snapshot),
      menuHintY(snapshot),
      '← Back',
      () => this.scene.start(SceneKeys.ThemeSelect),
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
    this.themeHintText.setPosition(snapshot.width / 2, menuExtraLineY(snapshot));
    this.themeHintText.setFontSize(
      menuFontSize(snapshot.height, MENU_LAYOUT.extraLineFontRatio, MENU_LAYOUT.extraLineMinPx),
    );
    layoutMenuHint(this.hintText, snapshot);

    this.backButton?.setPosition(menuBackX(snapshot), menuHintY(snapshot));
    this.backButton?.setFontSize(
      menuFontSize(snapshot.height, MENU_LAYOUT.backFontRatio, MENU_LAYOUT.backMinPx),
    );

    this.menu.resize(snapshot.width, snapshot.height, menuOriginY(snapshot));
  }
}
