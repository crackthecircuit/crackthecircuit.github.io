// Board world coordinates. The SVG viewBox uses these units; zoom/pan (src/lib/view.ts) only changes the
// viewBox, never stored positions.
//
// The board is an open canvas. The 960×600 "home" area is where a level's terminals sit; gates may go anywhere
// within the canvas limits, one home-area size beyond it on every side.
export const BOARD_WIDTH = 960;
export const BOARD_HEIGHT = 600;
export const GRID = 20;

export const CANVAS = {
  minX: -BOARD_WIDTH,
  minY: -BOARD_HEIGHT,
  maxX: BOARD_WIDTH * 2,
  maxY: BOARD_HEIGHT * 2,
} as const;

export const INPUT_TERMINAL_X = 80;
export const OUTPUT_TERMINAL_X = BOARD_WIDTH - 80;

export const snapToGrid = (value: number) => Math.round(value / GRID) * GRID;
