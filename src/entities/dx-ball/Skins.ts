import type { BallSkinId, PaddleSkinId } from '@entities/dx-ball/Progress';

/**
 * entities/dx-ball/Skins.ts
 *
 * DXB-16: Visual tokens for paddle / ball cosmetics. Unlock gates live
 * in `Progress.ts`; this file only names how an equipped skin looks.
 * `Paddle` / `Ball` never import this module — the owning scene applies
 * tokens, matching how `Theme.ts` stays out of those entities.
 *
 * DXB-19 adds Crystal / Titan / Pulse / Obsidian paddles and Ice Core /
 * Dark Matter / Solar / Nova balls. Existing Classic / Carbon / Neon /
 * Reactor and Classic / Plasma / Inferno / Quantum tokens are unchanged.
 *
 * DXB-22: ball skins name an idle `fx` token so gameplay and Garage
 * preview can animate without new skin ids. Fire Ball still overrides.
 *
 * DXB-23: paddle motifs still use these same ids. Distinct silhouettes
 * live in `paddleCosmetic.ts`. DXB-27 makes Robot / Alien / Reactor /
 * Pulse motion-first (pistons, upward waves, orbiting core, traveling
 * slug) so identity is not color-only.
 */

export type PaddleSkinMotif =
  | 'flat'
  | 'bands'
  | 'glow'
  | 'core'
  | 'crystal'
  | 'plates'
  | 'pulse'
  | 'shard';

export interface PaddleSkinVisual {
  fill: number;
  stroke: number;
  strokeWidthRatio: number;
  motif: PaddleSkinMotif;
  motifColor: number;
}

export type BallSkinFx = 'none' | 'plasma' | 'ember' | 'quantum' | 'frost' | 'void' | 'corona' | 'nova';

export interface BallSkinVisual {
  fill: number;
  stroke: number;
  strokeWidthRatio: number;
  glowColor: number;
  glowAlpha: number;
  glowScale: number;
  coreColor: number;
  coreAlpha: number;
  coreScale: number;
  /** DXB-22: idle animation kind. Fire Ball still wins while active. */
  fx: BallSkinFx;
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
  crystal: {
    fill: 0x9ee7ff,
    stroke: 0xf0fbff,
    strokeWidthRatio: 0.3,
    motif: 'crystal',
    motifColor: 0xffffff,
  },
  titan: {
    fill: 0x6b5344,
    stroke: 0xd6c3a8,
    strokeWidthRatio: 0.26,
    motif: 'plates',
    motifColor: 0xc4a574,
  },
  pulse: {
    fill: 0x101828,
    stroke: 0x38bdf8,
    strokeWidthRatio: 0.32,
    motif: 'pulse',
    motifColor: 0x22d3ee,
  },
  obsidian: {
    fill: 0x0b0614,
    stroke: 0xa78bfa,
    strokeWidthRatio: 0.34,
    motif: 'shard',
    motifColor: 0xc4b5fd,
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
    coreColor: 0xffcc00,
    coreAlpha: 0,
    coreScale: 0.4,
    fx: 'none',
  },
  plasma: {
    fill: 0x7c3aed,
    stroke: 0x2de2e6,
    strokeWidthRatio: 0.32,
    glowColor: 0x22d3ee,
    glowAlpha: 0.42,
    glowScale: 2.05,
    coreColor: 0xe0e7ff,
    coreAlpha: 0,
    coreScale: 0.4,
    fx: 'plasma',
  },
  inferno: {
    fill: 0xff6b35,
    stroke: 0xffe066,
    strokeWidthRatio: 0.28,
    glowColor: 0xff3d00,
    glowAlpha: 0.4,
    glowScale: 2.1,
    coreColor: 0xffe066,
    coreAlpha: 0,
    coreScale: 0.4,
    fx: 'ember',
  },
  quantum: {
    fill: 0x22d3ee,
    stroke: 0xe0e7ff,
    strokeWidthRatio: 0.38,
    glowColor: 0xa78bfa,
    glowAlpha: 0.36,
    glowScale: 1.85,
    coreColor: 0xe0e7ff,
    coreAlpha: 0,
    coreScale: 0.4,
    fx: 'quantum',
  },
  'ice-core': {
    fill: 0x7dd3fc,
    stroke: 0xf0f9ff,
    strokeWidthRatio: 0.36,
    glowColor: 0xbae6fd,
    glowAlpha: 0.46,
    glowScale: 2.15,
    coreColor: 0xffffff,
    coreAlpha: 0.95,
    coreScale: 0.42,
    fx: 'frost',
  },
  'dark-matter': {
    fill: 0x1e1028,
    stroke: 0xc026d3,
    strokeWidthRatio: 0.42,
    glowColor: 0x7c3aed,
    glowAlpha: 0.38,
    glowScale: 2.2,
    coreColor: 0xf0abfc,
    coreAlpha: 0.9,
    coreScale: 0.32,
    fx: 'void',
  },
  solar: {
    fill: 0xfacc15,
    stroke: 0xffedd5,
    strokeWidthRatio: 0.3,
    glowColor: 0xfb923c,
    glowAlpha: 0.48,
    glowScale: 2.25,
    coreColor: 0xfff7ed,
    coreAlpha: 0.95,
    coreScale: 0.38,
    fx: 'corona',
  },
  nova: {
    fill: 0xf472b6,
    stroke: 0xfae8ff,
    strokeWidthRatio: 0.4,
    glowColor: 0xe879f9,
    glowAlpha: 0.5,
    glowScale: 2.35,
    coreColor: 0xffffff,
    coreAlpha: 0.92,
    coreScale: 0.28,
    fx: 'nova',
  },
};

export function getPaddleSkinVisual(id: PaddleSkinId): PaddleSkinVisual {
  return PADDLE_SKINS[id];
}

/** DXB-27: One-line motion identity shown in Garage so the unlock is about behavior. */
export function getPaddleMotionHint(id: PaddleSkinId): string {
  switch (id) {
    case 'titan':
      return 'Moving pistons';
    case 'neon':
      return 'Rising signal waves';
    case 'reactor':
      return 'Orbiting energy core';
    case 'pulse':
      return 'Traveling energy flow';
    case 'crystal':
      return 'Faceted prism light';
    case 'obsidian':
      return 'Jagged shard hull';
    case 'carbon':
      return 'Chevron plate weave';
    case 'classic':
      return 'Arcade bar';
  }
}

export function getBallSkinVisual(id: BallSkinId): BallSkinVisual {
  return BALL_SKINS[id];
}
