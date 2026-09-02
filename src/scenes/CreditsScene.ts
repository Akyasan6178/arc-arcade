import Phaser from 'phaser';
import { SceneKeys, type SceneKey } from '@systems/SceneKeys';
import { GameViewport, type ViewportSnapshot } from '@systems/GameViewport';
import { AudioManager } from '@systems/AudioManager';
import { playDxBallThemeMusic } from '@entities/dx-ball/audioCues';
import {
  CREATOR_NAME,
  formatGameVersion,
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
 * DXB-23/DXB-25: Hub-accessible credits. Card layout for studio,
 * creator, and version. Owns no gameplay.
 */

export interface CreditsSceneData {
  from?: SceneKey;
}

interface CreditCard {
  chrome: Phaser.GameObjects.Graphics;
  kicker: Phaser.GameObjects.Text;
  name: Phaser.GameObjects.Text;
}

export class CreditsScene extends Phaser.Scene {
  private background!: ArcadeBackground;
  private titleText!: Phaser.GameObjects.Text;
  private subtitleText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private versionText!: Phaser.GameObjects.Text;
  private cards: CreditCard[] = [];
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
    this.titleText = createMenuTitle(this, snapshot, theme.hud.title, GAME_TITLE.toUpperCase());
    this.subtitleText = createMenuSubtitle(
      this,
      snapshot,
      theme.hud.subtitle,
      formatGameVersion(),
    );
    this.hintText = createMenuHint(this, snapshot, theme.hud.hint, 'Tap Back to return');
    this.cards = [
      this.createCard(theme, 'POWERED BY', STUDIO_NAME),
      this.createCard(theme, 'CREATED BY', CREATOR_NAME),
    ];
    this.versionText = this.add
      .text(snapshot.width / 2, 0, `${formatGameVersion()}  ·  Phaser 4`, {
        fontFamily: MENU_FONT_FAMILY,
        fontSize: `${menuFontSize(snapshot.height, 0.018, 12)}px`,
        color: theme.menu.mutedColor,
        align: 'center',
        stroke: MENU_STROKE,
        strokeThickness: 3,
      })
      .setOrigin(0.5, 0)
      .setShadow(1, 2, '#000000', 3, true, true)
      .setDepth(20);
    this.backButton = this.createBackButton(snapshot, theme.menu.color);
    this.layoutCards(snapshot, theme);

    this.unsubscribeViewport = viewport.onChange((next) => this.handleViewportChange(next));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubscribeViewport?.();
      this.backButton?.destroy();
      this.backButton = undefined;
      for (const card of this.cards) {
        card.chrome.destroy();
        card.kicker.destroy();
        card.name.destroy();
      }
      this.cards = [];
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

  private createCard(theme: ThemeDefinition, kicker: string, name: string): CreditCard {
    return {
      chrome: this.add.graphics().setDepth(20),
      kicker: this.add
        .text(0, 0, kicker, {
          fontFamily: MENU_FONT_FAMILY,
          fontSize: '12px',
          color: theme.hud.subtitle,
          fontStyle: 'bold',
          align: 'center',
          stroke: MENU_STROKE,
          strokeThickness: 3,
        })
        .setOrigin(0.5, 0)
        .setDepth(21),
      name: this.add
        .text(0, 0, name, {
          fontFamily: MENU_FONT_FAMILY,
          fontSize: '22px',
          color: theme.hud.title,
          fontStyle: 'bold',
          align: 'center',
          stroke: MENU_STROKE,
          strokeThickness: 5,
        })
        .setOrigin(0.5, 0)
        .setShadow(1, 2, '#000000', 3, true, true)
        .setDepth(21),
    };
  }

  private layoutCards(snapshot: ViewportSnapshot, theme: ThemeDefinition): void {
    const originY = menuContentY(snapshot);
    const cardW = Math.min(snapshot.width * 0.72, 520);
    const cardH = snapshot.height * 0.16;
    const gap = snapshot.height * 0.03;
    const x = (snapshot.width - cardW) / 2;
    const accent = Number.parseInt(theme.overlay.accent.replace('#', ''), 16) || 0xff2a6d;

    this.cards.forEach((card, index) => {
      const y = originY + index * (cardH + gap);
      const radius = Math.max(8, cardH * 0.12);
      card.chrome.clear();
      card.chrome.fillStyle(theme.overlay.panel, 0.92);
      card.chrome.fillRoundedRect(x, y, cardW, cardH, radius);
      card.chrome.lineStyle(2.5, theme.overlay.panelStroke, 1);
      card.chrome.strokeRoundedRect(x, y, cardW, cardH, radius);
      card.chrome.fillStyle(accent, 1);
      card.chrome.fillRect(x + cardW * 0.34, y, cardW * 0.32, 3);
      card.kicker.setPosition(snapshot.width / 2, y + cardH * 0.18);
      card.kicker.setFontSize(menuFontSize(snapshot.height, 0.018, 12));
      card.name.setPosition(snapshot.width / 2, y + cardH * 0.42);
      card.name.setFontSize(menuFontSize(snapshot.height, 0.038, 20));
    });

    this.versionText.setPosition(
      snapshot.width / 2,
      originY + this.cards.length * (cardH + gap) + 8,
    );
    this.versionText.setFontSize(menuFontSize(snapshot.height, 0.018, 12));
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
    layoutMenuSubtitle(this.subtitleText, snapshot);
    layoutMenuHint(this.hintText, snapshot);
    this.layoutCards(snapshot, theme);
    this.backButton?.setPosition(menuBackX(snapshot), menuHintY(snapshot));
    this.backButton?.setFontSize(
      menuFontSize(snapshot.height, MENU_LAYOUT.backFontRatio, MENU_LAYOUT.backMinPx),
    );
  }
}
