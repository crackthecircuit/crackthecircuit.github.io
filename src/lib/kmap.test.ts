import { describe, expect, it } from 'vitest';
import { hasKMap, kmapLayout } from './kmap';

describe('K-map layout', () => {
  it('uses Gray code so neighbouring cells differ in one variable', () => {
    const { cells } = kmapLayout(['A', 'B', 'C', 'D']);
    const oneBit = (x: number) => x !== 0 && (x & (x - 1)) === 0;
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        expect(oneBit(cells[r]![c]! ^ cells[r]![(c + 1) % 4]!)).toBe(true); // wraps around, as on the slides
        expect(oneBit(cells[r]![c]! ^ cells[(r + 1) % 4]![c]!)).toBe(true);
      }
    }
  });

  it('matches the slide layouts for 2, 3 and 4 variables', () => {
    // 2 variables: one row, AB = 00 01 11 10
    expect(kmapLayout(['A', 'B']).cells).toEqual([[0, 1, 3, 2]]);
    // 3 variables: A rows, BC columns. A'BC' (row 2) sits at A=0, BC=10.
    const three = kmapLayout(['A', 'B', 'C']);
    expect(three.rowVars).toEqual(['A']);
    expect(three.colVars).toEqual(['B', 'C']);
    expect(three.cells).toEqual([
      [0, 1, 3, 2],
      [4, 5, 7, 6],
    ]);
    // 4 variables: AB rows, CD columns. AB'CD (row 11) sits at AB=10, CD=11.
    const four = kmapLayout(['A', 'B', 'C', 'D']);
    expect(four.cells[3]![2]).toBe(0b1011);
    expect(new Set(four.cells.flat()).size).toBe(16);
  });

  it('is offered for 2–4 inputs only', () => {
    expect([1, 2, 3, 4, 5].map((n) => hasKMap(Array(n).fill('X')))).toEqual([false, true, true, true, false]);
  });
});
