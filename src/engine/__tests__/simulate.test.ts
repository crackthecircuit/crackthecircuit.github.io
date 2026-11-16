import { describe, expect, it } from 'vitest';
import { getLevel } from '../../levels/levels';
import { buildCircuit } from '../../levels/solutions';
import { rowInputs, simulate } from '../simulate';

const level1 = getLevel('both-switches')!; // A·B
const level7 = getLevel('three-way-switch')!; // (A·B)+C

describe('rowInputs', () => {
  it('counts in binary with the first input as the most significant bit', () => {
    expect([0, 1, 2, 3].map((i) => rowInputs(i, ['A', 'B']))).toEqual([
      { A: 0, B: 0 },
      { A: 0, B: 1 },
      { A: 1, B: 0 },
      { A: 1, B: 1 },
    ]);
    expect(rowInputs(6, ['A', 'B', 'C'])).toEqual({ A: 1, B: 1, C: 0 });
  });
});

describe('simulate', () => {
  it('evaluates all 2^n rows of the circuit the player built', () => {
    const c = buildCircuit(level7, { and: 'AND', or: 'OR' }, [
      ['A', 'and.in0'],
      ['B', 'and.in1'],
      ['and', 'or.in0'],
      ['C', 'or.in1'],
      ['or', 'Q'],
    ]);
    const result = simulate(c, level7);
    if (result.status !== 'ok') throw new Error('expected a valid circuit');
    expect(result.rows).toHaveLength(8);
    expect(result.rows.map((r) => r.outputs.Q)).toEqual([0, 1, 0, 1, 0, 1, 1, 1]);
    expect(result.allPassed).toBe(true);
    expect(result.passedCount).toBe(8);
  });

  it('marks exactly the rows a wrong circuit gets wrong', () => {
    // OR instead of AND: wrong on rows 01 and 10.
    const c = buildCircuit(level1, { g: 'OR' }, [
      ['A', 'g.in0'],
      ['B', 'g.in1'],
      ['g', 'Q'],
    ]);
    const result = simulate(c, level1);
    if (result.status !== 'ok') throw new Error('expected a valid circuit');
    expect(result.rows.map((r) => r.pass)).toEqual([true, false, false, true]);
    expect(result.allPassed).toBe(false);
    expect(result.rows[1]).toMatchObject({ outputs: { Q: 1 }, expected: { Q: 0 } });
  });

  it('judges the circuit, not which gates were placed', () => {
    // Level 1 expects AND. A NOR of two inverted inputs is also AND (De Morgan), so it passes.
    const c = buildCircuit(level1, { na: 'NOT', nb: 'NOT', nor: 'NOR' }, [
      ['A', 'na.in0'],
      ['B', 'nb.in0'],
      ['na', 'nor.in0'],
      ['nb', 'nor.in1'],
      ['nor', 'Q'],
    ]);
    const result = simulate(c, level1);
    expect(result.status === 'ok' && result.allPassed).toBe(true);
  });

  it('reports the value on every wire for row inspection', () => {
    const c = buildCircuit(level1, { g: 'AND', spare: 'NOT' }, [
      ['A', 'g.in0'], // w0
      ['B', 'g.in1'], // w1
      ['g', 'Q'], // w2
      ['A', 'spare.in0'], // w3: into an unused gate
    ]);
    const result = simulate(c, level1);
    if (result.status !== 'ok') throw new Error('expected a valid circuit');
    expect(result.rows[2]!.wireValues).toEqual({ w0: 1, w1: 0, w2: 0, w3: 1 });
    expect(result.rows[3]!.wireValues).toEqual({ w0: 1, w1: 1, w2: 1, w3: 1 });
    expect(result.unusedGateIds).toEqual(['spare']);
  });

  it('lets one output fan out to several inputs', () => {
    const level8 = getLevel('exactly-one')!;
    const c = buildCircuit(level8, { and: 'AND' }, [
      ['A', 'and.in0'],
      ['A', 'and.in1'],
      ['and', 'Q'],
    ]);
    const result = simulate(c, level8);
    if (result.status !== 'ok') throw new Error('expected a valid circuit');
    expect(result.rows.map((r) => r.outputs.Q)).toEqual([0, 0, 1, 1]);
  });

  it('returns errors instead of rows for an invalid circuit', () => {
    const c = buildCircuit(level1, { g: 'AND' }, [
      ['A', 'g.in0'],
      ['g', 'Q'],
    ]);
    const result = simulate(c, level1);
    expect(result.status).toBe('invalid');
    expect(result.status === 'invalid' && result.errors[0]!.code).toBe('FLOATING_INPUT');
  });
});
