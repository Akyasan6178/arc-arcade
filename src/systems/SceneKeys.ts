/**
 * systems/SceneKeys.ts
 *
 * `systems/` holds engine-level, game-agnostic building blocks that every
 * arcade title in this project (DX-Ball, Pac-Man, Snake, Bomberman, ...)
 * can depend on: scene registries, input helpers, audio managers, save
 * systems, event buses, etc. Nothing here should know about a specific
 * game's rules.
 *
 * This file centralizes scene key strings so scenes can reference each
 * other (e.g. `this.scene.start(SceneKeys.Main)`) without hardcoding and
 * risking typos scattered across the codebase.
 */
export const SceneKeys = {
  Boot: 'BootScene',
  Preload: 'PreloadScene',
  Main: 'MainScene',
} as const;

export type SceneKey = (typeof SceneKeys)[keyof typeof SceneKeys];
