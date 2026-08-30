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
 *
 * DXB-11 adds per-cell brick types via compact layout strings (`N`
 * normal, `C` cracked, `M` metal, `B` bonus). Level 1 stays an all-
 * normal field (no `layout`, so `BrickGrid`'s pre-DXB-11 default).
 * Level 2 introduces cracked bricks into the existing 6×8 ramp. Level 3
 * mixes cracked, metal obstacles, and bonus (guaranteed-drop) bricks
 * into the existing 7×9 ramp. Spacing / points / ball speed are
 * unchanged from DXB-08.
 */
export interface LevelConfig {
  brickGrid?: BrickGridConfig;
  ball?: BallConfig;
}

export const LEVELS: readonly LevelConfig[] = [
  // Level 1: unchanged from DXB-06A's tuned defaults — all normal bricks.
  {},
  // Level 2: one more row, a touch tighter, worth more, a bit faster.
  // Cracked bricks in the back row and a mid-field band.
  {
    brickGrid: {
      gapRatio: 0.012,
      basePointsPerRow: 12,
      layout: [
        'CCCCCCCC',
        'NNNNNNNN',
        'NNCCCCNN',
        'NNNNNNNN',
        'NCNCNCNC',
        'NNNNNNNN',
      ],
    },
    ball: { speedRatio: 0.68 },
  },
  // Level 3: more rows and columns, tighter rows, highest points/speed.
  // Cracked, metal (indestructible obstacles with bounce gaps), and bonus.
  {
    brickGrid: {
      gapRatio: 0.012,
      rowHeightRatio: 0.026,
      basePointsPerRow: 14,
      layout: [
        'CCCMCCMCC',
        'NNNNBNNNN',
        'CNCNCNCNC',
        'NNNMNMNNN',
        'BNNNNNNNB',
        'NCCCNCCCN',
        'NNNNNNNNN',
      ],
    },
    ball: { speedRatio: 0.76 },
  },
];
