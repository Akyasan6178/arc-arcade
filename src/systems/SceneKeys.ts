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
 * risking typos scattered across the codebase. DXB-16 added an
 * unlockables catalog; DXB-18A replaces that side screen with a
 * dedicated `Achievements` destination from the Hub. DXB-17 adds
 * `Stats`. DXB-18 adds `Garage`. DXB-18A adds `Hub` and `Settings`.
 */
export const SceneKeys = {
  Boot: 'BootScene',
  Preload: 'PreloadScene',
  Hub: 'HubScene',
  ThemeSelect: 'ThemeSelectScene',
  ModeSelect: 'ModeSelectScene',
  Achievements: 'AchievementsScene',
  Stats: 'StatsScene',
  Garage: 'GarageScene',
  Settings: 'SettingsScene',
  Main: 'MainScene',
} as const;

export type SceneKey = (typeof SceneKeys)[keyof typeof SceneKeys];
