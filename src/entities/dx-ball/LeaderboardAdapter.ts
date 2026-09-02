import { JsonStore } from '@systems/JsonStore';
import { isGameModeId, type GameModeId } from '@entities/dx-ball/GameMode';
import { DEFAULT_PLAYER_NAME, sanitizePlayerName } from '@entities/dx-ball/PlayerProfile';
import { GAME_VERSION } from '@entities/dx-ball/Version';

/**
 * entities/dx-ball/LeaderboardAdapter.ts
 *
 * DXB-24: Leaderboard persistence seam. DXB-28 expands the reusable
 * score-submission model (player name, mode, highest level reached,
 * date, version) so a future online backend can plug in without
 * touching gameplay.
 *
 * Gameplay never talks to a network — `Leaderboards.ts` always uses
 * `LocalLeaderboardAdapter` today. `OnlineLeaderboardAdapter` is a
 * typed future hook with no backend, accounts, or cloud save.
 *
 * Future backend integration:
 * 1. Implement HTTP (or similar) inside `OnlineLeaderboardAdapter`.
 * 2. POST/GET the same `LeaderboardEntry` fields — do not invent a
 *    second score shape.
 * 3. Opt in with `setLeaderboardAdapter(new OnlineLeaderboardAdapter())`.
 * 4. Keep `LocalLeaderboardAdapter` as the offline fallback.
 * Authentication, if added later, belongs at the transport layer —
 * not on this entry model and not in MainScene.
 */

export interface LeaderboardEntry {
  playerName: string;
  score: number;
  mode: GameModeId;
  highestLevelReached: number;
  recordedAt: number;
  version: string;
}

/** Input for a run submission. Name / date / version are filled by the service when omitted. */
export interface LeaderboardSubmission {
  score: number;
  mode: GameModeId;
  highestLevelReached: number;
  playerName?: string;
  recordedAt?: number;
  version?: string;
}

export type LeaderboardBoards = Record<GameModeId, LeaderboardEntry[]>;

export interface LeaderboardSubmitResult {
  accepted: boolean;
  rank: number | null;
  isNewRecord: boolean;
}

export interface LeaderboardAdapter {
  readonly kind: 'local' | 'online';
  submit(entry: LeaderboardEntry): LeaderboardSubmitResult;
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

export function formatLeaderboardDate(recordedAt: number): string {
  const date = new Date(clampNonNegInt(recordedAt));
  if (!Number.isFinite(date.getTime()) || date.getTime() <= 0) {
    return '—';
  }

  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function completeLeaderboardEntry(
  submission: LeaderboardSubmission,
  fallbackName: string,
): LeaderboardEntry | null {
  if (!isGameModeId(submission.mode)) {
    return null;
  }

  const score = clampNonNegInt(submission.score);
  if (score <= 0) {
    return null;
  }

  return {
    playerName: sanitizePlayerName(submission.playerName ?? fallbackName),
    score,
    mode: submission.mode,
    highestLevelReached: clampNonNegInt(submission.highestLevelReached),
    recordedAt: clampNonNegInt(submission.recordedAt) || Date.now(),
    version: typeof submission.version === 'string' && submission.version.trim()
      ? submission.version.trim()
      : GAME_VERSION,
  };
}

function normalizeEntry(
  raw: Partial<LeaderboardEntry> | null | undefined,
  fallbackMode: GameModeId,
): LeaderboardEntry | null {
  const score = clampNonNegInt(raw?.score);
  if (score <= 0) {
    return null;
  }

  const mode = isGameModeId(raw?.mode) ? raw.mode : fallbackMode;
  const version = typeof raw?.version === 'string' ? raw.version.trim() : '';

  return {
    playerName: sanitizePlayerName(raw?.playerName ?? DEFAULT_PLAYER_NAME),
    score,
    mode,
    highestLevelReached: clampNonNegInt(raw?.highestLevelReached),
    recordedAt: clampNonNegInt(raw?.recordedAt) || Date.now(),
    version,
  };
}

function normalizeList(raw: unknown, mode: GameModeId): LeaderboardEntry[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const entries: LeaderboardEntry[] = [];
  for (const item of raw) {
    const entry = normalizeEntry(item as Partial<LeaderboardEntry>, mode);
    if (entry) {
      entries.push(entry);
    }
  }

  entries.sort((a, b) => b.score - a.score || a.recordedAt - b.recordedAt);
  return entries.slice(0, LEADERBOARD_SIZE);
}

function normalizeBoards(raw: Partial<LeaderboardBoards> | null | undefined): LeaderboardBoards {
  return {
    classic: normalizeList(raw?.classic, 'classic'),
    'time-attack': normalizeList(raw?.['time-attack'], 'time-attack'),
    endless: normalizeList(raw?.endless, 'endless'),
  };
}

function compareEntries(a: LeaderboardEntry, b: LeaderboardEntry): number {
  return b.score - a.score || a.recordedAt - b.recordedAt;
}

/** Local Top 10. Same `dx-ball-leaderboards` key as DXB-17. */
export class LocalLeaderboardAdapter implements LeaderboardAdapter {
  readonly kind = 'local' as const;
  private cached: LeaderboardBoards | null = null;

  submit(entry: LeaderboardEntry): LeaderboardSubmitResult {
    if (!isGameModeId(entry.mode) || entry.score <= 0) {
      return { accepted: false, rank: null, isNewRecord: false };
    }

    const boards = this.load();
    const list = boards[entry.mode];
    list.push(entry);
    list.sort(compareEntries);
    boards[entry.mode] = list.slice(0, LEADERBOARD_SIZE);
    this.save();

    const rankIndex = boards[entry.mode].findIndex(
      (item) => item.score === entry.score && item.recordedAt === entry.recordedAt,
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
 *
 * When a real host exists, implement submit/list against that API
 * using the same `LeaderboardEntry` fields. Until then every call
 * is a no-op so the Statistics Online tab cannot fabricate ranks.
 */
export class OnlineLeaderboardAdapter implements LeaderboardAdapter {
  readonly kind = 'online' as const;

  submit(_entry: LeaderboardEntry): LeaderboardSubmitResult {
    return { accepted: false, rank: null, isNewRecord: false };
  }

  list(_mode: GameModeId): readonly LeaderboardEntry[] {
    return [];
  }
}

export function createDefaultLeaderboardAdapter(): LeaderboardAdapter {
  return new LocalLeaderboardAdapter();
}
