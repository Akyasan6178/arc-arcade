import Phaser from 'phaser';
import type { BrickType } from '@entities/dx-ball/BrickType';

/**
 * entities/dx-ball/BrickImpactFx.ts
 *
 * DXB-24: One-shot hit feedback spawned by `BrickGrid` at the contact
 * point. Visual only — score, drops, and removal stay on the grid.
 *
 *   Normal — bright flash + debris chips
 *   Cracked — crack-expansion lines + damage flash
 *   Metal  — metallic sparks
 *   Bonus  — gold starburst
 */

export interface BrickImpactSpec {
  x: number;
  y: number;
  width: number;
  height: number;
  brickType: BrickType;
  destroyed: boolean;
  /** True when a cracked brick just entered its damaged (1-hit) state. */
  crackedOpened?: boolean;
}

const FX_DEPTH = 13;

export function spawnBrickImpact(scene: Phaser.Scene, spec: BrickImpactSpec): void {
  const flash = scene.add.graphics().setDepth(FX_DEPTH);
  const burst = scene.add.graphics().setDepth(FX_DEPTH);
  const radius = Math.max(1, spec.height * 0.14);

  drawHitFlash(flash, spec, radius);
  drawBurst(burst, spec);

  scene.tweens.add({
    targets: flash,
    alpha: 0,
    duration: spec.destroyed ? 140 : 110,
    onComplete: () => flash.destroy(),
  });

  scene.tweens.add({
    targets: burst,
    alpha: 0,
    duration: spec.brickType === 'bonus' || spec.crackedOpened ? 280 : 200,
    onComplete: () => burst.destroy(),
  });

  // Tiny outward drift so debris reads as a burst, not a stamp.
  scene.tweens.add({
    targets: burst,
    y: spec.y - Math.max(4, spec.height * 0.25),
    duration: 220,
    ease: 'Quad.easeOut',
  });
}

function drawHitFlash(
  g: Phaser.GameObjects.Graphics,
  spec: BrickImpactSpec,
  radius: number,
): void {
  const { x, y, width, height, brickType, destroyed, crackedOpened } = spec;
  const left = x - width / 2;
  const top = y - height / 2;

  if (brickType === 'metal') {
    g.fillStyle(0xf8fafc, destroyed ? 0.85 : 0.55);
    g.fillRoundedRect(left - 1, top - 1, width + 2, height + 2, radius);
    g.lineStyle(Math.max(2, height * 0.14), 0xfff1c1, 0.95);
    g.strokeRoundedRect(left, top, width, height, radius);
    return;
  }

  if (brickType === 'bonus') {
    g.fillStyle(0xffe066, destroyed ? 0.9 : 0.65);
    g.fillRoundedRect(left - 2, top - 2, width + 4, height + 4, radius);
    g.lineStyle(Math.max(2, height * 0.16), 0xffffff, 0.8);
    g.strokeRoundedRect(left, top, width, height, radius);
    return;
  }

  if (brickType === 'cracked') {
    g.fillStyle(crackedOpened ? 0xffe066 : 0xffffff, crackedOpened ? 0.7 : 0.45);
    g.fillRoundedRect(left, top, width, height, radius);
    return;
  }

  g.fillStyle(0xffffff, destroyed ? 0.72 : 0.5);
  g.fillRoundedRect(left - 1, top - 1, width + 2, height + 2, radius);
}

function drawBurst(g: Phaser.GameObjects.Graphics, spec: BrickImpactSpec): void {
  switch (spec.brickType) {
    case 'metal':
      drawMetalSparks(g, spec);
      break;
    case 'bonus':
      drawBonusBurst(g, spec);
      break;
    case 'cracked':
      drawCrackExpansion(g, spec);
      break;
    default:
      drawNormalDebris(g, spec);
      break;
  }
}

function drawNormalDebris(g: Phaser.GameObjects.Graphics, spec: BrickImpactSpec): void {
  const chips = spec.destroyed ? 7 : 4;
  g.fillStyle(0xf8f9fa, 0.95);
  for (let i = 0; i < chips; i++) {
    const angle = (Math.PI * 2 * i) / chips + 0.35;
    const dist = spec.width * (0.22 + (i % 3) * 0.08);
    const cx = spec.x + Math.cos(angle) * dist;
    const cy = spec.y + Math.sin(angle) * dist * 0.65;
    const size = Math.max(1.4, spec.height * (spec.destroyed ? 0.18 : 0.12));
    g.fillRect(cx - size / 2, cy - size / 2, size, size * 0.7);
  }
}

function drawCrackExpansion(g: Phaser.GameObjects.Graphics, spec: BrickImpactSpec): void {
  const opened = spec.crackedOpened === true;
  g.lineStyle(Math.max(1.6, spec.height * (opened ? 0.16 : 0.1)), 0x1b1b1b, opened ? 0.95 : 0.7);
  const reach = spec.width * (opened ? 0.62 : 0.38);
  for (let i = 0; i < (opened ? 5 : 3); i++) {
    const angle = -Math.PI / 2 + (i - 1) * 0.55;
    g.beginPath();
    g.moveTo(spec.x, spec.y);
    g.lineTo(spec.x + Math.cos(angle) * reach, spec.y + Math.sin(angle) * spec.height * 0.55);
    g.strokePath();
  }
  if (opened) {
    g.fillStyle(0xffc857, 0.85);
    g.fillCircle(spec.x, spec.y, Math.max(2, spec.height * 0.16));
  }
}

function drawMetalSparks(g: Phaser.GameObjects.Graphics, spec: BrickImpactSpec): void {
  const sparks = spec.destroyed ? 8 : 6;
  for (let i = 0; i < sparks; i++) {
    const angle = -Math.PI / 2 + (i - sparks / 2) * 0.38;
    const len = spec.width * (0.18 + (i % 2) * 0.12);
    g.lineStyle(Math.max(1.2, spec.height * 0.08), i % 2 === 0 ? 0xfff6c2 : 0xe9ecef, 1);
    g.beginPath();
    g.moveTo(spec.x, spec.y);
    g.lineTo(spec.x + Math.cos(angle) * len, spec.y + Math.sin(angle) * len * 0.7);
    g.strokePath();
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(
      spec.x + Math.cos(angle) * len * 0.55,
      spec.y + Math.sin(angle) * len * 0.4,
      Math.max(1, spec.height * 0.07),
    );
  }
}

function drawBonusBurst(g: Phaser.GameObjects.Graphics, spec: BrickImpactSpec): void {
  const gem = Math.min(spec.width, spec.height) * 0.42;
  g.fillStyle(0xffe66d, 1);
  g.fillTriangle(spec.x, spec.y - gem, spec.x - gem * 0.7, spec.y + gem * 0.2, spec.x + gem * 0.7, spec.y + gem * 0.2);
  g.fillStyle(0xffffff, 0.75);
  g.fillCircle(spec.x, spec.y, gem * 0.22);
  g.lineStyle(Math.max(1.4, spec.height * 0.08), 0xfff1a8, 0.95);
  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI * 2 * i) / 8;
    const inner = gem * 0.35;
    const outer = gem * 1.15;
    g.beginPath();
    g.moveTo(spec.x + Math.cos(angle) * inner, spec.y + Math.sin(angle) * inner);
    g.lineTo(spec.x + Math.cos(angle) * outer, spec.y + Math.sin(angle) * outer);
    g.strokePath();
  }
}
