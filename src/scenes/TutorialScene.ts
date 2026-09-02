import Phaser from 'phaser';
import { SceneKeys, type SceneKey } from '@systems/SceneKeys';
import { GameViewport, type ViewportSnapshot } from '@systems/GameViewport';
import { AudioManager } from '@systems/AudioManager';
import { playDxBallThemeMusic } from '@entities/dx-ball/audioCues';
import { getTheme } from '@entities/dx-ball/Theme';
import { loadPlayableThemeId } from '@entities/dx-ball/Progress';
import { ArcadeBackground } from '@ui/ArcadeBackground';
import { TabBar } from '@ui/TabBar';
import { TextButton } from '@ui/TextButton';
import { TutorialBoard, type TutorialBoardPage } from '@ui/TutorialBoard';
import { resolveMenuReturn } from '@scenes/menuNavigation';
import {
  MENU_LAYOUT,
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
  menuTabY,
} from '@ui/menuLayout';

/**
 * scenes/TutorialScene.ts
 *
 * DXB-23/DXB-25: Hub-accessible how-to. Visual board (example in the
 * center, short notes on the sides) instead of a text dump. Esc / Back
 * return to the Hub.
 */

type TutorialTab = 'paddle' | 'bricks' | 'powerups' | 'modes';

export interface TutorialSceneData {
  from?: SceneKey;
}

export class TutorialScene extends Phaser.Scene {
  private background!: ArcadeBackground;
  private titleText!: Phaser.GameObjects.Text;
  private subtitleText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private tabBar?: TabBar<TutorialTab>;
  private board?: TutorialBoard;
  private backButton?: TextButton;
  private returnTo: SceneKey = SceneKeys.Hub;
  private unsubscribeViewport?: () => void;

  constructor() {
    super({ key: SceneKeys.Tutorial });
  }

  init(data: TutorialSceneData = {}): void {
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
    this.subtitleText = createMenuSubtitle(this, snapshot, theme.hud.subtitle, 'HOW TO PLAY');
    this.hintText = createMenuHint(this, snapshot, theme.hud.hint, 'Tap a tab', 'center');
    this.tabBar = new TabBar(
      this,
      snapshot.width,
      snapshot.height,
      menuTabY(snapshot),
      [
        { id: 'paddle', title: 'Paddle' },
        { id: 'bricks', title: 'Bricks' },
        { id: 'powerups', title: 'Drops' },
        { id: 'modes', title: 'Modes' },
      ],
      (id) => this.showPage(id),
      {
        initialId: 'paddle',
        color: theme.menu.color,
        highlightColor: theme.menu.highlightColor,
        mutedColor: theme.menu.mutedColor,
        fontSizeRatio: 0.018,
        sideRatio: 0.05,
      },
    );
    this.board = new TutorialBoard(
      this,
      snapshot.width,
      snapshot.height,
      menuContentY(snapshot) + snapshot.height * 0.04,
      {
        color: theme.menu.color,
        highlightColor: theme.menu.highlightColor,
        mutedColor: theme.menu.mutedColor,
        panel: theme.overlay.panel,
        panelStroke: theme.overlay.panelStroke,
        accent: Number.parseInt(theme.overlay.accent.replace('#', ''), 16) || 0xff2a6d,
      },
    );
    this.backButton = this.createBackButton(snapshot, theme.menu.color);
    this.showPage('paddle');

    this.unsubscribeViewport = viewport.onChange((next) => this.handleViewportChange(next));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubscribeViewport?.();
      this.tabBar?.destroy();
      this.tabBar = undefined;
      this.board?.destroy();
      this.board = undefined;
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

  update(_time: number, delta: number): void {
    this.board?.tick(delta);
  }

  private showPage(id: TutorialTab): void {
    this.board?.setPage(TUTORIAL_PAGES[id]);
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
    layoutMenuHint(this.hintText, snapshot, 'center');
    this.tabBar?.resize(snapshot.width, snapshot.height, menuTabY(snapshot));
    this.board?.resize(snapshot.width, snapshot.height, menuContentY(snapshot) + snapshot.height * 0.04);
    this.backButton?.setPosition(menuBackX(snapshot), menuHintY(snapshot));
    this.backButton?.setFontSize(
      menuFontSize(snapshot.height, MENU_LAYOUT.backFontRatio, MENU_LAYOUT.backMinPx),
    );
  }
}

const TUTORIAL_PAGES: Record<TutorialTab, TutorialBoardPage> = {
  paddle: {
    leftTitle: 'Move',
    leftBody: 'Pointer or arrows. Edges angle the ball.',
    rightTitle: 'Launch',
    rightBody: 'Space serves. 3 lives. Catch capsules.',
    draw: drawPaddleDemo,
  },
  bricks: {
    leftTitle: 'Break',
    leftBody: 'Normal: 1 hit. Cracked: 2. Bonus always drops.',
    rightTitle: 'Steel',
    rightBody: 'Metal ignores the ball. Fire pierces. Laser chips.',
    draw: drawBrickDemo,
  },
  powerups: {
    leftTitle: 'Common',
    leftBody: 'Widen, Slow, Fast, Small. Everyday catches.',
    rightTitle: 'Rare',
    rightBody: 'Multi. Fire. Laser (very rare). Extra Life (extreme).',
    draw: drawPowerupDemo,
  },
  modes: {
    leftTitle: 'Classic',
    leftBody: '10 named layouts. Browse, then clear.',
    rightTitle: 'More',
    rightBody: 'Time Attack 90s. Endless ramps. Unlocks stay local.',
    draw: drawModeDemo,
  },
};

function drawPaddleDemo(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  width: number,
  height: number,
  timeMs: number,
): void {
  const paddleW = width * 0.55;
  const paddleH = Math.max(8, height * 0.08);
  const travel = Math.sin(timeMs / 280) * width * 0.18;
  const px = cx + travel;
  const py = cy + height * 0.28;
  g.fillStyle(0x2de2e6, 1);
  g.fillRoundedRect(px - paddleW / 2, py - paddleH / 2, paddleW, paddleH, paddleH * 0.4);
  const bounce = Math.abs(Math.sin(timeMs / 220));
  const by = cy - height * 0.18 + bounce * height * 0.32;
  g.fillStyle(0xffe66d, 1);
  g.fillCircle(px, by, Math.max(5, height * 0.045));
}

function drawBrickDemo(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  width: number,
  height: number,
): void {
  const labels: Array<{ color: number; mark?: 'crack' | 'metal' | 'gem' }> = [
    { color: 0xe63946 },
    { color: 0xf9c74f, mark: 'crack' },
    { color: 0x8b95a1, mark: 'metal' },
    { color: 0x9b5de5, mark: 'gem' },
  ];
  const bw = width * 0.28;
  const bh = height * 0.16;
  const gap = width * 0.06;
  labels.forEach((spec, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = cx - gap / 2 - bw + col * (bw + gap);
    const y = cy - bh - gap / 2 + row * (bh + gap);
    g.fillStyle(spec.color, 1);
    g.fillRoundedRect(x, y, bw, bh, 4);
    if (spec.mark === 'crack') {
      g.lineStyle(2, 0x1b1b1b, 0.8);
      g.lineBetween(x + bw * 0.5, y + 4, x + bw * 0.45, y + bh - 4);
    } else if (spec.mark === 'metal') {
      g.fillStyle(0xe9ecef, 0.85);
      g.fillRect(x + 4, y + 3, bw - 8, bh * 0.22);
    } else if (spec.mark === 'gem') {
      g.fillStyle(0xffe66d, 1);
      g.fillTriangle(x + bw / 2, y + 6, x + 8, y + bh - 6, x + bw - 8, y + bh - 6);
    }
  });
}

function drawPowerupDemo(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  width: number,
  height: number,
): void {
  const caps = [
    { color: 0x4ade80, r: 0.9 },
    { color: 0x3b82f6, r: 0.7 },
    { color: 0xff7a18, r: 0.5 },
    { color: 0x22d3ee, r: 0.35 },
    { color: 0xe11d48, r: 0.22 },
  ];
  const capW = width * 0.14;
  const capH = height * 0.28;
  const total = caps.length * capW + (caps.length - 1) * 8;
  let x = cx - total / 2;
  caps.forEach((cap) => {
    g.fillStyle(cap.color, 0.25 + cap.r * 0.75);
    g.fillRoundedRect(x, cy - capH / 2, capW, capH, 6);
    g.fillStyle(0xffffff, 0.85);
    g.fillCircle(x + capW / 2, cy, capW * 0.22);
    x += capW + 8;
  });
}

function drawModeDemo(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  width: number,
  height: number,
): void {
  const modes = [0x2de2e6, 0xffd166, 0xff2a6d];
  const cardW = width * 0.26;
  const cardH = height * 0.42;
  const gap = width * 0.06;
  modes.forEach((color, i) => {
    const x = cx - cardW * 1.5 - gap + i * (cardW + gap);
    const y = cy - cardH / 2;
    g.fillStyle(0x0b1320, 0.85);
    g.fillRoundedRect(x, y, cardW, cardH, 6);
    g.lineStyle(2, color, 1);
    g.strokeRoundedRect(x, y, cardW, cardH, 6);
    g.fillStyle(color, 1);
    g.fillCircle(x + cardW / 2, y + cardH * 0.42, cardW * 0.18);
  });
}
