// Karnaugh map layout, matching the BCIS 1302 slides:
//   2 variables: one row, columns AB = 00 01 11 10
//   3 variables: rows A = 0 1, columns BC = 00 01 11 10
//   4 variables: rows AB = 00 01 11 10, columns CD = 00 01 11 10
// Axes use Gray code, so neighbouring cells differ in exactly one variable.

const GRAY: Record<number, number[]> = { 0: [0], 1: [0, 1], 2: [0, 1, 3, 2] };

export interface KMapLayout {
  rowVars: string[];
  colVars: string[];
  /** Gray-code values along each axis. */
  rowCodes: number[];
  colCodes: number[];
  /** Truth-table row index for each cell, [row][col]. */
  cells: number[][];
}

/** Whether a level's inputs can be shown as a K-map (2–4 variables). */
export const hasKMap = (inputs: string[]) => inputs.length >= 2 && inputs.length <= 4;

export function kmapLayout(inputs: string[]): KMapLayout {
  const n = inputs.length;
  const rowCount = n === 2 ? 0 : n === 3 ? 1 : 2;
  const rowVars = inputs.slice(0, rowCount);
  const colVars = inputs.slice(rowCount);
  const rowCodes = GRAY[rowVars.length]!;
  const colCodes = GRAY[colVars.length]!;
  // Truth-table rows count in binary with the first input as the most significant bit,
  // so a cell's index is (row bits, then column bits) read as one binary number.
  const cells = rowCodes.map((r) => colCodes.map((c) => (r << colVars.length) | c));
  return { rowVars, colVars, rowCodes, colCodes, cells };
}

export const bits = (value: number, width: number) => value.toString(2).padStart(width, '0');
