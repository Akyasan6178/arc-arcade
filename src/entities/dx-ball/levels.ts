import type { BrickGridConfig } from '@entities/dx-ball/BrickGrid';
import type { BallConfig } from '@entities/dx-ball/Ball';

/**
 * entities/dx-ball/levels.ts
 *
 * DXB-08: DX-Ball's fixed level sequence. Each `LevelConfig` is just a
 * pair of partial config overrides — one for `BrickGrid` (layout: rows,
 * columns, spacing, scoring), one for `Ball` (currently only its speed)
 * — merged over each entity's own `DEFAULT_CONFIG` exactly the way a
 * single level's config has always been passed in since DXB-03/DXB-02;
 * this file just picks that config from a list instead of a single
 * hardcoded call site. Neither `BrickGrid` nor `Ball` knows this file
 * exists — `MainScene` is the only reader, following the same "owning
 * scene drives everything" pattern already established for score/lives.
 *
 * Level 1 is exactly DXB-06A's already-tuned defaults (empty overrides,
 * so it is pixel-for-pixel unchanged from every prior task). Levels 2-3
 * progressively add rows/columns, tighten spacing slightly, raise
 * `basePointsPerRow`, and raise ball speed — a difficulty ramp, not a
 * full redesign. Every non-default value here is a placeholder, not
 * playtested, consistent with every other tuning value flagged since
 * DXB-01 (see this task's own Known Risks in `docs/progress/DXB-08.md`).
 */
export interface LevelConfig {
  brickGrid?: BrickGridConfig;
  ball?: BallConfig;
}

export const LEVELS: readonly LevelConfig[] = [
  // Level 1: unchanged from DXB-06A's tuned defaults.
  {},
  // Level 2: one more row, a touch tighter, worth more, a bit faster.
  {
    brickGrid: { rows: 6, gapRatio: 0.012, basePointsPerRow: 12 },
    ball: { speedRatio: 0.68 },
  },
  // Level 3: more rows and columns, tighter rows, highest points/speed.
  {
    brickGrid: {
      rows: 7,
      columns: 9,
      gapRatio: 0.012,
      rowHeightRatio: 0.026,
      basePointsPerRow: 14,
    },
    ball: { speedRatio: 0.76 },
  },
];
