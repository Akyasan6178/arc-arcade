import Phaser from 'phaser';
import { SceneKeys } from '@systems/SceneKeys';
import { DX_BALL_AUDIO_MANIFEST } from '@assets/dx-ball/audio-manifest';

/**
 * scenes/PreloadScene.ts
 *
 * Responsible for loading every asset the game needs (images, spritesheets,
 * atlases, audio, tilemaps, fonts) and showing loading progress. This is
 * where each specific game (DX-Ball, Pac-Man, Snake, Bomberman, ...) would
 * register its own asset manifest (see `src/assets/`).
 *
 * No gameplay or UI logic belongs here — only loading and a hand-off to
 * ModeSelectScene once everything is ready (DXB-14; MainScene starts
 * only after a mode is chosen).
 *
 * DXB-10: loads every entry in `DX_BALL_AUDIO_MANIFEST` (currently empty
 * — no real audio files exist yet) via `this.load.audio()`. A load
 * failure here (a missing/broken file) only ever produces Phaser's own
 * `loaderror` event, never a thrown exception, and `AudioManager`
 * already checks its cache before ever trying to play a key — so an
 * empty or partially-failed manifest is a fully safe, expected state,
 * not a startup error.
 */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: SceneKeys.Preload });
  }

  preload(): void {
    for (const asset of DX_BALL_AUDIO_MANIFEST) {
      this.load.audio(asset.key, asset.url);
    }

    // A loading bar UI would also be wired up here once ui/ has content.
  }

  create(): void {
    this.scene.start(SceneKeys.ModeSelect);
  }
}
