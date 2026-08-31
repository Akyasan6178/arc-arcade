import Phaser from 'phaser';
import { SceneKeys } from '@systems/SceneKeys';
import { GameViewport, type ViewportSnapshot } from '@systems/GameViewport';
import { AudioManager } from '@systems/AudioManager';
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

/**
 * scenes/ThemeSelectScene.ts
 *
 * DXB-15: Pre-run theme picker. Sits between the Hub (DXB-18A) and
 * `ModeSelectScene` so a Play session still starts with an explicit
 * visual identity. Owns no gameplay — it paints a live-preview backdrop,
 * a title, a `SelectMenu`, and a visible Back button to the Hub.
 *
 * Locked themes can be previewed but not confirmed. Optional G / S / U
 * shortcuts still open Garage / Stats / Achievements.
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
    this.titleText = this.createTitle(snapshot.width, snapshot.height, current.hud);
    this.subtitleText = this.createSubtitle(snapshot.width, snapshot.height, current.hud);
    this.hintText = this.createHint(snapshot.width, snapshot.height, current.hud);
    this.backButton = this.createBackButton(snapshot.width, snapshot.height, current.menu.color);
    this.menu = new SelectMenu(
      this,
      snapshot.width,
      snapshot.height,
      ThemeSelectScene.menuOriginY(snapshot.height),
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
  }

  private createTitle(
    viewportWidth: number,
    viewportHeight: number,
    hud: { title: string },
  ): Phaser.GameObjects.Text {
    const fontSize = Math.round(viewportHeight * 0.08);
    return this.add
      .text(viewportWidth / 2, viewportHeight * 0.12, 'DX-BALL', {
        fontFamily: 'Trebuchet MS, Segoe UI, sans-serif',
        fontSize: `${fontSize}px`,
        color: hud.title,
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
    hud: { subtitle: string },
  ): Phaser.GameObjects.Text {
    const fontSize = Math.round(viewportHeight * 0.032);
    return this.add
      .text(viewportWidth / 2, viewportHeight * 0.22, 'SELECT THEME', {
        fontFamily: 'Trebuchet MS, Segoe UI, sans-serif',
        fontSize: `${fontSize}px`,
        color: hud.subtitle,
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
    hud: { hint: string },
  ): Phaser.GameObjects.Text {
    const fontSize = Math.round(viewportHeight * 0.022);
    return this.add
      .text(
        viewportWidth * 0.92,
        viewportHeight * 0.955,
        'Arrows to preview  ·  tap to choose',
        {
          fontFamily: 'Trebuchet MS, Segoe UI, sans-serif',
          fontSize: `${fontSize}px`,
          color: hud.hint,
          align: 'right',
          stroke: '#0b1320',
          strokeThickness: 3,
        },
      )
      .setOrigin(1, 1)
      .setShadow(1, 2, '#000000', 3, true, true)
      .setDepth(20);
  }

  private createBackButton(
    viewportWidth: number,
    viewportHeight: number,
    color: string,
  ): TextButton {
    return new TextButton(
      this,
      viewportWidth * 0.08,
      viewportHeight * 0.955,
      '← Back',
      () => this.scene.start(SceneKeys.Hub),
      {
        color,
        originX: 0,
        originY: 1,
        fontSize: Math.round(viewportHeight * 0.022),
        align: 'left',
      },
    );
  }

  private handleViewportChange(snapshot: ViewportSnapshot): void {
    this.cameras.main.setViewport(0, 0, snapshot.width, snapshot.height);
    this.background.resize(snapshot.width, snapshot.height);

    this.titleText.setPosition(snapshot.width / 2, snapshot.height * 0.12);
    this.titleText.setFontSize(Math.round(snapshot.height * 0.08));

    this.subtitleText.setPosition(snapshot.width / 2, snapshot.height * 0.22);
    this.subtitleText.setFontSize(Math.round(snapshot.height * 0.032));

    this.hintText.setPosition(snapshot.width * 0.92, snapshot.height * 0.955);
    this.hintText.setFontSize(Math.round(snapshot.height * 0.018));

    this.backButton?.setPosition(snapshot.width * 0.08, snapshot.height * 0.955);
    this.backButton?.setFontSize(Math.round(snapshot.height * 0.022));

    this.menu.resize(
      snapshot.width,
      snapshot.height,
      ThemeSelectScene.menuOriginY(snapshot.height),
    );
  }

  private static menuOriginY(viewportHeight: number): number {
    return viewportHeight * 0.34;
  }
}
