import Phaser from 'phaser';
import { SceneKeys, type SceneKey } from '@systems/SceneKeys';
import { GameViewport, type ViewportSnapshot } from '@systems/GameViewport';
import { AudioManager } from '@systems/AudioManager';
import { playDxBallThemeMusic } from '@entities/dx-ball/audioCues';
import { getTheme } from '@entities/dx-ball/Theme';
import { loadPlayableThemeId } from '@entities/dx-ball/Progress';
import { ArcadeBackground } from '@ui/ArcadeBackground';
import { TextButton } from '@ui/TextButton';
import { TutorialStage, type TutorialPageId } from '@ui/TutorialStage';
import { resolveMenuReturn } from '@scenes/menuNavigation';
import {
  MENU_LAYOUT,
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
 * scenes/TutorialScene.ts
 *
 * DXB-27: Demonstration-driven How To. Five full-width live showcases.
 * Visible Previous / Next / Back — no hidden keyboard requirement.
 * Optional arrows still work; they are not the only path.
 */

const PAGE_ORDER: readonly TutorialPageId[] = [
  'controls',
  'bricks',
  'powerups',
  'modes',
  'progression',
];

const PAGE_TITLE: Record<TutorialPageId, string> = {
  controls: 'CONTROLS',
  bricks: 'BRICKS',
  powerups: 'POWERUPS',
  modes: 'MODES',
  progression: 'PROGRESSION',
};

export interface TutorialSceneData {
  from?: SceneKey;
}

export class TutorialScene extends Phaser.Scene {
  private background!: ArcadeBackground;
  private titleText!: Phaser.GameObjects.Text;
  private subtitleText!: Phaser.GameObjects.Text;
  private stage?: TutorialStage;
  private backButton?: TextButton;
  private prevButton?: TextButton;
  private nextButton?: TextButton;
  private dots?: Phaser.GameObjects.Graphics;
  private pageIndex = 0;
  private returnTo: SceneKey = SceneKeys.Hub;
  private unsubscribeViewport?: () => void;

  constructor() {
    super({ key: SceneKeys.Tutorial });
  }

  init(data: TutorialSceneData = {}): void {
    this.returnTo = resolveMenuReturn(data.from);
    this.pageIndex = 0;
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
    this.subtitleText = createMenuSubtitle(this, snapshot, theme.hud.subtitle, this.pageCaption());
    this.stage = new TutorialStage(
      this,
      snapshot.width,
      snapshot.height,
      menuContentY(snapshot) - snapshot.height * 0.02,
      this.stageBottom(snapshot),
      {
        color: theme.menu.color,
        highlightColor: theme.menu.highlightColor,
        mutedColor: theme.menu.mutedColor,
        panel: theme.overlay.panel,
        panelStroke: theme.overlay.panelStroke,
        accent: Number.parseInt(theme.overlay.accent.replace('#', ''), 16) || 0xff2a6d,
      },
    );
    this.dots = this.add.graphics().setDepth(21);
    this.backButton = this.createNavButton(snapshot, theme.menu.color, '← Back', 0, () => this.goBack());
    this.prevButton = this.createNavButton(snapshot, theme.menu.color, '← Previous', 0.5, () => this.shiftPage(-1));
    this.nextButton = this.createNavButton(snapshot, theme.menu.highlightColor, 'Next →', 1, () => this.shiftPage(1));
    this.showPage();

    this.unsubscribeViewport = viewport.onChange((next) => this.handleViewportChange(next));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubscribeViewport?.();
      this.stage?.destroy();
      this.stage = undefined;
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

  update(_time: number, delta: number): void {
    this.stage?.tick(delta);
  }

  private pageCaption(): string {
    const id = PAGE_ORDER[this.pageIndex];
    return `${PAGE_TITLE[id]}  ·  ${this.pageIndex + 1} / ${PAGE_ORDER.length}`;
  }

  private showPage(): void {
    this.stage?.setPage(PAGE_ORDER[this.pageIndex]);
    this.subtitleText.setText(this.pageCaption());
    this.drawDots();
  }

  private shiftPage(delta: number): void {
    this.pageIndex = Phaser.Math.Clamp(this.pageIndex + delta, 0, PAGE_ORDER.length - 1);
    this.showPage();
  }

  private goBack(): void {
    this.scene.start(this.returnTo);
  }

  private stageBottom(snapshot: ViewportSnapshot): number {
    return menuHintY(snapshot) - snapshot.height * 0.07;
  }

  private createNavButton(
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

  private drawDots(): void {
    if (!this.dots) {
      return;
    }
    const snapshot = GameViewport.get().getSnapshot();
    const theme = getTheme(loadPlayableThemeId());
    const accent = Number.parseInt(theme.overlay.accent.replace('#', ''), 16) || 0xff2a6d;
    const y = menuHintY(snapshot) - snapshot.height * 0.055;
    const gap = 14;
    const total = (PAGE_ORDER.length - 1) * gap;
    this.dots.clear();
    PAGE_ORDER.forEach((_, index) => {
      const x = snapshot.width / 2 - total / 2 + index * gap;
      this.dots?.fillStyle(index === this.pageIndex ? accent : theme.overlay.panelStroke, index === this.pageIndex ? 1 : 0.4);
      this.dots?.fillCircle(x, y, index === this.pageIndex ? 5 : 3.5);
    });
  }

  private handleViewportChange(snapshot: ViewportSnapshot): void {
    this.cameras.main.setViewport(0, 0, snapshot.width, snapshot.height);
    this.background.resize(snapshot.width, snapshot.height);
    layoutMenuTitle(this.titleText, snapshot);
    layoutMenuSubtitle(this.subtitleText, snapshot);
    this.stage?.resize(
      snapshot.width,
      snapshot.height,
      menuContentY(snapshot) - snapshot.height * 0.02,
      this.stageBottom(snapshot),
    );
    this.backButton?.setPosition(menuBackX(snapshot), menuHintY(snapshot));
    this.prevButton?.setPosition(snapshot.width / 2, menuHintY(snapshot));
    this.nextButton?.setPosition(snapshot.width - menuBackX(snapshot), menuHintY(snapshot));
    const font = menuFontSize(snapshot.height, MENU_LAYOUT.backFontRatio, MENU_LAYOUT.backMinPx);
    this.backButton?.setFontSize(font);
    this.prevButton?.setFontSize(font);
    this.nextButton?.setFontSize(font);
    this.drawDots();
  }
}
