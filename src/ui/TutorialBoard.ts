import Phaser from 'phaser';

/**
 * ui/TutorialBoard.ts
 *
 * DXB-25: Visual how-to board. Center is a gameplay example; left and
 * right carry short explanations. Not a gameplay system.
 */

export interface TutorialBoardPage {
  leftTitle: string;
  leftBody: string;
  rightTitle: string;
  rightBody: string;
  draw: (
    g: Phaser.GameObjects.Graphics,
    cx: number,
    cy: number,
    width: number,
    height: number,
    timeMs: number,
  ) => void;
}

export interface TutorialBoardColors {
  color: string;
  highlightColor: string;
  mutedColor: string;
  panel: number;
  panelStroke: number;
  accent: number;
}

const HUD_FONT_FAMILY = 'Trebuchet MS, Segoe UI, sans-serif';
const HUD_DEPTH = 20;

export class TutorialBoard {
  private readonly colors: TutorialBoardColors;
  private readonly chrome: Phaser.GameObjects.Graphics;
  private readonly demo: Phaser.GameObjects.Graphics;
  private readonly leftTitle: Phaser.GameObjects.Text;
  private readonly leftBody: Phaser.GameObjects.Text;
  private readonly rightTitle: Phaser.GameObjects.Text;
  private readonly rightBody: Phaser.GameObjects.Text;
  private page: TutorialBoardPage | undefined;
  private viewportWidth = 0;
  private viewportHeight = 0;
  private originY = 0;
  private destroyed = false;
  private timeMs = 0;

  constructor(
    scene: Phaser.Scene,
    viewportWidth: number,
    viewportHeight: number,
    originY: number,
    colors: TutorialBoardColors,
  ) {
    this.colors = colors;
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;
    this.originY = originY;
    this.chrome = scene.add.graphics().setDepth(HUD_DEPTH);
    this.demo = scene.add.graphics().setDepth(HUD_DEPTH + 1);
    this.leftTitle = TutorialBoard.makeLabel(scene, colors.highlightColor, true);
    this.leftBody = TutorialBoard.makeLabel(scene, colors.mutedColor, false);
    this.rightTitle = TutorialBoard.makeLabel(scene, colors.highlightColor, true);
    this.rightBody = TutorialBoard.makeLabel(scene, colors.mutedColor, false);
    this.layout();
  }

  setPage(page: TutorialBoardPage): void {
    this.page = page;
    this.leftTitle.setText(page.leftTitle);
    this.leftBody.setText(page.leftBody);
    this.rightTitle.setText(page.rightTitle);
    this.rightBody.setText(page.rightBody);
    this.redraw();
  }

  tick(deltaMs: number): void {
    if (this.destroyed) {
      return;
    }
    this.timeMs += deltaMs;
    this.redrawDemo();
  }

  resize(viewportWidth: number, viewportHeight: number, originY: number): void {
    if (this.destroyed) {
      return;
    }
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;
    this.originY = originY;
    this.layout();
    this.redraw();
  }

  destroy(): void {
    if (this.destroyed) {
      return;
    }
    this.destroyed = true;
    this.chrome.destroy();
    this.demo.destroy();
    this.leftTitle.destroy();
    this.leftBody.destroy();
    this.rightTitle.destroy();
    this.rightBody.destroy();
  }

  private layout(): void {
    const bottom = this.viewportHeight * 0.88;
    const height = Math.max(120, bottom - this.originY);
    const side = this.viewportWidth * 0.05;
    const colGap = this.viewportWidth * 0.018;
    const colW = (this.viewportWidth - side * 2 - colGap * 2) / 3;
    const y = this.originY;
    const titleSize = Math.max(12, Math.round(this.viewportHeight * 0.022));
    const bodySize = Math.max(11, Math.round(this.viewportHeight * 0.016));

    this.leftTitle.setPosition(side + colW / 2, y + 12);
    this.leftTitle.setFontSize(titleSize);
    this.leftTitle.setWordWrapWidth(colW * 0.88);
    this.leftBody.setPosition(side + colW / 2, y + 12 + titleSize * 1.35);
    this.leftBody.setFontSize(bodySize);
    this.leftBody.setWordWrapWidth(colW * 0.88);

    this.rightTitle.setPosition(this.viewportWidth - side - colW / 2, y + 12);
    this.rightTitle.setFontSize(titleSize);
    this.rightTitle.setWordWrapWidth(colW * 0.88);
    this.rightBody.setPosition(this.viewportWidth - side - colW / 2, y + 12 + titleSize * 1.35);
    this.rightBody.setFontSize(bodySize);
    this.rightBody.setWordWrapWidth(colW * 0.88);

    this.chrome.clear();
    this.drawCard(side, y, colW, height, false);
    this.drawCard(side + colW + colGap, y, colW, height, true);
    this.drawCard(side + (colW + colGap) * 2, y, colW, height, false);
  }

  private drawCard(x: number, y: number, w: number, h: number, featured: boolean): void {
    const radius = Math.max(8, h * 0.04);
    this.chrome.fillStyle(this.colors.panel, featured ? 0.94 : 0.82);
    this.chrome.fillRoundedRect(x, y, w, h, radius);
    this.chrome.lineStyle(featured ? 2.5 : 1.5, featured ? this.colors.accent : this.colors.panelStroke, 1);
    this.chrome.strokeRoundedRect(x, y, w, h, radius);
    if (featured) {
      this.chrome.fillStyle(this.colors.accent, 1);
      this.chrome.fillRect(x + w * 0.28, y, w * 0.44, 3);
    }
  }

  private redraw(): void {
    this.layout();
    this.redrawDemo();
  }

  private redrawDemo(): void {
    this.demo.clear();
    if (!this.page) {
      return;
    }
    const side = this.viewportWidth * 0.05;
    const colGap = this.viewportWidth * 0.018;
    const colW = (this.viewportWidth - side * 2 - colGap * 2) / 3;
    const bottom = this.viewportHeight * 0.88;
    const height = Math.max(120, bottom - this.originY);
    const cx = side + colW + colGap + colW / 2;
    const cy = this.originY + height * 0.58;
    this.page.draw(this.demo, cx, cy, colW * 0.82, height * 0.72, this.timeMs);
  }

  private static makeLabel(
    scene: Phaser.Scene,
    color: string,
    bold: boolean,
  ): Phaser.GameObjects.Text {
    return scene.add
      .text(0, 0, '', {
        fontFamily: HUD_FONT_FAMILY,
        fontSize: bold ? '14px' : '12px',
        color,
        fontStyle: bold ? 'bold' : 'normal',
        align: 'center',
        stroke: '#0b1320',
        strokeThickness: bold ? 4 : 3,
      })
      .setOrigin(0.5, 0)
      .setShadow(1, 2, '#000000', 2, true, true)
      .setDepth(HUD_DEPTH + 1);
  }
}
