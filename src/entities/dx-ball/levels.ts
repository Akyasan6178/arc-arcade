import type { BrickGridConfig } from '@entities/dx-ball/BrickGrid';
import type { BallConfig } from '@entities/dx-ball/Ball';
import { parseBrickLayout, type BrickType } from '@entities/dx-ball/BrickType';

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
 *
 * DXB-23: each entry has a display `name` for the Classic level browser.
 * Layouts are unchanged.
 */
export interface LevelConfig {
  /** DXB-23: Shown on Level Select. Gameplay ignores this. */
  name?: string;
  /** DXB-24: 1–5 rating shown on Level Select cards. Gameplay ignores this. */
  difficulty?: 1 | 2 | 3 | 4 | 5;
  brickGrid?: BrickGridConfig;
  ball?: BallConfig;
}

export const LEVELS: readonly LevelConfig[] = [
  // Level 1: unchanged from DXB-06A's tuned defaults — all normal bricks.
  { name: 'Opening Volley', difficulty: 1 },
  // Level 2: one more row, a touch tighter, worth more, a bit faster.
  // Cracked bricks in the back row and a mid-field band.
  {
    name: 'First Cracks',
    difficulty: 2,
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
    name: 'Mixed Field',
    difficulty: 3,
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
    name: 'Steel Corridors',
    difficulty: 3,
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
    name: 'Type Mix',
    difficulty: 3,
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
    name: 'Precision',
    difficulty: 4,
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
    name: 'Fracture',
    difficulty: 4,
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
    name: 'Metal Maze',
    difficulty: 4,
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
    name: 'Bonus Hunt',
    difficulty: 3,
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
    name: 'Finale',
    difficulty: 5,
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

const PREVIEW_ROW_COLORS = [0xe63946, 0xf3722c, 0xf9c74f, 0x90be6d, 0x4d96ff];
const PREVIEW_METAL = 0x8b95a1;
const PREVIEW_BONUS = 0x9b5de5;
const DEFAULT_PREVIEW_ROWS = 5;
const DEFAULT_PREVIEW_COLUMNS = 8;

export interface LevelPreviewCell {
  type: BrickType;
  color: number;
}

export interface LevelPreviewModel {
  index: number;
  number: number;
  name: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  brickTypes: BrickType[];
  cells: (LevelPreviewCell | null)[][];
}

export function getLevelName(index: number): string {
  return LEVELS[index]?.name ?? `Level ${index + 1}`;
}

/** DXB-23: Compact cell map for Level Select thumbnails. Layouts are unchanged. */
export function getLevelPreviewModel(index: number): LevelPreviewModel {
  const level = LEVELS[index] ?? {};
  const brick = level.brickGrid ?? {};
  const parsed = brick.layout
    ? parseBrickLayout(brick.layout)
    : defaultPreviewLayout(brick.rows ?? DEFAULT_PREVIEW_ROWS, brick.columns ?? DEFAULT_PREVIEW_COLUMNS);

  const cells = parsed.map((row, rowIndex) =>
    row.map((type) => {
      if (type === null) {
        return null;
      }
      return { type, color: previewCellColor(type, rowIndex) };
    }),
  );

  const brickTypes: BrickType[] = [];
  for (const row of cells) {
    for (const cell of row) {
      if (cell && !brickTypes.includes(cell.type)) {
        brickTypes.push(cell.type);
      }
    }
  }

  return {
    index,
    number: index + 1,
    name: getLevelName(index),
    difficulty: level.difficulty ?? defaultDifficulty(index),
    brickTypes,
    cells,
  };
}

function defaultDifficulty(index: number): 1 | 2 | 3 | 4 | 5 {
  const rating = Math.min(5, Math.floor(index / 2) + 1);
  return rating as 1 | 2 | 3 | 4 | 5;
}

export function getAllLevelPreviewModels(): LevelPreviewModel[] {
  return LEVELS.map((_, index) => getLevelPreviewModel(index));
}

function defaultPreviewLayout(rows: number, columns: number): (BrickType | null)[][] {
  return Array.from({ length: rows }, () => Array.from({ length: columns }, () => 'normal' as const));
}

function previewCellColor(type: BrickType, rowIndex: number): number {
  if (type === 'metal') {
    return PREVIEW_METAL;
  }
  if (type === 'bonus') {
    return PREVIEW_BONUS;
  }
  const rowColor = PREVIEW_ROW_COLORS[rowIndex % PREVIEW_ROW_COLORS.length];
  if (type === 'cracked') {
    return darkenPreview(rowColor, 0.72);
  }
  return rowColor;
}

function darkenPreview(color: number, factor: number): number {
  const r = Math.round(((color >> 16) & 0xff) * factor);
  const g = Math.round(((color >> 8) & 0xff) * factor);
  const b = Math.round((color & 0xff) * factor);
  return (r << 16) | (g << 8) | b;
}
