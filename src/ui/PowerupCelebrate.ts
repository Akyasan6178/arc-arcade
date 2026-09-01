import Phaser from 'phaser';

/**
 * ui/PowerupCelebrate.ts
 *
 * DXB-24: Strong-powerup collection burst (label + ring). Not a
 * gameplay system — `MainScene` still owns catch dispatch. Used for
 * Fire Ball, Multi Ball, Laser Paddle, and Extra Life.
 */

const FX_DEPTH = 18;
const HUD_FONT_FAMILY = 'Trebuchet MS, Segoe UI, sans-serif';

export class PowerupCelebrate {
  private readonly scene: Phaser.Scene;
  private burst?: Phaser.GameObjects.Graphics;
  private label?: Phaser.GameObjects.Text;
  private tween?: Phaser.Tweens.Tween;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  play(x: number, y: number, title: string, color: number, viewportHeight: number): void {
    this.clear();

    const size = Math.max(28, viewportHeight * 0.08);
    const burst = this.scene.add.graphics().setDepth(FX_DEPTH).setPosition(x, y);
    burst.fillStyle(color, 0.28);
    burst.fillCircle(0, 0, size);
    burst.lineStyle(Math.max(2, size * 0.08), color, 0.95);
    burst.strokeCircle(0, 0, size * 0.72);
    for (let i = 0; i < 10; i++) {
      const angle = (Math.PI * 2 * i) / 10;
      burst.lineStyle(Math.max(1.5, size * 0.05), 0xffffff, 0.85);
      burst.beginPath();
      burst.moveTo(Math.cos(angle) * size * 0.35, Math.sin(angle) * size * 0.35);
      burst.lineTo(Math.cos(angle) * size * 1.15, Math.sin(angle) * size * 1.15);
      burst.strokePath();
    }

    const label = this.scene.add
      .text(x, y - size * 0.15, title, {
        fontFamily: HUD_FONT_FAMILY,
        fontSize: `${Math.max(14, Math.round(viewportHeight * 0.028))}px`,
        color: '#ffffff',
        fontStyle: 'bold',
        align: 'center',
        stroke: '#0b1320',
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(FX_DEPTH + 1)
      .setShadow(1, 2, '#000000', 4, true, true);

    this.burst = burst;
    this.label = label;
    this.tween = this.scene.tweens.add({
      targets: [burst, label],
      alpha: 0,
      y: y - viewportHeight * 0.06,
      duration: 720,
      ease: 'Quad.easeOut',
      onComplete: () => this.clear(),
    });
  }

  destroy(): void {
    this.clear();
  }

  private clear(): void {
    this.tween?.stop();
    this.tween = undefined;
    this.burst?.destroy();
    this.label?.destroy();
    this.burst = undefined;
    this.label = undefined;
  }
}
