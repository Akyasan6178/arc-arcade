import { formatCount, getProgressSummary, getNextUnlockHint } from '@entities/dx-ball/Progress';
import { getGameModeInfo, type GameModeId } from '@entities/dx-ball/GameMode';
import type { LeaderboardSubmitResult } from '@entities/dx-ball/LeaderboardAdapter';

/**
 * entities/dx-ball/RunSummary.ts
 *
 * DXB-24: End-of-run copy for Classic / Endless / Time Attack result
 * cards. Score rules are unchanged — this only formats what the scene
 * already recorded.
 */

export interface RunSummaryInput {
  mode: GameModeId;
  score: number;
  bestScore: number;
  startingBestScore: number;
  startingModeBest: number;
  levelReached: number;
  campaignLength: number;
  leaderboard: LeaderboardSubmitResult | null;
  outcome: 'victory' | 'game-over' | 'time-up';
}

export interface RunSummaryCopy {
  kicker: string;
  title: string;
  reward: string;
  body: string;
  tone: 'victory' | 'defeat' | 'info';
}

export function buildRunSummary(input: RunSummaryInput): RunSummaryCopy {
  const modeLabel = getGameModeInfo(input.mode).label;
  const isNewBest = input.score > input.startingBestScore;
  const isNewModeBest = input.score > input.startingModeBest;
  const reward = isNewBest ? `NEW BEST  ${formatCount(input.score)}` : `Score  ${formatCount(input.score)}`;

  const lines: string[] = [];
  lines.push(`Best  ${formatCount(Math.max(input.bestScore, input.score))}`);
  if (isNewModeBest) {
    lines.push(`NEW ${modeLabel.toUpperCase()} RECORD`);
  }
  if (input.leaderboard?.accepted && input.leaderboard.rank != null) {
    lines.push(
      input.leaderboard.isNewRecord
        ? `Local board  #1`
        : `Local board  #${input.leaderboard.rank}`,
    );
  }

  if (input.outcome === 'victory') {
    lines.push(`All ${input.campaignLength} levels cleared`);
  } else if (input.mode === 'endless') {
    lines.push(`Reached Level ${input.levelReached}`);
  } else if (input.outcome === 'time-up') {
    lines.push('Clock expired');
  } else {
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
