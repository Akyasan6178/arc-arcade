import type { BallSkinId, PaddleSkinId } from '@entities/dx-ball/Progress';

/**
 * entities/dx-ball/Skins.ts
 *
 * DXB-16: Visual tokens for paddle / ball cosmetics. Unlock gates live
 * in `Progress.ts`; this file only names how an equipped skin looks.
 * `Paddle` / `Ball` never import this module — the owning scene applies
 * tokens, matching how `Theme.ts` stays out of those entities.
 */

export type PaddleSkinMotif = 'flat' | 'bands' | 'glow' | 'core';

export interface PaddleSkinVisual {
  fill: number;
  stroke: number;
  strokeWidthRatio: number;
  motif: PaddleSkinMotif;
  motifColor: number;
}

export interface BallSkinVisual {
  fill: number;
  stroke: number;
  strokeWidthRatio: number;
  glowColor: number;
  glowAlpha: number;
  glowScale: number;
}

const PADDLE_SKINS: Record<PaddleSkinId, PaddleSkinVisual> = {
  classic: {
    fill: 0xffffff,
    stroke: 0xffffff,
    strokeWidthRatio: 0,
    motif: 'flat',
    motifColor: 0xffffff,
  },
  carbon: {
    fill: 0x2b2f36,
    stroke: 0x9aa4b2,
    strokeWidthRatio: 0.18,
    motif: 'bands',
    motifColor: 0x5c6570,
  },
  neon: {
    fill: 0x1a0533,
    stroke: 0xff2a6d,
    strokeWidthRatio: 0.28,
    motif: 'glow',
    motifColor: 0x2de2e6,
  },
  reactor: {
    fill: 0x0b2a24,
    stroke: 0x2dd4bf,
    strokeWidthRatio: 0.22,
    motif: 'core',
    motifColor: 0xfbbf24,
  },
};

const BALL_SKINS: Record<BallSkinId, BallSkinVisual> = {
  classic: {
    fill: 0xffcc00,
    stroke: 0xffcc00,
    strokeWidthRatio: 0,
    glowColor: 0xffcc00,
    glowAlpha: 0,
    glowScale: 1,
  },
  plasma: {
    fill: 0x7c3aed,
    stroke: 0x2de2e6,
    strokeWidthRatio: 0.32,
    glowColor: 0x22d3ee,
    glowAlpha: 0.42,
    glowScale: 2.05,
  },
  inferno: {
    fill: 0xff6b35,
    stroke: 0xffe066,
    strokeWidthRatio: 0.28,
    glowColor: 0xff3d00,
    glowAlpha: 0.4,
    glowScale: 2.1,
  },
  quantum: {
    fill: 0x22d3ee,
    stroke: 0xe0e7ff,
    strokeWidthRatio: 0.38,
    glowColor: 0xa78bfa,
    glowAlpha: 0.36,
    glowScale: 1.85,
  },
};

export function getPaddleSkinVisual(id: PaddleSkinId): PaddleSkinVisual {
  return PADDLE_SKINS[id];
}

export function getBallSkinVisual(id: BallSkinId): BallSkinVisual {
  return BALL_SKINS[id];
}
