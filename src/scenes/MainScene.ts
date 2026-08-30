import Phaser from 'phaser';
import { SceneKeys } from '@systems/SceneKeys';
import { GameViewport, type ViewportSnapshot } from '@systems/GameViewport';
import { Paddle } from '@entities/dx-ball/Paddle';
import { Ball } from '@entities/dx-ball/Ball';
import { BrickGrid } from '@entities/dx-ball/BrickGrid';

/**
 * scenes/MainScene.ts
 *
 * The active gameplay scene. DXB-01 introduced the first DX-Ball gameplay
 * entity here: the paddle (see `entities/dx-ball/Paddle.ts`). DXB-02 adds
 * the second: the ball (see `entities/dx-ball/Ball.ts`). DXB-03 adds the
 * brick field and ball/brick collision (see
 * `entities/dx-ball/BrickGrid.ts`). The brick grid is constructed before
 * the ball since the ball takes it by reference to check/react to brick
 * collisions each frame. The ARC-01 diagnostic viewport border/label that
 * previously lived here have been removed now that real gameplay exists,
 * per that code's own note that it was a temporary stand-in and NOT game
 * UI/HUD.
 *
 * DXB-04 closes the gameplay loop: once `BrickGrid.isCleared()` reports
 * every brick gone, `update()` stops driving the paddle/ball (freezing
 * play) and a single "you win" message is shown. Pressing Space at that
 * point calls `this.scene.restart()` — Phaser's own scene lifecycle
 * (shutdown then create) tears down every game object this scene owns
 * (paddle, ball, bricks, the message) and rebuilds them from scratch, so
 * no manual per-entity reset code was needed here or in any entity.
 */
export class MainScene extends Phaser.Scene {
  private paddle!: Paddle;
  private ball!: Ball;
  private brickGrid!: BrickGrid;
  private unsubscribeViewport?: () => void;
  private won = false;
  private winText?: Phaser.GameObjects.Text;

  constructor() {
    super({ key: SceneKeys.Main });
  }

  create(): void {
    const viewport = GameViewport.get();
    const snapshot = viewport.getSnapshot();

    this.won = false;

    this.cameras.main.setViewport(0, 0, snapshot.width, snapshot.height);
    this.paddle = new Paddle(this, snapshot.width, snapshot.height);
    this.brickGrid = new BrickGrid(this, snapshot.width, snapshot.height);
    this.ball = new Ball(this, snapshot.width, snapshot.height, this.paddle, this.brickGrid);

    // The pattern every future game should follow: subscribe once, then
    // reposition/rescale whatever depends on viewport size whenever it
    // changes (window resize, orientation change, safe-area change).
    this.unsubscribeViewport = viewport.onChange((next) => this.handleViewportChange(next));

    // Scenes own their subscriptions: unsubscribe on shutdown so nothing
    // leaks if this scene is stopped/restarted.
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.unsubscribeViewport?.());
  }

  update(_time: number, delta: number): void {
    if (this.won) {
      return;
    }

    this.paddle.update(delta);
    this.ball.update(delta);

    if (this.brickGrid.isCleared()) {
      this.handleWin();
    }
  }

  /**
   * DXB-04: Freezes gameplay (see the `won` guard at the top of
   * `update()`) and shows a one-shot win message with a restart prompt.
   * `once('keydown-SPACE', ...)` is scoped to this scene instance and
   * never fires more than once, so it cannot double-restart even if
   * pressed rapidly.
   */
  private handleWin(): void {
    this.won = true;

    const { width, height } = GameViewport.get().getSnapshot();
    this.winText = this.createWinText(width, height);

    this.input.keyboard?.once('keydown-SPACE', () => this.scene.restart());
  }

  private createWinText(viewportWidth: number, viewportHeight: number): Phaser.GameObjects.Text {
    const fontSize = Math.round(viewportHeight * 0.05);

    return this.add
      .text(viewportWidth / 2, viewportHeight / 2, 'YOU WIN\nPress Space to play again', {
        fontFamily: 'sans-serif',
        fontSize: `${fontSize}px`,
        color: '#ffffff',
        align: 'center',
      })
      .setOrigin(0.5);
  }

  private handleViewportChange(snapshot: ViewportSnapshot): void {
    // Keep the camera in lockstep with the current canvas size. Phaser's
    // Scale Manager resizes the canvas itself; this ensures this scene's
    // world/coordinate space always matches it exactly (no letterboxing
    // drift, no stale viewport on rapid resizes).
    this.cameras.main.setViewport(0, 0, snapshot.width, snapshot.height);
    this.paddle.resize(snapshot.width, snapshot.height);
    this.ball.resize(snapshot.width, snapshot.height);
    this.brickGrid.resize(snapshot.width, snapshot.height);

    // The win message is still shown (and still responsive) after the
    // gameplay loop freezes, so it needs to follow resizes the same way
    // every other on-screen element does.
    if (this.winText) {
      const fontSize = Math.round(snapshot.height * 0.05);
      this.winText.setPosition(snapshot.width / 2, snapshot.height / 2);
      this.winText.setFontSize(fontSize);
    }
  }
}
