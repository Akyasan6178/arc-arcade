import Phaser from 'phaser';
import { SceneKeys } from '@systems/SceneKeys';

/**
 * scenes/PreloadScene.ts
 *
 * Responsible for loading every asset the game needs (images, spritesheets,
 * atlases, audio, tilemaps, fonts) and showing loading progress. This is
 * where each specific game (DX-Ball, Pac-Man, Snake, Bomberman, ...) would
 * register its own asset manifest (see `src/assets/`).
 *
 * No gameplay or UI logic belongs here — only loading and a hand-off to
 * MainScene once everything is ready.
 */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: SceneKeys.Preload });
  }

  preload(): void {
    // Placeholder for future asset loading, e.g.:
    // this.load.image('paddle', 'assets/dx-ball/paddle.png');
    //
    // A loading bar UI would also be wired up here once ui/ has content.
  }

  create(): void {
    this.scene.start(SceneKeys.Main);
  }
}
