import type { PowerupType } from '@entities/dx-ball/Powerup';

/**
 * entities/dx-ball/PowerupDropTable.ts
 *
 * DXB-23: Weighted spawn table for `PowerupManager`. BrickGrid still
 * only decides *whether* a capsule drops; this file decides *which*
 * type. Weights are integers, not equal shares — power strength tracks
 * rarity. Extra Life is a special reward, not a regular catch.
 *
 * DXB-24 adds Laser Paddle as a rare type. Weights still unique and
 * still sum to 100.
 */

export type PowerupRarity = 'very-rare' | 'rare' | 'uncommon' | 'common';

export interface PowerupDropEntry {
  type: PowerupType;
  weight: number;
  rarity: PowerupRarity;
}

/**
 * Final DXB-24 table. Weights sum to 100 so a roll is a percent.
 *
 * Extra Life     3%  Very Rare
 * Laser Paddle   6%  Rare
 * Fire Ball      8%  Rare
 * Multi Ball    13%  Uncommon
 * Small Paddle  14%  Common
 * Fast Ball     16%  Common
 * Widen Paddle  18%  Common
 * Slow Ball     22%  Common
 */
export const POWERUP_DROP_TABLE: readonly PowerupDropEntry[] = [
  { type: 'extra-life', weight: 3, rarity: 'very-rare' },
  { type: 'laser-paddle', weight: 6, rarity: 'rare' },
  { type: 'fire-ball', weight: 8, rarity: 'rare' },
  { type: 'multi-ball', weight: 13, rarity: 'uncommon' },
  { type: 'small-paddle', weight: 14, rarity: 'common' },
  { type: 'fast-ball', weight: 16, rarity: 'common' },
  { type: 'widen-paddle', weight: 18, rarity: 'common' },
  { type: 'slow-ball', weight: 22, rarity: 'common' },
];

const WEIGHT_BY_TYPE: Record<PowerupType, number> = {
  'extra-life': 3,
  'laser-paddle': 6,
  'fire-ball': 8,
  'multi-ball': 13,
  'small-paddle': 14,
  'fast-ball': 16,
  'widen-paddle': 18,
  'slow-ball': 22,
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
