import { formatCount, getProgressSummary, getNextUnlockHint } from '@entities/dx-ball/Progress';
import { getGameModeInfo, type GameModeId } from '@entities/dx-ball/GameMode';
import { formatLeaderboardDate, type LeaderboardSubmitResult } from '@entities/dx-ball/LeaderboardAdapter';

/**
 * entities/dx-ball/RunSummary.ts
 *
 * DXB-24: End-of-run copy for Classic / Endless / Time Attack result
 * cards. DXB-28 adds a shareable run-summary format (Score, Mode,
 * Highest Level Reached, Active Theme, Date) using the same labels as
 * Statistics and Leaderboards. Score rules are unchanged — this only
 * formats what the scene already recorded.
 */

export interface RunSummaryInput {
  mode: GameModeId;
  score: number;
  bestScore: number;
  startingBestScore: number;
  startingModeBest: number;
  highestLevelReached: number;
  campaignLength: number;
  activeThemeLabel: string;
  recordedAt?: number;
  leaderboard: LeaderboardSubmitResult | null;
  outcome: 'victory' | 'game-over' | 'time-up';
}

export interface ShareableRunSummary {
  score: number;
  mode: GameModeId;
  modeLabel: string;
  highestLevelReached: number;
  activeTheme: string;
  date: string;
}

export interface RunSummaryCopy {
  kicker: string;
  title: string;
  reward: string;
  body: string;
  tone: 'victory' | 'defeat' | 'info';
  shareable: ShareableRunSummary;
}

export function buildShareableRunSummary(input: {
  mode: GameModeId;
  score: number;
  highestLevelReached: number;
  activeThemeLabel: string;
  recordedAt?: number;
}): ShareableRunSummary {
  return {
    score: input.score,
    mode: input.mode,
    modeLabel: getGameModeInfo(input.mode).label,
    highestLevelReached: input.highestLevelReached,
    activeTheme: input.activeThemeLabel,
    date: formatLeaderboardDate(input.recordedAt ?? Date.now()),
  };
}

export function formatShareableRunSummary(summary: ShareableRunSummary): string {
  return [
    `Score  ${formatCount(summary.score)}`,
    `Mode  ${summary.modeLabel}`,
    `Highest Level Reached  ${summary.highestLevelReached}`,
    `Active Theme  ${summary.activeTheme}`,
    `Date  ${summary.date}`,
  ].join('\n');
}

export function buildRunSummary(input: RunSummaryInput): RunSummaryCopy {
  const modeLabel = getGameModeInfo(input.mode).label;
  const isNewBest = input.score > input.startingBestScore;
  const isNewModeBest = input.score > input.startingModeBest;
  const reward = isNewBest ? `NEW BEST  ${formatCount(input.score)}` : `Score  ${formatCount(input.score)}`;
  const shareable = buildShareableRunSummary({
    mode: input.mode,
    score: input.score,
    highestLevelReached: input.highestLevelReached,
    activeThemeLabel: input.activeThemeLabel,
    recordedAt: input.recordedAt,
  });

  const lines: string[] = [formatShareableRunSummary(shareable)];
  const highestScore = Math.max(input.bestScore, input.score);
  if (highestScore !== input.score) {
    lines.push(`Highest Score  ${formatCount(highestScore)}`);
  }

  if (isNewModeBest) {
    lines.push(`NEW ${modeLabel.toUpperCase()} RECORD`);
  }
  if (input.leaderboard?.accepted && input.leaderboard.rank != null) {
    lines.push(
      input.leaderboard.isNewRecord
        ? `Local  #1`
        : `Local  #${input.leaderboard.rank}`,
    );
  }

  if (input.outcome === 'victory') {
    lines.push(`All ${input.campaignLength} levels cleared`);
  } else if (input.outcome === 'time-up') {
    lines.push('Clock expired');
  } else if (input.mode !== 'endless') {
    lines.push('No lives remaining');
  }

  const unlocks = getProgressSummary();
  const next = getNextUnlockHint();
  if (next) {
    lines.push(
      `Unlocks  ${unlocks.unlockedCount}/${unlocks.totalCount}  ·  Next: ${next.title}`,
    );
  } else {
    lines.push(`Unlocks  ${unlocks.unlockedCount}/${unlocks.totalCount} complete`);
  }

  return {
    kicker: modeLabel,
    title: summaryTitle(input),
    reward,
    body: lines.join('\n'),
    tone: summaryTone(input),
    shareable,
  };
}

function summaryTitle(input: RunSummaryInput): string {
  if (input.outcome === 'victory') {
    return 'VICTORY';
  }
  if (input.outcome === 'time-up') {
    return "TIME'S UP";
  }
  if (input.mode === 'endless') {
    return 'RUN COMPLETE';
  }
  return 'GAME OVER';
}

function summaryTone(input: RunSummaryInput): 'victory' | 'defeat' | 'info' {
  if (input.outcome === 'victory') {
    return 'victory';
  }
  if (input.outcome === 'time-up' || input.mode === 'endless') {
    return 'info';
  }
  return 'defeat';
}
