import Phaser from 'phaser';

/**
 * entities/dx-ball/Brick.ts
 *
 * DXB-03: A single brick in the DX-Ball brick field. Purely a visual
 * rectangle plus its fixed row/column identity within the grid — all
 * sizing/positioning/layout math lives in `BrickGrid`, which owns the
 * full set of bricks the same way `MainScene` owns `Paddle`/`Ball`.
 *
 * No hit points, destruction, or ball collision here — that's separate
 * future work (mirroring DXB-01/DXB-02's own precedent of leaving
 * paddle/ball collision out of their "core" entity tasks).
 */
export class Brick extends Phaser.GameObjects.Rectangle {
  readonly row: number;
  readonly column: number;

  constructor(
    scene: Phaser.Scene,
    row: number,
    column: number,
    x: number,
    y: number,
    width: number,
    height: number,
    color: number,
  ) {
    super(scene, x, y, width, height, color);

    this.row = row;
    this.column = column;

    scene.add.existing(this);
  }
}
