import { describe, expect, it } from 'vitest';
import { evaluateGate, GATE_SPECS } from '../gates';
import type { Bit, GateType } from '../types';

// Expected outputs for inputs (a, b) = 00, 01, 10, 11.
const TABLES: Record<Exclude<GateType, 'NOT'>, Bit[]> = {
  AND: [0, 0, 0, 1],
  OR: [0, 1, 1, 1],
  NAND: [1, 1, 1, 0],
  NOR: [1, 0, 0, 0],
  XOR: [0, 1, 1, 0],
};
const PAIRS: [Bit, Bit][] = [
  [0, 0],
  [0, 1],
  [1, 0],
  [1, 1],
];

describe('gates', () => {
  for (const [type, outputs] of Object.entries(TABLES) as [GateType, Bit[]][]) {
    it(`${type} matches its truth table`, () => {
      expect(PAIRS.map(([a, b]) => evaluateGate(type, a, b))).toEqual(outputs);
    });
  }

  it('NOT flips its input', () => {
    expect(evaluateGate('NOT', 0)).toBe(1);
    expect(evaluateGate('NOT', 1)).toBe(0);
  });

  it('NOT has one input and the other gates have two', () => {
    expect(GATE_SPECS.NOT.inputs).toEqual(['in0']);
    for (const type of ['AND', 'OR', 'NAND', 'NOR', 'XOR'] as const) {
      expect(GATE_SPECS[type].inputs).toEqual(['in0', 'in1']);
    }
  });
});
