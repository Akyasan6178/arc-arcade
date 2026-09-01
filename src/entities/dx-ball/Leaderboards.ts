import { formatCount, type StatDisplayRow } from '@entities/dx-ball/Progress';
import { getGameModeInfo, type GameModeId } from '@entities/dx-ball/GameMode';
import {
  LEADERBOARD_SIZE,
  LocalLeaderboardAdapter,
  OnlineLeaderboardAdapter,
  createDefaultLeaderboardAdapter,
  type LeaderboardAdapter,
  type LeaderboardEntry,
  type LeaderboardSubmitResult,
} from '@entities/dx-ball/LeaderboardAdapter';

/**
 * entities/dx-ball/Leaderboards.ts
 *
 * DXB-17: Local Top 10 scores per mode. DXB-24 splits persistence into
 * `LeaderboardAdapter.ts` so a future online backend can plug in without
 * touching gameplay. The active adapter is local-only; no accounts,
 * cloud save, or network calls ship in this task.
 *
 * Public helpers (`submitScore` / `getLeaderboard` / `getLeaderboardRows`)
 * stay stable so MainScene and StatsScene do not change their call sites
 * beyond reading the richer submit result.
 */

export type { LeaderboardEntry, LeaderboardSubmitResult, LeaderboardAdapter };
export { LEADERBOARD_SIZE, LocalLeaderboardAdapter, OnlineLeaderboardAdapter };

export type Leaderboards = Record<GameModeId, LeaderboardEntry[]>;

class LeaderboardService {
  private adapter: LeaderboardAdapter;

  constructor(adapter: LeaderboardAdapter) {
    this.adapter = adapter;
  }

  /** Replaces the persistence backend. Gameplay does not call this. */
  setAdapter(adapter: LeaderboardAdapter): void {
    this.adapter = adapter;
  }

  getAdapter(): LeaderboardAdapter {
    return this.adapter;
  }

  submit(mode: GameModeId, score: number): LeaderboardSubmitResult {
    return this.adapter.submit(mode, score);
  }

  list(mode: GameModeId): readonly LeaderboardEntry[] {
    return this.adapter.list(mode);
  }
}

const service = new LeaderboardService(createDefaultLeaderboardAdapter());

/**
 * Architecture seam for a future online adapter. Not used by gameplay.
 * Passing `OnlineLeaderboardAdapter` still does not contact a server.
 */
export function setLeaderboardAdapter(adapter: LeaderboardAdapter): void {
  service.setAdapter(adapter);
}

export function getLeaderboardAdapter(): LeaderboardAdapter {
  return service.getAdapter();
}

/** Inserts `score` into that mode's Top 10. Scores of 0 are ignored. */
export function submitScore(mode: GameModeId, score: number): LeaderboardSubmitResult {
  return service.submit(mode, score);
}

export function getLeaderboard(mode: GameModeId): readonly LeaderboardEntry[] {
  return service.list(mode);
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
