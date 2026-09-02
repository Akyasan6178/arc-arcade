import Phaser from 'phaser';
import type { ProgressRow } from '@entities/dx-ball/Progress';
import { fittedRowHeight } from '@ui/menuLayout';

/**
 * ui/ProgressList.ts
 *
 * DXB-16: Reusable catalog list for unlockables / achievements. Not
 * DX-Ball-specific beyond consuming a `ProgressRow` shape (title,
 * requirement, percent, locked/unlocked). Arrow keys move; Space /
 * Enter / click confirm an unlocked selectable row. Locked rows can be
 * highlighted so the requirement is readable, but they do not confirm.
 *
 * DXB-18: `onHighlight` fires when the highlight moves (garage live
 * preview). `favorite` on a row is shown next to equipped. `getSelectedId()`
 * lets a scene favorite the highlighted item without confirming it.
 *
 * DXB-25: `completeChrome` paints gold cards, a completion ribbon, and
 * a badge on finished achievement rows so completion is obvious.
 */

export interface ProgressListConfig {
  color?: string;
  highlightColor?: string;
  descriptionColor?: string;
  mutedColor?: string;
  completeColor?: string;
  titleFontSizeRatio?: number;
  descriptionFontSizeRatio?: number;
  rowHeightRatio?: number;
  depth?: number;
  /** When false, confirm is a no-op even on unlocked rows (achievements). */
  selectable?: boolean;
  /** Label used at 100% (UNLOCKED for cosmetics, COMPLETE for achievements). */
  completeLabel?: string;
  /**
   * DXB-25: Gold border, glow, ribbon, and a completion badge on
   * finished rows. Achievements turn this on; Garage leaves it off.
   */
  completeChrome?: boolean;
  /** DXB-18: Index highlighted when the list is created. */
  initialIndex?: number;
  /** DXB-18: Fires when the highlight moves, before confirm. */
  onHighlight?: (id: string) => void;
}

const HUD_FONT_FAMILY = 'Trebuchet MS, Segoe UI, sans-serif';
const HUD_DEPTH = 20;

const DEFAULT_CONFIG: Required<Omit<ProgressListConfig, 'onHighlight' | 'initialIndex'>> = {
  color: '#c5d0dc',
  highlightColor: '#f8f9fa',
  descriptionColor: '#90e0ef',
  mutedColor: '#6c7a89',
  completeColor: '#95d5b2',
  titleFontSizeRatio: 0.032,
  descriptionFontSizeRatio: 0.018,
  rowHeightRatio: 0.1,
  depth: HUD_DEPTH,
  selectable: true,
  completeLabel: 'UNLOCKED',
  completeChrome: false,
};

interface ProgressListRow {
  chrome: Phaser.GameObjects.Graphics;
  title: Phaser.GameObjects.Text;
  description: Phaser.GameObjects.Text;
  badge: Phaser.GameObjects.Text;
}

export class ProgressList {
  private readonly scene: Phaser.Scene;
  private readonly onSelect: (id: string) => void;
  private readonly config: Required<Omit<ProgressListConfig, 'onHighlight' | 'initialIndex'>> &
    Pick<ProgressListConfig, 'onHighlight' | 'initialIndex'>;
  private readonly visualRows: ProgressListRow[] = [];
  private items: readonly ProgressRow[] = [];
  private selectedIndex = 0;
  private viewportWidth = 0;
  private viewportHeight = 0;
  private originY = 0;
  private destroyed = false;
  private readonly onUp = (): void => this.moveSelection(-1);
  private readonly onDown = (): void => this.moveSelection(1);
  private readonly onEnter = (): void => this.confirm();
  private readonly onSpace = (): void => this.confirm();

  constructor(
    scene: Phaser.Scene,
    viewportWidth: number,
    viewportHeight: number,
    originY: number,
    items: readonly ProgressRow[],
    onSelect: (id: string) => void,
    config: ProgressListConfig = {},
  ) {
    this.scene = scene;
    this.onSelect = onSelect;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;
    this.originY = originY;
    this.items = items;
    this.selectedIndex = Phaser.Math.Clamp(
      config.initialIndex ?? 0,
      0,
      Math.max(0, items.length - 1),
    );

    for (let i = 0; i < items.length; i++) {
      const chrome = scene.add.graphics().setDepth(this.config.depth - 1);

      const title = scene.add
        .text(0, 0, '', {
          fontFamily: HUD_FONT_FAMILY,
          fontSize: '16px',
          color: this.config.color,
          fontStyle: 'bold',
          align: 'center',
          stroke: '#0b1320',
          strokeThickness: 5,
        })
        .setOrigin(0.5, 0)
        .setShadow(1, 2, '#000000', 3, true, true)
        .setDepth(this.config.depth)
        .setInteractive({ useHandCursor: true });

      const description = scene.add
        .text(0, 0, '', {
          fontFamily: HUD_FONT_FAMILY,
          fontSize: '12px',
          color: this.config.mutedColor,
          align: 'center',
          wordWrap: { width: viewportWidth * 0.84 },
          stroke: '#0b1320',
          strokeThickness: 3,
        })
        .setOrigin(0.5, 0)
        .setShadow(1, 2, '#000000', 2, true, true)
        .setDepth(this.config.depth)
        .setInteractive({ useHandCursor: true });

      const badge = scene.add
        .text(0, 0, '', {
          fontFamily: HUD_FONT_FAMILY,
          fontSize: '10px',
          color: '#1b1404',
          fontStyle: 'bold',
          align: 'center',
          stroke: '#ffd166',
          strokeThickness: 2,
        })
        .setOrigin(1, 0)
        .setDepth(this.config.depth)
        .setVisible(false);

      const selectIndex = i;
      title.on('pointerover', () => this.setSelectedIndex(selectIndex));
      description.on('pointerover', () => this.setSelectedIndex(selectIndex));
      title.on('pointerup', () => this.confirm());
      description.on('pointerup', () => this.confirm());

      this.visualRows.push({ chrome, title, description, badge });
    }

    this.layout();
    this.refreshHighlight();
    this.bindKeyboard();
  }

  /** Highlighted row id, or undefined when the list is empty. */
  getSelectedId(): string | undefined {
    return this.items[this.selectedIndex]?.id;
  }

  setItems(items: readonly ProgressRow[]): void {
    if (this.destroyed) {
      return;
    }

    this.items = items;
    this.selectedIndex = Phaser.Math.Clamp(this.selectedIndex, 0, Math.max(0, items.length - 1));
    this.refreshHighlight();
  }

  destroy(): void {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;
    const keyboard = this.scene.input.keyboard;
    keyboard?.off('keydown-UP', this.onUp);
    keyboard?.off('keydown-DOWN', this.onDown);
    keyboard?.off('keydown-ENTER', this.onEnter);
    keyboard?.off('keydown-SPACE', this.onSpace);

    for (const row of this.visualRows) {
      row.chrome.destroy();
      row.title.destroy();
      row.description.destroy();
      row.badge.destroy();
    }
    this.visualRows.length = 0;
  }

  resize(viewportWidth: number, viewportHeight: number, originY: number): void {
    if (this.destroyed) {
      return;
    }

    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;
    this.originY = originY;
    this.layout();
  }

  private bindKeyboard(): void {
    const keyboard = this.scene.input.keyboard;
    if (!keyboard) {
      return;
    }

    keyboard.on('keydown-UP', this.onUp);
    keyboard.on('keydown-DOWN', this.onDown);
    keyboard.on('keydown-ENTER', this.onEnter);
    keyboard.on('keydown-SPACE', this.onSpace);
  }

  private moveSelection(delta: number): void {
    if (this.destroyed || this.items.length === 0) {
      return;
    }

    const next = (this.selectedIndex + delta + this.items.length) % this.items.length;
    this.setSelectedIndex(next);
  }

  private setSelectedIndex(index: number): void {
    if (this.destroyed || index === this.selectedIndex) {
      return;
    }

    this.selectedIndex = index;
    this.refreshHighlight();
    const id = this.items[index]?.id;
    if (id) {
      this.config.onHighlight?.(id);
    }
  }

  private confirm(): void {
    if (this.destroyed || !this.config.selectable) {
      return;
    }

    const item = this.items[this.selectedIndex];
    if (!item || !item.unlocked) {
      return;
    }

    this.onSelect(item.id);
  }

  private layout(): void {
    const titleSize = Math.max(12, Math.round(this.viewportHeight * this.config.titleFontSizeRatio));
    const descriptionSize = Math.max(
      10,
      Math.round(this.viewportHeight * this.config.descriptionFontSizeRatio),
    );
    const rowHeight = fittedRowHeight(
      this.viewportHeight,
      this.originY,
      this.visualRows.length,
      this.config.rowHeightRatio,
      this.viewportHeight * 0.9,
    );
    const wrapWidth = this.viewportWidth * (this.config.completeChrome ? 0.7 : 0.84);
    const cardW = this.viewportWidth * 0.86;
    const cardX = (this.viewportWidth - cardW) / 2;

    for (let i = 0; i < this.visualRows.length; i++) {
      const row = this.visualRows[i];
      const item = this.items[i];
      const y = this.originY + i * rowHeight;
      const cardH = rowHeight * 0.88;
      row.title.setPosition(this.viewportWidth / 2, y + (this.config.completeChrome ? cardH * 0.12 : 0));
      row.title.setFontSize(titleSize);
      row.description.setPosition(
        this.viewportWidth / 2,
        y + (this.config.completeChrome ? cardH * 0.12 : 0) + titleSize * 1.12,
      );
      row.description.setFontSize(descriptionSize);
      row.description.setWordWrapWidth(wrapWidth);
      row.badge.setPosition(cardX + 14, y + 8);
      row.badge.setFontSize(Math.max(9, Math.round(descriptionSize * 0.95)));
      row.badge.setOrigin(0, 0);
      this.drawRowChrome(row, item, cardX, y, cardW, cardH, i === this.selectedIndex);
    }
  }

  private refreshHighlight(): void {
    for (let i = 0; i < this.visualRows.length; i++) {
      const item = this.items[i];
      const row = this.visualRows[i];
      if (!item) {
        continue;
      }

      const selected = i === this.selectedIndex;
      const complete = Boolean(item.complete);
      row.title.setText(selected ? `>  ${item.title}  <` : item.title);
      row.title.setColor(
        selected
          ? complete && this.config.completeChrome
            ? '#ffe8a3'
            : this.config.highlightColor
          : complete && this.config.completeChrome
            ? '#ffd166'
            : item.unlocked
              ? this.config.color
              : this.config.mutedColor,
      );
      row.description.setText(
        `${ProgressList.statusLabel(item, this.config.completeLabel)}  ·  ${item.requirement}`,
      );
      row.description.setColor(
        selected
          ? complete
            ? this.config.completeColor
            : this.config.descriptionColor
          : complete
            ? this.config.completeColor
            : this.config.mutedColor,
      );
      row.badge.setVisible(this.config.completeChrome && complete);
      row.badge.setText(complete ? '✓ COMPLETE' : '');
    }

    if (this.config.completeChrome) {
      this.layout();
    }
  }

  private drawRowChrome(
    row: ProgressListRow,
    item: ProgressRow | undefined,
    x: number,
    y: number,
    width: number,
    height: number,
    selected: boolean,
  ): void {
    row.chrome.clear();
    if (!this.config.completeChrome || !item) {
      return;
    }

    const radius = Math.max(6, height * 0.18);
    const complete = item.complete;
    if (complete) {
      row.chrome.fillStyle(0xffd166, selected ? 0.28 : 0.18);
      row.chrome.fillRoundedRect(x - 4, y - 3, width + 8, height + 6, radius + 2);
      row.chrome.fillStyle(0x2a2108, 0.92);
      row.chrome.fillRoundedRect(x, y, width, height, radius);
      row.chrome.lineStyle(selected ? 3.5 : 2.5, 0xffd166, 1);
      row.chrome.strokeRoundedRect(x, y, width, height, radius);
      row.chrome.fillStyle(0xe11d48, 1);
      row.chrome.fillTriangle(x + width - 46, y, x + width, y, x + width, y + 46);
      row.chrome.fillStyle(0xffd166, 1);
      row.chrome.fillTriangle(x + width - 28, y, x + width, y, x + width, y + 28);
    } else {
      row.chrome.fillStyle(0x12182c, selected ? 0.88 : 0.72);
      row.chrome.fillRoundedRect(x, y, width, height, radius);
      row.chrome.lineStyle(selected ? 2 : 1, selected ? 0x90e0ef : 0x2a3348, 0.9);
      row.chrome.strokeRoundedRect(x, y, width, height, radius);
      const barW = width * 0.72;
      const barH = Math.max(4, height * 0.08);
      const barX = x + (width - barW) / 2;
      const barY = y + height - barH - 8;
      row.chrome.fillStyle(0x0b1320, 0.9);
      row.chrome.fillRoundedRect(barX, barY, barW, barH, 2);
      row.chrome.fillStyle(0x90e0ef, 0.85);
      row.chrome.fillRoundedRect(barX, barY, barW * (item.percent / 100), barH, 2);
    }
  }

  private static statusLabel(item: ProgressRow, completeLabel: string): string {
    const marks: string[] = [];
    if (item.equipped) {
      marks.push('EQUIPPED');
    }
    if (item.favorite) {
      marks.push('FAVORITE');
    }
    if (marks.length > 0) {
      return marks.join('  ·  ');
    }
    if (item.complete || item.unlocked) {
      return `${completeLabel}  100%`;
    }
    return `LOCKED  ${item.percent}%  (${item.current}/${item.target})`;
  }
}
