import { JsonStore } from '@systems/JsonStore';
import { ThemeStore } from '@systems/ThemeStore';
import { HighScoreStore } from '@systems/HighScoreStore';
import { loadThemeId, type ThemeId } from '@entities/dx-ball/Theme';
import type { GameModeId } from '@entities/dx-ball/GameMode';

/**
 * entities/dx-ball/Progress.ts
 *
 * DXB-16: DX-Ball's achievement / unlock vocabulary and lifetime
 * counters. Kept out of `MainScene` the same way `Theme.ts` / `GameMode.ts`
 * keep palettes and modes out of the run — this file names the stats,
 * the unlock gates, and the achievement list. Persistence is a
 * game-agnostic `JsonStore`; this module owns what a valid blob is.
 *
 * Unlocks are derived from stats on every read, not stored as a
 * separate flag list, so a refresh cannot desync "I have 25000 score"
 * from "Laboratory is unlocked".
 *
 * DXB-17: the same blob also holds long-term statistics (games played,
 * highest scores per mode, bricks destroyed, play time). Leaderboards
 * are a sibling file (`Leaderboards.ts`) with their own key so Top 10
 * lists cannot corrupt unlock counters.
 */

export type PaddleSkinId = 'classic' | 'carbon' | 'neon' | 'reactor';
export type BallSkinId = 'classic' | 'plasma' | 'inferno' | 'quantum';

export interface DxBallStats {
  lifetimeScore: number;
  powerupsCollected: number;
  metalBricksHit: number;
  fireBallBricksDestroyed: number;
  multiBallActivations: number;
  classicCompleted: boolean;
  classicPerfect: boolean;
  timeAttackBestScore: number;
  endlessMaxLevel: number;
  /** DXB-17: Runs started (create / restart). */
  gamesPlayed: number;
  /** DXB-17: Best score across every mode. */
  highestScore: number;
  /** DXB-17: Best finished-or-live Classic score. */
  classicBestScore: number;
  /** DXB-17: Best finished-or-live Endless score. */
  endlessBestScore: number;
  /** DXB-17: Bricks actually destroyed (not metal bounces). */
  bricksDestroyed: number;
  /** DXB-17: Accumulated live-play milliseconds (paused / ended time excluded). */
  playTimeMs: number;
}

/** DXB-17: Label + formatted value for the statistics screen. */
export interface StatDisplayRow {
  id: string;
  title: string;
  value: string;
}

export interface ProgressSummary {
  completionPercent: number;
  unlockedCount: number;
  totalCount: number;
  themesUnlocked: number;
  themesTotal: number;
  paddlesUnlocked: number;
  paddlesTotal: number;
  ballsUnlocked: number;
  ballsTotal: number;
  achievementsComplete: number;
  achievementsTotal: number;
}

export interface ProgressRow {
  id: string;
  title: string;
  requirement: string;
  current: number;
  target: number;
  percent: number;
  unlocked: boolean;
  complete: boolean;
  equipped?: boolean;
}

const PROGRESS_STORAGE_KEY = 'dx-ball-progress';
const PADDLE_SKIN_STORAGE_KEY = 'dx-ball-paddle-skin';
const BALL_SKIN_STORAGE_KEY = 'dx-ball-ball-skin';
/** Same key `MainScene` uses for the in-run Best HUD (DXB-06). */
const HIGH_SCORE_STORAGE_KEY = 'dx-ball-high-score';

const EMPTY_STATS: DxBallStats = {
  lifetimeScore: 0,
  powerupsCollected: 0,
  metalBricksHit: 0,
  fireBallBricksDestroyed: 0,
  multiBallActivations: 0,
  classicCompleted: false,
  classicPerfect: false,
  timeAttackBestScore: 0,
  endlessMaxLevel: 0,
  gamesPlayed: 0,
  highestScore: 0,
  classicBestScore: 0,
  endlessBestScore: 0,
  bricksDestroyed: 0,
  playTimeMs: 0,
};

let cached: DxBallStats | null = null;

function clampNonNegInt(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) {
    return 0;
  }
  return Math.floor(n);
}

function normalizeStats(raw: Partial<DxBallStats> | null | undefined): DxBallStats {
  return {
    lifetimeScore: clampNonNegInt(raw?.lifetimeScore ?? EMPTY_STATS.lifetimeScore),
    powerupsCollected: clampNonNegInt(raw?.powerupsCollected ?? EMPTY_STATS.powerupsCollected),
    metalBricksHit: clampNonNegInt(raw?.metalBricksHit ?? EMPTY_STATS.metalBricksHit),
    fireBallBricksDestroyed: clampNonNegInt(
      raw?.fireBallBricksDestroyed ?? EMPTY_STATS.fireBallBricksDestroyed,
    ),
    multiBallActivations: clampNonNegInt(
      raw?.multiBallActivations ?? EMPTY_STATS.multiBallActivations,
    ),
    classicCompleted: raw?.classicCompleted === true,
    classicPerfect: raw?.classicPerfect === true,
    timeAttackBestScore: clampNonNegInt(
      raw?.timeAttackBestScore ?? EMPTY_STATS.timeAttackBestScore,
    ),
    endlessMaxLevel: clampNonNegInt(raw?.endlessMaxLevel ?? EMPTY_STATS.endlessMaxLevel),
    gamesPlayed: clampNonNegInt(raw?.gamesPlayed ?? EMPTY_STATS.gamesPlayed),
    highestScore: clampNonNegInt(raw?.highestScore ?? EMPTY_STATS.highestScore),
    classicBestScore: clampNonNegInt(raw?.classicBestScore ?? EMPTY_STATS.classicBestScore),
    endlessBestScore: clampNonNegInt(raw?.endlessBestScore ?? EMPTY_STATS.endlessBestScore),
    bricksDestroyed: clampNonNegInt(raw?.bricksDestroyed ?? EMPTY_STATS.bricksDestroyed),
    playTimeMs: clampNonNegInt(raw?.playTimeMs ?? EMPTY_STATS.playTimeMs),
  };
}

function loadStats(): DxBallStats {
  if (cached) {
    return cached;
  }

  cached = normalizeStats(JsonStore.get<Partial<DxBallStats>>(PROGRESS_STORAGE_KEY));

  // DXB-17: seed overall highest from the pre-existing Best HUD store so
  // a player who never ran after this task still sees their old best.
  const storedBest = HighScoreStore.get(HIGH_SCORE_STORAGE_KEY);
  if (storedBest > cached.highestScore) {
    cached.highestScore = storedBest;
    JsonStore.set(PROGRESS_STORAGE_KEY, cached);
  }

  return cached;
}

function saveStats(): void {
  JsonStore.set(PROGRESS_STORAGE_KEY, loadStats());
}

function percent(current: number, target: number): number {
  if (target <= 0) {
    return 100;
  }
  return Math.max(0, Math.min(100, Math.floor((current / target) * 100)));
}

function countRow(
  id: string,
  title: string,
  requirement: string,
  current: number,
  target: number,
  equipped?: boolean,
): ProgressRow {
  const unlocked = current >= target;
  return {
    id,
    title,
    requirement,
    current: Math.min(current, target),
    target,
    percent: percent(current, target),
    unlocked,
    complete: unlocked,
    equipped,
  };
}

function flagRow(
  id: string,
  title: string,
  requirement: string,
  done: boolean,
  equipped?: boolean,
): ProgressRow {
  return {
    id,
    title,
    requirement,
    current: done ? 1 : 0,
    target: 1,
    percent: done ? 100 : 0,
    unlocked: done,
    complete: done,
    equipped,
  };
}

export function isThemeUnlocked(id: ThemeId): boolean {
  const stats = loadStats();
  if (id === 'neon-arcade') {
    return true;
  }
  if (id === 'space') {
    return stats.classicCompleted;
  }
  return stats.lifetimeScore >= 25_000;
}

export function isPaddleSkinUnlocked(id: PaddleSkinId): boolean {
  const stats = loadStats();
  switch (id) {
    case 'classic':
      return true;
    case 'carbon':
      return stats.powerupsCollected >= 100;
    case 'neon':
      return stats.timeAttackBestScore >= 15_000;
    case 'reactor':
      return stats.fireBallBricksDestroyed >= 250;
  }
}

export function isBallSkinUnlocked(id: BallSkinId): boolean {
  const stats = loadStats();
  switch (id) {
    case 'classic':
      return true;
    case 'plasma':
      return stats.multiBallActivations >= 50;
    case 'inferno':
      return stats.fireBallBricksDestroyed >= 500;
    case 'quantum':
      return stats.endlessMaxLevel >= 20;
  }
}

export function getThemeUnlockHint(id: ThemeId): string {
  switch (id) {
    case 'neon-arcade':
      return 'Unlocked by default.';
    case 'space':
      return 'Complete Classic Mode.';
    case 'laboratory':
      return 'Reach 25,000 lifetime score.';
  }
}

export function isPaddleSkinId(value: unknown): value is PaddleSkinId {
  return value === 'classic' || value === 'carbon' || value === 'neon' || value === 'reactor';
}

export function isBallSkinId(value: unknown): value is BallSkinId {
  return value === 'classic' || value === 'plasma' || value === 'inferno' || value === 'quantum';
}

/** Last chosen theme that is still unlocked, or Neon Arcade. */
export function loadPlayableThemeId(): ThemeId {
  const stored = loadThemeId();
  return isThemeUnlocked(stored) ? stored : 'neon-arcade';
}

export function loadPaddleSkinId(): PaddleSkinId {
  const stored = ThemeStore.get(PADDLE_SKIN_STORAGE_KEY);
  const id = isPaddleSkinId(stored) ? stored : 'classic';
  return isPaddleSkinUnlocked(id) ? id : 'classic';
}

export function savePaddleSkinId(id: PaddleSkinId): void {
  if (!isPaddleSkinUnlocked(id)) {
    return;
  }
  ThemeStore.set(PADDLE_SKIN_STORAGE_KEY, id);
}

export function loadBallSkinId(): BallSkinId {
  const stored = ThemeStore.get(BALL_SKIN_STORAGE_KEY);
  const id = isBallSkinId(stored) ? stored : 'classic';
  return isBallSkinUnlocked(id) ? id : 'classic';
}

export function saveBallSkinId(id: BallSkinId): void {
  if (!isBallSkinUnlocked(id)) {
    return;
  }
  ThemeStore.set(BALL_SKIN_STORAGE_KEY, id);
}

export function recordLifetimeScoreDelta(delta: number): void {
  if (delta <= 0) {
    return;
  }
  loadStats().lifetimeScore += delta;
  saveStats();
}

export function recordPowerupCollected(): void {
  loadStats().powerupsCollected += 1;
  saveStats();
}

export function recordMetalBrickHit(): void {
  loadStats().metalBricksHit += 1;
  saveStats();
}

export function recordFireBallBrickDestroyed(): void {
  loadStats().fireBallBricksDestroyed += 1;
  saveStats();
}

export function recordMultiBallActivation(): void {
  loadStats().multiBallActivations += 1;
  saveStats();
}

export function recordClassicComplete(perfect: boolean): void {
  const stats = loadStats();
  stats.classicCompleted = true;
  if (perfect) {
    stats.classicPerfect = true;
  }
  saveStats();
}

export function recordTimeAttackScore(score: number): void {
  recordModeScore('time-attack', score);
}

/** `levelNumber` is 1-based (`currentLevelIndex + 1`), including Endless wrap. */
export function recordEndlessLevel(levelNumber: number): void {
  const stats = loadStats();
  if (levelNumber > stats.endlessMaxLevel) {
    stats.endlessMaxLevel = levelNumber;
    saveStats();
  }
}

/** DXB-17: Live per-mode bests plus overall highest. No-ops if `score` is not an improvement. */
export function recordModeScore(mode: GameModeId, score: number): void {
  const stats = loadStats();
  const value = clampNonNegInt(score);
  let changed = false;

  if (value > stats.highestScore) {
    stats.highestScore = value;
    changed = true;
  }

  if (mode === 'classic' && value > stats.classicBestScore) {
    stats.classicBestScore = value;
    changed = true;
  }

  if (mode === 'time-attack' && value > stats.timeAttackBestScore) {
    stats.timeAttackBestScore = value;
    changed = true;
  }

  if (mode === 'endless' && value > stats.endlessBestScore) {
    stats.endlessBestScore = value;
    changed = true;
  }

  if (changed) {
    saveStats();
  }
}

export function recordGamePlayed(): void {
  loadStats().gamesPlayed += 1;
  saveStats();
}

export function recordBricksDestroyed(count = 1): void {
  const add = clampNonNegInt(count);
  if (add <= 0) {
    return;
  }
  loadStats().bricksDestroyed += add;
  saveStats();
}

export function recordPlayTime(deltaMs: number): void {
  const add = clampNonNegInt(deltaMs);
  if (add <= 0) {
    return;
  }
  loadStats().playTimeMs += add;
  saveStats();
}

export function getStats(): DxBallStats {
  return { ...loadStats() };
}

export function getThemeUnlockRows(equippedId: ThemeId): ProgressRow[] {
  const stats = loadStats();
  return [
    flagRow(
      'neon-arcade',
      'Neon Arcade',
      'Unlocked by default.',
      true,
      equippedId === 'neon-arcade',
    ),
    flagRow(
      'space',
      'Space',
      'Complete Classic Mode.',
      stats.classicCompleted,
      equippedId === 'space',
    ),
    countRow(
      'laboratory',
      'Laboratory',
      'Reach 25,000 lifetime score.',
      stats.lifetimeScore,
      25_000,
      equippedId === 'laboratory',
    ),
  ];
}

export function getPaddleUnlockRows(equippedId: PaddleSkinId): ProgressRow[] {
  const stats = loadStats();
  return [
    flagRow('classic', 'Classic Paddle', 'Unlocked by default.', true, equippedId === 'classic'),
    countRow(
      'carbon',
      'Carbon Paddle',
      'Collect 100 powerups.',
      stats.powerupsCollected,
      100,
      equippedId === 'carbon',
    ),
    countRow(
      'neon',
      'Neon Paddle',
      'Reach 15,000 points in Time Attack.',
      stats.timeAttackBestScore,
      15_000,
      equippedId === 'neon',
    ),
    countRow(
      'reactor',
      'Reactor Paddle',
      'Destroy 250 bricks using Fire Ball.',
      stats.fireBallBricksDestroyed,
      250,
      equippedId === 'reactor',
    ),
  ];
}

export function getBallUnlockRows(equippedId: BallSkinId): ProgressRow[] {
  const stats = loadStats();
  return [
    flagRow('classic', 'Classic Ball', 'Unlocked by default.', true, equippedId === 'classic'),
    countRow(
      'plasma',
      'Plasma Ball',
      'Activate Multi Ball 50 times.',
      stats.multiBallActivations,
      50,
      equippedId === 'plasma',
    ),
    countRow(
      'inferno',
      'Inferno Ball',
      'Destroy 500 bricks while Fire Ball is active.',
      stats.fireBallBricksDestroyed,
      500,
      equippedId === 'inferno',
    ),
    countRow(
      'quantum',
      'Quantum Ball',
      'Reach Level 20 in Endless Mode.',
      stats.endlessMaxLevel,
      20,
      equippedId === 'quantum',
    ),
  ];
}

export function getAchievementRows(): ProgressRow[] {
  const stats = loadStats();
  return [
    flagRow('first-victory', 'First Victory', 'Complete Classic Mode.', stats.classicCompleted),
    countRow(
      'power-collector',
      'Power Collector',
      'Collect 250 total powerups.',
      stats.powerupsCollected,
      250,
    ),
    countRow(
      'metal-breaker',
      'Metal Breaker',
      'Hit 500 metal bricks.',
      stats.metalBricksHit,
      500,
    ),
    countRow(
      'fire-master',
      'Fire Master',
      'Destroy 500 bricks with Fire Ball.',
      stats.fireBallBricksDestroyed,
      500,
    ),
    countRow(
      'endless-survivor',
      'Endless Survivor',
      'Reach Level 20 in Endless Mode.',
      stats.endlessMaxLevel,
      20,
    ),
    countRow(
      'time-attack-expert',
      'Time Attack Expert',
      'Reach 20,000 points in Time Attack.',
      stats.timeAttackBestScore,
      20_000,
    ),
    flagRow(
      'perfect-run',
      'Perfect Run',
      'Complete Classic Mode without losing a life.',
      stats.classicPerfect,
    ),
  ];
}

export function countUnlocked(rows: readonly ProgressRow[]): number {
  return rows.filter((row) => row.unlocked).length;
}

export function formatCount(value: number): string {
  return clampNonNegInt(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function formatPlayTime(ms: number): string {
  const totalSeconds = Math.floor(clampNonNegInt(ms) / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number): string => n.toString().padStart(2, '0');
  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${minutes}:${pad(seconds)}`;
}

export function getLifetimeStatRows(): StatDisplayRow[] {
  const stats = loadStats();
  return [
    { id: 'games', title: 'Total Games Played', value: formatCount(stats.gamesPlayed) },
    { id: 'score', title: 'Total Score', value: formatCount(stats.lifetimeScore) },
    { id: 'high', title: 'Highest Score', value: formatCount(stats.highestScore) },
    {
      id: 'time-attack-high',
      title: 'Highest Time Attack Score',
      value: formatCount(stats.timeAttackBestScore),
    },
    {
      id: 'endless-high',
      title: 'Highest Endless Score',
      value: formatCount(stats.endlessBestScore),
    },
    {
      id: 'bricks',
      title: 'Total Bricks Destroyed',
      value: formatCount(stats.bricksDestroyed),
    },
    {
      id: 'metal',
      title: 'Total Metal Bricks Hit',
      value: formatCount(stats.metalBricksHit),
    },
    {
      id: 'powerups',
      title: 'Total Powerups Collected',
      value: formatCount(stats.powerupsCollected),
    },
    {
      id: 'fire',
      title: 'Total Fire Ball Kills',
      value: formatCount(stats.fireBallBricksDestroyed),
    },
    {
      id: 'multi',
      title: 'Total Multi Ball Activations',
      value: formatCount(stats.multiBallActivations),
    },
    { id: 'play-time', title: 'Total Play Time', value: formatPlayTime(stats.playTimeMs) },
  ];
}

export function getPersonalBestRows(): StatDisplayRow[] {
  const stats = loadStats();
  return [
    { id: 'classic', title: 'Best Classic', value: formatCount(stats.classicBestScore) },
    {
      id: 'time-attack',
      title: 'Best Time Attack',
      value: formatCount(stats.timeAttackBestScore),
    },
    { id: 'endless', title: 'Best Endless', value: formatCount(stats.endlessBestScore) },
  ];
}

export function getProgressSummary(): ProgressSummary {
  const themeRows = getThemeUnlockRows(loadPlayableThemeId());
  const paddleRows = getPaddleUnlockRows(loadPaddleSkinId());
  const ballRows = getBallUnlockRows(loadBallSkinId());
  const achievementRows = getAchievementRows();
  const themesUnlocked = countUnlocked(themeRows);
  const paddlesUnlocked = countUnlocked(paddleRows);
  const ballsUnlocked = countUnlocked(ballRows);
  const achievementsComplete = countUnlocked(achievementRows);
  const unlockedCount = themesUnlocked + paddlesUnlocked + ballsUnlocked + achievementsComplete;
  const totalCount =
    themeRows.length + paddleRows.length + ballRows.length + achievementRows.length;

  return {
    completionPercent: percent(unlockedCount, totalCount),
    unlockedCount,
    totalCount,
    themesUnlocked,
    themesTotal: themeRows.length,
    paddlesUnlocked,
    paddlesTotal: paddleRows.length,
    ballsUnlocked,
    ballsTotal: ballRows.length,
    achievementsComplete,
    achievementsTotal: achievementRows.length,
  };
}

export function getProgressSummaryRows(): StatDisplayRow[] {
  const summary = getProgressSummary();
  return [
    { id: 'completion', title: 'Completion', value: `${summary.completionPercent}%` },
    {
      id: 'unlocks',
      title: 'Unlocks',
      value: `${summary.unlockedCount} / ${summary.totalCount}`,
    },
    {
      id: 'themes',
      title: 'Themes',
      value: `${summary.themesUnlocked} / ${summary.themesTotal}`,
    },
    {
      id: 'paddles',
      title: 'Paddle Skins',
      value: `${summary.paddlesUnlocked} / ${summary.paddlesTotal}`,
    },
    {
      id: 'balls',
      title: 'Ball Skins',
      value: `${summary.ballsUnlocked} / ${summary.ballsTotal}`,
    },
    {
      id: 'achievements',
      title: 'Achievements',
      value: `${summary.achievementsComplete} / ${summary.achievementsTotal}`,
    },
  ];
}
