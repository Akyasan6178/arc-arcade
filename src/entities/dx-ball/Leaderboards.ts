import { formatCount, type StatDisplayRow } from '@entities/dx-ball/Progress';
import type { GameModeId } from '@entities/dx-ball/GameMode';
import { loadPlayerName } from '@entities/dx-ball/PlayerProfile';
import {
  LEADERBOARD_SIZE,
  LocalLeaderboardAdapter,
  OnlineLeaderboardAdapter,
  completeLeaderboardEntry,
  createDefaultLeaderboardAdapter,
  type LeaderboardAdapter,
  type LeaderboardEntry,
  type LeaderboardSubmission,
  type LeaderboardSubmitResult,
} from '@entities/dx-ball/LeaderboardAdapter';

/**
 * entities/dx-ball/Leaderboards.ts
 *
 * DXB-17: Local Top 10 scores per mode. DXB-24 splits persistence into
 * `LeaderboardAdapter.ts` so a future online backend can plug in without
 * touching gameplay. DXB-28 enriches the submission model (player name,
 * highest level reached, date, version) and keeps the active adapter
 * local-only. No accounts, cloud save, or network calls ship in this task.
 *
 * Public helpers (`submitScore` / `getLeaderboard` / `getLeaderboardRows`)
 * stay the facade so MainScene and StatsScene do not talk to adapters.
 */

export type { LeaderboardEntry, LeaderboardSubmission, LeaderboardSubmitResult, LeaderboardAdapter };
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

  submit(submission: LeaderboardSubmission): LeaderboardSubmitResult {
    const entry = completeLeaderboardEntry(submission, loadPlayerName());
    if (!entry) {
      return { accepted: false, rank: null, isNewRecord: false };
    }
    return this.adapter.submit(entry);
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

/** Inserts a finished run into that mode's Top 10. Scores of 0 are ignored. */
export function submitScore(submission: LeaderboardSubmission): LeaderboardSubmitResult {
  return service.submit(submission);
}

export function getLeaderboard(mode: GameModeId): readonly LeaderboardEntry[] {
  return service.list(mode);
}

export function formatLeaderboardValue(entry: LeaderboardEntry): string {
  const score = formatCount(entry.score);
  if (entry.highestLevelReached > 0) {
    return `${score}  ·  Highest Level Reached ${entry.highestLevelReached}`;
  }
  return score;
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

  return entries.map((entry, index) => ({
    id: `${mode}-${index}`,
    title: `#${index + 1}  ${entry.playerName}`,
    value: formatLeaderboardValue(entry),
  }));
}

/**
 * Placeholder rows for the Online tab. Intentionally not a score list —
 * fabricating ranks would look like a live board.
 */
export function getOnlineComingSoonRows(): StatDisplayRow[] {
  return [
    {
      id: 'online-soon',
      title: 'Coming Soon',
      value: 'Online leaderboards are not available yet',
    },
    {
      id: 'online-local',
      title: 'Local',
      value: 'Scores on this device still save to Local',
    },
  ];
}
