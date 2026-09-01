import Phaser from 'phaser';
import { SceneKeys, type SceneKey } from '@systems/SceneKeys';
import { GameViewport, type ViewportSnapshot } from '@systems/GameViewport';
import { AudioManager } from '@systems/AudioManager';
import { playDxBallThemeMusic } from '@entities/dx-ball/audioCues';
import { formatGameVersion, GAME_TITLE } from '@entities/dx-ball/Version';
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
  menuContentY,
  menuFontSize,
  menuHintY,
} from '@ui/menuLayout';

/**
 * scenes/CreditsScene.ts
 *
 * DXB-23: Hub-accessible credits. Shows title, version, and development
 * credits in the existing menu chrome. Owns no gameplay.
 */

export interface CreditsSceneData {
  from?: SceneKey;
}

export class CreditsScene extends Phaser.Scene {
  private background!: ArcadeBackground;
  private titleText!: Phaser.GameObjects.Text;
  private subtitleText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private bodyText!: Phaser.GameObjects.Text;
  private backButton?: TextButton;
  private returnTo: SceneKey = SceneKeys.Hub;
  private unsubscribeViewport?: () => void;

  constructor() {
    super({ key: SceneKeys.Credits });
  }

  init(data: CreditsSceneData = {}): void {
    this.returnTo = resolveMenuReturn(data.from);
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
      `CREDITS  ·  ${formatGameVersion()}`,
    );
    this.hintText = createMenuHint(this, snapshot, theme.hud.hint, 'Tap Back to return');
    this.bodyText = this.add
      .text(snapshot.width / 2, menuContentY(snapshot), this.creditsCopy(), {
        fontFamily: MENU_FONT_FAMILY,
        fontSize: `${menuFontSize(snapshot.height, 0.024, 14)}px`,
        color: theme.menu.color,
        align: 'center',
        stroke: MENU_STROKE,
        strokeThickness: 4,
        wordWrap: { width: snapshot.width * 0.78 },
        lineSpacing: 8,
      })
      .setOrigin(0.5, 0)
      .setShadow(1, 2, '#000000', 3, true, true)
      .setDepth(20);
    this.backButton = this.createBackButton(snapshot, theme.menu.color);

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
    this.input.keyboard?.on('keydown-ESC', () => this.goBack());
  }

  private creditsCopy(): string {
    return [
      GAME_TITLE,
      formatGameVersion(),
      '',
      'An Arc Arcade title',
      'Phaser 4  ·  TypeScript  ·  Vite',
      '',
      'Design & Development',
      'Arc Arcade',
      '',
      'Playtested locally. No accounts, no cloud saves.',
    ].join('\n');
  }

  private goBack(): void {
    this.scene.start(this.returnTo);
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

  private handleViewportChange(snapshot: ViewportSnapshot): void {
    this.cameras.main.setViewport(0, 0, snapshot.width, snapshot.height);
    this.background.resize(snapshot.width, snapshot.height);
    layoutMenuTitle(this.titleText, snapshot);
    layoutMenuSubtitle(this.subtitleText, snapshot);
    layoutMenuHint(this.hintText, snapshot);
    this.bodyText.setPosition(snapshot.width / 2, menuContentY(snapshot));
    this.bodyText.setFontSize(menuFontSize(snapshot.height, 0.024, 14));
    this.bodyText.setWordWrapWidth(snapshot.width * 0.78);
    this.backButton?.setPosition(menuBackX(snapshot), menuHintY(snapshot));
    this.backButton?.setFontSize(
      menuFontSize(snapshot.height, MENU_LAYOUT.backFontRatio, MENU_LAYOUT.backMinPx),
    );
  }
}
