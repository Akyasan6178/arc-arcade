# systems/

Reusable, game-agnostic engine systems shared across every arcade title
built on this foundation (DX-Ball, Pac-Man, Snake, Bomberman, ...).

Examples of what belongs here as the project grows:

- Input abstraction (keyboard/gamepad/touch mapping)
- Audio manager (music/sfx pooling, mute state)
- Save/score persistence
- A global event bus for cross-scene communication
- Collision/physics helpers that aren't specific to one game's rules

Nothing in this folder should contain gameplay rules for a specific game —
that belongs in `entities/` (per-game actors) or a future per-game module.

Currently:

- `SceneKeys.ts` — string keys used to register and start scenes
  (`Boot`, `Preload`, `Hub` since DXB-18A, `ThemeSelect` since DXB-15,
  `ModeSelect` since DXB-14, `LevelSelect` / `Tutorial` / `Credits` since
  DXB-23, `Achievements` since DXB-18A, `Stats` since DXB-17, `Garage`
  since DXB-18, `Settings` since DXB-18A, `Main`).
- `GameViewport.ts` — ARC-01 responsive-viewport service. Wraps Phaser's
  Scale Manager plus browser orientation/safe-area concerns into a single
  `GameViewport.get()` accessor (`width`, `height`, `centerX`, `centerY`,
  `isPortrait`, `isLandscape`, `safeArea`, `onChange(listener)`) that any
  scene/system/entity in any future game can read.
- `HighScoreStore.ts` — DXB-06 save/score persistence. A tiny static
  `get(key)` / `set(key, value)` wrapper around `localStorage`, keyed by
  a caller-provided string so each game picks its own key without this
  file knowing anything about that game's scoring rules.
- `AudioManager.ts` — DXB-10 audio manager, extended in DXB-22 with
  looping music (`playMusic` / `stopMusic`) on the same real-asset-then-
  synthesized-fallback seam as one-shot SFX. Music and SFX sit on
  separate internal volume buses; the persisted global `enabled` mute
  still gates both and stops music immediately. Knows nothing about
  DX-Ball's cue names — see `entities/dx-ball/audioCues.ts`.
- `ThemeStore.ts` — DXB-15 string persistence for a selected theme id.
  Same localStorage wrapper shape as `HighScoreStore`, but for strings.
  Knows nothing about palettes; `entities/dx-ball/Theme.ts` owns those.
- `JsonStore.ts` — DXB-16 JSON persistence. Tiny static `get<T>(key)` /
  `set(key, value)` wrapper around `localStorage`. Knows nothing about
  achievements, unlocks, statistics, leaderboards, or favorites;
  `entities/dx-ball/Progress.ts` and `Leaderboards.ts` own those.
  DXB-24 keeps the local Top 10 in `LeaderboardAdapter.ts` (`LocalLeaderboardAdapter`)
  with an unwired `OnlineLeaderboardAdapter` seam — still no accounts
  or network.
