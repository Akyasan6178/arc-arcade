import Phaser from 'phaser';
import { SceneKeys, type SceneKey } from '@systems/SceneKeys';
import { GameViewport, type ViewportSnapshot } from '@systems/GameViewport';
import { AudioManager } from '@systems/AudioManager';
import { playDxBallThemeMusic } from '@entities/dx-ball/audioCues';
import { CURRENT_RELEASE_LABEL, RELEASE_NOTES } from '@entities/dx-ball/ReleaseNotes';
import { getTheme, type ThemeDefinition } from '@entities/dx-ball/Theme';
import { loadPlayableThemeId } from '@entities/dx-ball/Progress';
import { ArcadeBackground } from '@ui/ArcadeBackground';
import { TextButton } from '@ui/TextButton';
import { resolveMenuReturn } from '@scenes/menuNavigation';
import {
  MENU_FONT_FAMILY,
  MENU_LAYOUT,
  MENU_STROKE,
  createMenuSubtitle,
  createMenuTitle,
  layoutMenuSubtitle,
  layoutMenuTitle,
  menuBackX,
  menuContentY,
  menuFontSize,
  menuHintY,
} from '@ui/menuLayout';

/**
 * scenes/ReleaseNotesScene.ts
 *
 * DXB-26: Player-facing What's New. Compact milestone cards — not git
 * history. Visible Back. Owns no gameplay.
 */

export interface ReleaseNotesSceneData {
  from?: SceneKey;
}

interface NoteCard {
  chrome: Phaser.GameObjects.Graphics;
  version: Phaser.GameObjects.Text;
  title: Phaser.GameObjects.Text;
  body: Phaser.GameObjects.Text;
}

export class ReleaseNotesScene extends Phaser.Scene {
  private background!: ArcadeBackground;
  private titleText!: Phaser.GameObjects.Text;
  private subtitleText!: Phaser.GameObjects.Text;
  private cards: NoteCard[] = [];
  private backButton?: TextButton;
  private prevButton?: TextButton;
  private nextButton?: TextButton;
  private page = 0;
  private pageSize = 3;
  private returnTo: SceneKey = SceneKeys.Hub;
  private unsubscribeViewport?: () => void;

  constructor() {
    super({ key: SceneKeys.ReleaseNotes });
  }

  init(data: ReleaseNotesSceneData = {}): void {
    this.returnTo = resolveMenuReturn(data.from);
    this.page = 0;
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
      `WHAT'S NEW  ·  ${CURRENT_RELEASE_LABEL}`,
    );
    this.backButton = this.createNav(snapshot, theme.menu.color, '← Back', 0, () => this.goBack());
    this.prevButton = this.createNav(snapshot, theme.menu.color, '← Previous', 0.5, () => this.shiftPage(-1));
    this.nextButton = this.createNav(snapshot, theme.menu.highlightColor, 'Next →', 1, () => this.shiftPage(1));
    this.rebuildCards(snapshot, theme);

    this.unsubscribeViewport = viewport.onChange((next) => this.handleViewportChange(next));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubscribeViewport?.();
      this.clearCards();
      this.backButton?.destroy();
      this.prevButton?.destroy();
      this.nextButton?.destroy();
      this.backButton = undefined;
      this.prevButton = undefined;
      this.nextButton = undefined;
    });

    this.input.keyboard?.on('keydown-M', () => {
      try {
        AudioManager.get().toggle();
      } catch {
        // ignore
      }
    });
    this.input.keyboard?.on('keydown-ESC', () => this.goBack());
    this.input.keyboard?.on('keydown-LEFT', () => this.shiftPage(-1));
    this.input.keyboard?.on('keydown-RIGHT', () => this.shiftPage(1));
  }

  private pageCount(): number {
    return Math.max(1, Math.ceil(RELEASE_NOTES.length / this.pageSize));
  }

  private shiftPage(delta: number): void {
    this.page = Phaser.Math.Clamp(this.page + delta, 0, this.pageCount() - 1);
    const snapshot = GameViewport.get().getSnapshot();
    this.rebuildCards(snapshot, getTheme(loadPlayableThemeId()));
  }

  private rebuildCards(snapshot: ViewportSnapshot, theme: ThemeDefinition): void {
    this.clearCards();
    this.pageSize = snapshot.height > snapshot.width ? 2 : 3;
    const start = this.page * this.pageSize;
    const notes = RELEASE_NOTES.slice(start, start + this.pageSize);
    const originY = menuContentY(snapshot);
    const cardW = Math.min(snapshot.width * 0.82, 640);
    const cardH = Math.min(snapshot.height * 0.18, 120);
    const gap = snapshot.height * 0.018;
    const x = (snapshot.width - cardW) / 2;
    const accent = Number.parseInt(theme.overlay.accent.replace('#', ''), 16) || 0xff2a6d;

    notes.forEach((note, index) => {
      const y = originY + index * (cardH + gap);
      const chrome = this.add.graphics().setDepth(20);
      chrome.fillStyle(theme.overlay.panel, index === 0 && this.page === 0 ? 0.96 : 0.88);
      chrome.fillRoundedRect(x, y, cardW, cardH, 10);
      chrome.lineStyle(index === 0 && this.page === 0 ? 2.5 : 1.5, index === 0 && this.page === 0 ? accent : theme.overlay.panelStroke, 1);
      chrome.strokeRoundedRect(x, y, cardW, cardH, 10);
      chrome.fillStyle(accent, 1);
      chrome.fillRect(x, y + 10, 4, cardH - 20);

      const version = this.add
        .text(x + 18, y + 10, note.version, {
          fontFamily: MENU_FONT_FAMILY,
          fontSize: `${menuFontSize(snapshot.height, 0.016, 11)}px`,
          color: theme.hud.subtitle,
          fontStyle: 'bold',
          stroke: MENU_STROKE,
          strokeThickness: 3,
        })
        .setOrigin(0, 0)
        .setDepth(21);
      const title = this.add
        .text(x + 18, y + 28, note.title, {
          fontFamily: MENU_FONT_FAMILY,
          fontSize: `${menuFontSize(snapshot.height, 0.024, 14)}px`,
          color: theme.hud.title,
          fontStyle: 'bold',
          stroke: MENU_STROKE,
          strokeThickness: 4,
        })
        .setOrigin(0, 0)
        .setDepth(21);
      const body = this.add
        .text(x + 18, y + 52, note.highlights.map((line) => `•  ${line}`).join('   '), {
          fontFamily: MENU_FONT_FAMILY,
          fontSize: `${menuFontSize(snapshot.height, 0.016, 11)}px`,
          color: theme.menu.color,
          wordWrap: { width: cardW - 36 },
          stroke: MENU_STROKE,
          strokeThickness: 3,
        })
        .setOrigin(0, 0)
        .setDepth(21);
      this.cards.push({ chrome, version, title, body });
    });
  }

  private clearCards(): void {
    for (const card of this.cards) {
      card.chrome.destroy();
      card.version.destroy();
      card.title.destroy();
      card.body.destroy();
    }
    this.cards = [];
  }

  private goBack(): void {
    this.scene.start(this.returnTo);
  }

  private createNav(
    snapshot: ViewportSnapshot,
    color: string,
    label: string,
    originX: number,
    onClick: () => void,
  ): TextButton {
    const x =
      originX === 0
        ? menuBackX(snapshot)
        : originX === 1
          ? snapshot.width - menuBackX(snapshot)
          : snapshot.width / 2;
    return new TextButton(this, x, menuHintY(snapshot), label, onClick, {
      color,
      originX,
      originY: 1,
      fontSize: menuFontSize(snapshot.height, MENU_LAYOUT.backFontRatio, MENU_LAYOUT.backMinPx),
      align: originX === 0 ? 'left' : originX === 1 ? 'right' : 'center',
    });
  }

  private handleViewportChange(snapshot: ViewportSnapshot): void {
    this.cameras.main.setViewport(0, 0, snapshot.width, snapshot.height);
    this.background.resize(snapshot.width, snapshot.height);
    layoutMenuTitle(this.titleText, snapshot);
    layoutMenuSubtitle(this.subtitleText, snapshot);
    this.backButton?.setPosition(menuBackX(snapshot), menuHintY(snapshot));
    this.prevButton?.setPosition(snapshot.width / 2, menuHintY(snapshot));
    this.nextButton?.setPosition(snapshot.width - menuBackX(snapshot), menuHintY(snapshot));
    const font = menuFontSize(snapshot.height, MENU_LAYOUT.backFontRatio, MENU_LAYOUT.backMinPx);
    this.backButton?.setFontSize(font);
    this.prevButton?.setFontSize(font);
    this.nextButton?.setFontSize(font);
    this.rebuildCards(snapshot, getTheme(loadPlayableThemeId()));
  }
}
