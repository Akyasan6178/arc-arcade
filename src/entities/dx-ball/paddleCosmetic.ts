import Phaser from 'phaser';

/**
 * entities/dx-ball/paddleCosmetic.ts
 *
 * DXB-23: Shared paddle-body drawing for gameplay and Garage preview.
 * Collision still lives on `Paddle`'s rectangle; this only paints a
 * distinctive silhouette per motif so skins are identifiable at a
 * glance (moving robot pistons, alien waves above the hull, a rotating
 * reactor core, traveling pulse bands).
 */

export type PaddleCosmeticMotif =
  | 'flat'
  | 'bands'
  | 'glow'
  | 'core'
  | 'crystal'
  | 'plates'
  | 'pulse'
  | 'shard';

export interface PaddleCosmeticVisual {
  fill: number;
  stroke: number;
  strokeWidthRatio: number;
  motif: PaddleCosmeticMotif;
  motifColor: number;
}

export function drawPaddleCosmetic(
  g: Phaser.GameObjects.Graphics,
  visual: PaddleCosmeticVisual,
  width: number,
  height: number,
  fxTimeMs: number,
  originX = 0,
  originY = 0,
): void {
  const halfW = width / 2;
  const halfH = height / 2;
  const wave = (periodMs: number): number => 0.5 + 0.5 * Math.sin(fxTimeMs / periodMs);

  switch (visual.motif) {
    case 'flat':
      drawClassic(g, visual, originX, originY, halfW, halfH, width, height);
      break;
    case 'bands':
      drawCarbon(g, visual, originX, originY, halfW, halfH, width, height);
      break;
    case 'glow':
      drawAlien(g, visual, originX, originY, halfW, halfH, width, height, fxTimeMs, wave);
      break;
    case 'core':
      drawReactor(g, visual, originX, originY, halfW, halfH, width, height, fxTimeMs, wave);
      break;
    case 'crystal':
      drawCrystal(g, visual, originX, originY, halfW, halfH, width, height, fxTimeMs, wave);
      break;
    case 'plates':
      drawRobot(g, visual, originX, originY, halfW, halfH, width, height, fxTimeMs, wave);
      break;
    case 'pulse':
      drawPulse(g, visual, originX, originY, halfW, halfH, width, height, fxTimeMs, wave);
      break;
    case 'shard':
      drawObsidian(g, visual, originX, originY, halfW, halfH, width, height, wave);
      break;
  }
}

function drawClassic(
  g: Phaser.GameObjects.Graphics,
  visual: PaddleCosmeticVisual,
  ox: number,
  oy: number,
  halfW: number,
  halfH: number,
  width: number,
  height: number,
): void {
  const radius = Math.max(2, height * 0.42);
  g.fillStyle(visual.fill, 1);
  g.fillRoundedRect(ox - halfW, oy - halfH, width, height, radius);
  g.fillStyle(0xffffff, 0.42);
  g.fillRoundedRect(ox - halfW + 2, oy - halfH + 1, width - 4, height * 0.38, radius * 0.6);
  g.fillStyle(0x000000, 0.18);
  g.fillRect(ox - halfW + 3, oy + halfH * 0.25, width - 6, Math.max(1, height * 0.22));
}

function drawCarbon(
  g: Phaser.GameObjects.Graphics,
  visual: PaddleCosmeticVisual,
  ox: number,
  oy: number,
  halfW: number,
  halfH: number,
  width: number,
  height: number,
): void {
  const radius = Math.max(2, height * 0.22);
  g.fillStyle(visual.fill, 1);
  g.fillRoundedRect(ox - halfW, oy - halfH, width, height, radius);
  g.lineStyle(Math.max(1.5, height * 0.16), visual.stroke, 1);
  g.strokeRoundedRect(ox - halfW, oy - halfH, width, height, radius);

  g.fillStyle(visual.motifColor, 0.95);
  const stripeW = Math.max(2, width * 0.045);
  for (let i = 0; i < 7; i++) {
    const sx = ox - halfW * 0.78 + i * width * 0.12;
    g.beginPath();
    g.moveTo(sx, oy - halfH * 0.72);
    g.lineTo(sx + stripeW, oy - halfH * 0.72);
    g.lineTo(sx + stripeW + height * 0.35, oy + halfH * 0.72);
    g.lineTo(sx + height * 0.35, oy + halfH * 0.72);
    g.closePath();
    g.fillPath();
  }

  g.fillStyle(visual.stroke, 0.9);
  g.fillCircle(ox - halfW * 0.88, oy, Math.max(1.5, height * 0.18));
  g.fillCircle(ox + halfW * 0.88, oy, Math.max(1.5, height * 0.18));
}

function drawAlien(
  g: Phaser.GameObjects.Graphics,
  visual: PaddleCosmeticVisual,
  ox: number,
  oy: number,
  halfW: number,
  halfH: number,
  width: number,
  height: number,
  fxTimeMs: number,
  wave: (periodMs: number) => number,
): void {
  const radius = Math.max(2, height * 0.5);

  // Signal waves sit above the hull so the skin reads as alien at a glance.
  const waveCount = 3;
  for (let i = 0; i < waveCount; i++) {
    const phase = (fxTimeMs / 420 + i / waveCount) % 1;
    const spread = height * (0.55 + phase * 1.55);
    const alpha = (1 - phase) * (0.35 + 0.45 * wave(180));
    g.lineStyle(Math.max(1.2, height * 0.1), visual.motifColor, alpha);
    g.beginPath();
    g.arc(ox, oy - halfH * 0.85, spread, Math.PI * 1.12, Math.PI * 1.88, false);
    g.strokePath();
  }

  g.fillStyle(visual.motifColor, 0.16 + 0.14 * wave(220));
  g.fillRoundedRect(ox - halfW - 8, oy - halfH - 7, width + 16, height + 14, radius);

  g.fillStyle(visual.fill, 1);
  g.fillRoundedRect(ox - halfW, oy - halfH * 0.72, width, height * 0.72, radius);
  g.lineStyle(Math.max(1.5, height * 0.14), visual.stroke, 1);
  g.strokeRoundedRect(ox - halfW, oy - halfH * 0.72, width, height * 0.72, radius);

  g.fillStyle(visual.stroke, 0.95);
  g.fillCircle(ox - halfW * 0.72, oy - halfH * 1.05, Math.max(2, height * 0.22));
  g.fillCircle(ox + halfW * 0.72, oy - halfH * 1.05, Math.max(2, height * 0.22));
  g.fillStyle(visual.motifColor, 0.55 + 0.4 * wave(180));
  g.fillCircle(ox - halfW * 0.72, oy - halfH * 1.05, Math.max(1, height * 0.1));
  g.fillCircle(ox + halfW * 0.72, oy - halfH * 1.05, Math.max(1, height * 0.1));

  g.lineStyle(Math.max(1.4, height * 0.12), visual.motifColor, 0.7);
  g.beginPath();
  const amp = height * 0.28;
  const steps = 16;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = ox - halfW * 0.9 + width * 0.9 * t;
    const y = oy + Math.sin(t * Math.PI * 3 + fxTimeMs / 140) * amp * 0.55;
    if (i === 0) {
      g.moveTo(x, y);
    } else {
      g.lineTo(x, y);
    }
  }
  g.strokePath();
}

function drawReactor(
  g: Phaser.GameObjects.Graphics,
  visual: PaddleCosmeticVisual,
  ox: number,
  oy: number,
  halfW: number,
  halfH: number,
  width: number,
  height: number,
  fxTimeMs: number,
  wave: (periodMs: number) => number,
): void {
  const radius = Math.max(2, height * 0.28);
  g.fillStyle(visual.fill, 1);
  g.fillRoundedRect(ox - halfW, oy - halfH, width, height, radius);
  g.lineStyle(Math.max(1.5, height * visual.strokeWidthRatio), visual.stroke, 1);
  g.strokeRoundedRect(ox - halfW, oy - halfH, width, height, radius);

  g.fillStyle(visual.stroke, 0.35);
  g.fillRect(ox - halfW * 0.92, oy - halfH * 0.2, width * 0.18, Math.max(2, height * 0.4));
  g.fillRect(ox + halfW * 0.74, oy - halfH * 0.2, width * 0.18, Math.max(2, height * 0.4));

  const coreR = height * (0.5 + 0.12 * wave(140));
  g.fillStyle(visual.motifColor, 0.18 + 0.16 * wave(140));
  g.fillCircle(ox, oy, coreR * 1.95);
  g.fillStyle(visual.motifColor, 0.95);
  g.fillCircle(ox, oy, coreR);
  g.fillStyle(0xffffff, 0.5 + 0.35 * wave(90));
  g.fillCircle(ox - coreR * 0.18, oy - coreR * 0.18, coreR * 0.28);

  const spin = fxTimeMs / 180;
  const spokeR = coreR * 1.55;
  g.lineStyle(Math.max(1.4, height * 0.12), visual.motifColor, 0.85);
  for (let i = 0; i < 4; i++) {
    const angle = spin + (i * Math.PI) / 2;
    g.lineBetween(
      ox + Math.cos(angle) * coreR * 0.35,
      oy + Math.sin(angle) * coreR * 0.35,
      ox + Math.cos(angle) * spokeR,
      oy + Math.sin(angle) * spokeR,
    );
  }

  g.lineStyle(Math.max(1.2, height * 0.1), visual.motifColor, 0.45 + 0.4 * wave(160));
  g.strokeCircle(ox, oy, coreR * 1.7);
}

function drawCrystal(
  g: Phaser.GameObjects.Graphics,
  visual: PaddleCosmeticVisual,
  ox: number,
  oy: number,
  halfW: number,
  halfH: number,
  _width: number,
  height: number,
  fxTimeMs: number,
  wave: (periodMs: number) => number,
): void {
  g.fillStyle(visual.fill, 0.95);
  g.beginPath();
  g.moveTo(ox - halfW * 0.92, oy);
  g.lineTo(ox - halfW * 0.55, oy - halfH * 1.15);
  g.lineTo(ox + halfW * 0.55, oy - halfH * 1.15);
  g.lineTo(ox + halfW * 0.92, oy);
  g.lineTo(ox + halfW * 0.55, oy + halfH * 1.05);
  g.lineTo(ox - halfW * 0.55, oy + halfH * 1.05);
  g.closePath();
  g.fillPath();
  g.lineStyle(Math.max(1.5, height * visual.strokeWidthRatio), visual.stroke, 1);
  g.strokePath();

  g.fillStyle(visual.motifColor, 0.45 + 0.4 * wave(220));
  g.fillTriangle(ox, oy - halfH * 0.95, ox - halfW * 0.22, oy + halfH * 0.15, ox + halfW * 0.22, oy + halfH * 0.15);
  g.fillStyle(visual.motifColor, 0.7 + 0.25 * wave(180));
  g.fillTriangle(ox - halfW * 0.62, oy, ox - halfW * 0.22, oy - halfH * 0.7, ox - halfW * 0.12, oy + halfH * 0.7);
  g.fillTriangle(ox + halfW * 0.62, oy, ox + halfW * 0.22, oy - halfH * 0.7, ox + halfW * 0.12, oy + halfH * 0.7);

  const hx = ox + Math.sin(fxTimeMs / 380) * halfW * 0.55;
  g.fillStyle(0xffffff, 0.12 + 0.28 * wave(140));
  g.fillRect(hx - 2, oy - halfH * 1.05, 4, height * 1.1);
}

function drawRobot(
  g: Phaser.GameObjects.Graphics,
  visual: PaddleCosmeticVisual,
  ox: number,
  oy: number,
  halfW: number,
  halfH: number,
  width: number,
  height: number,
  fxTimeMs: number,
  wave: (periodMs: number) => number,
): void {
  const radius = Math.max(1, height * 0.12);
  g.fillStyle(visual.fill, 1);
  g.fillRoundedRect(ox - halfW * 0.72, oy - halfH * 0.85, width * 0.72, height * 0.85, radius);
  g.lineStyle(Math.max(1.5, height * visual.strokeWidthRatio), visual.stroke, 1);
  g.strokeRoundedRect(ox - halfW * 0.72, oy - halfH * 0.85, width * 0.72, height * 0.85, radius);

  const piston = Math.sin(fxTimeMs / 180);
  const leftExt = height * (0.55 + 0.95 * (0.5 + 0.5 * piston));
  const rightExt = height * (0.55 + 0.95 * (0.5 + 0.5 * -piston));
  const armW = width * 0.1;
  const housingW = armW * 1.55;

  // Side housings
  g.fillStyle(visual.stroke, 1);
  g.fillRoundedRect(ox - halfW * 0.98, oy - height * 0.42, housingW, height * 0.84, 2);
  g.fillRoundedRect(ox + halfW * 0.98 - housingW, oy - height * 0.42, housingW, height * 0.84, 2);

  // Moving piston rods + caps
  g.fillStyle(visual.motifColor, 1);
  g.fillRect(ox - halfW * 0.94, oy - leftExt / 2, armW * 0.55, leftExt);
  g.fillRect(ox + halfW * 0.94 - armW * 0.55, oy - rightExt / 2, armW * 0.55, rightExt);
  g.fillStyle(0xf8ead4, 1);
  g.fillRect(ox - halfW * 1.08, oy - leftExt / 2 - 2, housingW, Math.max(4, height * 0.28));
  g.fillRect(ox + halfW * 1.08 - housingW, oy - rightExt / 2 - 2, housingW, Math.max(4, height * 0.28));

  g.fillStyle(visual.motifColor, 0.95);
  const plateW = width * 0.16;
  const plateH = Math.max(2, height * 0.55);
  g.fillRect(ox - plateW * 1.15, oy - plateH / 2, plateW, plateH);
  g.fillRect(ox + plateW * 0.15, oy - plateH / 2, plateW, plateH);

  g.fillStyle(0xf8ead4, 0.35 + 0.4 * wave(320));
  g.fillCircle(ox - halfW * 0.28, oy, Math.max(1.5, height * 0.16));
  g.fillCircle(ox + halfW * 0.28, oy, Math.max(1.5, height * 0.16));
}

function drawPulse(
  g: Phaser.GameObjects.Graphics,
  visual: PaddleCosmeticVisual,
  ox: number,
  oy: number,
  halfW: number,
  halfH: number,
  width: number,
  height: number,
  fxTimeMs: number,
  wave: (periodMs: number) => number,
): void {
  const radius = Math.max(2, height * 0.45);
  g.fillStyle(visual.fill, 1);
  g.fillRoundedRect(ox - halfW, oy - halfH, width, height, radius);
  g.lineStyle(Math.max(1.6, height * visual.strokeWidthRatio), visual.stroke, 1);
  g.strokeRoundedRect(ox - halfW, oy - halfH, width, height, radius);

  g.fillStyle(0x020617, 0.88);
  g.fillRoundedRect(ox - halfW * 0.9, oy - halfH * 0.42, width * 0.9, height * 0.42, radius * 0.5);

  const channelW = width * 0.9;
  const channelX = ox - halfW * 0.9;
  for (let i = 0; i < 3; i++) {
    const travel = ((fxTimeMs / 280 + i / 3) % 1);
    const bandW = width * 0.18;
    const bandX = channelX + travel * (channelW - bandW);
    const alpha = 0.45 + 0.5 * wave(120 + i * 40);
    g.fillStyle(visual.motifColor, alpha);
    g.fillRoundedRect(bandX, oy - halfH * 0.34, bandW, height * 0.28, height * 0.16);
  }

  g.fillStyle(0xffffff, 0.35 + 0.4 * wave(90));
  const spark = ((fxTimeMs / 160) % 1);
  g.fillCircle(channelX + spark * channelW, oy, Math.max(1.5, height * 0.12));

  const beat = wave(180);
  g.lineStyle(Math.max(1.2, height * 0.1), visual.motifColor, 0.2 + 0.45 * beat);
  g.strokeCircle(ox, oy, height * (0.7 + 0.55 * beat));
}

function drawObsidian(
  g: Phaser.GameObjects.Graphics,
  visual: PaddleCosmeticVisual,
  ox: number,
  oy: number,
  halfW: number,
  halfH: number,
  width: number,
  height: number,
  wave: (periodMs: number) => number,
): void {
  g.fillStyle(0x2e1065, 0.12 + 0.18 * wave(260));
  g.fillRoundedRect(ox - halfW - 8, oy - halfH - 8, width + 16, height + 16, Math.max(3, height * 0.45));

  g.fillStyle(visual.fill, 1);
  g.beginPath();
  g.moveTo(ox - halfW * 0.98, oy + halfH * 0.2);
  g.lineTo(ox - halfW * 0.7, oy - halfH * 1.15);
  g.lineTo(ox - halfW * 0.15, oy - halfH * 0.55);
  g.lineTo(ox + halfW * 0.2, oy - halfH * 1.2);
  g.lineTo(ox + halfW * 0.95, oy - halfH * 0.15);
  g.lineTo(ox + halfW * 0.72, oy + halfH * 1.05);
  g.lineTo(ox - halfW * 0.35, oy + halfH * 0.85);
  g.closePath();
  g.fillPath();
  g.lineStyle(Math.max(1.6, height * visual.strokeWidthRatio), visual.stroke, 1);
  g.strokePath();

  g.fillStyle(visual.motifColor, 0.85 + 0.12 * wave(260));
  g.fillTriangle(ox - halfW * 0.08, oy - halfH * 0.9, ox + halfW * 0.55, oy, ox - halfW * 0.08, oy + halfH * 0.85);
  g.fillStyle(visual.motifColor, 0.4 + 0.25 * wave(200));
  g.fillTriangle(ox - halfW * 0.72, oy - halfH * 0.15, ox - halfW * 0.28, oy + halfH * 0.7, ox - halfW * 0.82, oy + halfH * 0.55);
}
