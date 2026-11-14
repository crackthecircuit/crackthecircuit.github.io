import { describe, expect, it } from 'vitest';
import { simulate } from '../engine';
import { buildCircuit } from './solutions';
import { adaptCircuit, sandboxInputCount, sandboxLevel } from './sandbox';
import { createStartingCircuit, inputTerminalId, isUsableBoard } from './startingCircuit';

describe('sandbox', () => {
  it('offers the base gates, plus earned ones', () => {
    expect(sandboxLevel(2, []).palette).toEqual(['AND', 'OR', 'NOT', 'NAND', 'NOR']);
    expect(sandboxLevel(2, ['XOR']).palette).toContain('XOR');
  });

  it('clamps the input count to 1–4', () => {
    expect(sandboxLevel(0, []).inputs).toEqual(['A']);
    expect(sandboxLevel(9, []).inputs).toEqual(['A', 'B', 'C', 'D']);
    expect(sandboxLevel(3, []).expected.Q).toHaveLength(8);
  });

  it('reads the input count back from a saved board', () => {
    expect(sandboxInputCount(undefined)).toBe(2);
    expect(sandboxInputCount(createStartingCircuit(sandboxLevel(3, [])))).toBe(3);
  });

  it('keeps gates and still-valid wires when the inputs change', () => {
    const three = sandboxLevel(3, []);
    const circuit = buildCircuit(three, { g1: 'AND' }, [
      ['A', 'g1.in0'],
      ['C', 'g1.in1'],
      ['g1', 'Q'],
    ]);
    const two = sandboxLevel(2, []);
    const adapted = adaptCircuit(circuit, two);
    expect(isUsableBoard(adapted, two)).toBe(true);
    expect(adapted.nodes.some((n) => n.id === inputTerminalId('C'))).toBe(false);
    expect(adapted.nodes.some((n) => n.id === 'g1')).toBe(true);
    expect(adapted.wires).toHaveLength(2); // the wire from C is gone
  });

  it('simulates like any level', () => {
    const level = sandboxLevel(2, []);
    const circuit = buildCircuit(level, { g1: 'NAND' }, [
      ['A', 'g1.in0'],
      ['B', 'g1.in1'],
      ['g1', 'Q'],
    ]);
    const result = simulate(circuit, level);
    expect(result.status === 'ok' && result.rows.map((r) => r.outputs.Q)).toEqual([1, 1, 1, 0]);
  });
});
