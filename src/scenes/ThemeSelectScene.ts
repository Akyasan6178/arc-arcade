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

/**
 * scenes/ThemeSelectScene.ts
 *
 * DXB-15: Pre-run theme picker. Sits between `PreloadScene` and
 * `ModeSelectScene` so every session starts with an explicit visual
 * identity. Owns no gameplay — it paints a live-preview backdrop, a
 * title, and a `SelectMenu`, then starts `ModeSelectScene`.
 *
 * Returning here from ModeSelect (Esc) lets the player change theme
 * without starting a run. U opens the unlockables / achievements
 * catalog (DXB-16). S opens statistics / leaderboards (DXB-17).
 * Locked themes can be previewed but not confirmed.
 */
export class ThemeSelectScene extends Phaser.Scene {
  private background!: ArcadeBackground;
  private titleText!: Phaser.GameObjects.Text;
  private subtitleText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
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
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.unsubscribeViewport?.());

    this.input.keyboard?.on('keydown-M', () => {
      try {
        AudioManager.get().toggle();
      } catch {
        // AudioManager missing/unavailable — ignore the toggle.
      }
    });

    this.input.keyboard?.on('keydown-U', () => {
      this.scene.start(SceneKeys.Unlockables, { from: SceneKeys.ThemeSelect });
    });

    this.input.keyboard?.on('keydown-S', () => {
      this.scene.start(SceneKeys.Stats, { from: SceneKeys.ThemeSelect });
    });
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
        viewportWidth / 2,
        viewportHeight * 0.9,
        'Arrows to preview  ·  Space / Enter / click to choose  ·  U unlockables  ·  S stats',
        {
          fontFamily: 'Trebuchet MS, Segoe UI, sans-serif',
          fontSize: `${fontSize}px`,
          color: hud.hint,
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
      ThemeSelectScene.menuOriginY(snapshot.height),
    );
  }

  private static menuOriginY(viewportHeight: number): number {
    return viewportHeight * 0.34;
  }
}
