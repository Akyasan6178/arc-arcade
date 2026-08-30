import Phaser from 'phaser';
import { SceneKeys } from '@systems/SceneKeys';
import { GameViewport, type ViewportSnapshot } from '@systems/GameViewport';
import { HighScoreStore } from '@systems/HighScoreStore';
import { Paddle } from '@entities/dx-ball/Paddle';
import { Ball } from '@entities/dx-ball/Ball';
import { BrickGrid } from '@entities/dx-ball/BrickGrid';
import { LEVELS } from '@entities/dx-ball/levels';
import { PowerupManager } from '@entities/dx-ball/PowerupManager';
import type { PowerupType } from '@entities/dx-ball/Powerup';
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
 *
 * DXB-08 turns the single brick grid into a fixed sequence of levels
 * (`entities/dx-ball/levels.ts`). Clearing a level no longer always wins:
 * `update()`'s existing `isCleared()` check now calls `handleWin()` only
 * on the last level, otherwise `handleLevelCleared()` freezes play (a
 * third `transitioning` flag, sibling to `won`/`lost`) behind a "LEVEL
 * CLEARED" message, and a one-shot Space press calls
 * `advanceToNextLevel()` — which loads the next level's bricks onto the
 * *same* `BrickGrid` instance via its new `loadLevel()` (preserving the
 * running score) and replaces `ball` with a fresh `Ball` built from that
 * level's speed config (re-serving above the paddle, exactly like a
 * fresh run). Score and lives are never reset by a level transition,
 * only by a full `scene.restart()`. A fourth `ScoreLabel` (`Level: `,
 * bottom-right — the last free corner) shows the current level number.
 *
 * DXB-09 adds powerups: every frame, `updatePowerups()` drains any spawn
 * points `brickGrid.consumePendingPowerupSpawns()` queued this frame
 * (from bricks just destroyed by `ball.update()` above it) into
 * `powerupManager.spawn()`, advances every falling capsule via
 * `powerupManager.update()`, then drains
 * `powerupManager.consumeCaughtPowerups()` into `applyPowerupEffect()` —
 * the one place that knows what each effect type actually does
 * (`extra-life` bumps `lives` directly; `widen-paddle`/`slow-ball`
 * delegate to `paddle.applyWidenBoost()`/`ball.applySlowEffect()`).
 * `powerupManager` itself never touches `Ball` or lives — see its own
 * doc comment for why.
 */
const HIGH_SCORE_KEY = 'dx-ball-high-score';

/** DXB-07: Starting lives per run — a placeholder tuning value, not playtested (see docs/progress/DXB-07.md). */
const STARTING_LIVES = 3;

/** DXB-09: How long a timed powerup effect (widen paddle / slow ball) lasts, in ms — a placeholder tuning value, not playtested. */
const POWERUP_EFFECT_DURATION_MS = 8000;

export class MainScene extends Phaser.Scene {
  private paddle!: Paddle;
  private ball!: Ball;
  private brickGrid!: BrickGrid;
  private powerupManager!: PowerupManager;
  private scoreLabel!: ScoreLabel;
  private bestScoreLabel!: ScoreLabel;
  private livesLabel!: ScoreLabel;
  private levelLabel!: ScoreLabel;
  private bestScore = 0;
  private lives = STARTING_LIVES;
  private lastMissCount = 0;
  /** DXB-08: 0-based index into `LEVELS` of the level currently in play. */
  private currentLevelIndex = 0;
  private unsubscribeViewport?: () => void;
  private won = false;
  private lost = false;
  /** DXB-08: True between a level being cleared and the player continuing to the next one. */
  private transitioning = false;
  private winText?: Phaser.GameObjects.Text;
  private gameOverText?: Phaser.GameObjects.Text;
  private levelTransitionText?: Phaser.GameObjects.Text;

  constructor() {
    super({ key: SceneKeys.Main });
  }

  create(): void {
    const viewport = GameViewport.get();
    const snapshot = viewport.getSnapshot();

    this.won = false;
    this.lost = false;
    this.transitioning = false;
    this.lives = STARTING_LIVES;
    this.lastMissCount = 0;
    this.currentLevelIndex = 0;
    this.bestScore = HighScoreStore.get(HIGH_SCORE_KEY);

    this.cameras.main.setViewport(0, 0, snapshot.width, snapshot.height);
    this.paddle = new Paddle(this, snapshot.width, snapshot.height);
    const firstLevel = LEVELS[this.currentLevelIndex];
    this.brickGrid = new BrickGrid(this, snapshot.width, snapshot.height, firstLevel.brickGrid);
    this.ball = new Ball(
      this,
      snapshot.width,
      snapshot.height,
      this.paddle,
      this.brickGrid,
      firstLevel.ball,
    );
    this.powerupManager = new PowerupManager(this, snapshot.width, snapshot.height, this.paddle);
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
    this.levelLabel = new ScoreLabel(this, snapshot.width, snapshot.height, {
      prefix: 'Level: ',
      anchor: 'bottom-right',
    });
    this.levelLabel.setValue(this.currentLevelIndex + 1);

    // The pattern every future game should follow: subscribe once, then
    // reposition/rescale whatever depends on viewport size whenever it
    // changes (window resize, orientation change, safe-area change).
    this.unsubscribeViewport = viewport.onChange((next) => this.handleViewportChange(next));

    // Scenes own their subscriptions: unsubscribe on shutdown so nothing
    // leaks if this scene is stopped/restarted.
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.unsubscribeViewport?.());
  }

  update(_time: number, delta: number): void {
    if (this.won || this.lost || this.transitioning) {
      return;
    }

    this.paddle.update(delta);
    this.ball.update(delta);
    this.updatePowerups(delta);
    this.updateScore();
    this.updateLives();

    if (this.brickGrid.isCleared()) {
      this.handleLevelCleared();
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
   * DXB-09: Spawns any powerup capsules `BrickGrid` queued this frame
   * (from bricks destroyed during `ball.update()` above), advances every
   * currently-falling capsule, and reacts to any the paddle just caught.
   * Mirrors `updateScore()`/`updateLives()`'s "owning scene polls a
   * getter/queue every frame" shape.
   */
  private updatePowerups(deltaMs: number): void {
    for (const spawn of this.brickGrid.consumePendingPowerupSpawns()) {
      this.powerupManager.spawn(spawn.x, spawn.y);
    }

    this.powerupManager.update(deltaMs);

    for (const type of this.powerupManager.consumeCaughtPowerups()) {
      this.applyPowerupEffect(type);
    }
  }

  /** DXB-09: The one place that knows what each powerup type actually does. */
  private applyPowerupEffect(type: PowerupType): void {
    switch (type) {
      case 'extra-life':
        this.lives++;
        this.livesLabel.setValue(this.lives);
        break;
      case 'widen-paddle':
        this.paddle.applyWidenBoost(POWERUP_EFFECT_DURATION_MS);
        break;
      case 'slow-ball':
        this.ball.applySlowEffect(POWERUP_EFFECT_DURATION_MS);
        break;
    }
  }

  /**
   * DXB-08: Called instead of `handleWin()` whenever `brickGrid.isCleared()`
   * fires and a level *after* the current one still exists in `LEVELS`.
   * On the last level this defers straight to `handleWin()` instead —
   * clearing a level only ever means "advance" or "win", never both.
   * Freezes gameplay via the new `transitioning` flag (a sibling to
   * `won`/`lost` in `update()`'s guard) and shows a one-shot "LEVEL
   * CLEARED" message; a Space press calls `advanceToNextLevel()`.
   */
  private handleLevelCleared(): void {
    if (this.currentLevelIndex >= LEVELS.length - 1) {
      this.handleWin();
      return;
    }

    this.transitioning = true;

    const { width, height } = GameViewport.get().getSnapshot();
    const clearedLevelNumber = this.currentLevelIndex + 1;
    this.levelTransitionText = this.createCenteredMessage(
      width,
      height,
      `LEVEL ${clearedLevelNumber} CLEARED\nGet ready for Level ${clearedLevelNumber + 1}\nPress Space to continue`,
    );

    this.input.keyboard?.once('keydown-SPACE', () => this.advanceToNextLevel());
  }

  /**
   * DXB-08: Advances from `currentLevelIndex` to the next `LEVELS` entry.
   * Loads that level's brick layout onto the *same* `BrickGrid` instance
   * via `loadLevel()` (score keeps accumulating — see that method's own
   * doc comment) and replaces `ball` with a fresh `Ball` built from that
   * level's speed config, which re-serves it above the paddle exactly
   * like a brand-new run would. Lives and score are untouched — only a
   * full `scene.restart()` resets those.
   */
  private advanceToNextLevel(): void {
    this.currentLevelIndex++;
    this.levelTransitionText?.destroy();
    this.levelTransitionText = undefined;

    const { width, height } = GameViewport.get().getSnapshot();
    const level = LEVELS[this.currentLevelIndex];

    this.brickGrid.loadLevel(level.brickGrid ?? {}, width, height);

    this.ball.destroy();
    this.ball = new Ball(this, width, height, this.paddle, this.brickGrid, level.ball);
    // DXB-09: a stray capsule still falling from the just-cleared level
    // shouldn't carry into the next one's fresh brick layout.
    this.powerupManager.clear();

    this.lastMissCount = 0;
    this.levelLabel.setValue(this.currentLevelIndex + 1);
    this.transitioning = false;
  }

  /**
   * DXB-04: Freezes gameplay (see the `won` guard at the top of
   * `update()`) and shows a one-shot win message with a restart prompt.
   * `once('keydown-SPACE', ...)` is scoped to this scene instance and
   * never fires more than once, so it cannot double-restart even if
   * pressed rapidly. DXB-08: only reachable once every `LEVELS` entry has
   * been cleared (see `handleLevelCleared()`), so the message now says so.
   */
  private handleWin(): void {
    this.won = true;

    const { width, height } = GameViewport.get().getSnapshot();
    const finalScore = this.brickGrid.getScore();
    this.winText = this.createCenteredMessage(
      width,
      height,
      `YOU WIN\nAll ${LEVELS.length} levels cleared — Score: ${finalScore}\nPress Space to play again`,
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

  /**
   * Shared layout for the win/game-over/level-transition messages:
   * centered, responsive-size, multi-line text.
   */
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
    this.powerupManager.resize(snapshot.width, snapshot.height);
    this.scoreLabel.resize(snapshot.width, snapshot.height);
    this.bestScoreLabel.resize(snapshot.width, snapshot.height);
    this.livesLabel.resize(snapshot.width, snapshot.height);
    this.levelLabel.resize(snapshot.width, snapshot.height);

    // The win/game-over/level-transition message is still shown (and
    // still responsive) while it's up, so it needs to follow resizes the
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

    if (this.levelTransitionText) {
      const fontSize = Math.round(snapshot.height * 0.05);
      this.levelTransitionText.setPosition(snapshot.width / 2, snapshot.height / 2);
      this.levelTransitionText.setFontSize(fontSize);
    }
  }
}
