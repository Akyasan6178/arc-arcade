import { ThemeStore } from '@systems/ThemeStore';

/**
 * entities/dx-ball/Theme.ts
 *
 * DXB-15: DX-Ball's visual-identity vocabulary. Kept out of `MainScene`
 * the same way `GameMode.ts` keeps mode data out of the run — this file
 * names the themes, their labels, and every palette token (background,
 * HUD, bricks, powerups, overlays). It does not own a scene or a widget.
 * `BrickGrid` / `Ball` / `Paddle` never import it; the owning scene
 * applies tokens. `Powerup` reads powerup colors from a palette the
 * manager passes in.
 *
 * DXB-19 adds Retro Grid, Frozen Core, and Inferno. Existing Neon /
 * Space / Laboratory palettes are unchanged. Unlock gates live in
 * `Progress.ts`; this file still only names palettes.
 */

export type ThemeId =
  | 'neon-arcade'
  | 'space'
  | 'laboratory'
  | 'retro-grid'
  | 'frozen-core'
  | 'inferno';

export type ArcadeBackdropStyle =
  | 'neon'
  | 'space'
  | 'laboratory'
  | 'retro'
  | 'frozen'
  | 'inferno';

export interface ThemeBackdrop {
  style: ArcadeBackdropStyle;
  topColor: number;
  bottomColor: number;
  gridColor: number;
  starColor: number;
  canvasBackground: string;
}

export interface ThemeHudColors {
  score: string;
  best: string;
  lives: string;
  level: string;
  effects: string;
  mode: string;
  title: string;
  subtitle: string;
  hint: string;
  stroke: string;
  message: string;
}

export interface ThemeBrickTypeVisual {
  fillColor?: number;
  strokeColor?: number;
  crackedFillDarken?: number;
  crackedStrokeColor?: number;
}

export interface ThemeBrickPalette {
  rowColors: number[];
  types: Record<'normal' | 'cracked' | 'metal' | 'bonus', ThemeBrickTypeVisual>;
}

export interface ThemePowerupVisual {
  color: number;
  stroke: number;
}

export interface ThemeOverlayColors {
  dim: number;
  dimAlpha: number;
  panel: number;
  panelStroke: number;
  title: string;
  body: string;
  accent: string;
  victoryTitle: string;
  defeatTitle: string;
  infoTitle: string;
}

export interface ThemeMenuColors {
  color: string;
  highlightColor: string;
  descriptionColor: string;
  mutedColor: string;
}

export interface ThemeDefinition {
  id: ThemeId;
  label: string;
  description: string;
  backdrop: ThemeBackdrop;
  hud: ThemeHudColors;
  bricks: ThemeBrickPalette;
  powerups: Record<
    | 'widen-paddle'
    | 'slow-ball'
    | 'extra-life'
    | 'fire-ball'
    | 'multi-ball'
    | 'small-paddle'
    | 'fast-ball',
    ThemePowerupVisual
  >;
  overlay: ThemeOverlayColors;
  menu: ThemeMenuColors;
}

export interface ThemeInfo {
  id: ThemeId;
  label: string;
  description: string;
}

const THEME_STORAGE_KEY = 'dx-ball-theme';

const NEON_ARCADE: ThemeDefinition = {
  id: 'neon-arcade',
  label: 'Neon Arcade',
  description: 'Magenta nights, cyan grid, classic cabinet glow.',
  backdrop: {
    style: 'neon',
    topColor: 0x0a1128,
    bottomColor: 0x1b0a3a,
    gridColor: 0x2de2e6,
    starColor: 0xff2a6d,
    canvasBackground: '#0a1128',
  },
  hud: {
    score: '#f8f9fa',
    best: '#ffd166',
    lives: '#95d5b2',
    level: '#2de2e6',
    effects: '#ffe066',
    mode: '#c4b5fd',
    title: '#f8f9fa',
    subtitle: '#ff2a6d',
    hint: '#2de2e6',
    stroke: '#0b1320',
    message: '#f8f9fa',
  },
  bricks: {
    rowColors: [0xff2a6d, 0xff6b35, 0xffe066, 0x05ffa1, 0x2de2e6],
    types: {
      normal: {},
      cracked: {
        strokeColor: 0xf1f3f5,
        crackedFillDarken: 0.42,
        crackedStrokeColor: 0xffe066,
      },
      metal: { fillColor: 0x8b95a1, strokeColor: 0xe9ecef },
      bonus: { fillColor: 0x9b5de5, strokeColor: 0xffe66d },
    },
  },
  powerups: {
    'widen-paddle': { color: 0x2d6a4f, stroke: 0xb7e4c7 },
    'slow-ball': { color: 0x40916c, stroke: 0xd8f3dc },
    'extra-life': { color: 0x52b788, stroke: 0xedf6f0 },
    'fire-ball': { color: 0x1b4332, stroke: 0x95d5b2 },
    'multi-ball': { color: 0x74c69d, stroke: 0xf0fff4 },
    'small-paddle': { color: 0xe85d04, stroke: 0xffd166 },
    'fast-ball': { color: 0xc1121f, stroke: 0xffba08 },
  },
  overlay: {
    dim: 0x050814,
    dimAlpha: 0.62,
    panel: 0x12182c,
    panelStroke: 0x2de2e6,
    title: '#f8f9fa',
    body: '#c5d0dc',
    accent: '#ff2a6d',
    victoryTitle: '#ffe066',
    defeatTitle: '#ff6b6b',
    infoTitle: '#2de2e6',
  },
  menu: {
    color: '#c5d0dc',
    highlightColor: '#f8f9fa',
    descriptionColor: '#2de2e6',
    mutedColor: '#8b9cb0',
  },
};

const SPACE: ThemeDefinition = {
  id: 'space',
  label: 'Space',
  description: 'Deep void, starfield, and distant nebula light.',
  backdrop: {
    style: 'space',
    topColor: 0x02010a,
    bottomColor: 0x1a1040,
    gridColor: 0x3d348b,
    starColor: 0xe0e7ff,
    canvasBackground: '#02010a',
  },
  hud: {
    score: '#e0e7ff',
    best: '#fbbf24',
    lives: '#86efac',
    level: '#93c5fd',
    effects: '#fcd34d',
    mode: '#c4b5fd',
    title: '#e0e7ff',
    subtitle: '#a78bfa',
    hint: '#93c5fd',
    stroke: '#02010a',
    message: '#e0e7ff',
  },
  bricks: {
    rowColors: [0x7c3aed, 0x2563eb, 0x0ea5e9, 0x8b5cf6, 0x6366f1],
    types: {
      normal: {},
      cracked: {
        strokeColor: 0xc7d2fe,
        crackedFillDarken: 0.38,
        crackedStrokeColor: 0xfbbf24,
      },
      metal: { fillColor: 0x64748b, strokeColor: 0xe2e8f0 },
      bonus: { fillColor: 0xd946ef, strokeColor: 0xfde68a },
    },
  },
  powerups: {
    'widen-paddle': { color: 0x1e3a5f, stroke: 0x93c5fd },
    'slow-ball': { color: 0x164e63, stroke: 0xa5f3fc },
    'extra-life': { color: 0x14532d, stroke: 0x86efac },
    'fire-ball': { color: 0x4c1d95, stroke: 0xe9d5ff },
    'multi-ball': { color: 0x1e1b4b, stroke: 0xc4b5fd },
    'small-paddle': { color: 0x9a3412, stroke: 0xfdba74 },
    'fast-ball': { color: 0x7f1d1d, stroke: 0xfca5a5 },
  },
  overlay: {
    dim: 0x010108,
    dimAlpha: 0.68,
    panel: 0x0f0a24,
    panelStroke: 0xa78bfa,
    title: '#e0e7ff',
    body: '#c7d2fe',
    accent: '#a78bfa',
    victoryTitle: '#fde68a',
    defeatTitle: '#fca5a5',
    infoTitle: '#93c5fd',
  },
  menu: {
    color: '#c7d2fe',
    highlightColor: '#e0e7ff',
    descriptionColor: '#a78bfa',
    mutedColor: '#94a3b8',
  },
};

const LABORATORY: ThemeDefinition = {
  id: 'laboratory',
  label: 'Laboratory',
  description: 'Sterile teal benches, hazard amber, and circuit lines.',
  backdrop: {
    style: 'laboratory',
    topColor: 0x071410,
    bottomColor: 0x0f2a24,
    gridColor: 0x2dd4bf,
    starColor: 0x99f6e4,
    canvasBackground: '#071410',
  },
  hud: {
    score: '#ecfdf5',
    best: '#fbbf24',
    lives: '#6ee7b7',
    level: '#5eead4',
    effects: '#fde68a',
    mode: '#a7f3d0',
    title: '#ecfdf5',
    subtitle: '#2dd4bf',
    hint: '#5eead4',
    stroke: '#022c22',
    message: '#ecfdf5',
  },
  bricks: {
    rowColors: [0x0d9488, 0x14b8a6, 0x84cc16, 0xf59e0b, 0x22c55e],
    types: {
      normal: {},
      cracked: {
        strokeColor: 0xccfbf1,
        crackedFillDarken: 0.4,
        crackedStrokeColor: 0xfbbf24,
      },
      metal: { fillColor: 0x6b7280, strokeColor: 0xe5e7eb },
      bonus: { fillColor: 0xd97706, strokeColor: 0xfde68a },
    },
  },
  powerups: {
    'widen-paddle': { color: 0x115e59, stroke: 0x99f6e4 },
    'slow-ball': { color: 0x166534, stroke: 0xbbf7d0 },
    'extra-life': { color: 0x047857, stroke: 0xd1fae5 },
    'fire-ball': { color: 0x3f6212, stroke: 0xd9f99d },
    'multi-ball': { color: 0x0f766e, stroke: 0xccfbf1 },
    'small-paddle': { color: 0xc2410c, stroke: 0xfdba74 },
    'fast-ball': { color: 0xb45309, stroke: 0xfde68a },
  },
  overlay: {
    dim: 0x022c22,
    dimAlpha: 0.64,
    panel: 0x0b1f1a,
    panelStroke: 0x2dd4bf,
    title: '#ecfdf5',
    body: '#a7f3d0',
    accent: '#fbbf24',
    victoryTitle: '#fde68a',
    defeatTitle: '#fb7185',
    infoTitle: '#5eead4',
  },
  menu: {
    color: '#a7f3d0',
    highlightColor: '#ecfdf5',
    descriptionColor: '#5eead4',
    mutedColor: '#7dd3c0',
  },
};

const INFERNO: ThemeDefinition = {
  id: 'inferno',
  label: 'Inferno',
  description: 'Magma vents, ember sparks, and a furnace glow.',
  backdrop: {
    style: 'inferno',
    topColor: 0x140202,
    bottomColor: 0x3b0d08,
    gridColor: 0xff6b35,
    starColor: 0xffd166,
    canvasBackground: '#140202',
  },
  hud: {
    score: '#fff7ed',
    best: '#ffd166',
    lives: '#86efac',
    level: '#fb923c',
    effects: '#ffe066',
    mode: '#fdba74',
    title: '#fff7ed',
    subtitle: '#ff6b35',
    hint: '#fdba74',
    stroke: '#1c0604',
    message: '#fff7ed',
  },
  bricks: {
    rowColors: [0xdc2626, 0xea580c, 0xf59e0b, 0xf97316, 0xb91c1c],
    types: {
      normal: {},
      cracked: {
        strokeColor: 0xffedd5,
        crackedFillDarken: 0.4,
        crackedStrokeColor: 0xfde68a,
      },
      metal: { fillColor: 0x44403c, strokeColor: 0xfca5a5 },
      bonus: { fillColor: 0xfacc15, strokeColor: 0xfff7ed },
    },
  },
  powerups: {
    'widen-paddle': { color: 0x166534, stroke: 0xbbf7d0 },
    'slow-ball': { color: 0x3f6212, stroke: 0xd9f99d },
    'extra-life': { color: 0x15803d, stroke: 0xdcfce7 },
    'fire-ball': { color: 0x7f1d1d, stroke: 0xfde68a },
    'multi-ball': { color: 0x9a3412, stroke: 0xfed7aa },
    'small-paddle': { color: 0x9f1239, stroke: 0xfda4af },
    'fast-ball': { color: 0x7c2d12, stroke: 0xfdba74 },
  },
  overlay: {
    dim: 0x140202,
    dimAlpha: 0.68,
    panel: 0x2a0b08,
    panelStroke: 0xff6b35,
    title: '#fff7ed',
    body: '#fdba74',
    accent: '#ffd166',
    victoryTitle: '#ffe066',
    defeatTitle: '#fb7185',
    infoTitle: '#fdba74',
  },
  menu: {
    color: '#fdba74',
    highlightColor: '#fff7ed',
    descriptionColor: '#ffd166',
    mutedColor: '#f4a261',
  },
};

const RETRO_GRID: ThemeDefinition = {
  id: 'retro-grid',
  label: 'Retro Grid',
  description: 'Phosphor green CRT, amber scanlines, and chunky pixels.',
  backdrop: {
    style: 'retro',
    topColor: 0x03140a,
    bottomColor: 0x0a2414,
    gridColor: 0x39ff14,
    starColor: 0xffb000,
    canvasBackground: '#03140a',
  },
  hud: {
    score: '#d8ffd8',
    best: '#ffb000',
    lives: '#86efac',
    level: '#39ff14',
    effects: '#ffe066',
    mode: '#bbf7d0',
    title: '#d8ffd8',
    subtitle: '#39ff14',
    hint: '#ffb000',
    stroke: '#021008',
    message: '#d8ffd8',
  },
  bricks: {
    rowColors: [0x22c55e, 0x84cc16, 0xf59e0b, 0x16a34a, 0xeab308],
    types: {
      normal: {},
      cracked: {
        strokeColor: 0xd9f99d,
        crackedFillDarken: 0.4,
        crackedStrokeColor: 0xffb000,
      },
      metal: { fillColor: 0x4b5563, strokeColor: 0xbbf7d0 },
      bonus: { fillColor: 0xf59e0b, strokeColor: 0xfef9c3 },
    },
  },
  powerups: {
    'widen-paddle': { color: 0x14532d, stroke: 0x86efac },
    'slow-ball': { color: 0x3f6212, stroke: 0xd9f99d },
    'extra-life': { color: 0x166534, stroke: 0xbbf7d0 },
    'fire-ball': { color: 0x365314, stroke: 0xfef08a },
    'multi-ball': { color: 0x15803d, stroke: 0xdcfce7 },
    'small-paddle': { color: 0x9a3412, stroke: 0xfdba74 },
    'fast-ball': { color: 0xb45309, stroke: 0xfde68a },
  },
  overlay: {
    dim: 0x021008,
    dimAlpha: 0.66,
    panel: 0x0a1f12,
    panelStroke: 0x39ff14,
    title: '#d8ffd8',
    body: '#bbf7d0',
    accent: '#ffb000',
    victoryTitle: '#fde68a',
    defeatTitle: '#fb7185',
    infoTitle: '#39ff14',
  },
  menu: {
    color: '#bbf7d0',
    highlightColor: '#d8ffd8',
    descriptionColor: '#39ff14',
    mutedColor: '#86c99a',
  },
};

const FROZEN_CORE: ThemeDefinition = {
  id: 'frozen-core',
  label: 'Frozen Core',
  description: 'Ice-blue glaciers, frost shards, and pale aurora light.',
  backdrop: {
    style: 'frozen',
    topColor: 0x031018,
    bottomColor: 0x0a2848,
    gridColor: 0x7dd3fc,
    starColor: 0xe0f2fe,
    canvasBackground: '#031018',
  },
  hud: {
    score: '#f0f9ff',
    best: '#fde68a',
    lives: '#a7f3d0',
    level: '#7dd3fc',
    effects: '#e0f2fe',
    mode: '#bae6fd',
    title: '#f0f9ff',
    subtitle: '#7dd3fc',
    hint: '#bae6fd',
    stroke: '#020617',
    message: '#f0f9ff',
  },
  bricks: {
    rowColors: [0x0284c7, 0x38bdf8, 0x67e8f9, 0x818cf8, 0x22d3ee],
    types: {
      normal: {},
      cracked: {
        strokeColor: 0xe0f2fe,
        crackedFillDarken: 0.36,
        crackedStrokeColor: 0xfde68a,
      },
      metal: { fillColor: 0x64748b, strokeColor: 0xf1f5f9 },
      bonus: { fillColor: 0x818cf8, strokeColor: 0xfef9c3 },
    },
  },
  powerups: {
    'widen-paddle': { color: 0x155e75, stroke: 0xa5f3fc },
    'slow-ball': { color: 0x0e7490, stroke: 0xcffafe },
    'extra-life': { color: 0x115e59, stroke: 0x99f6e4 },
    'fire-ball': { color: 0x1e3a8a, stroke: 0xbfdbfe },
    'multi-ball': { color: 0x164e63, stroke: 0xe0f2fe },
    'small-paddle': { color: 0x9a3412, stroke: 0xfdba74 },
    'fast-ball': { color: 0x7f1d1d, stroke: 0xfca5a5 },
  },
  overlay: {
    dim: 0x020617,
    dimAlpha: 0.66,
    panel: 0x0b1c2c,
    panelStroke: 0x7dd3fc,
    title: '#f0f9ff',
    body: '#bae6fd',
    accent: '#38bdf8',
    victoryTitle: '#fde68a',
    defeatTitle: '#fda4af',
    infoTitle: '#7dd3fc',
  },
  menu: {
    color: '#bae6fd',
    highlightColor: '#f0f9ff',
    descriptionColor: '#7dd3fc',
    mutedColor: '#94a3b8',
  },
};

export const THEMES: readonly ThemeDefinition[] = [
  NEON_ARCADE,
  SPACE,
  LABORATORY,
  RETRO_GRID,
  FROZEN_CORE,
  INFERNO,
];

export const THEME_INFOS: readonly ThemeInfo[] = THEMES.map((theme) => ({
  id: theme.id,
  label: theme.label,
  description: theme.description,
}));

export function isThemeId(value: unknown): value is ThemeId {
  return (
    value === 'neon-arcade' ||
    value === 'space' ||
    value === 'laboratory' ||
    value === 'retro-grid' ||
    value === 'frozen-core' ||
    value === 'inferno'
  );
}

export function getTheme(id: ThemeId): ThemeDefinition {
  return THEMES.find((theme) => theme.id === id) ?? THEMES[0];
}

/** Last chosen theme, or Neon Arcade if unset/invalid. */
export function loadThemeId(): ThemeId {
  const stored = ThemeStore.get(THEME_STORAGE_KEY);
  return isThemeId(stored) ? stored : 'neon-arcade';
}

export function saveThemeId(id: ThemeId): void {
  ThemeStore.set(THEME_STORAGE_KEY, id);
}

export function getThemeInfo(id: ThemeId): ThemeInfo {
  const theme = getTheme(id);
  return { id: theme.id, label: theme.label, description: theme.description };
}
