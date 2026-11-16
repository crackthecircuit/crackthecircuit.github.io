import { describe, expect, it } from 'vitest';
import {
  countGates,
  evaluateExpr,
  GATE_TYPES,
  gateInputCount,
  parseExpressions,
  rowInputs,
  simulate,
} from '../engine';
import { LEGACY_LEVEL_IDS } from './legacy';
import { BASIC_GATES, getLevel, LEVELS } from './levels';
import { gateSizeRange } from './rules';
import { buildCircuit, SOLUTIONS } from './solutions';
import { isUsableBoard } from './startingCircuit';

describe('level data', () => {
  it('has 25 levels numbered 1–25 with unique, stable ids', () => {
    expect(LEVELS.map((l) => l.number)).toEqual(Array.from({ length: 25 }, (_, i) => i + 1));
    expect(new Set(LEVELS.map((l) => l.id)).size).toBe(LEVELS.length);
    for (const l of LEVELS) expect(l.id).toMatch(/^[a-z]+(-[a-z]+)*$/);
  });

  it('earns NAND, NOR and XOR by building them, and only offers a gate after it is earned', () => {
    expect(LEVELS.filter((l) => l.unlocksGate).map((l) => [l.id, l.unlocksGate])).toEqual([
      ['not-both', 'NAND'],
      ['neither-switch', 'NOR'],
      ['exactly-one', 'XOR'],
    ]);
    const earned = new Set<string>(BASIC_GATES);
    for (const l of LEVELS) {
      for (const g of l.palette) expect(earned, `${l.id} offers ${g} before it is earned`).toContain(g);
      if (l.unlocksGate) {
        expect(l.palette, 'a level that unlocks a gate makes you build it').not.toContain(l.unlocksGate);
        earned.add(l.unlocksGate);
      }
    }
  });

  it('keeps levels 1–14 to 2-input gates; wide gates arrive at level 15', () => {
    for (const l of LEVELS) {
      if (l.number <= 14) expect(l.maxGateInputs ?? 2).toBe(2);
    }
    expect(LEVELS.find((l) => l.number === 15)!.maxGateInputs).toBe(4);
  });

  it('maps every old numbered id to a level that still exists', () => {
    for (const id of Object.values(LEGACY_LEVEL_IDS)) expect(getLevel(id), id).toBeDefined();
  });

  for (const level of LEVELS) {
    describe(`${level.number}. ${level.title}`, () => {
      it('has a complete truth table, a valid palette and three hints', () => {
        for (const out of level.outputs) expect(level.expected[out]).toHaveLength(2 ** level.inputs.length);
        expect(level.palette.length).toBeGreaterThan(0);
        for (const g of level.palette) expect(GATE_TYPES).toContain(g);
        expect(level.hints.every((h) => h.trim().length > 0)).toBe(true);
      });

      it('writes every $expression$ in its text in valid notation, and hint 2’s expressions match the truth table', () => {
        const embedded = (text: string) => [...text.matchAll(/\$([^$]+)\$/g)].map((m) => m[1]!);
        for (const text of [level.brief, ...level.hints]) {
          for (const src of embedded(text)) expect(() => parseExpressions(src), src).not.toThrow();
        }
        const shown = embedded(level.hints[1]).flatMap((src) => parseExpressions(src));
        expect(shown.length, 'hint 2 should state the expression').toBeGreaterThan(0);
        const out = level.outputs[0]!;
        for (const expr of shown) {
          const column = Array.from({ length: 2 ** level.inputs.length }, (_, i) =>
            evaluateExpr(expr, rowInputs(i, level.inputs)),
          );
          expect(column).toEqual(level.expected[out]);
        }
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
