import Phaser from 'phaser';
import { SceneKeys, type SceneKey } from '@systems/SceneKeys';
import { GameViewport, type ViewportSnapshot } from '@systems/GameViewport';
import { AudioManager } from '@systems/AudioManager';
import { playDxBallThemeMusic } from '@entities/dx-ball/audioCues';
import {
  CREATOR_NAME,
  formatShortVersion,
  GAME_TITLE,
  STUDIO_NAME,
} from '@entities/dx-ball/Version';
import { getTheme, type ThemeDefinition } from '@entities/dx-ball/Theme';
import { loadPlayableThemeId } from '@entities/dx-ball/Progress';
import { ArcadeBackground } from '@ui/ArcadeBackground';
import { TextButton } from '@ui/TextButton';
import { resolveMenuReturn } from '@scenes/menuNavigation';
import {
  MENU_FONT_FAMILY,
  MENU_LAYOUT,
  MENU_STROKE,
  createMenuTitle,
  layoutMenuTitle,
  menuBackX,
  menuContentY,
  menuFontSize,
  menuHintY,
} from '@ui/menuLayout';

/**
 * scenes/CreditsScene.ts
 *
 * DXB-26: Compact credits card. Created By Haydar Talha Akyasan,
 * Powered By Marka Mutfağı, version v0.26.0. Owns no gameplay.
 */

export interface CreditsSceneData {
  from?: SceneKey;
}

export class CreditsScene extends Phaser.Scene {
  private background!: ArcadeBackground;
  private titleText!: Phaser.GameObjects.Text;
  private card!: Phaser.GameObjects.Graphics;
  private lines: Phaser.GameObjects.Text[] = [];
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
    this.titleText = createMenuTitle(this, snapshot, theme.hud.title, 'CREDITS');
    this.card = this.add.graphics().setDepth(20);
    this.lines = [
      this.makeLine(theme.hud.title, GAME_TITLE, true),
      this.makeLine(theme.hud.subtitle, 'Created By'),
      this.makeLine(theme.hud.title, CREATOR_NAME, true),
      this.makeLine(theme.hud.subtitle, 'Powered By'),
      this.makeLine(theme.hud.title, STUDIO_NAME, true),
      this.makeLine(theme.hud.subtitle, 'Version'),
      this.makeLine(theme.menu.highlightColor, formatShortVersion(), true),
    ];
    this.backButton = this.createBackButton(snapshot, theme.menu.color);
    this.layoutCard(snapshot, theme);

    this.unsubscribeViewport = viewport.onChange((next) => this.handleViewportChange(next));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubscribeViewport?.();
      this.backButton?.destroy();
      this.backButton = undefined;
      this.card.destroy();
      for (const line of this.lines) {
        line.destroy();
      }
      this.lines = [];
    });

    this.input.keyboard?.on('keydown-M', () => {
      try {
        AudioManager.get().toggle();
      } catch {
        // ignore
      }
    });
    this.input.keyboard?.on('keydown-ESC', () => this.goBack());
  }

  private makeLine(color: string, text: string, emph = false): Phaser.GameObjects.Text {
    return this.add
      .text(0, 0, text, {
        fontFamily: MENU_FONT_FAMILY,
        fontSize: emph ? '20px' : '12px',
        color,
        fontStyle: 'bold',
        align: 'center',
        stroke: MENU_STROKE,
        strokeThickness: emph ? 5 : 3,
      })
      .setOrigin(0.5, 0)
      .setShadow(1, 2, '#000000', 3, true, true)
      .setDepth(21);
  }

  private layoutCard(snapshot: ViewportSnapshot, theme: ThemeDefinition): void {
    const cardW = Math.min(snapshot.width * 0.62, 420);
    const cardH = Math.min(snapshot.height * 0.58, 360);
    const x = (snapshot.width - cardW) / 2;
    const y = menuContentY(snapshot) + snapshot.height * 0.02;
    const radius = 14;
    const accent = Number.parseInt(theme.overlay.accent.replace('#', ''), 16) || 0xff2a6d;

    this.card.clear();
    this.card.fillStyle(theme.overlay.panel, 0.94);
    this.card.fillRoundedRect(x, y, cardW, cardH, radius);
    this.card.lineStyle(2, theme.overlay.panelStroke, 1);
    this.card.strokeRoundedRect(x, y, cardW, cardH, radius);
    this.card.fillStyle(accent, 1);
    this.card.fillRect(x + cardW * 0.34, y, cardW * 0.32, 3);

    const sizes = [0.042, 0.018, 0.028, 0.018, 0.028, 0.018, 0.026];
    const weights = [1.35, 0.85, 1.15, 0.85, 1.15, 0.85, 1.1];
    const total = weights.reduce((sum, w) => sum + w, 0);
    let cursor = y + cardH * 0.1;
    this.lines.forEach((line, index) => {
      line.setPosition(snapshot.width / 2, cursor);
      line.setFontSize(menuFontSize(snapshot.height, sizes[index], index % 2 === 0 ? 16 : 11));
      cursor += (cardH * 0.78 * weights[index]) / total;
    });
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
    const theme = getTheme(loadPlayableThemeId());
    this.cameras.main.setViewport(0, 0, snapshot.width, snapshot.height);
    this.background.resize(snapshot.width, snapshot.height);
    layoutMenuTitle(this.titleText, snapshot);
    this.layoutCard(snapshot, theme);
    this.backButton?.setPosition(menuBackX(snapshot), menuHintY(snapshot));
    this.backButton?.setFontSize(
      menuFontSize(snapshot.height, MENU_LAYOUT.backFontRatio, MENU_LAYOUT.backMinPx),
    );
  }
}
