import { describe, expect, it } from 'vitest';
import { countGates, GATE_TYPES, simulate } from '../engine';
import { LEVELS } from './levels';
import { buildCircuit, SOLUTIONS } from './solutions';

describe('level data', () => {
  it('has 10 levels numbered 1–10 with unique ids', () => {
    expect(LEVELS.map((l) => l.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(new Set(LEVELS.map((l) => l.id)).size).toBe(LEVELS.length);
  });

  it('only level 8 unlocks a gate (XOR), and XOR only appears in palettes after it', () => {
    expect(LEVELS.filter((l) => l.unlocksGate).map((l) => [l.number, l.unlocksGate])).toEqual([[8, 'XOR']]);
    for (const l of LEVELS) if (l.palette.includes('XOR')) expect(l.number).toBeGreaterThan(8);
  });

  for (const level of LEVELS) {
    describe(`${level.number}. ${level.title}`, () => {
      it('has a complete truth table, a valid palette and three hints', () => {
        for (const out of level.outputs) expect(level.expected[out]).toHaveLength(2 ** level.inputs.length);
        expect(level.palette.length).toBeGreaterThan(0);
        for (const g of level.palette) expect(GATE_TYPES).toContain(g);
        expect(level.hints.every((h) => h.trim().length > 0)).toBe(true);
      });

      it('has a reference solution that passes every row at exactly par, using only palette gates', () => {
        const recipe = SOLUTIONS[level.id];
        expect(recipe, 'missing reference solution').toBeDefined();
        for (const g of Object.values(recipe!.gates)) expect(level.palette).toContain(g);

        const circuit = buildCircuit(level, recipe!.gates, recipe!.wires);
        const result = simulate(circuit, level);
        expect(result.status === 'invalid' ? result.errors : []).toEqual([]);
        expect(result.status === 'ok' && result.allPassed).toBe(true);
        expect(countGates(circuit)).toBe(level.par);
      });
    });
  }
});
