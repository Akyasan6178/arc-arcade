/**
 * entities/dx-ball/BrickType.ts
 *
 * DXB-11: The reusable brick-type vocabulary for DX-Ball. Each type is
 * a data record (`BrickTypeSpec`) — hit count, whether destroying it
 * awards score, whether it drops a powerup, and any fill/stroke override
 * — rather than a subclass. Adding a future type is one more entry here
 * plus a layout character; `Brick` / `BrickGrid` read the spec instead
 * of switching on type names.
 *
 * Layouts are authored as compact row-strings (`N`/`C`/`M`/`B`/`.`) in
 * `levels.ts` and parsed here, keeping `BrickGridConfig` a plain-data
 * shape the same way DXB-08 kept `LevelConfig` as plain overrides.
 *
 * DXB-13 expands the visual fields so each type has a distinct recipe
 * (clean solid / damaged cracks / metallic sheen / highlighted bonus)
 * without changing hit counts, score, or drop policy.
 */

export type BrickType = 'normal' | 'cracked' | 'metal' | 'bonus';

/** How a destroyed brick interacts with DXB-09's existing drop roll. */
export type BrickPowerupDrop = 'chance' | 'always' | 'never';

export interface BrickTypeSpec {
  /**
   * Hits required to destroy this type. `Number.POSITIVE_INFINITY` means
   * the brick is an obstacle — the ball still bounces, it is never
   * removed, and it does not count toward `BrickGrid.isCleared()`.
   */
  hitsToDestroy: number;
  /** Score is awarded only when the brick is actually destroyed. */
  awardsScore: boolean;
  powerupDrop: BrickPowerupDrop;
  /** Overrides the row color when set (metal / bonus distinct fills). */
  fillColor?: number;
  strokeColor?: number;
  /**
   * Cracked-only: multiply the row color by this on the damaged (1-hit
   * remaining) state so healthy vs. cracked is visible without a sprite.
   */
  crackedFillDarken?: number;
  crackedStrokeColor?: number;
}

export const BRICK_TYPE_SPECS: Record<BrickType, BrickTypeSpec> = {
  normal: {
    hitsToDestroy: 1,
    awardsScore: true,
    powerupDrop: 'chance',
  },
  cracked: {
    hitsToDestroy: 2,
    awardsScore: true,
    powerupDrop: 'chance',
    // Pale outline vs. un-stroked normal bricks; damaged state darkens fill.
    strokeColor: 0xf1f3f5,
    crackedFillDarken: 0.42,
    crackedStrokeColor: 0xffc857,
  },
  metal: {
    hitsToDestroy: Number.POSITIVE_INFINITY,
    awardsScore: false,
    powerupDrop: 'never',
    fillColor: 0x8b95a1,
    strokeColor: 0xe9ecef,
  },
  bonus: {
    hitsToDestroy: 1,
    awardsScore: true,
    powerupDrop: 'always',
    fillColor: 0x9b5de5,
    strokeColor: 0xffe66d,
  },
};

/** One cell in a parsed layout — `null` is an empty hole (no brick). */
export type BrickLayoutCell = BrickType | null;

const EMPTY_BRICK_CHAR = '.';

const CHAR_TO_TYPE: Record<string, BrickType> = {
  N: 'normal',
  C: 'cracked',
  M: 'metal',
  B: 'bonus',
};

/**
 * Parses a compact row-string layout into a 2D cell grid. Each string is
 * one row; characters are `N` normal, `C` cracked, `M` metal, `B` bonus,
 * `.` empty. Row width is taken from the first string; shorter rows are
 * padded with empty cells and longer ones are truncated. Unknown
 * characters fall back to a normal brick so a typo cannot crash a level.
 */
export function parseBrickLayout(rows: readonly string[]): BrickLayoutCell[][] {
  if (rows.length === 0) {
    return [];
  }

  const columns = rows[0].length;

  return rows.map((row) => {
    const cells: BrickLayoutCell[] = [];

    for (let column = 0; column < columns; column++) {
      const ch = row[column] ?? EMPTY_BRICK_CHAR;

      if (ch === EMPTY_BRICK_CHAR) {
        cells.push(null);
        continue;
      }

      cells.push(CHAR_TO_TYPE[ch] ?? 'normal');
    }

    return cells;
  });
}
