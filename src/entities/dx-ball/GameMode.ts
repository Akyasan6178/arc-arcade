/**
 * entities/dx-ball/GameMode.ts
 *
 * DXB-14: DX-Ball's game-mode vocabulary. Kept out of `MainScene` the
 * same way `levels.ts` keeps level data out of the grid — this file
 * names the modes, their HUD labels, Time Attack's duration, and
 * Endless's speed ramp. It does not own a run, a scene, or any HUD
 * widget. `BrickGrid` / `Ball` / `Paddle` never import it.
 *
 * DXB-21 retunes Time Attack's base speed fold and Endless's ramp
 * rate from playtest feedback. Duration stays 90s; the cap stays 2×.
 * No new modes.
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
    description: 'Always starts at Level 1. Clear 1 → 10.',
  },
  {
    id: 'time-attack',
    label: 'Time Attack',
    description: '90 seconds each level. Timer resets on clear.',
  },
  {
    id: 'endless',
    label: 'Endless',
    description: 'Layouts wrap. Ball speeds up. Score stays.',
  },
];

/**
 * DXB-14: Time Attack duration. DXB-21 left this at 90s.
 * DXB-26: this is the duration of EVERY Time Attack level. Completing a
 * level does not carry leftover time into the next one — `MainScene`
 * writes a fresh `TIME_ATTACK_DURATION_MS` when the next stage begins.
 */
export const TIME_ATTACK_DURATION_MS = 90_000;

/**
 * DXB-21: Time Attack multiplies base travel speed by this constant so
 * a 90-second run has more scoring chances. Classic stays at `1`.
 * Slow / fast still apply on top via the ball's own multiplier.
 */
export const TIME_ATTACK_SPEED_MULTIPLIER = 1.15;

/**
 * DXB-14/DXB-21: Endless adds this much extra speed per second of play
 * time (`1 + seconds * ramp`, capped). DXB-21 reduced the original
 * `0.004` so the 2× cap lands around 11 minutes instead of ~4, which
 * was the level-4 wall.
 */
export const ENDLESS_SPEED_RAMP_PER_SECOND = 0.0015;

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

/** Endless speed multiplier for `elapsedMs` of play time. */
export function computeEndlessSpeedMultiplier(elapsedMs: number): number {
  const seconds = Math.max(0, elapsedMs) / 1000;
  return Math.min(ENDLESS_SPEED_RAMP_CAP, 1 + seconds * ENDLESS_SPEED_RAMP_PER_SECOND);
}

/**
 * DXB-21: Mode speed fold applied to a live ball. Classic is `1`;
 * Time Attack is a constant; Endless ramps with play time. The ball
 * still does not know modes exist — the owning scene writes the fold.
 */
export function computeModeSpeedMultiplier(mode: GameModeId, elapsedMs: number): number {
  if (mode === 'endless') {
    return computeEndlessSpeedMultiplier(elapsedMs);
  }
  if (mode === 'time-attack') {
    return TIME_ATTACK_SPEED_MULTIPLIER;
  }
  return 1;
}
