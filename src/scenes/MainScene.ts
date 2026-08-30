import Phaser from 'phaser';
import { SceneKeys } from '@systems/SceneKeys';

/**
 * scenes/MainScene.ts
 *
 * The active gameplay scene. For now this is an empty foundation: it just
 * proves the Boot -> Preload -> Main pipeline runs end to end. Actual
 * gameplay (DX-Ball paddle/ball/bricks, or later Pac-Man/Snake/Bomberman
 * logic) will be built here or delegated to per-game classes composed
 * from `entities/` and `systems/`, on top of this scene.
 */
export class MainScene extends Phaser.Scene {
  constructor() {
    super({ key: SceneKeys.Main });
  }

  create(): void {
    // No gameplay yet. This is intentionally left as the foundation
    // hand-off point for future game implementations.
  }
}
