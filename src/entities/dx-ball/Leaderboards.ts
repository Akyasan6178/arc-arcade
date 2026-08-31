import { JsonStore } from '@systems/JsonStore';
import { formatCount, type StatDisplayRow } from '@entities/dx-ball/Progress';
import { getGameModeInfo, isGameModeId, type GameModeId } from '@entities/dx-ball/GameMode';

/**
 * entities/dx-ball/Leaderboards.ts
 *
 * DXB-17: Local Top 10 scores per mode. Kept next to `Progress.ts` the
 * same way that file keeps unlock counters out of `MainScene` — this
 * module owns the board shape and rank rules. Persistence is a
 * game-agnostic `JsonStore`; a separate key from `dx-ball-progress`
 * so a malformed board cannot wipe achievements.
 *
 * Local only: no accounts, no cloud, no online services.
 */

export interface LeaderboardEntry {
  score: number;
  recordedAt: number;
}

export type Leaderboards = Record<GameModeId, LeaderboardEntry[]>;

export const LEADERBOARD_SIZE = 10;

const LEADERBOARD_STORAGE_KEY = 'dx-ball-leaderboards';

let cached: Leaderboards | null = null;

function clampNonNegInt(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) {
    return 0;
  }
  return Math.floor(n);
}

function normalizeEntry(raw: Partial<LeaderboardEntry> | null | undefined): LeaderboardEntry | null {
  const score = clampNonNegInt(raw?.score);
  if (score <= 0) {
    return null;
  }
  return {
    score,
    recordedAt: clampNonNegInt(raw?.recordedAt) || Date.now(),
  };
}

function normalizeList(raw: unknown): LeaderboardEntry[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const entries: LeaderboardEntry[] = [];
  for (const item of raw) {
    const entry = normalizeEntry(item as Partial<LeaderboardEntry>);
    if (entry) {
      entries.push(entry);
    }
  }

  entries.sort((a, b) => b.score - a.score || a.recordedAt - b.recordedAt);
  return entries.slice(0, LEADERBOARD_SIZE);
}

function normalizeBoards(raw: Partial<Leaderboards> | null | undefined): Leaderboards {
  return {
    classic: normalizeList(raw?.classic),
    'time-attack': normalizeList(raw?.['time-attack']),
    endless: normalizeList(raw?.endless),
  };
}

function loadBoards(): Leaderboards {
  if (cached) {
    return cached;
  }

  cached = normalizeBoards(JsonStore.get<Partial<Leaderboards>>(LEADERBOARD_STORAGE_KEY));
  return cached;
}

function saveBoards(): void {
  JsonStore.set(LEADERBOARD_STORAGE_KEY, loadBoards());
}

/** Inserts `score` into that mode's Top 10. Scores of 0 are ignored. */
export function submitScore(mode: GameModeId, score: number): void {
  const value = clampNonNegInt(score);
  if (value <= 0 || !isGameModeId(mode)) {
    return;
  }

  const boards = loadBoards();
  const list = boards[mode];
  list.push({ score: value, recordedAt: Date.now() });
  list.sort((a, b) => b.score - a.score || a.recordedAt - b.recordedAt);
  boards[mode] = list.slice(0, LEADERBOARD_SIZE);
  saveBoards();
}

export function getLeaderboard(mode: GameModeId): readonly LeaderboardEntry[] {
  return loadBoards()[mode];
}

export function getLeaderboardRows(mode: GameModeId): StatDisplayRow[] {
  const entries = getLeaderboard(mode);
  if (entries.length === 0) {
    return [
      {
        id: 'empty',
        title: 'No scores yet',
        value: 'Play a run to appear here',
      },
    ];
  }

  const label = getGameModeInfo(mode).label;
  return entries.map((entry, index) => ({
    id: `${mode}-${index}`,
    title: `#${index + 1}  ${label}`,
    value: formatCount(entry.score),
  }));
}
