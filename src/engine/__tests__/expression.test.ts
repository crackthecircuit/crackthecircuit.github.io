import { describe, expect, it } from 'vitest';
import { getLevel } from '../../levels/levels';
import { buildCircuit } from '../../levels/solutions';
import {
  and,
  circuitExpression,
  evaluateExpr,
  flatten,
  not,
  or,
  parseExpression,
  parseExpressions,
  v,
  xor,
} from '../expression';

const A = v('A');
const B = v('B');
const C = v('C');

describe('parseExpression', () => {
  it('reads standard notation: juxtaposition, postfix complement and AND-before-OR', () => {
    expect(parseExpression("A'BC' + A'BC")).toEqual(or(and(not(A), B, not(C)), and(not(A), B, C)));
    expect(parseExpression('A·B + C')).toEqual(or(and(A, B), C));
    expect(parseExpression('A + B·C')).toEqual(or(A, and(B, C)));
  });

  it('reads grouped complements, prefix ¬, XOR and products of sums', () => {
    expect(parseExpression("(A·B)'")).toEqual(not(and(A, B)));
    expect(parseExpression('¬(A + B)')).toEqual(not(or(A, B)));
    expect(parseExpression('A ⊕ B ⊕ C')).toEqual(xor(A, B, C));
    expect(parseExpression("(A + B)(B' + C)")).toEqual(and(or(A, B), or(not(B), C)));
  });

  it('reads chains of equal forms, and rejects nonsense', () => {
    expect(parseExpressions("A + B = (A'·B')'")).toHaveLength(2);
    expect(() => parseExpression('A + ')).toThrow();
    expect(() => parseExpression('A $ B')).toThrow();
    expect(() => parseExpression('(A + B')).toThrow();
  });

  it('evaluates expressions', () => {
    const f = parseExpression("B(A' + C')");
    expect(evaluateExpr(f, { A: 0, B: 1, C: 1 })).toBe(1);
    expect(evaluateExpr(f, { A: 1, B: 1, C: 1 })).toBe(0);
    expect(evaluateExpr(parseExpression('A ⊕ B ⊕ C'), { A: 1, B: 1, C: 1 })).toBe(1);
  });
});

describe('circuitExpression', () => {
  it('reads the equation back from the player’s circuit', () => {
    const level = getLevel('exactly-one')!;
    const c = buildCircuit(level, { or: 'OR', and: 'AND', not: 'NOT', out: 'AND' }, [
      ['A', 'or.in0'],
      ['B', 'or.in1'],
      ['A', 'and.in0'],
      ['B', 'and.in1'],
      ['and', 'not.in0'],
      ['or', 'out.in0'],
      ['not', 'out.in1'],
      ['out', 'Q'],
    ]);
    expect(circuitExpression(c, level)).toEqual(and(or(A, B), not(and(A, B))));
  });

  it('shows NAND/NOR as complemented AND/OR and marks unconnected inputs as unknown', () => {
    const level = getLevel('universal-gate')!;
    const c = buildCircuit(level, { n: 'NAND' }, [
      ['A', 'n.in0'],
      ['n', 'Q'],
    ]);
    expect(circuitExpression(c, level)).toEqual(not(and(A, { kind: 'unknown' })));
    expect(circuitExpression(buildCircuit(level, {}, []), level)).toEqual({ kind: 'unknown' });
  });

  it('marks feedback loops instead of recursing forever', () => {
    const level = getLevel('both-switches')!;
    const c = buildCircuit(level, { g: 'AND' }, [
      ['A', 'g.in0'],
      ['g', 'g.in1'],
      ['g', 'Q'],
    ]);
    expect(circuitExpression(c, level)).toEqual(and(A, { kind: 'loop' }));
  });

  it('flattens chains of the same operation', () => {
    expect(flatten(and(and(A, B), C))).toEqual(and(A, B, C));
    expect(flatten(or(A, and(B, C)))).toEqual(or(A, and(B, C)));
  });
});
