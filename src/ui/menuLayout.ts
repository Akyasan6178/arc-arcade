import Phaser from 'phaser';
import type { ViewportSnapshot } from '@systems/GameViewport';

/**
 * ui/menuLayout.ts
 *
 * DXB-20: Shared menu chrome tokens so Hub / Theme Select / Mode Select /
 * Garage / Statistics / Achievements / Settings use the same title,
 * subtitle, hint, and Back placement. Layout only — not a new screen.
 */

export const MENU_FONT_FAMILY = 'Trebuchet MS, Segoe UI, sans-serif';
export const MENU_STROKE = '#0b1320';
export const MENU_DEPTH = 20;

export const MENU_LAYOUT = {
  titleYRatio: 0.04,
  titleFontRatio: 0.06,
  titleMinPx: 22,
  subtitleYRatio: 0.105,
  subtitleFontRatio: 0.024,
  subtitleMinPx: 14,
  extraLineYRatio: 0.145,
  extraLineFontRatio: 0.018,
  extraLineMinPx: 12,
  tabYRatio: 0.155,
  contentYRatio: 0.21,
  menuYRatio: 0.22,
  compactMenuYRatio: 0.155,
  hintYRatio: 0.955,
  hintFontRatio: 0.018,
  hintMinPx: 12,
  backFontRatio: 0.022,
  backMinPx: 14,
  sideRatio: 0.08,
  contentBottomRatio: 0.90,
  minRowRatio: 0.036,
} as const;

export function menuFontSize(viewportHeight: number, ratio: number, minPx: number): number {
  return Math.max(minPx, Math.round(viewportHeight * ratio));
}

export function menuTitleY(snapshot: ViewportSnapshot): number {
  return snapshot.safeArea.top + snapshot.height * MENU_LAYOUT.titleYRatio;
}

export function menuSubtitleY(snapshot: ViewportSnapshot): number {
  return snapshot.safeArea.top + snapshot.height * MENU_LAYOUT.subtitleYRatio;
}

export function menuExtraLineY(snapshot: ViewportSnapshot): number {
  return snapshot.safeArea.top + snapshot.height * MENU_LAYOUT.extraLineYRatio;
}

export function menuTabY(snapshot: ViewportSnapshot): number {
  return snapshot.safeArea.top + snapshot.height * MENU_LAYOUT.tabYRatio;
}

export function menuContentY(snapshot: ViewportSnapshot): number {
  return snapshot.safeArea.top + snapshot.height * MENU_LAYOUT.contentYRatio;
}

export function menuOriginY(snapshot: ViewportSnapshot, compact = false): number {
  const ratio = compact ? MENU_LAYOUT.compactMenuYRatio : MENU_LAYOUT.menuYRatio;
  return snapshot.safeArea.top + snapshot.height * ratio;
}

export function menuHintY(snapshot: ViewportSnapshot): number {
  return snapshot.height - snapshot.safeArea.bottom - snapshot.height * (1 - MENU_LAYOUT.hintYRatio);
}

export function menuBackX(snapshot: ViewportSnapshot): number {
  return Math.max(snapshot.width * MENU_LAYOUT.sideRatio, snapshot.safeArea.left + 12);
}

export function menuHintX(snapshot: ViewportSnapshot): number {
  return snapshot.width - Math.max(snapshot.width * MENU_LAYOUT.sideRatio, snapshot.safeArea.right + 12);
}

export function menuContentBottom(snapshot: ViewportSnapshot): number {
  return snapshot.height * MENU_LAYOUT.contentBottomRatio - snapshot.safeArea.bottom;
}

export function menuRuleY(snapshot: ViewportSnapshot): number {
  return menuSubtitleY(snapshot) + menuFontSize(snapshot.height, MENU_LAYOUT.subtitleFontRatio, MENU_LAYOUT.subtitleMinPx) * 1.45;
}

export function createMenuRule(
  scene: Phaser.Scene,
  snapshot: ViewportSnapshot,
  color: number,
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics().setDepth(MENU_DEPTH);
  layoutMenuRule(g, snapshot, color);
  return g;
}

export function layoutMenuRule(
  g: Phaser.GameObjects.Graphics,
  snapshot: ViewportSnapshot,
  color: number,
): void {
  const y = menuRuleY(snapshot);
  const width = snapshot.width * 0.16;
  g.clear();
  g.fillStyle(color, 0.95);
  g.fillRect(snapshot.width / 2 - width / 2, y, width, 3);
}

export function createMenuVersion(
  scene: Phaser.Scene,
  snapshot: ViewportSnapshot,
  color: string,
  caption: string,
): Phaser.GameObjects.Text {
  return scene.add
    .text(menuBackX(snapshot), menuHintY(snapshot), caption, {
      fontFamily: MENU_FONT_FAMILY,
      fontSize: `${menuFontSize(snapshot.height, MENU_LAYOUT.hintFontRatio, MENU_LAYOUT.hintMinPx)}px`,
      color,
      align: 'left',
      stroke: MENU_STROKE,
      strokeThickness: 3,
    })
    .setOrigin(0, 1)
    .setShadow(1, 2, '#000000', 3, true, true)
    .setDepth(MENU_DEPTH);
}

export function layoutMenuVersion(text: Phaser.GameObjects.Text, snapshot: ViewportSnapshot): void {
  text.setPosition(menuBackX(snapshot), menuHintY(snapshot));
  text.setFontSize(menuFontSize(snapshot.height, MENU_LAYOUT.hintFontRatio, MENU_LAYOUT.hintMinPx));
}

export function fittedRowHeight(
  viewportHeight: number,
  originY: number,
  count: number,
  rowHeightRatio: number,
  bottomY: number,
): number {
  const natural = viewportHeight * rowHeightRatio;
  if (count <= 0) {
    return natural;
  }

  const available = bottomY - originY;
  if (available <= 0) {
    return natural;
  }

  const minRow = viewportHeight * MENU_LAYOUT.minRowRatio;
  return Math.min(natural, Math.max(minRow, available / count));
}

export function createMenuTitle(
  scene: Phaser.Scene,
  snapshot: ViewportSnapshot,
  color: string,
  caption = 'DX-BALL',
): Phaser.GameObjects.Text {
  return scene.add
    .text(snapshot.width / 2, menuTitleY(snapshot), caption, {
      fontFamily: MENU_FONT_FAMILY,
      fontSize: `${menuFontSize(snapshot.height, MENU_LAYOUT.titleFontRatio, MENU_LAYOUT.titleMinPx)}px`,
      color,
      fontStyle: 'bold',
      align: 'center',
      stroke: MENU_STROKE,
      strokeThickness: 8,
    })
    .setOrigin(0.5, 0)
    .setShadow(1, 3, '#000000', 4, true, true)
    .setDepth(MENU_DEPTH);
}

export function layoutMenuTitle(
  text: Phaser.GameObjects.Text,
  snapshot: ViewportSnapshot,
): void {
  text.setPosition(snapshot.width / 2, menuTitleY(snapshot));
  text.setFontSize(menuFontSize(snapshot.height, MENU_LAYOUT.titleFontRatio, MENU_LAYOUT.titleMinPx));
}

export function createMenuSubtitle(
  scene: Phaser.Scene,
  snapshot: ViewportSnapshot,
  color: string,
  caption: string,
): Phaser.GameObjects.Text {
  return scene.add
    .text(snapshot.width / 2, menuSubtitleY(snapshot), caption, {
      fontFamily: MENU_FONT_FAMILY,
      fontSize: `${menuFontSize(snapshot.height, MENU_LAYOUT.subtitleFontRatio, MENU_LAYOUT.subtitleMinPx)}px`,
      color,
      fontStyle: 'bold',
      align: 'center',
      stroke: MENU_STROKE,
      strokeThickness: 4,
    })
    .setOrigin(0.5, 0)
    .setShadow(1, 2, '#000000', 3, true, true)
    .setDepth(MENU_DEPTH);
}

export function layoutMenuSubtitle(
  text: Phaser.GameObjects.Text,
  snapshot: ViewportSnapshot,
): void {
  text.setPosition(snapshot.width / 2, menuSubtitleY(snapshot));
  text.setFontSize(
    menuFontSize(snapshot.height, MENU_LAYOUT.subtitleFontRatio, MENU_LAYOUT.subtitleMinPx),
  );
}

export function createMenuHint(
  scene: Phaser.Scene,
  snapshot: ViewportSnapshot,
  color: string,
  caption: string,
  align: 'center' | 'right' = 'right',
): Phaser.GameObjects.Text {
  const x = align === 'center' ? snapshot.width / 2 : menuHintX(snapshot);
  return scene.add
    .text(x, menuHintY(snapshot), caption, {
      fontFamily: MENU_FONT_FAMILY,
      fontSize: `${menuFontSize(snapshot.height, MENU_LAYOUT.hintFontRatio, MENU_LAYOUT.hintMinPx)}px`,
      color,
      align,
      stroke: MENU_STROKE,
      strokeThickness: 3,
      wordWrap: { width: snapshot.width * (align === 'center' ? 0.86 : 0.62) },
    })
    .setOrigin(align === 'center' ? 0.5 : 1, 1)
    .setShadow(1, 2, '#000000', 3, true, true)
    .setDepth(MENU_DEPTH);
}

export function layoutMenuHint(
  text: Phaser.GameObjects.Text,
  snapshot: ViewportSnapshot,
  align: 'center' | 'right' = 'right',
): void {
  const x = align === 'center' ? snapshot.width / 2 : menuHintX(snapshot);
  text.setPosition(x, menuHintY(snapshot));
  text.setFontSize(menuFontSize(snapshot.height, MENU_LAYOUT.hintFontRatio, MENU_LAYOUT.hintMinPx));
  text.setWordWrapWidth(snapshot.width * (align === 'center' ? 0.86 : 0.62));
}
