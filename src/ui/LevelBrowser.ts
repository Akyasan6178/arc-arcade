import Phaser from 'phaser';
import type { LevelPreviewModel } from '@entities/dx-ball/levels';
import type { BrickType } from '@entities/dx-ball/BrickType';

/**
 * ui/LevelBrowser.ts
 *
 * DXB-23: Visual Classic campaign browser. Draws miniature brick-map
 * thumbnails plus name/number captions. DXB-24 added type icons and a
 * difficulty rating. DXB-25 strengthens the card: inner thumbnail well,
 * colored difficulty pips, and labeled brick-type chips. Not a gameplay
 * system — confirm only reports the highlighted index.
 */

export interface LevelBrowserColors {
  color: string;
  highlightColor: string;
  mutedColor: string;
  panel: number;
  panelStroke: number;
  accent: number;
}

const HUD_FONT_FAMILY = 'Trebuchet MS, Segoe UI, sans-serif';
const HUD_DEPTH = 20;

const DEFAULT_COLORS: LevelBrowserColors = {
  color: '#c5d0dc',
  highlightColor: '#f8f9fa',
  mutedColor: '#6c7a89',
  panel: 0x12182c,
  panelStroke: 0x2de2e6,
  accent: 0xff2a6d,
};

interface LevelBrowserTile {
  hit: Phaser.GameObjects.Rectangle;
  frame: Phaser.GameObjects.Graphics;
  map: Phaser.GameObjects.Graphics;
  icons: Phaser.GameObjects.Graphics;
  caption: Phaser.GameObjects.Text;
  rating: Phaser.GameObjects.Text;
}

export class LevelBrowser {
  private readonly scene: Phaser.Scene;
  private readonly levels: readonly LevelPreviewModel[];
  private readonly onSelect: (index: number) => void;
  private readonly onHighlight?: (index: number) => void;
  private readonly colors: LevelBrowserColors;
  private readonly tiles: LevelBrowserTile[] = [];
  private selectedIndex = 0;
  private viewportWidth = 0;
  private viewportHeight = 0;
  private originY = 0;
  private columns = 5;
  private destroyed = false;
  private readonly onLeft = (): void => this.move(-1);
  private readonly onRight = (): void => this.move(1);
  private readonly onUp = (): void => this.move(-this.columns);
  private readonly onDown = (): void => this.move(this.columns);
  private readonly onEnter = (): void => this.confirm();
  private readonly onSpace = (): void => this.confirm();

  constructor(
    scene: Phaser.Scene,
    viewportWidth: number,
    viewportHeight: number,
    originY: number,
    levels: readonly LevelPreviewModel[],
    onSelect: (index: number) => void,
    colors: Partial<LevelBrowserColors> = {},
    onHighlight?: (index: number) => void,
  ) {
    this.scene = scene;
    this.levels = levels;
    this.onSelect = onSelect;
    this.onHighlight = onHighlight;
    this.colors = { ...DEFAULT_COLORS, ...colors };
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;
    this.originY = originY;
    this.columns = this.columnCount();

    for (let i = 0; i < levels.length; i++) {
      const frame = scene.add.graphics().setDepth(HUD_DEPTH);
      const map = scene.add.graphics().setDepth(HUD_DEPTH + 1);
      const icons = scene.add.graphics().setDepth(HUD_DEPTH + 1);
      const hit = scene.add
        .rectangle(0, 0, 10, 10, 0x000000, 0.001)
        .setDepth(HUD_DEPTH + 2)
        .setInteractive({ useHandCursor: true });
      const caption = scene.add
        .text(0, 0, '', {
          fontFamily: HUD_FONT_FAMILY,
          fontSize: '12px',
          color: this.colors.color,
          fontStyle: 'bold',
          align: 'center',
          stroke: '#0b1320',
          strokeThickness: 3,
        })
        .setOrigin(0.5, 0)
        .setDepth(HUD_DEPTH + 1);
      const rating = scene.add
        .text(0, 0, '', {
          fontFamily: HUD_FONT_FAMILY,
          fontSize: '11px',
          color: this.colors.highlightColor,
          fontStyle: 'bold',
          align: 'center',
          stroke: '#0b1320',
          strokeThickness: 3,
        })
        .setOrigin(0.5, 0)
        .setDepth(HUD_DEPTH + 1);

      const index = i;
      hit.on('pointerover', () => this.setSelectedIndex(index));
      hit.on('pointerup', () => this.confirm());
      caption.setInteractive({ useHandCursor: true });
      caption.on('pointerover', () => this.setSelectedIndex(index));
      caption.on('pointerup', () => this.confirm());

      this.tiles.push({ hit, frame, map, icons, caption, rating });
    }

    this.layout();
    this.refreshHighlight();
    this.bindKeyboard();
  }

  getSelectedIndex(): number {
    return this.selectedIndex;
  }

  destroy(): void {
    if (this.destroyed) {
      return;
    }
    this.destroyed = true;
    const keyboard = this.scene.input.keyboard;
    keyboard?.off('keydown-LEFT', this.onLeft);
    keyboard?.off('keydown-RIGHT', this.onRight);
    keyboard?.off('keydown-UP', this.onUp);
    keyboard?.off('keydown-DOWN', this.onDown);
    keyboard?.off('keydown-ENTER', this.onEnter);
    keyboard?.off('keydown-SPACE', this.onSpace);
    for (const tile of this.tiles) {
      tile.hit.destroy();
      tile.frame.destroy();
      tile.map.destroy();
      tile.icons.destroy();
      tile.caption.destroy();
      tile.rating.destroy();
    }
    this.tiles.length = 0;
  }

  resize(viewportWidth: number, viewportHeight: number, originY: number): void {
    if (this.destroyed) {
      return;
    }
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;
    this.originY = originY;
    this.columns = this.columnCount();
    this.layout();
    this.refreshHighlight();
  }

  private columnCount(): number {
    return this.viewportWidth < this.viewportHeight ? 2 : 5;
  }

  private bindKeyboard(): void {
    const keyboard = this.scene.input.keyboard;
    if (!keyboard) {
      return;
    }
    keyboard.on('keydown-LEFT', this.onLeft);
    keyboard.on('keydown-RIGHT', this.onRight);
    keyboard.on('keydown-UP', this.onUp);
    keyboard.on('keydown-DOWN', this.onDown);
    keyboard.on('keydown-ENTER', this.onEnter);
    keyboard.on('keydown-SPACE', this.onSpace);
  }

  private move(delta: number): void {
    if (this.destroyed || this.levels.length === 0) {
      return;
    }
    const next = Phaser.Math.Clamp(this.selectedIndex + delta, 0, this.levels.length - 1);
    this.setSelectedIndex(next);
  }

  private setSelectedIndex(index: number): void {
    if (this.destroyed || index === this.selectedIndex) {
      return;
    }
    this.selectedIndex = index;
    this.refreshHighlight();
    this.onHighlight?.(index);
  }

  private confirm(): void {
    if (this.destroyed) {
      return;
    }
    this.onSelect(this.selectedIndex);
  }

  private layout(): void {
    const count = this.levels.length;
    const columns = this.columns;
    const rows = Math.max(1, Math.ceil(count / columns));
    const side = this.viewportWidth * 0.06;
    const gap = Math.max(8, this.viewportWidth * 0.014);
    const availableW = this.viewportWidth - side * 2;
    const availableH = this.viewportHeight * 0.9 - this.originY;
    const tileW = (availableW - gap * (columns - 1)) / columns;
    const tileH = Math.min(tileW * 0.98, (availableH - gap * (rows - 1)) / rows);
    const fontSize = Math.max(9, Math.round(this.viewportHeight * 0.014));

    for (let i = 0; i < this.tiles.length; i++) {
      const col = i % columns;
      const row = Math.floor(i / columns);
      const x = side + col * (tileW + gap) + tileW / 2;
      const y = this.originY + row * (tileH + gap);
      this.drawTile(i, x, y, tileW, tileH, fontSize);
    }
  }

  private drawTile(
    index: number,
    centerX: number,
    topY: number,
    tileW: number,
    tileH: number,
    fontSize: number,
  ): void {
    const tile = this.tiles[index];
    const level = this.levels[index];
    const selected = index === this.selectedIndex;
    const radius = Math.max(6, tileH * 0.08);
    const mapH = tileH * 0.46;
    const mapW = tileW * 0.86;
    const mapX = centerX - mapW / 2;
    const mapY = topY + tileH * 0.07;
    const wellPad = 4;

    tile.frame.clear();
    tile.frame.fillStyle(this.colors.panel, 0.94);
    tile.frame.fillRoundedRect(centerX - tileW / 2, topY, tileW, tileH, radius);
    tile.frame.lineStyle(selected ? 3 : 1.5, selected ? this.colors.accent : this.colors.panelStroke, 1);
    tile.frame.strokeRoundedRect(centerX - tileW / 2, topY, tileW, tileH, radius);
    tile.frame.fillStyle(0x070b14, 0.92);
    tile.frame.fillRoundedRect(mapX - wellPad, mapY - wellPad, mapW + wellPad * 2, mapH + wellPad * 2, 4);
    if (selected) {
      tile.frame.fillStyle(this.colors.accent, 1);
      tile.frame.fillRect(centerX - tileW * 0.22, topY, tileW * 0.44, 4);
    }

    tile.map.clear();
    drawBrickThumbnail(tile.map, level, mapX, mapY, mapW, mapH);

    tile.icons.clear();
    const metaY = mapY + mapH + tileH * 0.05;
    drawDifficultyPips(tile.icons, level.difficulty, centerX, metaY, tileW * 0.72);
    drawTypeIcons(tile.icons, level.brickTypes, centerX, metaY + tileH * 0.08, tileW * 0.86);

    tile.rating.setPosition(centerX, metaY + tileH * 0.155);
    tile.rating.setFontSize(Math.max(8, fontSize - 2));
    tile.rating.setColor(selected ? this.colors.highlightColor : this.colors.mutedColor);
    tile.rating.setText(`${difficultyLabel(level.difficulty)}  ·  ${typeLetters(level.brickTypes)}`);

    tile.caption.setPosition(centerX, topY + tileH - fontSize * 1.7);
    tile.caption.setFontSize(fontSize);
    tile.caption.setColor(selected ? this.colors.highlightColor : this.colors.color);
    tile.caption.setText(level.name);
    tile.caption.setWordWrapWidth(tileW * 0.9);

    tile.hit.setPosition(centerX, topY + tileH / 2);
    tile.hit.setSize(tileW, tileH);
    tile.hit.setDisplaySize(tileW, tileH);
  }

  private refreshHighlight(): void {
    this.layout();
  }
}

function drawBrickThumbnail(
  g: Phaser.GameObjects.Graphics,
  level: LevelPreviewModel,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  const rows = level.cells.length;
  const columns = level.cells[0]?.length ?? 0;
  if (rows === 0 || columns === 0) {
    return;
  }

  const gap = Math.max(1, Math.min(width, height) * 0.02);
  const cellW = (width - gap * (columns - 1)) / columns;
  const cellH = (height - gap * (rows - 1)) / rows;

  g.fillStyle(0x070b14, 0.85);
  g.fillRect(x - 2, y - 2, width + 4, height + 4);

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      const cell = level.cells[row][col];
      if (!cell) {
        continue;
      }
      const cx = x + col * (cellW + gap);
      const cy = y + row * (cellH + gap);
      g.fillStyle(cell.color, 1);
      g.fillRect(cx, cy, Math.max(1, cellW), Math.max(1, cellH));
      if (cell.type === 'metal') {
        g.fillStyle(0xe9ecef, 0.85);
        g.fillRect(cx, cy, Math.max(1, cellW), Math.max(1, cellH * 0.28));
      } else if (cell.type === 'bonus') {
        g.fillStyle(0xffe66d, 1);
        g.fillRect(cx + cellW * 0.3, cy + cellH * 0.3, Math.max(1, cellW * 0.4), Math.max(1, cellH * 0.4));
      } else if (cell.type === 'cracked') {
        g.fillStyle(0x1b1b1b, 0.55);
        g.fillRect(cx + cellW * 0.4, cy + cellH * 0.15, Math.max(1, cellW * 0.12), Math.max(1, cellH * 0.7));
      }
    }
  }
}

const TYPE_ICON_COLORS: Record<BrickType, number> = {
  normal: 0xe63946,
  cracked: 0xf9c74f,
  metal: 0x8b95a1,
  bonus: 0x9b5de5,
};

const TYPE_CHIP_LABEL: Record<BrickType, string> = {
  normal: 'N',
  cracked: 'C',
  metal: 'M',
  bonus: 'B',
};

const DIFFICULTY_COLORS = [0x4ade80, 0xa3e635, 0xfacc15, 0xfb923c, 0xf43f5e] as const;

function drawTypeIcons(
  g: Phaser.GameObjects.Graphics,
  types: readonly BrickType[],
  centerX: number,
  y: number,
  maxWidth: number,
): void {
  if (types.length === 0) {
    return;
  }
  const size = Math.max(10, maxWidth * 0.12);
  const gap = size * 0.28;
  const total = types.length * size + gap * (types.length - 1);
  let x = centerX - total / 2;
  for (const type of types) {
    g.fillStyle(TYPE_ICON_COLORS[type], 1);
    g.fillRoundedRect(x, y, size, size, 3);
    if (type === 'metal') {
      g.fillStyle(0xe9ecef, 0.9);
      g.fillRect(x, y, size, size * 0.28);
    } else if (type === 'cracked') {
      g.fillStyle(0x1b1b1b, 0.7);
      g.fillRect(x + size * 0.42, y + size * 0.12, size * 0.16, size * 0.76);
    } else if (type === 'bonus') {
      g.fillStyle(0xffe66d, 1);
      g.fillTriangle(x + size / 2, y + 2, x + 2, y + size - 2, x + size - 2, y + size - 2);
    }
    x += size + gap;
  }
}

function drawDifficultyPips(
  g: Phaser.GameObjects.Graphics,
  rating: 1 | 2 | 3 | 4 | 5,
  centerX: number,
  y: number,
  maxWidth: number,
): void {
  const size = Math.max(6, maxWidth * 0.08);
  const gap = size * 0.45;
  const total = 5 * size + gap * 4;
  let x = centerX - total / 2;
  for (let i = 0; i < 5; i++) {
    const filled = i < rating;
    g.fillStyle(filled ? DIFFICULTY_COLORS[rating - 1] : 0x1f2937, filled ? 1 : 0.7);
    g.fillRoundedRect(x, y, size, size * 0.55, 2);
    x += size + gap;
  }
}

function difficultyLabel(rating: 1 | 2 | 3 | 4 | 5): string {
  return `DIFF ${rating}`;
}

function typeLetters(types: readonly BrickType[]): string {
  return types.map((type) => TYPE_CHIP_LABEL[type]).join(' ');
}
