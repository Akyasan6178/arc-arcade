import Phaser from 'phaser';
import { drawPaddleCosmetic, type PaddleCosmeticVisual } from '@entities/dx-ball/paddleCosmetic';
import { drawPowerupIcon, type PowerupType } from '@entities/dx-ball/Powerup';
import { getPaddleSkinVisual } from '@entities/dx-ball/Skins';
import type { PaddleSkinId } from '@entities/dx-ball/Progress';

/**
 * ui/TutorialStage.ts
 *
 * DXB-27: Full-width live how-to stage. Each page is a looping miniature
 * gameplay showcase. Reading is a short caption only — the demonstration
 * is the lesson. Not a gameplay system.
 */

export type TutorialPageId = 'controls' | 'bricks' | 'powerups' | 'modes' | 'progression';

export interface TutorialStageColors {
  color: string;
  highlightColor: string;
  mutedColor: string;
  panel: number;
  panelStroke: number;
  accent: number;
}

const HUD_FONT_FAMILY = 'Trebuchet MS, Segoe UI, sans-serif';
const HUD_DEPTH = 20;

const CLASSIC_PADDLE: PaddleCosmeticVisual = {
  fill: 0x2de2e6,
  stroke: 0xe0fbfc,
  strokeWidthRatio: 0.14,
  motif: 'flat',
  motifColor: 0xffffff,
};

const PAGE_CAPTION: Record<TutorialPageId, string> = {
  controls: 'Watch · move · launch · bounce',
  bricks: 'Watch each brick behave',
  powerups: 'Watch the catch and the effect',
  modes: 'Watch Classic · Time Attack · Endless',
  progression: 'Watch Garage · Unlocks · Achievements · Themes',
};

const BRICK_LANE_LABELS = ['NORMAL', 'CRACKED', 'METAL', 'BONUS'] as const;
const MODE_LABELS = ['CLASSIC', 'TIME ATTACK', 'ENDLESS'] as const;
const PROGRESS_LABELS = ['GARAGE', 'UNLOCKS', 'ACHIEVEMENTS', 'THEMES'] as const;
const PROGRESS_PADDLES: readonly PaddleSkinId[] = ['titan', 'neon', 'reactor', 'pulse'];

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface ControlsSim {
  paddleX: number;
  ballX: number;
  ballY: number;
  vx: number;
  vy: number;
  attached: boolean;
  attachMs: number;
}

interface PowerupSim {
  phase: number;
  capsuleY: number;
  caught: boolean;
  effectMs: number;
}

export class TutorialStage {
  private readonly colors: TutorialStageColors;
  private readonly chrome: Phaser.GameObjects.Graphics;
  private readonly demo: Phaser.GameObjects.Graphics;
  private readonly caption: Phaser.GameObjects.Text;
  private readonly labels: Phaser.GameObjects.Text[];
  private page: TutorialPageId = 'controls';
  private viewportWidth = 0;
  private viewportHeight = 0;
  private originY = 0;
  private bottomY = 0;
  private destroyed = false;
  private timeMs = 0;
  private controls: ControlsSim;
  private powerup: PowerupSim;

  constructor(
    scene: Phaser.Scene,
    viewportWidth: number,
    viewportHeight: number,
    originY: number,
    bottomY: number,
    colors: TutorialStageColors,
  ) {
    this.colors = colors;
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;
    this.originY = originY;
    this.bottomY = bottomY;
    this.chrome = scene.add.graphics().setDepth(HUD_DEPTH);
    this.demo = scene.add.graphics().setDepth(HUD_DEPTH + 1);
    this.caption = TutorialStage.makeLabel(scene, colors.highlightColor, true);
    this.labels = [0, 1, 2, 3].map(() => TutorialStage.makeLabel(scene, colors.mutedColor, false));
    this.controls = this.freshControls();
    this.powerup = this.freshPowerup();
    this.layout();
  }

  setPage(page: TutorialPageId): void {
    this.page = page;
    this.timeMs = 0;
    this.controls = this.freshControls();
    this.powerup = this.freshPowerup();
    this.caption.setText(PAGE_CAPTION[page]);
    this.layout();
    this.redrawDemo();
  }

  tick(deltaMs: number): void {
    if (this.destroyed) {
      return;
    }
    this.timeMs += deltaMs;
    if (this.page === 'controls') {
      this.stepControls(deltaMs);
    } else if (this.page === 'powerups') {
      this.stepPowerup(deltaMs);
    }
    this.redrawDemo();
  }

  resize(viewportWidth: number, viewportHeight: number, originY: number, bottomY: number): void {
    if (this.destroyed) {
      return;
    }
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;
    this.originY = originY;
    this.bottomY = bottomY;
    this.layout();
    this.redrawDemo();
  }

  destroy(): void {
    if (this.destroyed) {
      return;
    }
    this.destroyed = true;
    this.chrome.destroy();
    this.demo.destroy();
    this.caption.destroy();
    for (const label of this.labels) {
      label.destroy();
    }
  }

  private freshControls(): ControlsSim {
    const stage = this.stageRect();
    return {
      paddleX: stage.x + stage.w / 2,
      ballX: stage.x + stage.w / 2,
      ballY: stage.y + stage.h * 0.82,
      vx: 0,
      vy: 0,
      attached: true,
      attachMs: 650,
    };
  }

  private freshPowerup(): PowerupSim {
    return { phase: 0, capsuleY: 0, caught: false, effectMs: 0 };
  }

  private stageRect(): Rect {
    const side = this.viewportWidth * 0.035;
    return {
      x: side,
      y: this.originY,
      w: this.viewportWidth - side * 2,
      h: Math.max(160, this.bottomY - this.originY),
    };
  }

  private innerRect(): Rect {
    const stage = this.stageRect();
    const pad = Math.max(10, stage.h * 0.04);
    const captionH = Math.max(22, this.viewportHeight * 0.04);
    return {
      x: stage.x + pad,
      y: stage.y + pad,
      w: stage.w - pad * 2,
      h: stage.h - pad * 2 - captionH,
    };
  }

  private layout(): void {
    const stage = this.stageRect();
    const radius = Math.max(10, stage.h * 0.03);
    this.chrome.clear();
    this.chrome.fillStyle(this.colors.panel, 0.94);
    this.chrome.fillRoundedRect(stage.x, stage.y, stage.w, stage.h, radius);
    this.chrome.lineStyle(2.5, this.colors.accent, 1);
    this.chrome.strokeRoundedRect(stage.x, stage.y, stage.w, stage.h, radius);
    this.chrome.fillStyle(this.colors.accent, 1);
    this.chrome.fillRect(stage.x + stage.w * 0.34, stage.y, stage.w * 0.32, 3);

    const captionSize = Math.max(13, Math.round(this.viewportHeight * 0.022));
    this.caption.setFontSize(captionSize);
    this.caption.setPosition(stage.x + stage.w / 2, stage.y + stage.h - captionSize * 1.35);
    this.caption.setWordWrapWidth(stage.w * 0.92);

    this.placeLaneLabels();
  }

  private placeLaneLabels(): void {
    const inner = this.innerRect();
    const size = Math.max(10, Math.round(this.viewportHeight * 0.016));
    const names =
      this.page === 'bricks'
        ? BRICK_LANE_LABELS
        : this.page === 'modes'
          ? MODE_LABELS
          : this.page === 'progression'
            ? PROGRESS_LABELS
            : [];

    this.labels.forEach((label, index) => {
      const name = names[index];
      if (!name) {
        label.setVisible(false);
        return;
      }
      label.setVisible(true);
      label.setFontSize(size);
      label.setText(name);
      if (this.page === 'modes') {
        const lane = this.modeLane(inner, index);
        label.setPosition(lane.x + lane.w / 2, lane.y + 8);
        label.setWordWrapWidth(lane.w * 0.9);
      } else {
        const lane = this.fourLane(inner, index);
        label.setPosition(lane.x + lane.w / 2, lane.y + 6);
        label.setWordWrapWidth(lane.w * 0.92);
      }
    });
  }

  private redrawDemo(): void {
    this.demo.clear();
    const inner = this.innerRect();
    switch (this.page) {
      case 'controls':
        this.drawControls(inner);
        break;
      case 'bricks':
        this.drawBricks(inner);
        break;
      case 'powerups':
        this.drawPowerups(inner);
        break;
      case 'modes':
        this.drawModes(inner);
        break;
      case 'progression':
        this.drawProgression(inner);
        break;
    }
  }

  private stepControls(deltaMs: number): void {
    const inner = this.innerRect();
    const paddleW = inner.w * 0.28;
    const paddleH = Math.max(10, inner.h * 0.055);
    const paddleY = inner.y + inner.h * 0.88;
    const minX = inner.x + paddleW / 2;
    const maxX = inner.x + inner.w - paddleW / 2;
    const ballR = Math.max(6, paddleH * 0.72);
    const s = this.controls;

    const sweep = 0.5 + 0.5 * Math.sin(this.timeMs / 680);
    s.paddleX = minX + sweep * (maxX - minX);

    if (s.attached) {
      s.ballX = s.paddleX;
      s.ballY = paddleY - paddleH / 2 - ballR - 2;
      s.attachMs -= deltaMs;
      if (s.attachMs <= 0) {
        s.attached = false;
        s.vx = (sweep - 0.5) * inner.w * 0.55;
        s.vy = -inner.h * 0.7;
      }
      return;
    }

    s.ballX += s.vx * (deltaMs / 1000);
    s.ballY += s.vy * (deltaMs / 1000);

    if (s.ballX - ballR < inner.x) {
      s.ballX = inner.x + ballR;
      s.vx = Math.abs(s.vx);
    } else if (s.ballX + ballR > inner.x + inner.w) {
      s.ballX = inner.x + inner.w - ballR;
      s.vx = -Math.abs(s.vx);
    }
    if (s.ballY - ballR < inner.y) {
      s.ballY = inner.y + ballR;
      s.vy = Math.abs(s.vy);
    }

    const halfW = paddleW / 2;
    const halfH = paddleH / 2;
    if (
      s.vy > 0 &&
      s.ballY + ballR >= paddleY - halfH &&
      s.ballY < paddleY + halfH &&
      Math.abs(s.ballX - s.paddleX) < halfW + ballR
    ) {
      s.vy = -Math.abs(s.vy);
      const offset = (s.ballX - s.paddleX) / halfW;
      s.vx = offset * inner.w * 0.4;
      s.ballY = paddleY - halfH - ballR;
    }

    if (s.ballY - ballR > inner.y + inner.h) {
      s.attached = true;
      s.attachMs = 700;
    }
  }

  private drawControls(inner: Rect): void {
    const g = this.demo;
    const paddleW = inner.w * 0.28;
    const paddleH = Math.max(10, inner.h * 0.055);
    const paddleY = inner.y + inner.h * 0.88;
    const ballR = Math.max(6, paddleH * 0.72);
    const s = this.controls;

    g.lineStyle(2, this.colors.panelStroke, 0.55);
    g.strokeRect(inner.x, inner.y, inner.w, inner.h);

    drawPaddleCosmetic(g, CLASSIC_PADDLE, paddleW, paddleH, this.timeMs, s.paddleX, paddleY);
    g.fillStyle(0xffe66d, 1);
    g.fillCircle(s.ballX, s.ballY, ballR);
    g.fillStyle(0xffffff, 0.4);
    g.fillCircle(s.ballX - ballR * 0.25, s.ballY - ballR * 0.25, ballR * 0.28);

    if (s.attached) {
      g.lineStyle(2, 0xffffff, 0.45);
      g.lineBetween(s.paddleX, paddleY - paddleH, s.ballX, s.ballY);
    }
  }

  private drawBricks(inner: Rect): void {
    for (let i = 0; i < 4; i++) {
      this.drawBrickLane(this.fourLane(inner, i), i);
    }
  }

  private drawBrickLane(lane: Rect, index: number): void {
    const g = this.demo;
    const play = inset(lane, 8, 26);
    g.fillStyle(0x0b1320, 0.55);
    g.fillRoundedRect(lane.x, lane.y, lane.w, lane.h, 8);
    g.lineStyle(1.5, this.colors.panelStroke, 0.7);
    g.strokeRoundedRect(lane.x, lane.y, lane.w, lane.h, 8);

    const bw = play.w * 0.78;
    const bh = Math.max(16, play.h * 0.18);
    const bx = play.x + (play.w - bw) / 2;
    const by = play.y + play.h * 0.12;
    const paddleW = play.w * 0.62;
    const paddleH = Math.max(8, play.h * 0.08);
    const paddleY = play.y + play.h * 0.88;
    const paddleX = play.x + play.w / 2;
    const ballR = Math.max(5, paddleH * 0.7);

    if (index === 0) {
      this.drawNormalLane(play, bx, by, bw, bh, paddleX, paddleY, paddleW, paddleH, ballR);
    } else if (index === 1) {
      this.drawCrackedLane(play, bx, by, bw, bh, paddleX, paddleY, paddleW, paddleH, ballR);
    } else if (index === 2) {
      this.drawMetalLane(play, bx, by, bw, bh, paddleX, paddleY, paddleW, paddleH, ballR);
    } else {
      this.drawBonusLane(play, bx, by, bw, bh, paddleX, paddleY, paddleW, paddleH, ballR);
    }
  }

  private drawNormalLane(
    play: Rect,
    bx: number,
    by: number,
    bw: number,
    bh: number,
    paddleX: number,
    paddleY: number,
    paddleW: number,
    paddleH: number,
    ballR: number,
  ): void {
    const cycle = 2400;
    const t = (this.timeMs % cycle) / cycle;
    const hit = 0.42;
    const ball = flyBall(play, paddleY, by + bh, ballR, t, hit);
    if (t < hit) {
      drawNormalBrick(this.demo, bx, by, bw, bh, 0xe63946);
    } else {
      drawBurst(this.demo, bx + bw / 2, by + bh / 2, (t - hit) / 0.25, 0xe63946);
    }
    drawPaddleCosmetic(this.demo, CLASSIC_PADDLE, paddleW, paddleH, this.timeMs, paddleX, paddleY);
    drawBall(this.demo, ball.x, ball.y, ballR);
  }

  private drawCrackedLane(
    play: Rect,
    bx: number,
    by: number,
    bw: number,
    bh: number,
    paddleX: number,
    paddleY: number,
    paddleW: number,
    paddleH: number,
    ballR: number,
  ): void {
    const cycle = 3400;
    const t = (this.timeMs % cycle) / cycle;
    const first = 0.28;
    const second = 0.62;
    let ball: { x: number; y: number };
    if (t < first) {
      ball = flyBall(play, paddleY, by + bh, ballR, t / first, 1);
      drawCrackedBrick(this.demo, bx, by, bw, bh, false);
    } else if (t < second) {
      const local = (t - first) / (second - first);
      ball = bounceBack(play, paddleY, by + bh, ballR, local);
      drawCrackedBrick(this.demo, bx, by, bw, bh, true);
    } else {
      ball = { x: play.x + play.w / 2, y: paddleY - paddleH };
      drawBurst(this.demo, bx + bw / 2, by + bh / 2, (t - second) / 0.22, 0xf9c74f);
    }
    drawPaddleCosmetic(this.demo, CLASSIC_PADDLE, paddleW, paddleH, this.timeMs, paddleX, paddleY);
    drawBall(this.demo, ball.x, ball.y, ballR);
  }

  private drawMetalLane(
    play: Rect,
    bx: number,
    by: number,
    bw: number,
    bh: number,
    paddleX: number,
    paddleY: number,
    paddleW: number,
    paddleH: number,
    ballR: number,
  ): void {
    const cycle = 1600;
    const t = (this.timeMs % cycle) / cycle;
    const ball = bounceBack(play, paddleY, by + bh, ballR, t);
    drawMetalBrick(this.demo, bx, by, bw, bh);
    if (t > 0.45 && t < 0.62) {
      drawBurst(this.demo, bx + bw / 2, by + bh, (t - 0.45) / 0.17, 0xdfe3e8);
    }
    drawPaddleCosmetic(this.demo, CLASSIC_PADDLE, paddleW, paddleH, this.timeMs, paddleX, paddleY);
    drawBall(this.demo, ball.x, ball.y, ballR);
  }

  private drawBonusLane(
    play: Rect,
    bx: number,
    by: number,
    bw: number,
    bh: number,
    paddleX: number,
    paddleY: number,
    paddleW: number,
    paddleH: number,
    ballR: number,
  ): void {
    const cycle = 3600;
    const t = (this.timeMs % cycle) / cycle;
    const hit = 0.32;
    const catchT = 0.72;
    const ball = t < hit ? flyBall(play, paddleY, by + bh, ballR, t / hit, 1) : { x: paddleX, y: paddleY - paddleH };
    if (t < hit) {
      drawBonusBrick(this.demo, bx, by, bw, bh);
    } else {
      drawBurst(this.demo, bx + bw / 2, by + bh / 2, Math.min(1, (t - hit) / 0.18), 0xffe66d);
    }
    if (t >= hit && t < catchT) {
      const fall = (t - hit) / (catchT - hit);
      const capY = by + bh + fall * (paddleY - paddleH * 2 - (by + bh));
      drawCapsule(this.demo, play.x + play.w / 2, capY, Math.min(28, play.w * 0.28), 'widen-paddle');
    }
    if (t >= catchT && t < 0.88) {
      this.demo.fillStyle(0x4ade80, 0.28);
      this.demo.fillCircle(paddleX, paddleY, paddleW * 0.55);
    }
    drawPaddleCosmetic(this.demo, CLASSIC_PADDLE, paddleW, paddleH, this.timeMs, paddleX, paddleY);
    drawBall(this.demo, ball.x, ball.y, ballR);
  }

  private stepPowerup(deltaMs: number): void {
    const inner = this.innerRect();
    const cycle = 7800;
    const t = (this.timeMs % cycle) / cycle;
    const phase = t < 0.33 ? 0 : t < 0.66 ? 1 : 2;
    if (phase !== this.powerup.phase) {
      this.powerup.phase = phase;
      this.powerup.caught = false;
      this.powerup.effectMs = 0;
      this.powerup.capsuleY = inner.y + inner.h * 0.12;
    }
    const local = t < 0.33 ? t / 0.33 : t < 0.66 ? (t - 0.33) / 0.33 : (t - 0.66) / 0.34;
    const paddleY = inner.y + inner.h * 0.86;
    if (local < 0.55) {
      this.powerup.caught = false;
      this.powerup.capsuleY = inner.y + inner.h * 0.12 + local / 0.55 * (paddleY - inner.y - inner.h * 0.22);
    } else {
      this.powerup.caught = true;
      this.powerup.effectMs += deltaMs;
    }
  }

  private drawPowerups(inner: Rect): void {
    const g = this.demo;
    g.lineStyle(2, this.colors.panelStroke, 0.55);
    g.strokeRect(inner.x, inner.y, inner.w, inner.h);

    const types: PowerupType[] = ['widen-paddle', 'fire-ball', 'laser-paddle'];
    const type = types[this.powerup.phase];
    const paddleWBase = inner.w * 0.3;
    const paddleH = Math.max(10, inner.h * 0.06);
    const paddleY = inner.y + inner.h * 0.86;
    const paddleX = inner.x + inner.w / 2;
    const widened = this.powerup.caught && type === 'widen-paddle';
    const paddleW = widened ? paddleWBase * 1.5 : paddleWBase;
    const ballR = Math.max(7, paddleH * 0.75);
    const ballY = inner.y + inner.h * 0.42 + Math.sin(this.timeMs / 280) * inner.h * 0.08;
    const ballX = paddleX + Math.sin(this.timeMs / 420) * inner.w * 0.12;

    if (!this.powerup.caught) {
      const capW = Math.min(36, inner.w * 0.08);
      drawCapsule(g, paddleX, this.powerup.capsuleY, capW, type);
    } else {
      g.fillStyle(type === 'fire-ball' ? 0xff6b35 : type === 'laser-paddle' ? 0x7df9ff : 0x4ade80, 0.22);
      g.fillCircle(paddleX, paddleY, paddleW * 0.7);
    }

    drawPaddleCosmetic(g, CLASSIC_PADDLE, paddleW, paddleH, this.timeMs, paddleX, paddleY);

    if (this.powerup.caught && type === 'laser-paddle') {
      const boltH = (this.powerup.effectMs % 400) / 400 * (paddleY - inner.y - 20);
      g.fillStyle(0x7df9ff, 0.95);
      g.fillRect(paddleX - paddleW * 0.32 - 2, paddleY - paddleH - boltH, 4, boltH);
      g.fillRect(paddleX + paddleW * 0.32 - 2, paddleY - paddleH - boltH, 4, boltH);
    }

    if (this.powerup.caught && type === 'fire-ball') {
      g.fillStyle(0xff6b35, 0.45);
      g.fillCircle(ballX, ballY, ballR * 1.8);
      g.fillStyle(0xffe066, 1);
      g.fillCircle(ballX, ballY, ballR);
    } else {
      drawBall(g, ballX, ballY, ballR);
    }
  }

  private drawModes(inner: Rect): void {
    for (let i = 0; i < 3; i++) {
      const lane = this.modeLane(inner, i);
      this.demo.fillStyle(0x0b1320, 0.55);
      this.demo.fillRoundedRect(lane.x, lane.y, lane.w, lane.h, 8);
      this.demo.lineStyle(2, i === 0 ? 0x2de2e6 : i === 1 ? 0xffd166 : 0xff2a6d, 1);
      this.demo.strokeRoundedRect(lane.x, lane.y, lane.w, lane.h, 8);
      const play = inset(lane, 10, 28);
      if (i === 0) {
        this.drawClassicMode(play);
      } else if (i === 1) {
        this.drawTimeAttackMode(play);
      } else {
        this.drawEndlessMode(play);
      }
    }
  }

  private drawClassicMode(play: Rect): void {
    const level = 1 + Math.floor((this.timeMs / 1800) % 10);
    const clear = (this.timeMs / 1800) % 1;
    const cols = 5;
    const rows = 3;
    const gap = 4;
    const bw = (play.w - gap * (cols - 1)) / cols;
    const bh = play.h * 0.14;
    const remaining = Math.max(0, Math.ceil((1 - clear) * cols * rows));
    let drawn = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (drawn >= remaining) {
          break;
        }
        drawNormalBrick(
          this.demo,
          play.x + c * (bw + gap),
          play.y + play.h * 0.08 + r * (bh + gap),
          bw,
          bh,
          [0xe63946, 0xf4a261, 0x2a9d8f][r],
        );
        drawn += 1;
      }
    }
    drawPaddleCosmetic(
      this.demo,
      CLASSIC_PADDLE,
      play.w * 0.42,
      Math.max(8, play.h * 0.08),
      this.timeMs,
      play.x + play.w / 2,
      play.y + play.h * 0.82,
    );
    drawLevelPip(this.demo, play.x + play.w / 2, play.y + play.h * 0.62, level, 0x2de2e6);
  }

  private drawTimeAttackMode(play: Rect): void {
    const remain = 90 - ((this.timeMs / 80) % 90);
    const urgency = remain < 20;
    const cx = play.x + play.w / 2;
    const cy = play.y + play.h * 0.38;
    const radius = Math.min(play.w, play.h) * 0.28;
    this.demo.lineStyle(Math.max(4, radius * 0.12), urgency ? 0xff2a6d : 0xffd166, 1);
    this.demo.strokeCircle(cx, cy, radius);
    const angle = -Math.PI / 2 + (1 - remain / 90) * Math.PI * 2;
    this.demo.fillStyle(urgency ? 0xff2a6d : 0xffd166, 0.35);
    this.demo.beginPath();
    this.demo.moveTo(cx, cy);
    this.demo.arc(cx, cy, radius * 0.86, -Math.PI / 2, angle, false);
    this.demo.closePath();
    this.demo.fillPath();
    this.demo.lineStyle(Math.max(3, radius * 0.1), 0xffffff, 1);
    this.demo.lineBetween(cx, cy, cx + Math.cos(angle) * radius * 0.72, cy + Math.sin(angle) * radius * 0.72);
    this.demo.fillStyle(urgency ? 0xff2a6d : 0xffd166, 1);
    this.demo.fillCircle(cx, cy, Math.max(3, radius * 0.08));
    const barW = play.w * 0.7;
    const barH = Math.max(8, play.h * 0.08);
    const barX = play.x + (play.w - barW) / 2;
    const barY = play.y + play.h * 0.78;
    this.demo.fillStyle(0x1b263b, 1);
    this.demo.fillRoundedRect(barX, barY, barW, barH, 4);
    this.demo.fillStyle(urgency ? 0xff2a6d : 0xffd166, 1);
    this.demo.fillRoundedRect(barX, barY, barW * (remain / 90), barH, 4);
  }

  private drawEndlessMode(play: Rect): void {
    const ramp = 0.35 + 0.65 * ((this.timeMs / 5000) % 1);
    const speed = 0.8 + ramp * 1.2;
    const ballX = play.x + play.w / 2 + Math.sin(this.timeMs / (180 / speed)) * play.w * 0.32;
    const ballY = play.y + play.h * 0.38 + Math.cos(this.timeMs / (140 / speed)) * play.h * 0.16;
    drawBall(this.demo, ballX, ballY, Math.max(6, play.h * 0.05));
    const barW = play.w * 0.7;
    const barH = Math.max(8, play.h * 0.08);
    const barX = play.x + (play.w - barW) / 2;
    const barY = play.y + play.h * 0.72;
    this.demo.fillStyle(0x1b263b, 1);
    this.demo.fillRoundedRect(barX, barY, barW, barH, 4);
    this.demo.fillStyle(0xff2a6d, 1);
    this.demo.fillRoundedRect(barX, barY, barW * ramp, barH, 4);
    this.demo.lineStyle(1.5, 0xff2a6d, 1);
    this.demo.strokeRoundedRect(barX, barY, barW, barH, 4);
  }

  private drawProgression(inner: Rect): void {
    for (let i = 0; i < 4; i++) {
      const lane = this.fourLane(inner, i);
      this.demo.fillStyle(0x0b1320, 0.55);
      this.demo.fillRoundedRect(lane.x, lane.y, lane.w, lane.h, 8);
      this.demo.lineStyle(2, [0xc4a574, 0x2de2e6, 0xffd166, 0xff2a6d][i], 1);
      this.demo.strokeRoundedRect(lane.x, lane.y, lane.w, lane.h, 8);
      const play = inset(lane, 10, 28);
      if (i === 0) {
        this.drawGarageCard(play);
      } else if (i === 1) {
        this.drawUnlockCard(play);
      } else if (i === 2) {
        this.drawAchievementCard(play);
      } else {
        this.drawThemeCard(play);
      }
    }
  }

  private drawGarageCard(play: Rect): void {
    const cycle = Math.floor(this.timeMs / 2200) % PROGRESS_PADDLES.length;
    const visual = getPaddleSkinVisual(PROGRESS_PADDLES[cycle]);
    const width = play.w * 0.78;
    const height = Math.max(12, play.h * 0.18);
    drawPaddleCosmetic(this.demo, visual, width, height, this.timeMs, play.x + play.w / 2, play.y + play.h * 0.58);
  }

  private drawUnlockCard(play: Rect): void {
    const open = 0.5 + 0.5 * Math.sin(this.timeMs / 400);
    const cx = play.x + play.w / 2;
    const cy = play.y + play.h * 0.48;
    const s = Math.min(play.w, play.h) * 0.22;
    this.demo.fillStyle(0x1b263b, 1);
    this.demo.fillRoundedRect(cx - s, cy - s * 0.2, s * 2, s * 1.35, 6);
    this.demo.lineStyle(3, 0x2de2e6, 1);
    this.demo.beginPath();
    this.demo.arc(cx, cy - s * 0.2, s * 0.7, Math.PI, Math.PI * (1.15 + open * 0.7), false);
    this.demo.strokePath();
    this.demo.fillStyle(0xffd166, 1);
    this.demo.fillCircle(cx, cy + s * 0.35, s * 0.18);
    const visual = getPaddleSkinVisual('titan');
    drawPaddleCosmetic(
      this.demo,
      visual,
      play.w * 0.7,
      Math.max(10, play.h * 0.14),
      this.timeMs,
      cx,
      play.y + play.h * 0.88,
    );
  }

  private drawAchievementCard(play: Rect): void {
    const fill = 0.15 + 0.85 * (0.5 + 0.5 * Math.sin(this.timeMs / 500));
    const gold = 0xffd166;
    this.demo.fillStyle(0x3d2e0a, 0.9);
    this.demo.fillRoundedRect(play.x + play.w * 0.08, play.y + play.h * 0.08, play.w * 0.84, play.h * 0.84, 8);
    this.demo.lineStyle(3, gold, 1);
    this.demo.strokeRoundedRect(play.x + play.w * 0.08, play.y + play.h * 0.08, play.w * 0.84, play.h * 0.84, 8);
    this.demo.fillStyle(gold, 0.2 + 0.35 * fill);
    this.demo.fillCircle(play.x + play.w / 2, play.y + play.h * 0.42, Math.min(play.w, play.h) * 0.18);
    this.demo.lineStyle(4, gold, 1);
    const cx = play.x + play.w / 2;
    const cy = play.y + play.h * 0.42;
    this.demo.beginPath();
    this.demo.moveTo(cx - 10, cy);
    this.demo.lineTo(cx - 2, cy + 10 * fill);
    this.demo.lineTo(cx + 14, cy - 12 * fill);
    this.demo.strokePath();
    const barW = play.w * 0.64;
    const barX = play.x + (play.w - barW) / 2;
    const barY = play.y + play.h * 0.72;
    this.demo.fillStyle(0x1b1510, 1);
    this.demo.fillRoundedRect(barX, barY, barW, 10, 4);
    this.demo.fillStyle(gold, 1);
    this.demo.fillRoundedRect(barX, barY, barW * fill, 10, 4);
  }

  private drawThemeCard(play: Rect): void {
    const palettes = [
      [0x0a1128, 0xff2a6d, 0x2de2e6],
      [0x050814, 0x7c3aed, 0x22d3ee],
      [0x102018, 0x2dd4bf, 0xfbbf24],
      [0x1a0505, 0xff6b35, 0xffe066],
    ];
    const idx = Math.floor(this.timeMs / 1600) % palettes.length;
    const [bg, a, b] = palettes[idx];
    this.demo.fillStyle(bg, 1);
    this.demo.fillRoundedRect(play.x, play.y, play.w, play.h, 6);
    this.demo.fillStyle(a, 1);
    this.demo.fillCircle(play.x + play.w * 0.32, play.y + play.h * 0.45, play.h * 0.18);
    this.demo.fillStyle(b, 1);
    this.demo.fillCircle(play.x + play.w * 0.68, play.y + play.h * 0.55, play.h * 0.14);
    this.demo.fillStyle(a, 0.35);
    this.demo.fillRect(play.x, play.y + play.h * 0.78, play.w, play.h * 0.08);
  }

  private static makeLabel(
    scene: Phaser.Scene,
    color: string,
    bold: boolean,
  ): Phaser.GameObjects.Text {
    return scene.add
      .text(0, 0, '', {
        fontFamily: HUD_FONT_FAMILY,
        fontSize: bold ? '14px' : '11px',
        color,
        fontStyle: bold ? 'bold' : 'normal',
        align: 'center',
        stroke: '#0b1320',
        strokeThickness: bold ? 4 : 3,
      })
      .setOrigin(0.5, 0)
      .setShadow(1, 2, '#000000', 2, true, true)
      .setDepth(HUD_DEPTH + 2);
  }

  private isPortrait(): boolean {
    return this.viewportHeight > this.viewportWidth * 1.05;
  }

  private fourLane(inner: Rect, index: number): Rect {
    if (this.isPortrait()) {
      const gapX = inner.w * 0.02;
      const gapY = inner.h * 0.02;
      const w = (inner.w - gapX) / 2;
      const h = (inner.h - gapY) / 2;
      const col = index % 2;
      const row = Math.floor(index / 2);
      return { x: inner.x + col * (w + gapX), y: inner.y + row * (h + gapY), w, h };
    }
    const gap = inner.w * 0.018;
    const w = (inner.w - gap * 3) / 4;
    return { x: inner.x + index * (w + gap), y: inner.y, w, h: inner.h };
  }

  private modeLane(inner: Rect, index: number): Rect {
    if (this.isPortrait()) {
      const gap = inner.h * 0.02;
      const h = (inner.h - gap * 2) / 3;
      return { x: inner.x, y: inner.y + index * (h + gap), w: inner.w, h };
    }
    const gap = inner.w * 0.02;
    const w = (inner.w - gap * 2) / 3;
    return { x: inner.x + index * (w + gap), y: inner.y, w, h: inner.h };
  }
}

function inset(rect: Rect, x: number, top: number): Rect {
  return { x: rect.x + x, y: rect.y + top, w: rect.w - x * 2, h: rect.h - top - 8 };
}

function flyBall(
  play: Rect,
  paddleY: number,
  brickBottom: number,
  ballR: number,
  t: number,
  hitAt: number,
): { x: number; y: number } {
  const startY = paddleY - ballR * 2;
  const endY = brickBottom + ballR;
  const u = Math.min(1, t / hitAt);
  return { x: play.x + play.w / 2, y: startY + (endY - startY) * u };
}

function bounceBack(
  play: Rect,
  paddleY: number,
  brickBottom: number,
  ballR: number,
  t: number,
): { x: number; y: number } {
  const startY = paddleY - ballR * 2;
  const endY = brickBottom + ballR;
  const u = t < 0.5 ? t / 0.5 : 1 - (t - 0.5) / 0.5;
  return { x: play.x + play.w / 2, y: startY + (endY - startY) * u };
}

function drawBall(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number): void {
  g.fillStyle(0xffe66d, 1);
  g.fillCircle(x, y, r);
  g.fillStyle(0xffffff, 0.4);
  g.fillCircle(x - r * 0.25, y - r * 0.25, r * 0.28);
}

function drawBurst(g: Phaser.GameObjects.Graphics, x: number, y: number, t: number, color: number): void {
  if (t <= 0 || t > 1) {
    return;
  }
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const dist = t * 22;
    g.fillStyle(color, 1 - t);
    g.fillCircle(x + Math.cos(angle) * dist, y + Math.sin(angle) * dist, Math.max(1.5, 5 * (1 - t)));
  }
}

function drawCapsule(g: Phaser.GameObjects.Graphics, x: number, y: number, size: number, type: PowerupType): void {
  const w = size;
  const h = size * 1.35;
  const palette: Record<PowerupType, { color: number; stroke: number }> = {
    'widen-paddle': { color: 0x2d6a4f, stroke: 0xb7e4c7 },
    'slow-ball': { color: 0x40916c, stroke: 0xd8f3dc },
    'extra-life': { color: 0x52b788, stroke: 0xedf6f0 },
    'fire-ball': { color: 0x1b4332, stroke: 0x95d5b2 },
    'multi-ball': { color: 0x74c69d, stroke: 0xf0fff4 },
    'small-paddle': { color: 0xe85d04, stroke: 0xffd166 },
    'fast-ball': { color: 0xc1121f, stroke: 0xffba08 },
    'laser-paddle': { color: 0x0d3b66, stroke: 0x7df9ff },
  };
  const vis = palette[type];
  g.fillStyle(vis.color, 1);
  g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 6);
  g.lineStyle(2, vis.stroke, 1);
  g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 6);
  drawPowerupIcon(g, type, vis.stroke, w, h, x, y);
}

function drawNormalBrick(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, fill: number): void {
  const radius = Math.max(2, h * 0.14);
  g.fillStyle(fill, 1);
  g.fillRoundedRect(x, y, w, h, radius);
  g.fillStyle(0xffffff, 0.32);
  g.fillRoundedRect(x + 2, y + 1, w - 4, h * 0.32, radius * 0.6);
  g.fillStyle(0x000000, 0.22);
  g.fillRect(x + w * 0.82, y + 2, w * 0.14, h - 4);
}

function drawCrackedBrick(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, damaged: boolean): void {
  drawNormalBrick(g, x, y, w, h, damaged ? 0xb08900 : 0xf9c74f);
  g.lineStyle(Math.max(2, h * 0.1), 0x1b1b1b, damaged ? 0.95 : 0.55);
  g.beginPath();
  g.moveTo(x + w * 0.22, y + h * 0.18);
  g.lineTo(x + w * 0.48, y + h * 0.5);
  g.lineTo(x + w * 0.32, y + h * 0.92);
  g.strokePath();
  if (damaged) {
    g.beginPath();
    g.moveTo(x + w * 0.72, y + h * 0.12);
    g.lineTo(x + w * 0.58, y + h * 0.55);
    g.lineTo(x + w * 0.8, y + h * 0.9);
    g.strokePath();
  }
}

function drawMetalBrick(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number): void {
  const radius = Math.max(2, h * 0.14);
  g.fillStyle(0x6d7680, 1);
  g.fillRoundedRect(x, y, w, h, radius);
  g.fillStyle(0xb8c0c8, 0.95);
  g.fillRect(x + 2, y + 2, w - 4, h * 0.28);
  g.fillStyle(0x3d454d, 0.9);
  g.fillRect(x + 2, y + h * 0.62, w - 4, h * 0.3);
  const rivet = Math.max(1.6, Math.min(w, h) * 0.1);
  g.fillStyle(0xdfe3e8, 1);
  g.fillCircle(x + w * 0.14, y + h * 0.22, rivet);
  g.fillCircle(x + w * 0.86, y + h * 0.22, rivet);
  g.fillCircle(x + w * 0.14, y + h * 0.78, rivet);
  g.fillCircle(x + w * 0.86, y + h * 0.78, rivet);
  g.lineStyle(Math.max(2, h * 0.12), 0xe9ecef, 1);
  g.strokeRoundedRect(x, y, w, h, radius);
}

function drawBonusBrick(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number): void {
  const radius = Math.max(2, h * 0.14);
  g.fillStyle(0x9b5de5, 1);
  g.fillRoundedRect(x, y, w, h, radius);
  g.lineStyle(Math.max(2, h * 0.14), 0xffe66d, 1);
  g.strokeRoundedRect(x, y, w, h, radius);
  g.fillStyle(0xffe66d, 1);
  g.fillTriangle(x + w / 2, y + h * 0.22, x + w * 0.28, y + h * 0.7, x + w * 0.72, y + h * 0.7);
}

function drawLevelPip(g: Phaser.GameObjects.Graphics, x: number, y: number, level: number, color: number): void {
  const w = 36;
  const h = 18;
  g.fillStyle(0x0b1320, 0.9);
  g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 4);
  g.lineStyle(1.5, color, 1);
  g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 4);
  for (let i = 0; i < 10; i++) {
    g.fillStyle(i < level ? color : 0x334155, 1);
    g.fillCircle(x - 16 + i * 3.6, y, 1.6);
  }
}
