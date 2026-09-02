import Phaser from 'phaser';
import { SceneKeys, type SceneKey } from '@systems/SceneKeys';
import { GameViewport, type ViewportSnapshot } from '@systems/GameViewport';
import { AudioManager } from '@systems/AudioManager';
import { playDxBallThemeMusic } from '@entities/dx-ball/audioCues';
import { drawPowerupIcon, type PowerupType } from '@entities/dx-ball/Powerup';
import { getTheme } from '@entities/dx-ball/Theme';
import { loadPlayableThemeId } from '@entities/dx-ball/Progress';
import { ArcadeBackground } from '@ui/ArcadeBackground';
import { TextButton } from '@ui/TextButton';
import { TutorialBoard, type TutorialBoardPage } from '@ui/TutorialBoard';
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
 * DXB-26: Visual-first How To. Five pages with a live gameplay vignette
 * in the center and short labels on the sides. Visible Previous / Next /
 * Back — no hidden keyboard requirement.
 */

type TutorialPageId = 'controls' | 'bricks' | 'powerups' | 'modes' | 'progression';

const PAGE_ORDER: readonly TutorialPageId[] = [
  'controls',
  'bricks',
  'powerups',
  'modes',
  'progression',
];

export interface TutorialSceneData {
  from?: SceneKey;
}

export class TutorialScene extends Phaser.Scene {
  private background!: ArcadeBackground;
  private titleText!: Phaser.GameObjects.Text;
  private subtitleText!: Phaser.GameObjects.Text;
  private board?: TutorialBoard;
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
    this.board = new TutorialBoard(
      this,
      snapshot.width,
      snapshot.height,
      menuContentY(snapshot) - snapshot.height * 0.02,
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
      this.board?.destroy();
      this.board = undefined;
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
    this.board?.tick(delta);
  }

  private pageCaption(): string {
    const titles: Record<TutorialPageId, string> = {
      controls: 'BASIC CONTROLS',
      bricks: 'BRICKS',
      powerups: 'POWERUPS',
      modes: 'MODES',
      progression: 'PROGRESSION',
    };
    return `${titles[PAGE_ORDER[this.pageIndex]]}  ·  ${this.pageIndex + 1} / ${PAGE_ORDER.length}`;
  }

  private showPage(): void {
    const id = PAGE_ORDER[this.pageIndex];
    this.board?.setPage(TUTORIAL_PAGES[id]);
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
    this.board?.resize(snapshot.width, snapshot.height, menuContentY(snapshot) - snapshot.height * 0.02);
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

const TUTORIAL_PAGES: Record<TutorialPageId, TutorialBoardPage> = {
  controls: {
    leftTitle: 'Move',
    leftBody: 'Pointer or arrows.',
    rightTitle: 'Launch',
    rightBody: 'Space or tap.',
    draw: drawControlsDemo,
  },
  bricks: {
    leftTitle: 'Break',
    leftBody: 'Normal 1 hit. Cracked 2.',
    rightTitle: 'Special',
    rightBody: 'Metal lasts. Bonus drops.',
    draw: drawBrickDemo,
  },
  powerups: {
    leftTitle: 'Positive',
    leftBody: 'Widen · Slow · Life · Fire · Multi · Laser',
    rightTitle: 'Negative',
    rightBody: 'Small Paddle · Fast Ball',
    draw: drawPowerupDemo,
  },
  modes: {
    leftTitle: 'Classic',
    leftBody: 'Level 1 → 10. Victory.',
    rightTitle: 'More',
    rightBody: 'Time Attack 90s/level. Endless ramps.',
    draw: drawModeDemo,
  },
  progression: {
    leftTitle: 'Earn',
    leftBody: 'Achievements · Unlocks',
    rightTitle: 'Equip',
    rightBody: 'Garage · Themes · Cosmetics',
    draw: drawProgressDemo,
  },
};

function drawControlsDemo(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  width: number,
  height: number,
  timeMs: number,
): void {
  const cycle = (timeMs % 3200) / 3200;
  const paddleW = width * 0.42;
  const paddleH = Math.max(10, height * 0.07);
  const travel = Math.sin(timeMs / 280) * width * 0.22;
  const px = cx + travel;
  const py = cy + height * 0.32;
  g.fillStyle(0x2de2e6, 1);
  g.fillRoundedRect(px - paddleW / 2, py - paddleH / 2, paddleW, paddleH, paddleH * 0.4);
  g.fillStyle(0xffffff, 0.35);
  g.fillTriangle(px - paddleW * 0.7, py, px - paddleW * 0.48, py - paddleH, px - paddleW * 0.48, py + paddleH);
  g.fillTriangle(px + paddleW * 0.7, py, px + paddleW * 0.48, py - paddleH, px + paddleW * 0.48, py + paddleH);

  const launch = cycle < 0.28;
  const bounce = cycle >= 0.28 && cycle < 0.72;
  const reflect = cycle >= 0.72;
  let bx = px;
  let by = py - paddleH * 2.2;
  if (launch) {
    by = py - paddleH * 2.2;
  } else if (bounce) {
    const t = (cycle - 0.28) / 0.44;
    by = py - paddleH * 2.2 - Math.sin(t * Math.PI) * height * 0.42;
  } else if (reflect) {
    const t = (cycle - 0.72) / 0.28;
    bx = px + t * width * 0.18;
    by = py - paddleH * 2.2 - t * height * 0.28;
  }
  g.fillStyle(0xffe66d, 1);
  g.fillCircle(bx, by, Math.max(6, height * 0.045));
  if (reflect) {
    g.lineStyle(2, 0xffe66d, 0.55);
    g.lineBetween(px, py - paddleH, bx, by);
  }
}

function drawBrickDemo(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  width: number,
  height: number,
): void {
  const specs = [
    (x: number, y: number, w: number, h: number) => drawNormalBrick(g, x, y, w, h, 0xe63946),
    (x: number, y: number, w: number, h: number) => drawCrackedBrick(g, x, y, w, h),
    (x: number, y: number, w: number, h: number) => drawMetalBrick(g, x, y, w, h),
    (x: number, y: number, w: number, h: number) => drawBonusBrick(g, x, y, w, h),
  ];
  const bw = width * 0.38;
  const bh = height * 0.28;
  const gapX = width * 0.08;
  const gapY = height * 0.12;
  specs.forEach((draw, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = cx - gapX / 2 - bw + col * (bw + gapX);
    const y = cy - bh - gapY / 2 + row * (bh + gapY);
    draw(x, y, bw, bh);
  });
}

function drawNormalBrick(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, fill: number): void {
  const radius = Math.max(2, h * 0.14);
  g.fillStyle(fill, 1);
  g.fillRoundedRect(x, y, w, h, radius);
  g.fillStyle(0xffffff, 0.28);
  g.fillRoundedRect(x + 2, y + 1, w - 4, h * 0.32, radius * 0.6);
  g.fillStyle(0x000000, 0.22);
  g.fillRect(x + w * 0.82, y + 2, w * 0.14, h - 4);
}

function drawCrackedBrick(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number): void {
  drawNormalBrick(g, x, y, w, h, 0xf9c74f);
  g.lineStyle(Math.max(2, h * 0.1), 0x1b1b1b, 0.9);
  g.beginPath();
  g.moveTo(x + w * 0.22, y + h * 0.18);
  g.lineTo(x + w * 0.48, y + h * 0.5);
  g.lineTo(x + w * 0.32, y + h * 0.92);
  g.strokePath();
  g.beginPath();
  g.moveTo(x + w * 0.72, y + h * 0.12);
  g.lineTo(x + w * 0.58, y + h * 0.55);
  g.strokePath();
}

function drawMetalBrick(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number): void {
  const radius = Math.max(2, h * 0.14);
  g.fillStyle(0x6d7680, 1);
  g.fillRoundedRect(x, y, w, h, radius);
  g.fillStyle(0xb8c0c8, 0.95);
  g.fillRect(x + 2, y + 2, w - 4, h * 0.28);
  g.fillStyle(0x3d454d, 0.9);
  g.fillRect(x + 2, y + h * 0.62, w - 4, h * 0.3);
  const rivet = Math.max(1.6, Math.min(w, h) * 0.1);
  g.fillStyle(0xdfe3e8, 1);
  g.fillCircle(x + w * 0.14, y + h * 0.22, rivet);
  g.fillCircle(x + w * 0.86, y + h * 0.22, rivet);
  g.fillCircle(x + w * 0.14, y + h * 0.78, rivet);
  g.fillCircle(x + w * 0.86, y + h * 0.78, rivet);
  g.lineStyle(Math.max(2, h * 0.12), 0xe9ecef, 1);
  g.strokeRoundedRect(x, y, w, h, radius);
}

function drawBonusBrick(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number): void {
  const radius = Math.max(2, h * 0.14);
  g.fillStyle(0x9b5de5, 1);
  g.fillRoundedRect(x, y, w, h, radius);
  g.lineStyle(Math.max(2, h * 0.14), 0xffe66d, 1);
  g.strokeRoundedRect(x, y, w, h, radius);
  g.fillStyle(0xffe66d, 1);
  g.fillTriangle(x + w / 2, y + h * 0.22, x + w * 0.28, y + h * 0.7, x + w * 0.72, y + h * 0.7);
  g.fillStyle(0xffffff, 0.5);
  g.fillTriangle(x + w / 2, y + h * 0.28, x + w * 0.4, y + h * 0.55, x + w * 0.52, y + h * 0.5);
}

function drawPowerupDemo(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  width: number,
  height: number,
): void {
  const positives: Array<{ type: PowerupType; color: number; stroke: number }> = [
    { type: 'widen-paddle', color: 0x2d6a4f, stroke: 0xb7e4c7 },
    { type: 'slow-ball', color: 0x40916c, stroke: 0xd8f3dc },
    { type: 'extra-life', color: 0x52b788, stroke: 0xedf6f0 },
    { type: 'fire-ball', color: 0x1b4332, stroke: 0x95d5b2 },
    { type: 'multi-ball', color: 0x74c69d, stroke: 0xf0fff4 },
    { type: 'laser-paddle', color: 0x0d3b66, stroke: 0x7df9ff },
  ];
  const negatives: Array<{ type: PowerupType; color: number; stroke: number }> = [
    { type: 'small-paddle', color: 0xe85d04, stroke: 0xffd166 },
    { type: 'fast-ball', color: 0xc1121f, stroke: 0xffba08 },
  ];
  const capW = Math.min(width * 0.14, height * 0.28);
  const capH = capW * 1.35;
  drawCapsuleRow(g, positives, cx, cy - height * 0.16, capW, capH, 0x4ade80);
  drawCapsuleRow(g, negatives, cx, cy + height * 0.28, capW, capH, 0xf43f5e);
}

function drawCapsuleRow(
  g: Phaser.GameObjects.Graphics,
  items: Array<{ type: PowerupType; color: number; stroke: number }>,
  cx: number,
  cy: number,
  capW: number,
  capH: number,
  rail: number,
): void {
  const gap = capW * 0.22;
  const total = items.length * capW + (items.length - 1) * gap;
  let x = cx - total / 2;
  g.fillStyle(rail, 0.18);
  g.fillRoundedRect(x - 8, cy - capH / 2 - 8, total + 16, capH + 16, 8);
  for (const item of items) {
    g.fillStyle(item.color, 1);
    g.fillRoundedRect(x, cy - capH / 2, capW, capH, 6);
    g.lineStyle(2, item.stroke, 1);
    g.strokeRoundedRect(x, cy - capH / 2, capW, capH, 6);
    drawPowerupIcon(g, item.type, item.stroke, capW, capH, x + capW / 2, cy);
    x += capW + gap;
  }
}

function drawModeDemo(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  width: number,
  height: number,
): void {
  const modes = [0x2de2e6, 0xffd166, 0xff2a6d];
  const cardW = width * 0.28;
  const cardH = height * 0.62;
  const gap = width * 0.05;
  modes.forEach((color, i) => {
    const x = cx - cardW * 1.5 - gap + i * (cardW + gap);
    const y = cy - cardH / 2;
    g.fillStyle(0x0b1320, 0.9);
    g.fillRoundedRect(x, y, cardW, cardH, 8);
    g.lineStyle(2.5, color, 1);
    g.strokeRoundedRect(x, y, cardW, cardH, 8);
    g.fillStyle(color, 1);
    if (i === 0) {
      for (let n = 0; n < 10; n++) {
        g.fillCircle(x + cardW * 0.22 + (n % 5) * cardW * 0.14, y + cardH * 0.38 + Math.floor(n / 5) * 14, 4);
      }
    } else if (i === 1) {
      g.strokeCircle(x + cardW / 2, y + cardH * 0.42, cardW * 0.22);
      g.fillRect(x + cardW / 2 - 2, y + cardH * 0.28, 4, cardW * 0.16);
      g.fillRect(x + cardW / 2, y + cardH * 0.4, cardW * 0.12, 4);
    } else {
      g.beginPath();
      g.arc(x + cardW * 0.38, y + cardH * 0.42, cardW * 0.16, 0.4, Math.PI * 1.6);
      g.strokePath();
      g.beginPath();
      g.arc(x + cardW * 0.62, y + cardH * 0.42, cardW * 0.16, Math.PI + 0.4, Math.PI * 2.6);
      g.strokePath();
    }
  });
}

function drawProgressDemo(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  width: number,
  height: number,
): void {
  const cards = [0xffd166, 0x2de2e6, 0xff2a6d, 0x95d5b2, 0xc4b5fd, 0xffe066];
  const cardW = width * 0.26;
  const cardH = height * 0.32;
  const gap = width * 0.05;
  cards.forEach((color, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = cx - cardW * 1.5 - gap + col * (cardW + gap);
    const y = cy - cardH - gap / 2 + row * (cardH + gap);
    g.fillStyle(0x0b1320, 0.9);
    g.fillRoundedRect(x, y, cardW, cardH, 8);
    g.lineStyle(2, color, 1);
    g.strokeRoundedRect(x, y, cardW, cardH, 8);
    g.fillStyle(color, 1);
    if (i === 0) {
      g.fillCircle(x + cardW / 2, y + cardH * 0.45, cardW * 0.16);
      g.fillTriangle(x + cardW / 2, y + cardH * 0.22, x + cardW * 0.32, y + cardH * 0.55, x + cardW * 0.68, y + cardH * 0.55);
    } else if (i === 1) {
      g.fillRoundedRect(x + cardW * 0.28, y + cardH * 0.28, cardW * 0.44, cardH * 0.18, 3);
      g.fillCircle(x + cardW * 0.38, y + cardH * 0.62, 4);
    } else if (i === 2) {
      g.fillRoundedRect(x + cardW * 0.22, y + cardH * 0.55, cardW * 0.56, cardH * 0.16, 4);
      g.fillCircle(x + cardW / 2, y + cardH * 0.38, cardW * 0.12);
    } else if (i === 3) {
      g.fillCircle(x + cardW / 2, y + cardH * 0.45, cardW * 0.18);
      g.fillStyle(0x0b1320, 1);
      g.fillCircle(x + cardW / 2, y + cardH * 0.45, cardW * 0.08);
    } else if (i === 4) {
      g.fillRoundedRect(x + cardW * 0.18, y + cardH * 0.55, cardW * 0.64, cardH * 0.14, 4);
      g.fillCircle(x + cardW * 0.32, y + cardH * 0.38, 5);
      g.fillCircle(x + cardW * 0.68, y + cardH * 0.38, 5);
    } else {
      g.fillCircle(x + cardW / 2, y + cardH * 0.42, cardW * 0.16);
      g.fillStyle(0xffffff, 0.45);
      g.fillCircle(x + cardW * 0.44, y + cardH * 0.34, cardW * 0.05);
    }
  });
}
