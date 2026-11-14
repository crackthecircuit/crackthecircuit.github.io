import { describe, expect, it } from 'vitest';
import { countGates, GATE_TYPES, gateInputCount, simulate } from '../engine';
import { LEVELS } from './levels';
import { gateSizeRange } from './rules';
import { buildCircuit, SOLUTIONS } from './solutions';
import { isUsableBoard } from './startingCircuit';

describe('level data', () => {
  it('has 15 levels numbered 1–15 with unique ids', () => {
    expect(LEVELS.map((l) => l.number)).toEqual(Array.from({ length: 15 }, (_, i) => i + 1));
    expect(new Set(LEVELS.map((l) => l.id)).size).toBe(LEVELS.length);
  });

  it('only level 8 unlocks a gate (XOR), and XOR only appears in palettes after it', () => {
    expect(LEVELS.filter((l) => l.unlocksGate).map((l) => [l.number, l.unlocksGate])).toEqual([[8, 'XOR']]);
    for (const l of LEVELS) if (l.palette.includes('XOR')) expect(l.number).toBeGreaterThan(8);
  });

  it('keeps levels 1–11 to 2-input gates; wide gates arrive at level 12', () => {
    for (const l of LEVELS) {
      if (l.number <= 11) expect(l.maxGateInputs ?? 2).toBe(2);
    }
    expect(LEVELS.find((l) => l.number === 12)!.maxGateInputs).toBe(4);
  });

  for (const level of LEVELS) {
    describe(`${level.number}. ${level.title}`, () => {
      it('has a complete truth table, a valid palette and three hints', () => {
        for (const out of level.outputs) expect(level.expected[out]).toHaveLength(2 ** level.inputs.length);
        expect(level.palette.length).toBeGreaterThan(0);
        for (const g of level.palette) expect(GATE_TYPES).toContain(g);
        expect(level.hints.every((h) => h.trim().length > 0)).toBe(true);
      });

      it('has a reference solution that passes every row at exactly par, within the level’s rules', () => {
        const recipe = SOLUTIONS[level.id];
        expect(recipe, 'missing reference solution').toBeDefined();
        const circuit = buildCircuit(level, recipe!.gates, recipe!.wires);

        for (const node of circuit.nodes) {
          if (node.kind !== 'gate') continue;
          expect(level.palette).toContain(node.gateType);
          expect(gateInputCount(node)).toBeLessThanOrEqual(gateSizeRange(node.gateType, level).max);
        }
        expect(isUsableBoard(circuit, level)).toBe(true);

        const result = simulate(circuit, level);
        expect(result.status === 'invalid' ? result.errors : []).toEqual([]);
        expect(result.status === 'ok' && result.allPassed).toBe(true);
        expect(countGates(circuit)).toBe(level.par);
      });
    });
  }
});
