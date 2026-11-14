import { describe, expect, it } from 'vitest';
import { getLevel } from '../levels/levels';
import { buildCircuit } from '../levels/solutions';
import { describePort, nodeName, portName } from './describe';

const level = getLevel('level-4')!; // A, B → Q; AND, NOT
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
