// Board world coordinates. The SVG viewBox uses these units and scales to the window,
// so zoom/pan can be added later without touching stored positions.
export const BOARD_WIDTH = 960;
export const BOARD_HEIGHT = 600;
export const GRID = 20;

export const INPUT_TERMINAL_X = 80;
export const OUTPUT_TERMINAL_X = BOARD_WIDTH - 80;

export const snapToGrid = (value: number) => Math.round(value / GRID) * GRID;
