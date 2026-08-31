import Phaser from 'phaser';
import { SceneKeys } from '@systems/SceneKeys';
import { GameViewport, type ViewportSnapshot } from '@systems/GameViewport';
import { AudioManager } from '@systems/AudioManager';
import { playDxBallThemeMusic } from '@entities/dx-ball/audioCues';
import {
  THEME_INFOS,
  getTheme,
  saveThemeId,
  type ThemeId,
} from '@entities/dx-ball/Theme';
import {
  getThemeUnlockHint,
  isThemeUnlocked,
  loadPlayableThemeId,
} from '@entities/dx-ball/Progress';
import { ArcadeBackground } from '@ui/ArcadeBackground';
import { SelectMenu } from '@ui/SelectMenu';
import { TextButton } from '@ui/TextButton';
import { bindOptionalMenuShortcuts } from '@scenes/menuNavigation';
import {
  MENU_LAYOUT,
  createMenuHint,
  createMenuSubtitle,
  createMenuTitle,
  layoutMenuHint,
  layoutMenuSubtitle,
  layoutMenuTitle,
  menuBackX,
  menuFontSize,
  menuHintY,
  menuOriginY,
} from '@ui/menuLayout';

/**
 * scenes/ThemeSelectScene.ts
 *
 * DXB-15: Pre-run theme picker. Sits between the Hub (DXB-18A) and
 * `ModeSelectScene` so a Play session still starts with an explicit
 * visual identity. Owns no gameplay — it paints a live-preview backdrop,
 * a title, a `SelectMenu`, and a visible Back button to the Hub.
 *
 * Locked themes can be previewed but not confirmed. Optional G / S / U
 * shortcuts still open Garage / Stats / Achievements. DXB-19: the list
 * is `THEME_INFOS` (six themes). DXB-20: shared menu chrome so six rows
 * stay on-screen with the same Back / hint language as every other menu.
 */
export class ThemeSelectScene extends Phaser.Scene {
  private background!: ArcadeBackground;
  private titleText!: Phaser.GameObjects.Text;
  private subtitleText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private backButton?: TextButton;
  private menu!: SelectMenu<ThemeId>;
  private unsubscribeViewport?: () => void;

  constructor() {
    super({ key: SceneKeys.ThemeSelect });
  }

  create(): void {
    const viewport = GameViewport.get();
    const snapshot = viewport.getSnapshot();
    const currentId = loadPlayableThemeId();
    const current = getTheme(currentId);

    this.cameras.main.setViewport(0, 0, snapshot.width, snapshot.height);
    this.cameras.main.setBackgroundColor(current.backdrop.canvasBackground);
    this.background = new ArcadeBackground(this, snapshot.width, snapshot.height, current.backdrop);
    playDxBallThemeMusic(currentId);
    this.titleText = createMenuTitle(this, snapshot, current.hud.title);
    this.subtitleText = createMenuSubtitle(this, snapshot, current.hud.subtitle, 'SELECT THEME');
    this.hintText = createMenuHint(this, snapshot, current.hud.hint, 'Tap a theme to choose');
    this.backButton = this.createBackButton(snapshot, current.menu.color);
    this.menu = new SelectMenu(
      this,
      snapshot.width,
      snapshot.height,
      menuOriginY(snapshot, true),
      THEME_INFOS.map((theme) => {
        const unlocked = isThemeUnlocked(theme.id);
        return {
          id: theme.id,
          title: theme.label,
          description: unlocked ? theme.description : getThemeUnlockHint(theme.id),
          locked: !unlocked,
        };
      }),
      (theme) => this.confirmTheme(theme),
      {
        initialIndex: Math.max(0, THEME_INFOS.findIndex((theme) => theme.id === currentId)),
        onHighlight: (theme) => this.previewTheme(theme),
        color: current.menu.color,
        highlightColor: current.menu.highlightColor,
        descriptionColor: current.menu.descriptionColor,
        mutedColor: current.menu.mutedColor,
        titleFontSizeRatio: 0.028,
        descriptionFontSizeRatio: 0.016,
        rowHeightRatio: 0.1,
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
      this.scene.start(SceneKeys.Hub);
    });

    bindOptionalMenuShortcuts(this, SceneKeys.ThemeSelect);
  }

  private confirmTheme(id: ThemeId): void {
    if (!isThemeUnlocked(id)) {
      return;
    }
    saveThemeId(id);
    this.scene.start(SceneKeys.ModeSelect);
  }

  private previewTheme(id: ThemeId): void {
    const theme = getTheme(id);
    this.cameras.main.setBackgroundColor(theme.backdrop.canvasBackground);
    this.background.applyTheme(theme.backdrop);
    this.titleText.setColor(theme.hud.title);
    this.subtitleText.setColor(theme.hud.subtitle);
    this.hintText.setColor(theme.hud.hint);
    this.backButton?.setColor(theme.menu.color, theme.menu.highlightColor);
    playDxBallThemeMusic(id);
  }

  private createBackButton(snapshot: ViewportSnapshot, color: string): TextButton {
    return new TextButton(
      this,
      menuBackX(snapshot),
      menuHintY(snapshot),
      '← Back',
      () => this.scene.start(SceneKeys.Hub),
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

    this.backButton?.setPosition(menuBackX(snapshot), menuHintY(snapshot));
    this.backButton?.setFontSize(
      menuFontSize(snapshot.height, MENU_LAYOUT.backFontRatio, MENU_LAYOUT.backMinPx),
    );

    this.menu.resize(snapshot.width, snapshot.height, menuOriginY(snapshot, true));
  }
}
