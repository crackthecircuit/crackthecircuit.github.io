import { describe, expect, it } from 'vitest';
import { getLevel } from '../../levels/levels';
import { buildCircuit } from '../../levels/solutions';
import { createStartingCircuit } from '../../levels/startingCircuit';
import { simulate } from '../simulate';
import type { Circuit, Level } from '../types';
import { analyze, validate } from '../validate';

const level7 = getLevel('level-7')!; // (A·B)+C, palette AND/OR/NOT
const level1 = getLevel('level-1')!; // A·B

const codes = (circuit: Circuit, level: Level) => validate(circuit, level).map((e) => e.code);

describe('validate', () => {
  it('accepts a complete circuit', () => {
    const c = buildCircuit(level1, { g: 'AND' }, [
      ['A', 'g.in0'],
      ['B', 'g.in1'],
      ['g', 'Q'],
    ]);
    expect(validate(c, level1)).toEqual([]);
  });

  it('reports an output terminal with nothing connected', () => {
    const errors = validate(createStartingCircuit(level1), level1);
    expect(errors.map((e) => e.code)).toEqual(['OUTPUT_UNCONNECTED']);
    expect(errors[0]!.nodeIds).toEqual(['out-Q']);
  });

  it('reports a floating gate input instead of treating it as 0', () => {
    const c = buildCircuit(level1, { g: 'AND' }, [
      ['A', 'g.in0'],
      ['g', 'Q'],
    ]);
    const errors = validate(c, level1);
    expect(errors.map((e) => e.code)).toEqual(['FLOATING_INPUT']);
    expect(errors[0]!.nodeIds).toEqual(['g']);
    expect(errors[0]!.message).toContain('bottom input');
    expect(simulate(c, level1).status).toBe('invalid');
  });

  it('reports an input port driven by two wires', () => {
    const c = buildCircuit(level1, { g: 'AND' }, [
      ['A', 'g.in0'],
      ['B', 'g.in0'],
      ['B', 'g.in1'],
      ['g', 'Q'],
    ]);
    const errors = validate(c, level1);
    expect(errors.map((e) => e.code)).toEqual(['MULTIPLE_DRIVERS']);
    expect(errors[0]!.wireIds).toEqual(['w0', 'w1']);
  });

  it('reports wires that start at an output terminal or end at an input terminal', () => {
    const c = buildCircuit(level1, { g: 'AND' }, [
      ['A', 'g.in0'],
      ['B', 'g.in1'],
      ['g', 'Q'],
    ]);
    c.wires.push(
      { id: 'bad1', from: { nodeId: 'out-Q', port: 'out' }, to: { nodeId: 'g', port: 'in0' } },
      { id: 'bad2', from: { nodeId: 'g', port: 'out' }, to: { nodeId: 'in-A', port: 'in0' } },
    );
    const errors = validate(c, level1).filter((e) => e.code === 'INVALID_WIRE');
    expect(errors.map((e) => e.wireIds[0])).toEqual(['bad1', 'bad2']);
  });

  it('reports wires to ports a gate does not have, or to missing nodes', () => {
    const level3 = getLevel('level-3')!;
    const c = buildCircuit(level3, { n: 'NOT' }, [
      ['A', 'n.in0'],
      ['n', 'Q'],
    ]);
    c.wires.push(
      { id: 'bad1', from: { nodeId: 'in-A', port: 'out' }, to: { nodeId: 'n', port: 'in1' } },
      { id: 'bad2', from: { nodeId: 'ghost', port: 'out' }, to: { nodeId: 'n', port: 'in0' } },
    );
    expect(codes(c, level3)).toEqual(['INVALID_WIRE', 'INVALID_WIRE']);
  });

  it('reports a missing terminal', () => {
    const c = buildCircuit(level1, { g: 'AND' }, [
      ['A', 'g.in0'],
      ['B', 'g.in1'],
      ['g', 'Q'],
    ]);
    c.nodes = c.nodes.filter((n) => n.id !== 'in-B');
    expect(codes(c, level1)).toContain('MISSING_TERMINAL');
  });

  it('reports a feedback loop and highlights only the gates on it', () => {
    // Q ← or ← (and ← or) — and/or form a loop; "tail" sits downstream of it.
    const c = buildCircuit(level7, { and: 'AND', or: 'OR', tail: 'NOT' }, [
      ['A', 'and.in0'],
      ['or', 'and.in1'],
      ['and', 'or.in0'],
      ['C', 'or.in1'],
      ['or', 'tail.in0'],
      ['tail', 'Q'],
    ]);
    const errors = validate(c, level7);
    expect(errors.map((e) => e.code)).toEqual(['CYCLE']);
    expect(errors[0]!.nodeIds.sort()).toEqual(['and', 'or']);
    expect(errors[0]!.wireIds.sort()).toEqual(['w1', 'w2']);
  });

  it('reports a gate wired into itself', () => {
    const c = buildCircuit(level1, { g: 'AND' }, [
      ['A', 'g.in0'],
      ['g', 'g.in1'],
      ['g', 'Q'],
    ]);
    expect(codes(c, level1)).toEqual(['CYCLE']);
  });

  it('ignores unused gates, even broken ones, but reports them', () => {
    const c = buildCircuit(level1, { g: 'AND', spare: 'OR', loopy: 'NOT' }, [
      ['A', 'g.in0'],
      ['B', 'g.in1'],
      ['g', 'Q'],
      ['A', 'spare.in0'], // spare.in1 floating
      ['loopy', 'loopy.in0'], // self-loop
    ]);
    const analysis = analyze(c, level1);
    expect(analysis.errors).toEqual([]);
    expect(analysis.unusedGateIds.sort()).toEqual(['loopy', 'spare']);
    expect(analysis.evalOrder.map((g) => g.id)).toEqual(['g']);
  });

  it('orders gates so each comes after the gates that drive it', () => {
    const c = buildCircuit(getLevel('level-8')!, { out: 'AND', not: 'NOT', and: 'AND', or: 'OR' }, [
      ['A', 'or.in0'],
      ['B', 'or.in1'],
      ['A', 'and.in0'],
      ['B', 'and.in1'],
      ['and', 'not.in0'],
      ['or', 'out.in0'],
      ['not', 'out.in1'],
      ['out', 'Q'],
    ]);
    const order = analyze(c, getLevel('level-8')!).evalOrder.map((g) => g.id);
    expect(order.indexOf('and')).toBeLessThan(order.indexOf('not'));
    expect(order.indexOf('not')).toBeLessThan(order.indexOf('out'));
    expect(order.indexOf('or')).toBeLessThan(order.indexOf('out'));
  });
});
