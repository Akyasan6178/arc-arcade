import Phaser from 'phaser';

/**
 * ui/TutorialBoard.ts
 *
 * DXB-26: Visual-first how-to board. Desktop: short notes left/right,
 * large gameplay vignette in the center. Portrait stacks the demo on
 * top with notes underneath. Not a gameplay system.
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

  private isPortrait(): boolean {
    return this.viewportHeight > this.viewportWidth * 1.05;
  }

  private layout(): void {
    const regions = this.regions();
    const titleSize = Math.max(12, Math.round(this.viewportHeight * 0.022));
    const bodySize = Math.max(11, Math.round(this.viewportHeight * 0.016));

    this.placeNote(this.leftTitle, this.leftBody, regions.left, titleSize, bodySize);
    this.placeNote(this.rightTitle, this.rightBody, regions.right, titleSize, bodySize);

    this.chrome.clear();
    this.drawCard(regions.left.x, regions.left.y, regions.left.w, regions.left.h, false);
    this.drawCard(regions.center.x, regions.center.y, regions.center.w, regions.center.h, true);
    this.drawCard(regions.right.x, regions.right.y, regions.right.w, regions.right.h, false);
  }

  private placeNote(
    title: Phaser.GameObjects.Text,
    body: Phaser.GameObjects.Text,
    region: { x: number; y: number; w: number; h: number },
    titleSize: number,
    bodySize: number,
  ): void {
    title.setPosition(region.x + region.w / 2, region.y + 12);
    title.setFontSize(titleSize);
    title.setWordWrapWidth(region.w * 0.86);
    body.setPosition(region.x + region.w / 2, region.y + 12 + titleSize * 1.4);
    body.setFontSize(bodySize);
    body.setWordWrapWidth(region.w * 0.86);
  }

  private regions(): {
    left: { x: number; y: number; w: number; h: number };
    center: { x: number; y: number; w: number; h: number };
    right: { x: number; y: number; w: number; h: number };
  } {
    const bottom = this.viewportHeight * 0.82;
    const height = Math.max(140, bottom - this.originY);
    const side = this.viewportWidth * 0.04;
    const gap = this.viewportWidth * 0.014;

    if (this.isPortrait()) {
      const demoH = height * 0.58;
      const noteH = height - demoH - gap;
      const noteW = (this.viewportWidth - side * 2 - gap) / 2;
      return {
        center: { x: side, y: this.originY, w: this.viewportWidth - side * 2, h: demoH },
        left: { x: side, y: this.originY + demoH + gap, w: noteW, h: noteH },
        right: { x: side + noteW + gap, y: this.originY + demoH + gap, w: noteW, h: noteH },
      };
    }

    const sideW = (this.viewportWidth - side * 2 - gap * 2) * 0.24;
    const centerW = this.viewportWidth - side * 2 - gap * 2 - sideW * 2;
    return {
      left: { x: side, y: this.originY, w: sideW, h: height },
      center: { x: side + sideW + gap, y: this.originY, w: centerW, h: height },
      right: { x: side + sideW + gap + centerW + gap, y: this.originY, w: sideW, h: height },
    };
  }

  private drawCard(x: number, y: number, w: number, h: number, featured: boolean): void {
    const radius = Math.max(8, h * 0.04);
    this.chrome.fillStyle(this.colors.panel, featured ? 0.95 : 0.82);
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
    const center = this.regions().center;
    this.page.draw(
      this.demo,
      center.x + center.w / 2,
      center.y + center.h * 0.54,
      center.w * 0.86,
      center.h * 0.78,
      this.timeMs,
    );
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
