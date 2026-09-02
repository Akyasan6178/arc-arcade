import type { PowerupType } from '@entities/dx-ball/Powerup';

/**
 * entities/dx-ball/PowerupDropTable.ts
 *
 * DXB-23: Weighted spawn table for `PowerupManager`. BrickGrid still
 * only decides *whether* a capsule drops; this file decides *which*
 * type. Weights are integers, not equal shares — power strength tracks
 * rarity. Extra Life is a special reward, not a regular catch.
 *
 * DXB-24 added Laser Paddle. DXB-25 is the final rarity pass: Extra
 * Life is extremely rare, Laser is very rare, Fire Ball is rare.
 * Weights stay unique and still sum to 100.
 */

export type PowerupRarity =
  | 'extremely-rare'
  | 'very-rare'
  | 'rare'
  | 'uncommon'
  | 'common';

export interface PowerupDropEntry {
  type: PowerupType;
  weight: number;
  rarity: PowerupRarity;
}

export const POWERUP_RARITY_LABELS: Record<PowerupRarity, string> = {
  'extremely-rare': 'Extremely Rare',
  'very-rare': 'Very Rare',
  rare: 'Rare',
  uncommon: 'Uncommon',
  common: 'Common',
};

/**
 * Final DXB-25 table. Weights sum to 100 so a roll is a percent.
 *
 * Extra Life     2%  Extremely Rare
 * Laser Paddle   4%  Very Rare
 * Fire Ball      8%  Rare
 * Multi Ball    13%  Uncommon
 * Small Paddle  16%  Common
 * Fast Ball     17%  Common
 * Widen Paddle  19%  Common
 * Slow Ball     21%  Common
 */
export const POWERUP_DROP_TABLE: readonly PowerupDropEntry[] = [
  { type: 'extra-life', weight: 2, rarity: 'extremely-rare' },
  { type: 'laser-paddle', weight: 4, rarity: 'very-rare' },
  { type: 'fire-ball', weight: 8, rarity: 'rare' },
  { type: 'multi-ball', weight: 13, rarity: 'uncommon' },
  { type: 'small-paddle', weight: 16, rarity: 'common' },
  { type: 'fast-ball', weight: 17, rarity: 'common' },
  { type: 'widen-paddle', weight: 19, rarity: 'common' },
  { type: 'slow-ball', weight: 21, rarity: 'common' },
];

const WEIGHT_BY_TYPE = Object.fromEntries(
  POWERUP_DROP_TABLE.map((entry) => [entry.type, entry.weight]),
) as Record<PowerupType, number>;

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
