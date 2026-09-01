import { JsonStore } from '@systems/JsonStore';
import { isGameModeId, type GameModeId } from '@entities/dx-ball/GameMode';

/**
 * entities/dx-ball/LeaderboardAdapter.ts
 *
 * DXB-24: Leaderboard persistence seam. Gameplay never talks to a
 * network — `Leaderboards.ts` always uses `LocalLeaderboardAdapter`
 * today. `OnlineLeaderboardAdapter` is a typed future hook with no
 * backend, accounts, or cloud save.
 */

export interface LeaderboardEntry {
  score: number;
  recordedAt: number;
}

export type LeaderboardBoards = Record<GameModeId, LeaderboardEntry[]>;

export interface LeaderboardSubmitResult {
  accepted: boolean;
  rank: number | null;
  isNewRecord: boolean;
}

export interface LeaderboardAdapter {
  readonly kind: 'local' | 'online';
  submit(mode: GameModeId, score: number): LeaderboardSubmitResult;
  list(mode: GameModeId): readonly LeaderboardEntry[];
}

export const LEADERBOARD_SIZE = 10;

const LEADERBOARD_STORAGE_KEY = 'dx-ball-leaderboards';

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

function normalizeBoards(raw: Partial<LeaderboardBoards> | null | undefined): LeaderboardBoards {
  return {
    classic: normalizeList(raw?.classic),
    'time-attack': normalizeList(raw?.['time-attack']),
    endless: normalizeList(raw?.endless),
  };
}

/** Local Top 10. Same `dx-ball-leaderboards` key as DXB-17. */
export class LocalLeaderboardAdapter implements LeaderboardAdapter {
  readonly kind = 'local' as const;
  private cached: LeaderboardBoards | null = null;

  submit(mode: GameModeId, score: number): LeaderboardSubmitResult {
    const value = clampNonNegInt(score);
    if (value <= 0 || !isGameModeId(mode)) {
      return { accepted: false, rank: null, isNewRecord: false };
    }

    const boards = this.load();
    const recordedAt = Date.now();
    const list = boards[mode];
    list.push({ score: value, recordedAt });
    list.sort((a, b) => b.score - a.score || a.recordedAt - b.recordedAt);
    boards[mode] = list.slice(0, LEADERBOARD_SIZE);
    this.save();

    const rankIndex = boards[mode].findIndex(
      (entry) => entry.score === value && entry.recordedAt === recordedAt,
    );
    if (rankIndex < 0) {
      return { accepted: false, rank: null, isNewRecord: false };
    }

    return {
      accepted: true,
      rank: rankIndex + 1,
      isNewRecord: rankIndex === 0,
    };
  }

  list(mode: GameModeId): readonly LeaderboardEntry[] {
    if (!isGameModeId(mode)) {
      return [];
    }
    return this.load()[mode];
  }

  private load(): LeaderboardBoards {
    if (this.cached) {
      return this.cached;
    }
    this.cached = normalizeBoards(JsonStore.get<Partial<LeaderboardBoards>>(LEADERBOARD_STORAGE_KEY));
    return this.cached;
  }

  private save(): void {
    JsonStore.set(LEADERBOARD_STORAGE_KEY, this.load());
  }
}

/**
 * Future online adapter. Does not open a socket, call a host, or
 * create accounts. `LeaderboardService` never selects this unless a
 * later task wires it on purpose.
 */
export class OnlineLeaderboardAdapter implements LeaderboardAdapter {
  readonly kind = 'online' as const;

  submit(_mode: GameModeId, _score: number): LeaderboardSubmitResult {
    return { accepted: false, rank: null, isNewRecord: false };
  }

  list(_mode: GameModeId): readonly LeaderboardEntry[] {
    return [];
  }
}

export function createDefaultLeaderboardAdapter(): LeaderboardAdapter {
  return new LocalLeaderboardAdapter();
}
