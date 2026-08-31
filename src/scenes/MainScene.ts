import Phaser from 'phaser';
import { SceneKeys } from '@systems/SceneKeys';
import { GameViewport, type ViewportSnapshot } from '@systems/GameViewport';
import { HighScoreStore } from '@systems/HighScoreStore';
import { Paddle } from '@entities/dx-ball/Paddle';
import { Ball } from '@entities/dx-ball/Ball';
import { BrickGrid } from '@entities/dx-ball/BrickGrid';
import { LEVELS, type LevelConfig } from '@entities/dx-ball/levels';
import { PowerupManager } from '@entities/dx-ball/PowerupManager';
import type { PowerupType } from '@entities/dx-ball/Powerup';
import { playDxBallSfx } from '@entities/dx-ball/audioCues';
import {
  TIME_ATTACK_DURATION_MS,
  computeEndlessSpeedMultiplier,
  formatTimeAttackClock,
  getGameModeInfo,
  isGameModeId,
  type GameModeId,
} from '@entities/dx-ball/GameMode';
import { AudioManager } from '@systems/AudioManager';
import { ScoreLabel } from '@ui/ScoreLabel';
import { ActiveEffectsLabel, type ActiveEffectDisplay } from '@ui/ActiveEffectsLabel';
import { ArcadeBackground } from '@ui/ArcadeBackground';
import { ModeLabel } from '@ui/ModeLabel';
import { PauseOverlay, type PauseOverlayAction } from '@ui/PauseOverlay';
import { ResultOverlay } from '@ui/ResultOverlay';
import { getTheme, type ThemeDefinition } from '@entities/dx-ball/Theme';
import type { BrickGridConfig } from '@entities/dx-ball/BrickGrid';
import {
  loadBallSkinId,
  loadPaddleSkinId,
  loadPlayableThemeId,
  recordBricksDestroyed,
  recordClassicComplete,
  recordEndlessLevel,
  recordFireBallBrickDestroyed,
  recordGamePlayed,
  recordLifetimeScoreDelta,
  recordMetalBrickHit,
  recordModeScore,
  recordMultiBallActivation,
  recordPlayTime,
  recordPowerupCollected,
} from '@entities/dx-ball/Progress';
import { submitScore } from '@entities/dx-ball/Leaderboards';
import { getBallSkinVisual, getPaddleSkinVisual } from '@entities/dx-ball/Skins';

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
 *
 * DXB-10 adds the four remaining audio cues this scene itself owns
 * (`playDxBallSfx()`, right alongside the code that already detects each
 * event): "life lost" in `updateLives()` the instant lives actually
 * decrement, "level complete" in `handleLevelCleared()` (only on a
 * non-final level — the final one defers straight to `handleWin()`,
 * which plays "victory" instead so the two never both fire for the same
 * clear), "game over" in `handleGameOver()`, and "victory" in
 * `handleWin()`. `create()` also wires a global mute toggle (the `M`
 * key) directly to `AudioManager.get().toggle()` — a keybinding, not a
 * new HUD element, per this task's own "no visual redesign" restriction.
 *
 * DXB-12 expands the powerup roster and the HUD: `applyPowerupEffect()`
 * gains Fire Ball (timed pierce, including metal), Multi Ball (up to 3
 * balls; extras spend on miss so lives still only decrement when the
 * last ball is gone), Small Paddle, and Fast Ball. Timed effects keep
 * living on the entity they affect. An `ActiveEffectsLabel` at top-
 * center lists every active effect and its remaining duration. Existing
 * widen / slow / extra-life, score, lives, levels, and audio paths are
 * unchanged except that this scene now owns a `balls` array instead of
 * a single `ball` so Multi Ball can coexist with those systems.
 *
 * DXB-13 is a visual-only pass: an `ArcadeBackground` behind the
 * playfield, distinct brick/powerup/fire-ball drawing, and a shared HUD
 * typeface. Score, lives, levels, powerups, and audio call sites are
 * unchanged.
 *
 * DXB-14 adds game modes. `init()` reads `{ mode }` from ModeSelect
 * (default Classic). Classic is the pre-DXB-14 loop. Time Attack adds a
 * 90s countdown that ends the run at 0 (levels wrap so the full clock
 * can keep scoring). Endless wraps the existing `LEVELS` forever and
 * gradually raises a progression speed fold on every live ball. Score,
 * lives, powerups, and audio keep their existing call sites; a
 * `ModeLabel` shows the active mode (plus the Time Attack clock).
 *
 * DXB-13A: ESC opens a `PauseOverlay` (Resume / Restart Run / Return
 * To Mode Selection) from every gameplay state. The campaign is 5
 * levels; the HUD shows `Level X / 5`. Score, lives, and high score
 * still carry across the sequence on the same `BrickGrid`.
 *
 * DXB-15: reads the persisted theme and applies it to the backdrop,
 * HUD, brick row/type colors, powerup palette, pause card, and
 * result cards (victory / game over / time-up / level-clear). No
 * gameplay call site is replaced.
 *
 * DXB-16: records lifetime stats into `Progress.ts` (score deltas,
 * powerup catches, metal hits, Fire Ball destroys, Multi Ball
 * activations, Classic completion / perfect run, Time Attack best,
 * Endless level reached) and applies the equipped paddle / ball
 * skins. Gameplay rules are unchanged.
 *
 * DXB-17: the same recording path also counts games played, bricks
 * destroyed, per-mode personal bests, overall highest score, and
 * live play time, and submits a finished run's score to that mode's
 * local Top 10. Pause / end-of-run still own the existing overlays.
 */

export interface MainSceneData {
  mode?: GameModeId;
}
const HIGH_SCORE_KEY = 'dx-ball-high-score';

/** DXB-07: Starting lives per run — a placeholder tuning value, not playtested (see docs/progress/DXB-07.md). */
const STARTING_LIVES = 3;

/** DXB-09: How long widen-paddle / slow-ball last, in ms — preserved from the original timed pair. */
const POWERUP_EFFECT_DURATION_MS = 8000;

/** DXB-12: Per-type durations. Instant effects use `0`. */
const POWERUP_DURATION_MS: Record<PowerupType, number> = {
  'widen-paddle': POWERUP_EFFECT_DURATION_MS,
  'slow-ball': POWERUP_EFFECT_DURATION_MS,
  'extra-life': 0,
  'fire-ball': 10000,
  'multi-ball': 0,
  'small-paddle': 15000,
  'fast-ball': 10000,
};

/** DXB-12: Multi Ball always tops up to this many balls, never more. */
const MULTI_BALL_TOTAL = 3;

/** DXB-12: Heading offsets (degrees) applied to extras split from a launched ball. */
const MULTI_BALL_SPLIT_ANGLES_DEG = [-20, 20];

/** DXB-17: Flush accumulated play time to localStorage at this interval. */
const PLAY_TIME_FLUSH_MS = 5000;

export class MainScene extends Phaser.Scene {
  private paddle!: Paddle;
  /**
   * DXB-12: Every live ball this run. Index 0 is the serve ball at
   * create / level-advance time; extras are appended by Multi Ball.
   * Lives still only decrement when the last remaining ball misses.
   */
  private balls: Ball[] = [];
  private brickGrid!: BrickGrid;
  private powerupManager!: PowerupManager;
  private scoreLabel!: ScoreLabel;
  private bestScoreLabel!: ScoreLabel;
  private livesLabel!: ScoreLabel;
  private levelLabel!: ScoreLabel;
  private effectsLabel!: ActiveEffectsLabel;
  private modeLabel!: ModeLabel;
  private pauseOverlay!: PauseOverlay;
  private resultOverlay!: ResultOverlay;
  private background!: ArcadeBackground;
  private theme!: ThemeDefinition;
  private bestScore = 0;
  private lives = STARTING_LIVES;
  private lastMissCount = 0;
  /** DXB-16: Last score already folded into lifetime progress this run. */
  private lastRunScore = 0;
  /** DXB-16: True once a life has been lost this run (Perfect Run gate). */
  private lostLifeThisRun = false;
  /** DXB-08: 0-based index into `LEVELS` of the level currently in play. */
  private currentLevelIndex = 0;
  /** DXB-14: Chosen on the mode-select screen; defaults to Classic. */
  private mode: GameModeId = 'classic';
  /** DXB-14: Time Attack remaining ms. Unused in other modes. */
  private remainingTimeMs = TIME_ATTACK_DURATION_MS;
  /** DXB-14: Endless play time used for the gradual speed ramp. */
  private runElapsedMs = 0;
  /** DXB-17: Live-play ms not yet written to Progress. */
  private unflushedPlayTimeMs = 0;
  /** DXB-17: True once this run's score has been offered to the local board. */
  private runSubmitted = false;
  private unsubscribeViewport?: () => void;
  private won = false;
  private lost = false;
  /** DXB-14: Time Attack clock reached 0. Sibling to `won` / `lost`. */
  private timedOut = false;
  /** DXB-13A: True while the ESC pause overlay is open. */
  private paused = false;
  /** DXB-08: True between a level being cleared and the player continuing to the next one. */
  private transitioning = false;

  constructor() {
    super({ key: SceneKeys.Main });
  }

  init(data: MainSceneData = {}): void {
    this.mode = isGameModeId(data.mode) ? data.mode : 'classic';
  }

  create(): void {
    const viewport = GameViewport.get();
    const snapshot = viewport.getSnapshot();

    this.won = false;
    this.lost = false;
    this.timedOut = false;
    this.paused = false;
    this.transitioning = false;
    this.lives = STARTING_LIVES;
    this.lastMissCount = 0;
    this.lastRunScore = 0;
    this.lostLifeThisRun = false;
    this.currentLevelIndex = 0;
    this.remainingTimeMs = TIME_ATTACK_DURATION_MS;
    this.runElapsedMs = 0;
    this.unflushedPlayTimeMs = 0;
    this.runSubmitted = false;
    this.bestScore = HighScoreStore.get(HIGH_SCORE_KEY);
    this.theme = getTheme(loadPlayableThemeId());
    recordGamePlayed();

    this.cameras.main.setViewport(0, 0, snapshot.width, snapshot.height);
    this.cameras.main.setBackgroundColor(this.theme.backdrop.canvasBackground);
    this.background = new ArcadeBackground(
      this,
      snapshot.width,
      snapshot.height,
      this.theme.backdrop,
    );
    this.paddle = new Paddle(this, snapshot.width, snapshot.height);
    this.paddle.applySkin(getPaddleSkinVisual(loadPaddleSkinId()));
    const firstLevel = this.getCurrentLevel();
    this.brickGrid = new BrickGrid(
      this,
      snapshot.width,
      snapshot.height,
      this.withThemeBricks(firstLevel.brickGrid),
    );
    this.balls = [
      new Ball(
        this,
        snapshot.width,
        snapshot.height,
        this.paddle,
        this.brickGrid,
        firstLevel.ball,
      ),
    ];
    this.applyBallSkin(this.balls[0]);
    this.powerupManager = new PowerupManager(this, snapshot.width, snapshot.height, this.paddle, {
      palette: this.theme.powerups,
    });
    this.scoreLabel = new ScoreLabel(this, snapshot.width, snapshot.height, {
      prefix: 'Score: ',
      color: this.theme.hud.score,
      stroke: this.theme.hud.stroke,
      anchor: 'top-left',
    });
    this.bestScoreLabel = new ScoreLabel(this, snapshot.width, snapshot.height, {
      prefix: 'Best: ',
      color: this.theme.hud.best,
      stroke: this.theme.hud.stroke,
      anchor: 'top-right',
    });
    this.bestScoreLabel.setValue(this.bestScore);
    this.livesLabel = new ScoreLabel(this, snapshot.width, snapshot.height, {
      prefix: 'Lives: ',
      color: this.theme.hud.lives,
      stroke: this.theme.hud.stroke,
      anchor: 'bottom-left',
    });
    this.livesLabel.setValue(this.lives);
    this.levelLabel = new ScoreLabel(this, snapshot.width, snapshot.height, {
      prefix: 'Level ',
      color: this.theme.hud.level,
      stroke: this.theme.hud.stroke,
      anchor: 'bottom-right',
      fontSizeRatio: 0.032,
    });
    this.refreshLevelLabel();
    this.modeLabel = new ModeLabel(this, snapshot.width, snapshot.height, {
      color: this.theme.hud.mode,
    });
    this.refreshModeLabel();
    this.effectsLabel = new ActiveEffectsLabel(this, snapshot.width, snapshot.height, {
      topRatio: 0.055,
      color: this.theme.hud.effects,
    });
    this.pauseOverlay = new PauseOverlay(this, snapshot.width, snapshot.height);
    this.pauseOverlay.applyTheme({
      ...this.theme.overlay,
      menuColor: this.theme.menu.color,
      menuHighlight: this.theme.menu.highlightColor,
      menuDescription: this.theme.menu.descriptionColor,
      menuMuted: this.theme.menu.mutedColor,
    });
    this.resultOverlay = new ResultOverlay(this, snapshot.width, snapshot.height);
    this.resultOverlay.applyTheme(this.theme.overlay);

    // The pattern every future game should follow: subscribe once, then
    // reposition/rescale whatever depends on viewport size whenever it
    // changes (window resize, orientation change, safe-area change).
    this.unsubscribeViewport = viewport.onChange((next) => this.handleViewportChange(next));

    // Scenes own their subscriptions: unsubscribe on shutdown so nothing
    // leaks if this scene is stopped/restarted. DXB-17 also flushes play
    // time and offers the run to the local leaderboard on the way out.
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubscribeViewport?.();
      this.flushPlayTime();
      this.submitRunIfNeeded();
    });

    // DXB-10: global audio mute toggle. A keybinding rather than a HUD
    // button/icon, per this task's "no visual redesign" restriction; the
    // listener itself is on `this.input.keyboard` (scene-scoped), so it's
    // torn down automatically on shutdown/restart like every other
    // per-scene input listener already is.
    this.input.keyboard?.on('keydown-M', () => {
      try {
        AudioManager.get().toggle();
      } catch {
        // AudioManager missing/unavailable — ignore the toggle.
      }
    });

    // DXB-13A: ESC opens (or closes) the pause overlay from every
    // gameplay state, including win / game-over / time-up / level clear.
    this.input.keyboard?.on('keydown-ESC', () => this.togglePauseMenu());
  }

  update(_time: number, delta: number): void {
    if (this.paused || this.won || this.lost || this.timedOut) {
      return;
    }

    this.updateTimeAttack(delta);
    if (this.timedOut) {
      return;
    }

    this.updateEndlessSpeed(delta);

    if (this.transitioning) {
      return;
    }

    this.accumulatePlayTime(delta);

    this.paddle.update(delta);
    this.updateBalls(delta);
    this.updateProgressFromHits();
    this.updatePowerups(delta);
    this.updateScore();
    this.updateActiveEffects();

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

    const delta = score - this.lastRunScore;
    if (delta > 0) {
      recordLifetimeScoreDelta(delta);
      recordModeScore(this.mode, score);
      this.lastRunScore = score;
    }

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
    const serveBall = this.balls[0];
    if (!serveBall) {
      return;
    }

    const missCount = serveBall.getMissCount();
    const newMisses = missCount - this.lastMissCount;

    if (newMisses <= 0) {
      return;
    }

    this.lastMissCount = missCount;
    this.lives = Math.max(0, this.lives - newMisses);
    this.lostLifeThisRun = true;
    this.livesLabel.setValue(this.lives);
    playDxBallSfx('life-lost');
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
      recordPowerupCollected();
      this.applyPowerupEffect(type);
    }
  }

  /**
   * DXB-16: Folds brick contacts into lifetime achievement counters.
   * Metal hits count even when the brick survives; Fire Ball destroys
   * count only when pierce actually removed the brick.
   * DXB-17: every actual destroy also increments bricksDestroyed.
   */
  private updateProgressFromHits(): void {
    let destroyed = 0;
    for (const hit of this.brickGrid.consumePendingHits()) {
      if (hit.brickType === 'metal') {
        recordMetalBrickHit();
      }
      if (hit.destroyed) {
        destroyed += 1;
      }
      if (hit.destroyed && hit.pierced) {
        recordFireBallBrickDestroyed();
      }
    }
    if (destroyed > 0) {
      recordBricksDestroyed(destroyed);
    }
  }

  /** DXB-17: Count only live play; paused / ended / level-clear waits are excluded. */
  private accumulatePlayTime(deltaMs: number): void {
    this.unflushedPlayTimeMs += deltaMs;
    if (this.unflushedPlayTimeMs >= PLAY_TIME_FLUSH_MS) {
      this.flushPlayTime();
    }
  }

  private flushPlayTime(): void {
    if (this.unflushedPlayTimeMs <= 0) {
      return;
    }
    recordPlayTime(this.unflushedPlayTimeMs);
    this.unflushedPlayTimeMs = 0;
  }

  /**
   * DXB-17: Offers this run's score to the local Top 10 once. Called
   * from win / game-over / time-up and from shutdown (pause leave /
   * restart) so a refresh on an end card still persists the entry.
   */
  private submitRunIfNeeded(): void {
    if (this.runSubmitted || !this.brickGrid) {
      return;
    }

    this.runSubmitted = true;
    this.flushPlayTime();
    submitScore(this.mode, this.brickGrid.getScore());
  }

  /**
   * DXB-12: Advances every live ball, removes extras that spent on a
   * miss, and only runs the existing lives poll when exactly one ball
   * remains. If every ball spent in the same frame, that is one life
   * lost and a fresh serve ball is created — the Multi-Ball equivalent
   * of `returnToPaddle()` + `updateLives()`.
   */
  private updateBalls(deltaMs: number): void {
    for (const ball of this.balls) {
      ball.update(deltaMs);
    }

    const hadMultiple = this.balls.length > 1;
    this.balls = this.balls.filter((ball) => {
      if (!ball.isSpent()) {
        return true;
      }
      ball.destroy();
      return false;
    });

    if (this.balls.length === 0) {
      this.handleAllBallsSpent();
      return;
    }

    if (this.balls.length === 1) {
      this.balls[0].setMissBehavior('reserve');
      if (hadMultiple) {
        this.lastMissCount = this.balls[0].getMissCount();
      }
      this.updateLives();
    }
  }

  /** Last remaining balls all spent this frame — one miss, one new serve. */
  private handleAllBallsSpent(): void {
    this.balls = [this.createServeBall()];
    this.lastMissCount = 0;
    this.lives = Math.max(0, this.lives - 1);
    this.lostLifeThisRun = true;
    this.livesLabel.setValue(this.lives);
    playDxBallSfx('life-lost');
  }

  private createServeBall(): Ball {
    const { width, height } = GameViewport.get().getSnapshot();
    const level = this.getCurrentLevel();
    const ball = new Ball(this, width, height, this.paddle, this.brickGrid, level.ball);
    this.applyBallSkin(ball);
    this.applyEndlessSpeed(ball);
    return ball;
  }

  private applyBallSkin(ball: Ball): void {
    ball.applySkin(getBallSkinVisual(loadBallSkinId()));
  }

  /** DXB-14: Current `LEVELS` entry, wrapping in Time Attack / Endless. */
  private getCurrentLevel(): LevelConfig {
    return LEVELS[this.currentLevelIndex % LEVELS.length];
  }

  /** DXB-14: Time Attack countdown. Ends the run at 0; paused only after the run is over. */
  private updateTimeAttack(deltaMs: number): void {
    if (this.mode !== 'time-attack') {
      return;
    }

    this.remainingTimeMs = Math.max(0, this.remainingTimeMs - deltaMs);
    this.refreshModeLabel();

    if (this.remainingTimeMs <= 0) {
      this.handleTimeUp();
    }
  }

  /** DXB-14: Endless gradual speed ramp. No-ops in Classic / Time Attack. */
  private updateEndlessSpeed(deltaMs: number): void {
    if (this.mode !== 'endless') {
      return;
    }

    this.runElapsedMs += deltaMs;
    for (const ball of this.balls) {
      this.applyEndlessSpeed(ball);
    }
  }

  private applyEndlessSpeed(ball: Ball): void {
    if (this.mode !== 'endless') {
      return;
    }

    ball.setProgressionMultiplier(computeEndlessSpeedMultiplier(this.runElapsedMs));
  }

  private refreshModeLabel(): void {
    const label = getGameModeInfo(this.mode).label.toUpperCase();
    const detail =
      this.mode === 'time-attack' ? formatTimeAttackClock(this.remainingTimeMs) : undefined;
    this.modeLabel.setContent(label, detail);
  }

  /**
   * DXB-12: Polls every timed effect (and Multi Ball's live count) into
   * the top-center HUD. Extra-life is instant and is not listed.
   */
  private updateActiveEffects(): void {
    const effects: ActiveEffectDisplay[] = [];
    const fireMs = this.maxBallEffect((ball) => ball.getFireRemainingMs());
    const slowMs = this.maxBallEffect((ball) => ball.getSlowRemainingMs());
    const fastMs = this.maxBallEffect((ball) => ball.getFastRemainingMs());
    const widenMs = this.paddle.getWidenRemainingMs();
    const smallMs = this.paddle.getSmallRemainingMs();

    if (fireMs > 0) {
      effects.push({ label: 'FIRE', remainingMs: fireMs });
    }
    if (this.balls.length > 1) {
      effects.push({ label: 'MULTI', detail: `x${this.balls.length}` });
    }
    if (widenMs > 0) {
      effects.push({ label: 'WIDE', remainingMs: widenMs });
    }
    if (smallMs > 0) {
      effects.push({ label: 'SMALL', remainingMs: smallMs });
    }
    if (slowMs > 0) {
      effects.push({ label: 'SLOW', remainingMs: slowMs });
    }
    if (fastMs > 0) {
      effects.push({ label: 'FAST', remainingMs: fastMs });
    }

    this.effectsLabel.setEffects(effects);
  }

  private maxBallEffect(read: (ball: Ball) => number): number {
    let max = 0;
    for (const ball of this.balls) {
      max = Math.max(max, read(ball));
    }
    return max;
  }

  /** DXB-09/DXB-12: The one place that knows what each powerup type actually does. */
  private applyPowerupEffect(type: PowerupType): void {
    const durationMs = POWERUP_DURATION_MS[type];

    switch (type) {
      case 'extra-life':
        this.lives++;
        this.livesLabel.setValue(this.lives);
        break;
      case 'widen-paddle':
        this.paddle.applyWidenBoost(durationMs);
        break;
      case 'slow-ball':
        for (const ball of this.balls) {
          ball.applySlowEffect(durationMs);
        }
        break;
      case 'fire-ball':
        for (const ball of this.balls) {
          ball.applyFireEffect(durationMs);
        }
        break;
      case 'fast-ball':
        for (const ball of this.balls) {
          ball.applyFastEffect(durationMs);
        }
        break;
      case 'small-paddle':
        this.paddle.applyShrinkEffect(durationMs);
        break;
      case 'multi-ball':
        recordMultiBallActivation();
        this.spawnMultiBall();
        break;
    }
  }

  /**
   * DXB-12: Tops the live ball count up to `MULTI_BALL_TOTAL`. Extras
   * inherit the source ball's remaining timed effects and start already
   * launched. While more than one ball is in play, every ball spends on
   * miss so a single extra falling off the bottom cannot cost a life.
   */
  private spawnMultiBall(): void {
    const needed = MULTI_BALL_TOTAL - this.balls.length;
    if (needed <= 0 || this.balls.length === 0) {
      return;
    }

    const source = this.balls.find((ball) => ball.isLaunched()) ?? this.balls[0];
    const sourceVelocity = new Phaser.Math.Vector2();
    source.copyVelocityInto(sourceVelocity);
    const launched = source.isLaunched() && sourceVelocity.length() > 0;
    const { width, height } = GameViewport.get().getSnapshot();
    const level = this.getCurrentLevel();

    for (let i = 0; i < needed; i++) {
      const extra = new Ball(this, width, height, this.paddle, this.brickGrid, level.ball);
      extra.copyEffectsFrom(source);
      this.applyBallSkin(extra);
      this.applyEndlessSpeed(extra);

      if (launched) {
        const split = sourceVelocity.clone().rotate(
          Phaser.Math.DegToRad(MULTI_BALL_SPLIT_ANGLES_DEG[i] ?? (i % 2 === 0 ? -20 : 20)),
        );
        extra.becomeExtra(source.x, source.y, split.x, split.y);
      } else {
        const speed = source.getTravelSpeed();
        const angleDeg = -60 + (MULTI_BALL_SPLIT_ANGLES_DEG[i] ?? (i % 2 === 0 ? -20 : 20));
        const angle = Phaser.Math.DegToRad(angleDeg);
        extra.becomeExtra(source.x, source.y, Math.cos(angle) * speed, Math.sin(angle) * speed);
      }

      this.balls.push(extra);
    }

    if (this.balls.length > 1) {
      for (const ball of this.balls) {
        ball.setMissBehavior('spend');
      }
    }
  }

  /**
   * DXB-08: Called instead of `handleWin()` whenever `brickGrid.isCleared()`
   * fires and a level *after* the current one still exists in `LEVELS`.
   * DXB-14: Classic still wins on the last level. Time Attack and Endless
   * wrap `LEVELS` so score can keep growing (timer / lives end those runs).
   * Freezes gameplay via the new `transitioning` flag (a sibling to
   * `won`/`lost` in `update()`'s guard) and shows a one-shot "LEVEL
   * CLEARED" message; a Space press calls `advanceToNextLevel()`.
   */
  private handleLevelCleared(): void {
    if (this.mode === 'classic' && this.currentLevelIndex >= LEVELS.length - 1) {
      this.handleWin();
      return;
    }

    playDxBallSfx('level-complete');
    this.transitioning = true;

    const clearedLevelNumber = this.currentLevelIndex + 1;
    this.resultOverlay.show({
      tone: 'info',
      title: `LEVEL ${clearedLevelNumber} CLEARED`,
      body: `Get ready for Level ${clearedLevelNumber + 1}\nPress Space to continue`,
    });

    this.input.keyboard?.once('keydown-SPACE', () => this.continueAfterLevelClear());
  }

  private continueAfterLevelClear(): void {
    if (this.paused || this.timedOut || this.won || this.lost) {
      return;
    }

    this.advanceToNextLevel();
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
    this.resultOverlay.hide();

    const { width, height } = GameViewport.get().getSnapshot();
    const level = this.getCurrentLevel();

    if (this.mode === 'endless') {
      recordEndlessLevel(this.currentLevelIndex + 1);
    }

    this.brickGrid.loadLevel(this.withThemeBricks(level.brickGrid), width, height);

    for (const ball of this.balls) {
      ball.destroy();
    }
    this.balls = [this.createServeBall()];
    // DXB-09: a stray capsule still falling from the just-cleared level
    // shouldn't carry into the next one's fresh brick layout.
    this.powerupManager.clear();
    this.effectsLabel.setEffects([]);

    this.lastMissCount = 0;
    this.refreshLevelLabel();
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
    playDxBallSfx('victory');

    if (this.mode === 'classic') {
      recordClassicComplete(!this.lostLifeThisRun);
    }

    this.submitRunIfNeeded();

    const finalScore = this.brickGrid.getScore();
    this.resultOverlay.show({
      tone: 'victory',
      title: 'YOU WIN',
      body: `All ${LEVELS.length} levels cleared\nScore: ${finalScore}\nPress Space to play again\nPress Esc for menu`,
    });

    this.bindEndOfRunInput();
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
    playDxBallSfx('game-over');
    this.submitRunIfNeeded();

    const finalScore = this.brickGrid.getScore();
    this.resultOverlay.show({
      tone: 'defeat',
      title: 'GAME OVER',
      body: `Score: ${finalScore}\nPress Space to try again\nPress Esc for menu`,
    });

    this.bindEndOfRunInput();
  }

  /**
   * DXB-14: Time Attack clock reached 0. Highest score for the run is
   * whatever `updateScore()` already persisted. Reuses the existing
   * game-over cue so audio stays on the same 8-event vocabulary.
   */
  private handleTimeUp(): void {
    if (this.timedOut || this.won || this.lost) {
      return;
    }

    this.timedOut = true;
    this.transitioning = false;
    this.resultOverlay.hide();
    playDxBallSfx('game-over');
    this.submitRunIfNeeded();

    const finalScore = this.brickGrid.getScore();
    this.resultOverlay.show({
      tone: 'defeat',
      title: "TIME'S UP",
      body: `Score: ${finalScore}\nPress Space to play again\nPress Esc for menu`,
    });

    this.bindEndOfRunInput();
  }

  /** Space replays the same mode. Esc is the global pause menu (see `togglePauseMenu`). */
  private bindEndOfRunInput(): void {
    this.input.keyboard?.off('keydown-SPACE');
    this.input.keyboard?.once('keydown-SPACE', () => {
      if (this.paused) {
        return;
      }
      this.scene.restart({ mode: this.mode });
    });
  }

  private refreshLevelLabel(): void {
    this.levelLabel.setValue(this.currentLevelIndex + 1, ` / ${LEVELS.length}`);
  }

  /**
   * DXB-13A: ESC from any gameplay state. A second ESC (or Resume)
   * closes the overlay. Opening the menu unbinds Space continue/restart
   * so SelectMenu confirm cannot also advance a level or restart a run.
   */
  private togglePauseMenu(): void {
    if (this.paused) {
      this.closePauseMenu();
      return;
    }

    this.openPauseMenu();
  }

  private openPauseMenu(): void {
    this.paused = true;
    this.input.keyboard?.off('keydown-SPACE');
    this.pauseOverlay.show((action) => this.handlePauseAction(action));
  }

  private closePauseMenu(): void {
    this.pauseOverlay.hide();
    this.paused = false;
    this.rebindPausedSpace();
  }

  private handlePauseAction(action: PauseOverlayAction): void {
    switch (action) {
      case 'resume':
        this.closePauseMenu();
        break;
      case 'restart':
        this.pauseOverlay.hide();
        this.paused = false;
        this.scene.restart({ mode: this.mode });
        break;
      case 'mode-select':
        this.pauseOverlay.hide();
        this.paused = false;
        this.scene.start(SceneKeys.ModeSelect);
        break;
    }
  }

  /** Restores Space continue/restart after the pause menu closes. */
  private rebindPausedSpace(): void {
    if (this.won || this.lost || this.timedOut) {
      this.bindEndOfRunInput();
      return;
    }

    if (this.transitioning) {
      this.input.keyboard?.once('keydown-SPACE', () => this.continueAfterLevelClear());
    }
  }

  /** DXB-15: Level layouts stay authored; only palette tokens come from the theme. */
  private withThemeBricks(config: BrickGridConfig | undefined): BrickGridConfig {
    return {
      ...config,
      colors: this.theme.bricks.rowColors,
      typeVisuals: this.theme.bricks.types,
    };
  }

  private handleViewportChange(snapshot: ViewportSnapshot): void {
    // Keep the camera in lockstep with the current canvas size. Phaser's
    // Scale Manager resizes the canvas itself; this ensures this scene's
    // world/coordinate space always matches it exactly (no letterboxing
    // drift, no stale viewport on rapid resizes).
    this.cameras.main.setViewport(0, 0, snapshot.width, snapshot.height);
    this.background.resize(snapshot.width, snapshot.height);
    this.paddle.resize(snapshot.width, snapshot.height);
    for (const ball of this.balls) {
      ball.resize(snapshot.width, snapshot.height);
    }
    this.brickGrid.resize(snapshot.width, snapshot.height);
    this.powerupManager.resize(snapshot.width, snapshot.height);
    this.scoreLabel.resize(snapshot.width, snapshot.height);
    this.bestScoreLabel.resize(snapshot.width, snapshot.height);
    this.livesLabel.resize(snapshot.width, snapshot.height);
    this.levelLabel.resize(snapshot.width, snapshot.height);
    this.modeLabel.resize(snapshot.width, snapshot.height);
    this.effectsLabel.resize(snapshot.width, snapshot.height);
    this.pauseOverlay.resize(snapshot.width, snapshot.height);
    this.resultOverlay.resize(snapshot.width, snapshot.height);
  }
}
