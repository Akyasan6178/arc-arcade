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
  menuTabY,
} from '@ui/menuLayout';

/**
 * scenes/TutorialScene.ts
 *
 * DXB-23: Hub-accessible how-to. Owns no gameplay — it explains paddle
 * control, brick types, powerups, modes, and unlockables in the existing
 * menu chrome. Esc / Back return to the Hub.
 */

type TutorialTab = 'paddle' | 'bricks' | 'powerups' | 'modes' | 'unlocks';

const TUTORIAL_PAGES: Record<TutorialTab, { title: string; body: string }> = {
  paddle: {
    title: 'Paddle',
    body:
      'Move with the pointer or Left / Right arrows. The ball launches with Space.\n\n' +
      'Hits near the paddle edges send the ball out at a steeper angle. Catch falling capsules to activate powerups.\n\n' +
      'You start with 3 lives. Missing the last ball costs a life.',
  },
  bricks: {
    title: 'Brick Types',
    body:
      'Normal — one hit, may drop a capsule.\n\n' +
      'Cracked — two hits. The split face is the damaged state.\n\n' +
      'Metal — silver riveted plates. Indestructible to the ball (Fire Ball can still pierce them; Laser Paddle chips them in a few hits). Metal does not block a clear.\n\n' +
      'Bonus — gold gem. Always drops a powerup.',
  },
  powerups: {
    title: 'Powerups',
    body:
      'Capsules fall when bricks break. Catch them with the paddle.\n\n' +
      'Common: Widen, Slow, Fast, Small Paddle.\n' +
      'Uncommon: Multi Ball (extras stay grouped).\n' +
      'Rare: Fire Ball (pierces bricks for a short time) and Laser Paddle (fires bolts that break bricks and chip metal).\n' +
      'Very Rare: Extra Life — a special reward, not a regular drop.',
  },
  modes: {
    title: 'Modes',
    body:
      'Classic — browse the 10-level campaign, then clear them in order from the level you start.\n\n' +
      'Time Attack — 90 seconds. Highest score wins. Levels wrap.\n\n' +
      'Endless — levels wrap forever. The ball speeds up gradually. Lives still end the run.',
  },
  unlocks: {
    title: 'Unlockables',
    body:
      'Play unlocks themes, paddles, balls, and achievements. Open Garage to equip cosmetics and favorite a loadout.\n\n' +
      'Statistics tracks lifetime totals and local Top 10 boards. Achievements lists every lifetime goal.\n\n' +
      'Nothing here uses currency, accounts, or online saves — progress stays on this device.',
  },
};

export interface TutorialSceneData {
  from?: SceneKey;
}

export class TutorialScene extends Phaser.Scene {
  private background!: ArcadeBackground;
  private titleText!: Phaser.GameObjects.Text;
  private subtitleText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private bodyText!: Phaser.GameObjects.Text;
  private tabBar?: TabBar<TutorialTab>;
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
    this.subtitleText = createMenuSubtitle(this, snapshot, theme.hud.subtitle, 'TUTORIAL');
    this.hintText = createMenuHint(this, snapshot, theme.hud.hint, 'Tap a tab to read');
    this.tabBar = new TabBar(
      this,
      snapshot.width,
      snapshot.height,
      menuTabY(snapshot),
      [
        { id: 'paddle', title: 'Paddle' },
        { id: 'bricks', title: 'Bricks' },
        { id: 'powerups', title: 'Powerups' },
        { id: 'modes', title: 'Modes' },
        { id: 'unlocks', title: 'Unlocks' },
      ],
      (id) => this.showPage(id),
      {
        initialId: 'paddle',
        color: theme.menu.color,
        highlightColor: theme.menu.highlightColor,
        mutedColor: theme.menu.mutedColor,
        fontSizeRatio: 0.02,
      },
    );
    this.bodyText = this.add
      .text(snapshot.width / 2, menuContentY(snapshot), '', {
        fontFamily: MENU_FONT_FAMILY,
        fontSize: `${menuFontSize(snapshot.height, 0.022, 13)}px`,
        color: theme.menu.color,
        align: 'left',
        stroke: MENU_STROKE,
        strokeThickness: 3,
        wordWrap: { width: snapshot.width * 0.78 },
        lineSpacing: 6,
      })
      .setOrigin(0.5, 0)
      .setShadow(1, 2, '#000000', 3, true, true)
      .setDepth(20);
    this.backButton = this.createBackButton(snapshot, theme.menu.color);
    this.showPage('paddle');

    this.unsubscribeViewport = viewport.onChange((next) => this.handleViewportChange(next));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubscribeViewport?.();
      this.tabBar?.destroy();
      this.tabBar = undefined;
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

  private showPage(id: TutorialTab): void {
    const page = TUTORIAL_PAGES[id];
    this.bodyText.setText(`${page.title}\n\n${page.body}`);
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
    this.tabBar?.resize(snapshot.width, snapshot.height, menuTabY(snapshot));
    this.bodyText.setPosition(snapshot.width / 2, menuContentY(snapshot));
    this.bodyText.setFontSize(menuFontSize(snapshot.height, 0.022, 13));
    this.bodyText.setWordWrapWidth(snapshot.width * 0.78);
    this.backButton?.setPosition(menuBackX(snapshot), menuHintY(snapshot));
    this.backButton?.setFontSize(
      menuFontSize(snapshot.height, MENU_LAYOUT.backFontRatio, MENU_LAYOUT.backMinPx),
    );
  }
}
