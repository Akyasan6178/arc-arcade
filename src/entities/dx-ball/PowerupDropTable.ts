import type { PowerupType } from '@entities/dx-ball/Powerup';

/**
 * entities/dx-ball/PowerupDropTable.ts
 *
 * DXB-23: Weighted spawn table for `PowerupManager`. BrickGrid still
 * only decides *whether* a capsule drops; this file decides *which*
 * type. Weights are integers, not equal shares — power strength tracks
 * rarity. Extra Life is a special reward, not a regular catch.
 */

export type PowerupRarity = 'very-rare' | 'rare' | 'uncommon' | 'common';

export interface PowerupDropEntry {
  type: PowerupType;
  weight: number;
  rarity: PowerupRarity;
}

/**
 * Final DXB-23 table. Weights sum to 100 so a roll is a percent.
 *
 * Extra Life  3%  Very Rare
 * Fire Ball   8%  Rare
 * Multi Ball 14%  Uncommon
 * Small Paddle 15% Common
 * Fast Ball  17%  Common
 * Widen Paddle 19% Common
 * Slow Ball  24%  Common
 */
export const POWERUP_DROP_TABLE: readonly PowerupDropEntry[] = [
  { type: 'extra-life', weight: 3, rarity: 'very-rare' },
  { type: 'fire-ball', weight: 8, rarity: 'rare' },
  { type: 'multi-ball', weight: 14, rarity: 'uncommon' },
  { type: 'small-paddle', weight: 15, rarity: 'common' },
  { type: 'fast-ball', weight: 17, rarity: 'common' },
  { type: 'widen-paddle', weight: 19, rarity: 'common' },
  { type: 'slow-ball', weight: 24, rarity: 'common' },
];

const WEIGHT_BY_TYPE: Record<PowerupType, number> = {
  'extra-life': 3,
  'fire-ball': 8,
  'multi-ball': 14,
  'small-paddle': 15,
  'fast-ball': 17,
  'widen-paddle': 19,
  'slow-ball': 24,
};

export function pickWeightedPowerupType(types: readonly PowerupType[]): PowerupType {
  if (types.length === 0) {
    return 'widen-paddle';
  }

  let total = 0;
  const weighted = types.map((type) => {
    const weight = Math.max(1, WEIGHT_BY_TYPE[type] ?? 1);
    total += weight;
    return { type, weight };
  });

  let roll = Math.random() * total;
  for (const entry of weighted) {
    roll -= entry.weight;
    if (roll < 0) {
      return entry.type;
    }
  }

  return weighted[weighted.length - 1].type;
}
