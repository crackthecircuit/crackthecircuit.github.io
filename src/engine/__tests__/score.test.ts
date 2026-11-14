import { describe, expect, it } from 'vitest';
import { getLevel } from '../../levels/levels';
import { buildCircuit } from '../../levels/solutions';
import { countGates, score } from '../score';

describe('score', () => {
  it('gives no stars when the circuit fails', () => {
    expect(score(false, 1, 1)).toBe(0);
  });

  it('gives 3 stars at or under par, 2 within two gates, otherwise 1', () => {
    expect(score(true, 3, 4)).toBe(3);
    expect(score(true, 4, 4)).toBe(3);
    expect(score(true, 6, 4)).toBe(2);
    expect(score(true, 7, 4)).toBe(1);
  });

  it('counts every gate on the board, including unused ones', () => {
    const level1 = getLevel('level-1')!;
    const c = buildCircuit(level1, { g: 'AND', spare: 'OR' }, [
      ['A', 'g.in0'],
      ['B', 'g.in1'],
      ['g', 'Q'],
    ]);
    expect(countGates(c)).toBe(2);
  });
});
