/**
 * entities/dx-ball/GameMode.ts
 *
 * DXB-14: DX-Ball's game-mode vocabulary. Kept out of `MainScene` the
 * same way `levels.ts` keeps level data out of the grid — this file
 * names the modes, their HUD labels, Time Attack's duration, and
 * Endless's speed ramp. It does not own a run, a scene, or any HUD
 * widget. `BrickGrid` / `Ball` / `Paddle` never import it.
 */

export type GameModeId = 'classic' | 'time-attack' | 'endless';

export interface GameModeInfo {
  id: GameModeId;
  label: string;
  description: string;
}

export const GAME_MODES: readonly GameModeInfo[] = [
  {
    id: 'classic',
    label: 'Classic',
    description: 'Clear every level. Score, lives, and powerups carry through.',
  },
  {
    id: 'time-attack',
    label: 'Time Attack',
    description: '90 seconds. Highest score wins. The run ends when time runs out.',
  },
  {
    id: 'endless',
    label: 'Endless',
    description: 'Levels wrap forever. The ball speeds up gradually. Score never resets.',
  },
];

/** DXB-14: Time Attack duration — a placeholder tuning value, not playtested. */
export const TIME_ATTACK_DURATION_MS = 90_000;

/**
 * DXB-14: Endless adds this much extra speed per second of play time
 * (`1 + seconds * ramp`, capped). Placeholder, not playtested.
 */
export const ENDLESS_SPEED_RAMP_PER_SECOND = 0.004;

/** DXB-14: Hard cap on the Endless progression multiplier. */
export const ENDLESS_SPEED_RAMP_CAP = 2;

export function isGameModeId(value: unknown): value is GameModeId {
  return value === 'classic' || value === 'time-attack' || value === 'endless';
}

export function getGameModeInfo(id: GameModeId): GameModeInfo {
  return GAME_MODES.find((mode) => mode.id === id) ?? GAME_MODES[0];
}

/** Remaining Time Attack clock as `M:SS`. */
export function formatTimeAttackClock(remainingMs: number): string {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/** Endless speed multiplier for `elapsedMs` of play time. Classic / Time Attack stay at `1`. */
export function computeEndlessSpeedMultiplier(elapsedMs: number): number {
  const seconds = Math.max(0, elapsedMs) / 1000;
  return Math.min(ENDLESS_SPEED_RAMP_CAP, 1 + seconds * ENDLESS_SPEED_RAMP_PER_SECOND);
}
