import Phaser from 'phaser';
import { SceneKeys } from '@systems/SceneKeys';

/**
 * scenes/BootScene.ts
 *
 * `scenes/` contains Phaser Scene classes: the lifecycle containers that
 * drive what's on screen (booting, preloading, menus, gameplay, ...).
 * Each future arcade game will add its own gameplay scene(s) here while
 * reusing this same Boot -> Preload -> Hub -> (Play: ThemeSelect ->
 * ModeSelect -> Main) pipeline (Achievements, Stats, Garage, and
 * Settings are side screens from the Hub, not in the boot chain).
 *
 * BootScene is the very first scene to run. Its only job is extremely
 * lightweight setup that must happen before we can even show a loading
 * screen: reading persisted settings, configuring global renderer/scale
 * behavior, registering fonts, etc. It deliberately loads no game assets
 * (that's PreloadScene's job) so it starts instantly.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: SceneKeys.Boot });
  }

  preload(): void {
    // Intentionally minimal: only tiny, essential-for-loading-screen
    // assets (e.g. a logo or loading-bar frame) would go here later.
    // No gameplay assets belong in BootScene.
  }

  create(): void {
    this.scene.start(SceneKeys.Preload);
  }
}
