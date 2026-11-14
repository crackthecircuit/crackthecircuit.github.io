import { describe, expect, it } from 'vitest';
import { describePort, evaluateGate, gateInputCount, GATE_SPECS, portsOf } from '../gates';
import type { Bit, GateNode, GateType } from '../types';

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

/** Every combination of n bits, in row order. */
const combos = (n: number): Bit[][] =>
  Array.from({ length: 2 ** n }, (_, i) =>
    Array.from({ length: n }, (_, j) => ((i >> (n - 1 - j)) & 1) as Bit),
  );

const gate = (gateType: GateType, inputs?: number): GateNode => ({
  id: 'g',
  kind: 'gate',
  gateType,
  inputs,
  pos: { x: 0, y: 0 },
});

describe('gates', () => {
  for (const [type, outputs] of Object.entries(TABLES) as [GateType, Bit[]][]) {
    it(`2-input ${type} matches its truth table`, () => {
      expect(PAIRS.map((pair) => evaluateGate(type, pair))).toEqual(outputs);
    });
  }

  it('NOT flips its input', () => {
    expect(evaluateGate('NOT', [0])).toBe(1);
    expect(evaluateGate('NOT', [1])).toBe(0);
  });

  it('wide gates generalise: AND = all, OR = any, NAND/NOR invert them, XOR = odd count', () => {
    for (const n of [3, 4]) {
      for (const bits of combos(n)) {
        const ones = bits.filter((b) => b === 1).length;
        expect(evaluateGate('AND', bits)).toBe(ones === n ? 1 : 0);
        expect(evaluateGate('OR', bits)).toBe(ones > 0 ? 1 : 0);
        expect(evaluateGate('NAND', bits)).toBe(ones === n ? 0 : 1);
        expect(evaluateGate('NOR', bits)).toBe(ones > 0 ? 0 : 1);
        expect(evaluateGate('XOR', bits)).toBe(ones % 2 === 1 ? 1 : 0);
      }
    }
  });

  it('gives gates 2–4 inputs (NOT always 1), defaulting to the minimum', () => {
    expect(portsOf(gate('AND')).inputs).toEqual(['in0', 'in1']);
    expect(portsOf(gate('AND', 4)).inputs).toEqual(['in0', 'in1', 'in2', 'in3']);
    expect(gateInputCount(gate('OR', 9))).toBe(4);
    expect(gateInputCount(gate('NOT', 3))).toBe(1);
    expect(GATE_SPECS.NOT.maxInputs).toBe(1);
  });

  it('names ports in plain language', () => {
    expect(describePort(gate('AND'), 'in1')).toBe('bottom input');
    expect(describePort(gate('AND', 3), 'in2')).toBe('input 3 (from the top)');
    expect(describePort(gate('NOT'), 'in0')).toBe('input');
  });
});
