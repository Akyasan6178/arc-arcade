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
 *
 * DXB-13A adds levels 4-5 (campaign is now 5). Level 4 leans on metal
 * corridors. Level 5 mixes every current type (normal, cracked, metal,
 * bonus). Score / lives still carry on the same `BrickGrid` instance.
 *
 * DXB-19 appends levels 6-10 (campaign is now 10). Levels 1-5 stay as
 * authored. Level 6 is a sparse precision field; level 7 is cracked-
 * heavy; level 8 is a metal-obstacle maze with bounce lanes; level 9
 * is bonus-brick risk/reward; level 10 mixes every current type as the
 * Classic finale. Metal still never counts toward clear, so leftover
 * cages cannot lock a level. Time Attack / Endless still wrap `LEVELS`.
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
  // Level 4: heavier metal — corridors and bounce cages, still clearable.
  {
    brickGrid: {
      gapRatio: 0.012,
      rowHeightRatio: 0.024,
      basePointsPerRow: 16,
      layout: [
        'MMNMNMNMM',
        'NMMNNNMMN',
        'CMNMNMNMC',
        'MMNNNNNMM',
        'NNNMNMNNN',
        'CMNCNCNMC',
        'NNNMNMNNN',
        'NNNNCNNNN',
      ],
    },
    ball: { speedRatio: 0.82 },
  },
  // Level 5: mixed field of every current brick type.
  {
    brickGrid: {
      gapRatio: 0.011,
      rowHeightRatio: 0.024,
      basePointsPerRow: 18,
      layout: [
        'CMBNNMBMC',
        'NCNMBMNCN',
        'BNCNCNCNB',
        'MNNCCCNNM',
        'CNCBNBCNC',
        'BNNMNMNNB',
        'NCBMNMBCN',
        'NNNBCBNNN',
      ],
    },
    ball: { speedRatio: 0.88 },
  },
  // Level 6: precision — sparse columns and holes; every required brick is open.
  {
    brickGrid: {
      gapRatio: 0.014,
      rowHeightRatio: 0.024,
      basePointsPerRow: 18,
      layout: [
        '..N..N..',
        '.N.NN.N.',
        'N......N',
        '.N....N.',
        '..N..N..',
        'N.N..N.N',
        '.N.NN.N.',
        '..NNNN..',
      ],
    },
    ball: { speedRatio: 0.9 },
  },
  // Level 7: cracked-heavy — two-hit bricks dominate, with lanes so nothing is boxed in.
  {
    brickGrid: {
      gapRatio: 0.012,
      rowHeightRatio: 0.024,
      basePointsPerRow: 20,
      layout: [
        'CCCCCCCC',
        'CCNCCNCC',
        'C.CCCC.C',
        'CCCCCCCC',
        'CNCNCNCN',
        'CCCCCCCC',
        '.CCCCCC.',
        'NCCNNCCN',
      ],
    },
    ball: { speedRatio: 0.92 },
  },
  // Level 8: metal-obstacle maze — bounce lanes keep every required brick reachable.
  {
    brickGrid: {
      gapRatio: 0.012,
      rowHeightRatio: 0.022,
      basePointsPerRow: 20,
      layout: [
        'M.N.N.N.M',
        'N.M.N.M.N',
        '.N.N.N.N.',
        'NNM.N.MNN',
        'M.N...N.M',
        '.NNNNNNN.',
        'MN.NNN.NM',
        'N...N...N',
      ],
    },
    ball: { speedRatio: 0.94 },
  },
  // Level 9: bonus risk/reward — guaranteed-drop bricks near metal, plus safer clusters.
  {
    brickGrid: {
      gapRatio: 0.012,
      rowHeightRatio: 0.022,
      basePointsPerRow: 22,
      layout: [
        'B.B.M.B.B',
        '.M.B.B.M.',
        'B..NNN..B',
        'M.B.M.B.M',
        'B...B...B',
        'NNB.B.BNN',
        '.B..M..B.',
        'BB.NNN.BB',
      ],
    },
    ball: { speedRatio: 0.96 },
  },
  // Level 10: finale — every current brick type, metal as obstacles only.
  {
    brickGrid: {
      gapRatio: 0.011,
      rowHeightRatio: 0.022,
      basePointsPerRow: 24,
      layout: [
        'CMBNNMBMC',
        'NCMCBCNCN',
        'M.NCCCN.M',
        'BNCNMNCNB',
        'C.CBNBC.C',
        'MNN.B.NNM',
        'NCBMNMBCN',
        'B.NMCMN.B',
      ],
    },
    ball: { speedRatio: 0.98 },
  },
];
