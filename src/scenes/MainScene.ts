import Phaser from 'phaser';
import { SceneKeys } from '@systems/SceneKeys';
import { GameViewport, type ViewportSnapshot } from '@systems/GameViewport';
import { HighScoreStore } from '@systems/HighScoreStore';
import { Paddle } from '@entities/dx-ball/Paddle';
import { Ball } from '@entities/dx-ball/Ball';
import { BrickGrid } from '@entities/dx-ball/BrickGrid';
import { ScoreLabel } from '@ui/ScoreLabel';

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
 *
 * DXB-06 adds the score HUD: every frame, this scene polls
 * `brickGrid.getScore()` (the same "owning scene polls a getter" pattern
 * `isCleared()` already established) and forwards it to a `ScoreLabel`.
 * A second `ScoreLabel` shows the best score ever reached, persisted
 * across restarts/reloads via `HighScoreStore` — updated live the moment
 * the current run's score passes it, not just at win time. The win
 * message also now reports the final score reached.
 *
 * DXB-07 adds the missing losing condition: the scene starts each run
 * with `STARTING_LIVES` lives, polls `ball.getMissCount()` every frame
 * (the same "owning scene polls a getter" pattern already used for
 * `getScore()`/`isCleared()`) and decrements lives by however much that
 * counter grew since last frame. A third `ScoreLabel` (`Lives: `,
 * bottom-left — both top corners are already taken) shows the current
 * count. Reaching zero freezes the loop exactly like a win does, via a
 * parallel `lost` flag and a "GAME OVER" message reusing the same
 * restart-on-Space flow as `handleWin()`.
 */
const HIGH_SCORE_KEY = 'dx-ball-high-score';

/** DXB-07: Starting lives per run — a placeholder tuning value, not playtested (see docs/progress/DXB-07.md). */
const STARTING_LIVES = 3;

export class MainScene extends Phaser.Scene {
  private paddle!: Paddle;
  private ball!: Ball;
  private brickGrid!: BrickGrid;
  private scoreLabel!: ScoreLabel;
  private bestScoreLabel!: ScoreLabel;
  private livesLabel!: ScoreLabel;
  private bestScore = 0;
  private lives = STARTING_LIVES;
  private lastMissCount = 0;
  private unsubscribeViewport?: () => void;
  private won = false;
  private lost = false;
  private winText?: Phaser.GameObjects.Text;
  private gameOverText?: Phaser.GameObjects.Text;

  constructor() {
    super({ key: SceneKeys.Main });
  }

  create(): void {
    const viewport = GameViewport.get();
    const snapshot = viewport.getSnapshot();

    this.won = false;
    this.lost = false;
    this.lives = STARTING_LIVES;
    this.lastMissCount = 0;
    this.bestScore = HighScoreStore.get(HIGH_SCORE_KEY);

    this.cameras.main.setViewport(0, 0, snapshot.width, snapshot.height);
    this.paddle = new Paddle(this, snapshot.width, snapshot.height);
    this.brickGrid = new BrickGrid(this, snapshot.width, snapshot.height);
    this.ball = new Ball(this, snapshot.width, snapshot.height, this.paddle, this.brickGrid);
    this.scoreLabel = new ScoreLabel(this, snapshot.width, snapshot.height, {
      prefix: 'Score: ',
      anchor: 'top-left',
    });
    this.bestScoreLabel = new ScoreLabel(this, snapshot.width, snapshot.height, {
      prefix: 'Best: ',
      anchor: 'top-right',
    });
    this.bestScoreLabel.setValue(this.bestScore);
    this.livesLabel = new ScoreLabel(this, snapshot.width, snapshot.height, {
      prefix: 'Lives: ',
      anchor: 'bottom-left',
    });
    this.livesLabel.setValue(this.lives);

    // The pattern every future game should follow: subscribe once, then
    // reposition/rescale whatever depends on viewport size whenever it
    // changes (window resize, orientation change, safe-area change).
    this.unsubscribeViewport = viewport.onChange((next) => this.handleViewportChange(next));

    // Scenes own their subscriptions: unsubscribe on shutdown so nothing
    // leaks if this scene is stopped/restarted.
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.unsubscribeViewport?.());
  }

  update(_time: number, delta: number): void {
    if (this.won || this.lost) {
      return;
    }

    this.paddle.update(delta);
    this.ball.update(delta);
    this.updateScore();
    this.updateLives();

    if (this.brickGrid.isCleared()) {
      this.handleWin();
      return;
    }

    if (this.lives <= 0) {
      this.handleGameOver();
    }
  }

  /**
   * DXB-06: Polls the current run's score and reflects it in the HUD
   * every frame. The moment it passes the persisted best, that best is
   * updated both in memory and in `HighScoreStore` immediately — not
   * deferred to a win/game-over — so the "Best" label always reflects
   * the true best across every completed and in-progress run.
   */
  private updateScore(): void {
    const score = this.brickGrid.getScore();
    this.scoreLabel.setValue(score);

    if (score > this.bestScore) {
      this.bestScore = score;
      this.bestScoreLabel.setValue(this.bestScore);
      HighScoreStore.set(HIGH_SCORE_KEY, this.bestScore);
    }
  }

  /**
   * DXB-07: Polls `ball.getMissCount()` (the same "owning scene polls a
   * getter" pattern `updateScore()` already uses) and decrements lives
   * by however much it grew since last frame — normally by exactly one,
   * but comparing counts rather than assuming "exactly one miss per
   * frame" stays correct even if that ever changed. Never lets the
   * label go negative; `update()` checks `this.lives <= 0` separately to
   * trigger game over.
   */
  private updateLives(): void {
    const missCount = this.ball.getMissCount();
    const newMisses = missCount - this.lastMissCount;

    if (newMisses <= 0) {
      return;
    }

    this.lastMissCount = missCount;
    this.lives = Math.max(0, this.lives - newMisses);
    this.livesLabel.setValue(this.lives);
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
    const finalScore = this.brickGrid.getScore();
    this.winText = this.createCenteredMessage(
      width,
      height,
      `YOU WIN\nScore: ${finalScore}\nPress Space to play again`,
    );

    this.input.keyboard?.once('keydown-SPACE', () => this.scene.restart());
  }

  /**
   * DXB-07: Freezes gameplay (see the `lost` guard at the top of
   * `update()`) once lives reach zero, and shows a one-shot game-over
   * message with a restart prompt — the losing mirror of `handleWin()`,
   * reusing the exact same one-shot-restart mechanics and message
   * layout (`createCenteredMessage()`), just different text.
   */
  private handleGameOver(): void {
    this.lost = true;

    const { width, height } = GameViewport.get().getSnapshot();
    const finalScore = this.brickGrid.getScore();
    this.gameOverText = this.createCenteredMessage(
      width,
      height,
      `GAME OVER\nScore: ${finalScore}\nPress Space to try again`,
    );

    this.input.keyboard?.once('keydown-SPACE', () => this.scene.restart());
  }

  /** Shared layout for the win/game-over messages: centered, responsive-size, multi-line text. */
  private createCenteredMessage(
    viewportWidth: number,
    viewportHeight: number,
    message: string,
  ): Phaser.GameObjects.Text {
    const fontSize = Math.round(viewportHeight * 0.05);

    return this.add
      .text(viewportWidth / 2, viewportHeight / 2, message, {
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
    this.scoreLabel.resize(snapshot.width, snapshot.height);
    this.bestScoreLabel.resize(snapshot.width, snapshot.height);
    this.livesLabel.resize(snapshot.width, snapshot.height);

    // The win/game-over message is still shown (and still responsive)
    // after the gameplay loop freezes, so it needs to follow resizes the
    // same way every other on-screen element does.
    if (this.winText) {
      const fontSize = Math.round(snapshot.height * 0.05);
      this.winText.setPosition(snapshot.width / 2, snapshot.height / 2);
      this.winText.setFontSize(fontSize);
    }

    if (this.gameOverText) {
      const fontSize = Math.round(snapshot.height * 0.05);
      this.gameOverText.setPosition(snapshot.width / 2, snapshot.height / 2);
      this.gameOverText.setFontSize(fontSize);
    }
  }
}
