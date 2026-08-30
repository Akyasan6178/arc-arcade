import Phaser from 'phaser';
import { SceneKeys } from '@systems/SceneKeys';
import { GameViewport, type ViewportSnapshot } from '@systems/GameViewport';

/**
 * scenes/MainScene.ts
 *
 * The active gameplay scene. Still no gameplay implemented — this is the
 * foundation hand-off point for future game implementations (DX-Ball
 * first, then Pac-Man/Snake/Bomberman).
 *
 * ARC-01: demonstrates the responsive-viewport foundation (GameViewport).
 * The border + label drawn below are a *diagnostic* visualization proving
 * the responsive system tracks the canvas correctly across desktop,
 * tablet, mobile portrait/landscape, and live window resizes. They are
 * NOT game UI/HUD — that belongs in `src/ui/` once real menus/UI exist —
 * and should be removed once actual gameplay is built here.
 */
export class MainScene extends Phaser.Scene {
  private viewportBorder!: Phaser.GameObjects.Graphics;
  private viewportLabel!: Phaser.GameObjects.Text;
  private unsubscribeViewport?: () => void;

  constructor() {
    super({ key: SceneKeys.Main });
  }

  create(): void {
    const viewport = GameViewport.get();

    this.viewportBorder = this.add.graphics();
    this.viewportLabel = this.add
      .text(0, 0, '', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#00ff88',
        align: 'center',
      })
      .setOrigin(0.5);

    this.renderViewportDebug(viewport.getSnapshot());

    // The pattern every future game should follow: subscribe once, then
    // reposition/rescale/redraw whatever depends on viewport size whenever
    // it changes (window resize, orientation change, safe-area change).
    this.unsubscribeViewport = viewport.onChange((snapshot) => this.renderViewportDebug(snapshot));

    // Scenes own their subscriptions: unsubscribe on shutdown so nothing
    // leaks if this scene is stopped/restarted.
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.unsubscribeViewport?.());
  }

  private renderViewportDebug(snapshot: ViewportSnapshot): void {
    const { width, height, centerX, centerY, isPortrait, safeArea } = snapshot;

    // Keep the camera in lockstep with the current canvas size. Phaser's
    // Scale Manager resizes the canvas itself; this ensures this scene's
    // world/coordinate space always matches it exactly (no letterboxing
    // drift, no stale viewport on rapid resizes).
    this.cameras.main.setViewport(0, 0, width, height);

    this.viewportBorder.clear();
    this.viewportBorder.lineStyle(4, 0x00ff88, 1);
    this.viewportBorder.strokeRect(
      safeArea.left + 2,
      safeArea.top + 2,
      width - safeArea.left - safeArea.right - 4,
      height - safeArea.top - safeArea.bottom - 4,
    );

    this.viewportLabel.setText(
      [
        'GameViewport (ARC-01 responsive foundation demo)',
        `${Math.round(width)} x ${Math.round(height)}`,
        isPortrait ? 'Portrait' : 'Landscape',
        `safe-area T${Math.round(safeArea.top)} R${Math.round(safeArea.right)} B${Math.round(
          safeArea.bottom,
        )} L${Math.round(safeArea.left)}`,
      ].join('\n'),
    );
    this.viewportLabel.setPosition(centerX, centerY);
  }
}
