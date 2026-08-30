import Phaser from 'phaser';
import { BootScene } from '@scenes/BootScene';
import { PreloadScene } from '@scenes/PreloadScene';
import { MainScene } from '@scenes/MainScene';

/**
 * src/main.ts
 *
 * Application entry point. Creates the single Phaser.Game instance shared
 * by every game built on this foundation and registers the base scene
 * pipeline (Boot -> Preload -> Main). Individual games plug additional
 * scenes into this same array as they're built.
 */
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'app',
  width: 800,
  height: 600,
  backgroundColor: '#1d1d1d',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, PreloadScene, MainScene],
};

new Phaser.Game(config);
