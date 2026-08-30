# Arc Arcade — Project Foundation

A scalable **Phaser 4 + TypeScript + Vite** foundation shared by multiple
arcade games. The first game built on top of it will be **DX-Ball**, with
**Pac-Man**, **Snake**, and **Bomberman** planned to reuse the same
architecture afterwards.

This is a foundation-only scaffold: **no gameplay, assets, menus, or UI
have been implemented yet.** It only proves the scene pipeline boots and
the project compiles/runs.

## Stack

- [Phaser 4](https://phaser.io/)
- TypeScript
- Vite

## Folder structure

```
src/
  scenes/     Phaser Scene classes (lifecycle: Boot -> Preload -> Main, plus
              future per-game scenes)
  systems/    Reusable, game-agnostic engine systems (input, audio, save,
              event bus, ...) shared across every game
  entities/   Game objects/actors with their own behavior (per-game
              subfolders as games are added)
  ui/         HUD/menu components layered on top of gameplay
  assets/     Asset manifests/keys describing what PreloadScene loads
              (binary files themselves live in top-level public/)
```

Each folder contains a short `README.md` (or code comments, for
`scenes/`) explaining its intended purpose in more detail.

## Scenes

- **BootScene** — first scene to run; minimal setup before anything is
  shown, then hands off to `PreloadScene`.
- **PreloadScene** — loads assets and shows loading progress, then hands
  off to `MainScene`.
- **MainScene** — the active scene where a specific game's logic will
  eventually be built.

## Getting started

Install dependencies:

```bash
npm install
```

Run the dev server (opens the game in your browser with hot reload):

```bash
npm run dev
```

Type-check the project:

```bash
npm run typecheck
```

Build for production:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```
