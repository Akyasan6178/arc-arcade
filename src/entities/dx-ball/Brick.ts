import Phaser from 'phaser';

/**
 * entities/dx-ball/Brick.ts
 *
 * DXB-03: A single brick in the DX-Ball brick field. Purely a visual
 * rectangle plus its fixed row/column identity within the grid — all
 * sizing/positioning/layout math lives in `BrickGrid`, which owns the
 * full set of bricks the same way `MainScene` owns `Paddle`/`Ball`.
 *
 * No destruction or ball collision here — that's owned by `BrickGrid`
 * (mirroring DXB-01/DXB-02's own precedent of leaving paddle/ball
 * collision out of their "core" entity tasks).
 *
 * DXB-06 adds `points`: this brick's fixed score value, assigned once at
 * construction by `BrickGrid` (which decides the row-based scoring rule)
 * and never mutated afterwards — the brick just carries it, the same way
 * it carries `row`/`column`.
 */
export class Brick extends Phaser.GameObjects.Rectangle {
  readonly row: number;
  readonly column: number;
  readonly points: number;

  constructor(
    scene: Phaser.Scene,
    row: number,
    column: number,
    x: number,
    y: number,
    width: number,
    height: number,
    color: number,
    points: number,
  ) {
    super(scene, x, y, width, height, color);

    this.row = row;
    this.column = column;
    this.points = points;

    scene.add.existing(this);
  }
}
