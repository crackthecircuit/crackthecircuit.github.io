import { describe, expect, it } from 'vitest';
import { getLevel } from '../levels/levels';
import { buildCircuit } from '../levels/solutions';
import { deletionMessage, describePort, nodeName, portName } from './describe';

const level = getLevel('not-both')!; // A, B → Q; AND, NOT
const circuit = buildCircuit(level, { g1: 'AND', g2: 'NOT' }, [
  ['A', 'g1.in0'],
  ['g1', 'g2.in0'],
]);

describe('screen-reader names', () => {
  it('names terminals and gates', () => {
    expect(circuit.nodes.map(nodeName)).toEqual(['switch A', 'switch B', 'lamp Q', 'AND gate 1', 'NOT gate 2']);
  });

  it('names ports, numbering inputs only when a gate has several', () => {
    expect(portName(circuit, { nodeId: 'g1', port: 'in1' })).toBe('AND gate 1 input 2');
    expect(portName(circuit, { nodeId: 'g2', port: 'in0' })).toBe('NOT gate 2 input');
    expect(portName(circuit, { nodeId: 'in-A', port: 'out' })).toBe('switch A output');
    expect(portName(circuit, { nodeId: 'out-Q', port: 'in0' })).toBe('lamp Q');
  });

  it('says what each port is wired to', () => {
    expect(describePort(circuit, { nodeId: 'g1', port: 'in0' })).toBe('AND gate 1 input 1, from switch A');
    expect(describePort(circuit, { nodeId: 'g1', port: 'in1' })).toBe('AND gate 1 input 2, not connected');
    expect(describePort(circuit, { nodeId: 'g1', port: 'out' })).toBe('AND gate 1 output, feeds 1 input');
  });
});

describe('undo toast messages', () => {
  const without = (ids: string[]) => ({
    nodes: circuit.nodes.filter((n) => !ids.includes(n.id)),
    wires: circuit.wires.filter((w) => !ids.includes(w.from.nodeId) && !ids.includes(w.to.nodeId)),
  });

  it('names what an edit deleted', () => {
    expect(deletionMessage(circuit, without(['g2']))).toBe('Gate deleted');
    expect(deletionMessage(circuit, without(['g1', 'g2']))).toBe('Board cleared');
    expect(deletionMessage(circuit, { ...circuit, wires: circuit.wires.slice(1) })).toBe('Wire deleted');
    expect(deletionMessage(circuit, { ...circuit, wires: [] })).toBe('Wires deleted');
  });

  it('stays quiet for edits that are not deletions', () => {
    expect(deletionMessage(without(['g2']), circuit)).toBeNull(); // a gate added
    // Narrowing a gate drops a wire, but that's a resize.
    const wide = { ...circuit, nodes: circuit.nodes.map((n) => (n.id === 'g1' ? { ...n, inputs: 3 } : n)) };
    expect(deletionMessage(wide, { ...circuit, wires: circuit.wires.slice(1) })).toBeNull();
  });
});
