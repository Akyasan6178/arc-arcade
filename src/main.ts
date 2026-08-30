import Phaser from 'phaser';
import { BootScene } from '@scenes/BootScene';
import { PreloadScene } from '@scenes/PreloadScene';
import { ThemeSelectScene } from '@scenes/ThemeSelectScene';
import { ModeSelectScene } from '@scenes/ModeSelectScene';
import { MainScene } from '@scenes/MainScene';
import { GameViewport } from '@systems/GameViewport';
import { AudioManager } from '@systems/AudioManager';

/**
 * src/main.ts
 *
 * Application entry point. Creates the single Phaser.Game instance shared
 * by every game built on this foundation and registers the base scene
 * pipeline (Boot -> Preload -> ThemeSelect -> ModeSelect -> Main). Individual games
 * plug additional scenes into this same array as they're built.
 *
 * ARC-01: `scale` is configured with Phaser.Scale.RESIZE so the canvas
 * always fills its parent container (`#app`, styled to 100% of the
 * viewport in index.html) instead of being locked to a fixed design
 * resolution. `min`/`max` guard against degenerate or absurdly large
 * canvases. This is the "Phaser Scale Manager configuration" +
 * "responsive viewport system" foundation every future game reads through
 * the `GameViewport` service (see systems/GameViewport.ts).
 *
 * DXB-13: `backgroundColor` matches the arcade backdrop's top band so a
 * resize/load flash stays in the same navy family.
 */
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'app',
  backgroundColor: '#0a1128',
  scale: {
    mode: Phaser.Scale.RESIZE,
    parent: 'app',
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: '100%',
    height: '100%',
    min: { width: 320, height: 240 },
    max: { width: 2560, height: 1440 },
  },
  scene: [BootScene, PreloadScene, ThemeSelectScene, ModeSelectScene, MainScene],
};

const game = new Phaser.Game(config);

// Single shared responsive-viewport service. Initialized once here so any
// scene can call `GameViewport.get()` from this point on.
GameViewport.init(game);

// DXB-10: Single shared audio service, same singleton shape as
// `GameViewport` above. Initialized once here so any scene/entity can
// call `AudioManager.get()` from this point on.
AudioManager.init(game);
