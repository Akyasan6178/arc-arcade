import Phaser from 'phaser';
import { SceneKeys, type SceneKey } from '@systems/SceneKeys';

/**
 * scenes/menuNavigation.ts
 *
 * DXB-18A: Shared menu routing for the Hub and the Play flow. Side
 * screens (Garage / Stats / Achievements / Settings) return to the
 * caller when it is Hub, ThemeSelect, or ModeSelect; otherwise they
 * fall back to the Hub. Optional G / S / U shortcuts stay bound on
 * those three screens so keyboard users keep the DXB-16/17/18 keys
 * without needing them to reach any screen.
 */

const RETURN_SCENES: readonly SceneKey[] = [
  SceneKeys.Hub,
  SceneKeys.ThemeSelect,
  SceneKeys.ModeSelect,
];

export function resolveMenuReturn(from?: SceneKey): SceneKey {
  return from && RETURN_SCENES.includes(from) ? from : SceneKeys.Hub;
}

export function bindOptionalMenuShortcuts(scene: Phaser.Scene, from: SceneKey): void {
  scene.input.keyboard?.on('keydown-G', () => {
    scene.scene.start(SceneKeys.Garage, { from });
  });
  scene.input.keyboard?.on('keydown-S', () => {
    scene.scene.start(SceneKeys.Stats, { from });
  });
  scene.input.keyboard?.on('keydown-U', () => {
    scene.scene.start(SceneKeys.Achievements, { from });
  });
}
