import Phaser from 'phaser';

/**
 * ui/CatchFlash.ts
 *
 * DXB-22: A one-shot, full-viewport color flash. Used for powerup
 * collection feedback. Not a gameplay system — the caller still owns
 * catch dispatch. One rectangle, short fade, no particles.
 */

const FLASH_DEPTH = 16;
const FLASH_DURATION_MS = 200;
const FLASH_ALPHA = 0.3;

export class CatchFlash {
  private readonly scene: Phaser.Scene;
  private readonly rect: Phaser.GameObjects.Rectangle;
  private tween?: Phaser.Tweens.Tween;

  constructor(scene: Phaser.Scene, viewportWidth: number, viewportHeight: number) {
    this.scene = scene;
    this.rect = scene.add
      .rectangle(viewportWidth / 2, viewportHeight / 2, viewportWidth, viewportHeight, 0xffffff, FLASH_ALPHA)
      .setDepth(FLASH_DEPTH)
      .setVisible(false)
      .setAlpha(0);
  }

  flash(color: number): void {
    this.tween?.stop();
    this.rect.setFillStyle(color, 1);
    this.rect.setVisible(true);
    this.rect.setAlpha(FLASH_ALPHA);
    this.tween = this.scene.tweens.add({
      targets: this.rect,
      alpha: 0,
      duration: FLASH_DURATION_MS,
      onComplete: () => {
        this.rect.setVisible(false);
      },
    });
  }

  resize(viewportWidth: number, viewportHeight: number): void {
    this.rect.setPosition(viewportWidth / 2, viewportHeight / 2);
    this.rect.setSize(viewportWidth, viewportHeight);
  }

  destroy(): void {
    this.tween?.stop();
    this.tween = undefined;
    this.rect.destroy();
  }
}
