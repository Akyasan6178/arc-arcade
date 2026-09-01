import Phaser from 'phaser';

/**
 * entities/dx-ball/paddleCosmetic.ts
 *
 * DXB-23: Shared paddle-body drawing for gameplay and Garage preview.
 * Collision still lives on `Paddle`'s rectangle; this only paints a
 * distinctive silhouette per motif so skins are identifiable at a
 * glance (moving robot pistons, alien waves, reactor core, pulse slug).
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
      drawReactor(g, visual, originX, originY, halfW, halfH, width, height, wave);
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

  g.lineStyle(Math.max(1.4, height * 0.12), visual.motifColor, 0.85);
  g.beginPath();
  const amp = height * 0.42;
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

  g.lineStyle(Math.max(1.2, height * 0.1), visual.stroke, 0.55 + 0.35 * wave(160));
  g.beginPath();
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = ox - halfW * 0.9 + width * 0.9 * t;
    const y = oy - Math.sin(t * Math.PI * 2.4 + fxTimeMs / 180 + 1.2) * amp * 0.4;
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

  const coreR = height * (0.55 + 0.22 * wave(140));
  g.fillStyle(visual.motifColor, 0.22 + 0.2 * wave(140));
  g.fillCircle(ox, oy, coreR * 1.85);
  g.fillStyle(visual.motifColor, 0.95);
  g.fillCircle(ox, oy, coreR);
  g.fillStyle(0xffffff, 0.55 + 0.35 * wave(90));
  g.fillCircle(ox - coreR * 0.18, oy - coreR * 0.18, coreR * 0.32);

  const ring = coreR * (1.45 + 0.25 * wave(160));
  g.lineStyle(Math.max(1.2, height * 0.1), visual.motifColor, 0.4 + 0.45 * wave(160));
  g.strokeCircle(ox, oy, ring);
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
  g.fillRoundedRect(ox - halfW * 0.78, oy - halfH * 0.85, width * 0.78, height * 0.85, radius);
  g.lineStyle(Math.max(1.5, height * visual.strokeWidthRatio), visual.stroke, 1);
  g.strokeRoundedRect(ox - halfW * 0.78, oy - halfH * 0.85, width * 0.78, height * 0.85, radius);

  const piston = Math.sin(fxTimeMs / 220);
  const leftExt = height * (0.15 + 0.55 * (0.5 + 0.5 * piston));
  const rightExt = height * (0.15 + 0.55 * (0.5 + 0.5 * -piston));
  const armW = width * 0.12;

  g.fillStyle(visual.motifColor, 1);
  g.fillRect(ox - halfW * 0.98, oy - leftExt / 2, armW, leftExt);
  g.fillRect(ox + halfW * 0.98 - armW, oy - rightExt / 2, armW, rightExt);
  g.fillStyle(visual.stroke, 1);
  g.fillRect(ox - halfW * 1.02, oy - leftExt / 2 - 2, armW + 4, Math.max(3, height * 0.22));
  g.fillRect(ox + halfW * 0.96 - armW, oy - rightExt / 2 - 2, armW + 4, Math.max(3, height * 0.22));

  g.fillStyle(visual.motifColor, 0.95);
  const plateW = width * 0.16;
  const plateH = Math.max(2, height * 0.55);
  g.fillRect(ox - plateW * 1.15, oy - plateH / 2, plateW, plateH);
  g.fillRect(ox + plateW * 0.15, oy - plateH / 2, plateW, plateH);

  g.fillStyle(0xf8ead4, 0.35 + 0.4 * wave(320));
  g.fillCircle(ox - halfW * 0.35, oy, Math.max(1.5, height * 0.16));
  g.fillCircle(ox + halfW * 0.35, oy, Math.max(1.5, height * 0.16));
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

  g.fillStyle(0x020617, 0.85);
  g.fillRoundedRect(ox - halfW * 0.88, oy - halfH * 0.38, width * 0.88, height * 0.38, radius * 0.5);

  const travel = (Math.sin(fxTimeMs / 260) + 1) / 2;
  const slugW = width * 0.22;
  const slugX = ox - halfW * 0.78 + travel * (width * 0.78 - slugW);
  g.fillStyle(visual.motifColor, 0.95);
  g.fillRoundedRect(slugX, oy - halfH * 0.32, slugW, height * 0.32, height * 0.2);
  g.fillStyle(0xffffff, 0.45 + 0.4 * wave(120));
  g.fillRoundedRect(slugX + slugW * 0.15, oy - halfH * 0.18, slugW * 0.4, height * 0.12, 2);

  const beat = wave(180);
  g.lineStyle(Math.max(1.2, height * 0.1), visual.motifColor, 0.25 + 0.5 * beat);
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
