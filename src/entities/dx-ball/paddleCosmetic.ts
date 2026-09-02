import Phaser from 'phaser';

/**
 * entities/dx-ball/paddleCosmetic.ts
 *
 * Shared paddle-body drawing for gameplay and Garage preview.
 * Collision still lives on `Paddle`'s rectangle; this only paints a
 * distinctive silhouette per motif.
 *
 * DXB-27: Robot / Alien / Reactor / Pulse are motion-first identities.
 * A still screenshot of gameplay should reveal which paddle is equipped
 * because pistons, signal waves, an orbiting core, or a traveling energy
 * slug dominate the silhouette — not fill color or glow.
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
  _width: number,
  height: number,
  fxTimeMs: number,
  wave: (periodMs: number) => number,
): void {
  // Living hull: the top and bottom edges undulate so the body is organic,
  // not a recolored bar.
  const breathe = 0.55 + 0.45 * wave(220);
  g.fillStyle(visual.motifColor, 0.12 + 0.1 * breathe);
  g.beginPath();
  traceOrganicHull(g, ox, oy, halfW * 1.12, halfH * 1.55, fxTimeMs / 160, 1.15);
  g.closePath();
  g.fillPath();

  g.fillStyle(visual.fill, 1);
  g.beginPath();
  traceOrganicHull(g, ox, oy, halfW, halfH, fxTimeMs / 140, 1);
  g.closePath();
  g.fillPath();
  g.lineStyle(Math.max(1.6, height * 0.14), visual.stroke, 1);
  g.beginPath();
  traceOrganicHull(g, ox, oy, halfW, halfH, fxTimeMs / 140, 1);
  g.closePath();
  g.strokePath();

  // Antennae sway independently of the hull.
  const sway = Math.sin(fxTimeMs / 160);
  drawAlienAntenna(g, visual, ox - halfW * 0.62, oy - halfH, -0.55 - sway * 0.35, height);
  drawAlienAntenna(g, visual, ox + halfW * 0.62, oy - halfH, 0.55 + sway * 0.35, height);

  // Upward signal waves are the identity: expanding arcs that leave the hull
  // and travel well above the paddle so a screenshot still reads as Alien.
  const waveCount = 4;
  for (let i = 0; i < waveCount; i++) {
    const phase = (fxTimeMs / 260 + i / waveCount) % 1;
    const lift = height * (0.4 + phase * 3.4);
    const spread = halfW * (0.35 + phase * 0.95);
    const alpha = (1 - phase) * (0.55 + 0.4 * breathe);
    g.lineStyle(Math.max(2, height * (0.16 - phase * 0.06)), visual.motifColor, alpha);
    g.beginPath();
    g.arc(ox, oy - halfH - lift * 0.15, spread, Math.PI * 1.08, Math.PI * 1.92, false);
    g.strokePath();
    g.lineStyle(Math.max(1.2, height * 0.08), 0xffffff, alpha * 0.45);
    g.beginPath();
    g.arc(ox, oy - halfH - lift * 0.15, spread * 0.82, Math.PI * 1.18, Math.PI * 1.82, false);
    g.strokePath();
  }

  g.fillStyle(visual.motifColor, 0.45 + 0.5 * wave(150));
  g.fillCircle(ox - halfW * 0.28, oy - halfH * 0.1, Math.max(2, height * 0.22));
  g.fillCircle(ox + halfW * 0.28, oy - halfH * 0.1, Math.max(2, height * 0.22));
  g.fillStyle(0xffffff, 0.55 + 0.4 * wave(120));
  g.fillCircle(ox - halfW * 0.28, oy - halfH * 0.18, Math.max(1, height * 0.08));
  g.fillCircle(ox + halfW * 0.28, oy - halfH * 0.18, Math.max(1, height * 0.08));
}

function traceOrganicHull(
  g: Phaser.GameObjects.Graphics,
  ox: number,
  oy: number,
  halfW: number,
  halfH: number,
  phase: number,
  amp: number,
): void {
  const steps = 18;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = ox - halfW + halfW * 2 * t;
    const bulge = Math.sin(t * Math.PI) * halfH * 0.35 * amp;
    const rip = Math.sin(t * Math.PI * 3 + phase) * halfH * 0.45 * amp;
    const y = oy - halfH - bulge - rip;
    if (i === 0) {
      g.moveTo(x, y);
    } else {
      g.lineTo(x, y);
    }
  }
  for (let i = steps; i >= 0; i--) {
    const t = i / steps;
    const x = ox - halfW + halfW * 2 * t;
    const bulge = Math.sin(t * Math.PI) * halfH * 0.2 * amp;
    const rip = Math.sin(t * Math.PI * 3 + phase + 0.8) * halfH * 0.28 * amp;
    g.lineTo(x, oy + halfH + bulge + rip);
  }
}

function drawAlienAntenna(
  g: Phaser.GameObjects.Graphics,
  visual: PaddleCosmeticVisual,
  x: number,
  y: number,
  tilt: number,
  height: number,
): void {
  const len = height * 1.65;
  const tipX = x + Math.sin(tilt) * len;
  const tipY = y - Math.cos(tilt) * len;
  g.lineStyle(Math.max(2, height * 0.14), visual.stroke, 1);
  g.lineBetween(x, y, tipX, tipY);
  g.fillStyle(visual.motifColor, 1);
  g.fillCircle(tipX, tipY, Math.max(2.4, height * 0.28));
  g.fillStyle(0xffffff, 0.7);
  g.fillCircle(tipX, tipY, Math.max(1, height * 0.12));
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
  const radius = Math.max(2, height * 0.22);
  g.fillStyle(visual.fill, 1);
  g.fillRoundedRect(ox - halfW, oy - halfH, width, height, radius);
  g.lineStyle(Math.max(1.6, height * visual.strokeWidthRatio), visual.stroke, 1);
  g.strokeRoundedRect(ox - halfW, oy - halfH, width, height, radius);

  g.fillStyle(visual.stroke, 0.85);
  g.fillRect(ox - halfW * 0.96, oy - halfH * 0.55, width * 0.16, height * 1.1);
  g.fillRect(ox + halfW * 0.8, oy - halfH * 0.55, width * 0.16, height * 1.1);

  const coreR = height * (0.82 + 0.12 * wave(110));
  const spin = fxTimeMs / 110;

  g.fillStyle(visual.motifColor, 0.16 + 0.14 * wave(110));
  g.fillCircle(ox, oy, coreR * 2.15);

  // Orbiting energy beads — the motion that identifies Reactor in a still.
  for (let i = 0; i < 3; i++) {
    const angle = spin + (i * Math.PI * 2) / 3;
    const orbit = coreR * 1.85;
    const bx = ox + Math.cos(angle) * orbit;
    const by = oy + Math.sin(angle) * orbit;
    g.fillStyle(visual.motifColor, 0.95);
    g.fillCircle(bx, by, Math.max(2.2, height * 0.22));
    g.fillStyle(0xffffff, 0.75);
    g.fillCircle(bx - 1, by - 1, Math.max(1, height * 0.08));
    g.lineStyle(Math.max(1.2, height * 0.08), visual.motifColor, 0.55);
    g.lineBetween(ox, oy, bx, by);
  }

  g.fillStyle(visual.motifColor, 1);
  g.fillCircle(ox, oy, coreR);
  g.fillStyle(visual.fill, 0.55);
  g.fillCircle(ox, oy, coreR * 0.62);

  for (let i = 0; i < 6; i++) {
    const angle = spin * 1.4 + (i * Math.PI) / 3;
    const inner = coreR * 0.18;
    const outer = coreR * 0.58;
    g.fillStyle(0xffffff, 0.55 + 0.35 * wave(80));
    g.beginPath();
    g.moveTo(ox + Math.cos(angle) * inner, oy + Math.sin(angle) * inner);
    g.lineTo(ox + Math.cos(angle + 0.28) * outer, oy + Math.sin(angle + 0.28) * outer);
    g.lineTo(ox + Math.cos(angle - 0.28) * outer, oy + Math.sin(angle - 0.28) * outer);
    g.closePath();
    g.fillPath();
  }

  g.fillStyle(0xffffff, 0.7 + 0.25 * wave(70));
  g.fillCircle(ox, oy, coreR * 0.22);
  g.lineStyle(Math.max(2, height * 0.12), visual.stroke, 1);
  g.strokeCircle(ox, oy, coreR);
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
  g.fillRoundedRect(ox - halfW * 0.7, oy - halfH, width * 0.7, height, radius);
  g.lineStyle(Math.max(1.6, height * visual.strokeWidthRatio), visual.stroke, 1);
  g.strokeRoundedRect(ox - halfW * 0.7, oy - halfH, width * 0.7, height, radius);

  g.fillStyle(visual.motifColor, 0.95);
  const plateW = width * 0.14;
  g.fillRect(ox - plateW * 1.2, oy - halfH * 0.7, plateW, height * 0.7);
  g.fillRect(ox + plateW * 0.2, oy - halfH * 0.7, plateW, height * 0.7);

  // Three vertical pistons. Left and right pump in opposite phase; the
  // center rod lags. Travel is several paddle-heights so the motion is
  // the silhouette, not a tint.
  const pump = Math.sin(fxTimeMs / 130);
  drawPistonStack(g, visual, ox - halfW * 0.92, oy, height, width, pump);
  drawPistonStack(g, visual, ox + halfW * 0.92, oy, height, width, -pump);
  drawPistonStack(g, visual, ox, oy, height * 0.82, width * 0.72, Math.sin(fxTimeMs / 130 + 1.1));

  g.fillStyle(0xf8ead4, 0.45 + 0.5 * wave(180));
  g.fillCircle(ox - halfW * 0.22, oy, Math.max(2, height * 0.18));
  g.fillCircle(ox + halfW * 0.22, oy, Math.max(2, height * 0.18));
}

function drawPistonStack(
  g: Phaser.GameObjects.Graphics,
  visual: PaddleCosmeticVisual,
  x: number,
  oy: number,
  height: number,
  width: number,
  pump: number,
): void {
  const housingW = Math.max(6, width * 0.11);
  const housingH = height * 1.15;
  const travel = height * (0.85 + 1.55 * (0.5 + 0.5 * pump));
  const rodW = housingW * 0.42;
  const capH = Math.max(5, height * 0.38);
  const capY = oy - travel;

  g.fillStyle(visual.stroke, 1);
  g.fillRoundedRect(x - housingW / 2, oy - housingH / 2, housingW, housingH, 2);
  g.fillStyle(0x1b1510, 0.55);
  g.fillRect(x - rodW * 0.7, oy - housingH / 2 + 2, rodW * 1.4, housingH - 4);

  g.fillStyle(visual.motifColor, 1);
  g.fillRect(x - rodW / 2, capY, rodW, travel + housingH * 0.2);
  g.fillStyle(0xf8ead4, 1);
  g.fillRoundedRect(x - housingW * 0.7, capY - capH * 0.35, housingW * 1.4, capH, 2);
  g.fillStyle(visual.stroke, 1);
  g.fillRect(x - housingW * 0.55, capY - capH * 0.08, housingW * 1.1, Math.max(2, capH * 0.22));

  if (pump > 0.65) {
    g.fillStyle(0xf8ead4, 0.28 + (pump - 0.65) * 0.8);
    g.fillCircle(x, capY - capH * 0.7, housingW * 0.55);
  }
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
  g.lineStyle(Math.max(1.8, height * visual.strokeWidthRatio), visual.stroke, 1);
  g.strokeRoundedRect(ox - halfW, oy - halfH, width, height, radius);

  const channelW = width * 0.9;
  const channelH = height * 0.58;
  const channelX = ox - halfW * 0.9;
  const channelY = oy - channelH / 2;
  g.fillStyle(0x020617, 0.95);
  g.fillRoundedRect(channelX, channelY, channelW, channelH, radius * 0.5);

  const travel = (fxTimeMs / 520) % 1;
  const slugW = width * 0.28;
  const slugX = channelX + travel * (channelW - slugW);

  // Trail so direction is obvious even in a still frame.
  for (let i = 4; i >= 1; i--) {
    const back = travel - i * 0.07;
    if (back < 0) {
      continue;
    }
    const tx = channelX + back * (channelW - slugW);
    g.fillStyle(visual.motifColor, 0.12 * (5 - i));
    g.fillRoundedRect(tx, channelY + channelH * 0.18, slugW * (0.7 + i * 0.05), channelH * 0.64, height * 0.2);
  }

  g.fillStyle(visual.motifColor, 1);
  g.fillRoundedRect(slugX, channelY + channelH * 0.08, slugW, channelH * 0.84, height * 0.28);
  g.fillStyle(0xffffff, 0.55 + 0.4 * wave(80));
  g.fillRoundedRect(slugX + slugW * 0.18, channelY + channelH * 0.22, slugW * 0.45, channelH * 0.38, height * 0.16);

  const atEnd = travel > 0.92 || travel < 0.08;
  g.fillStyle(visual.motifColor, atEnd ? 0.95 : 0.35);
  g.fillCircle(channelX, oy, Math.max(3, height * 0.28));
  g.fillCircle(channelX + channelW, oy, Math.max(3, height * 0.28));
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
