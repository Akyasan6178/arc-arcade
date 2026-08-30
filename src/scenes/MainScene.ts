import Phaser from 'phaser';
import { SceneKeys } from '@systems/SceneKeys';
import { GameViewport, type ViewportSnapshot } from '@systems/GameViewport';
import { Paddle } from '@entities/dx-ball/Paddle';

/**
 * scenes/MainScene.ts
 *
 * The active gameplay scene. DXB-01 introduces the first DX-Ball gameplay
 * entity here: the paddle (see `entities/dx-ball/Paddle.ts`). The ARC-01
 * diagnostic viewport border/label that previously lived here have been
 * removed now that real gameplay exists, per that code's own note that it
 * was a temporary stand-in and NOT game UI/HUD.
 */
export class MainScene extends Phaser.Scene {
  private paddle!: Paddle;
  private unsubscribeViewport?: () => void;

  constructor() {
    super({ key: SceneKeys.Main });
  }

  create(): void {
    const viewport = GameViewport.get();
    const snapshot = viewport.getSnapshot();

    this.cameras.main.setViewport(0, 0, snapshot.width, snapshot.height);
    this.paddle = new Paddle(this, snapshot.width, snapshot.height);

    // The pattern every future game should follow: subscribe once, then
    // reposition/rescale whatever depends on viewport size whenever it
    // changes (window resize, orientation change, safe-area change).
    this.unsubscribeViewport = viewport.onChange((next) => this.handleViewportChange(next));

    // Scenes own their subscriptions: unsubscribe on shutdown so nothing
    // leaks if this scene is stopped/restarted.
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.unsubscribeViewport?.());
  }

  update(_time: number, delta: number): void {
    this.paddle.update(delta);
  }

  private handleViewportChange(snapshot: ViewportSnapshot): void {
    // Keep the camera in lockstep with the current canvas size. Phaser's
    // Scale Manager resizes the canvas itself; this ensures this scene's
    // world/coordinate space always matches it exactly (no letterboxing
    // drift, no stale viewport on rapid resizes).
    this.cameras.main.setViewport(0, 0, snapshot.width, snapshot.height);
    this.paddle.resize(snapshot.width, snapshot.height);
  }
}
