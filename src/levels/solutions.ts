// Reference solutions, one per level. Tests use them to prove each level is solvable at par.
// They are never shown to players.
import type { Circuit, GateType, InputPortId, Level } from '../engine';
import { createStartingCircuit, inputTerminalId, outputTerminalId } from './startingCircuit';

/**
 * Compact circuit builder.
 * - gates: id → gate type
 * - wires: [source, target] where source is an input label ("A") or gate id,
 *   and target is "gateId.in0" / "gateId.in1" or an output label ("Q").
 */
export function buildCircuit(
  level: Level,
  gates: Record<string, GateType>,
  wires: [string, string][],
): Circuit {
  const base = createStartingCircuit(level);
  const gateNodes = Object.entries(gates).map(([id, gateType], i) => ({
    id,
    kind: 'gate' as const,
    gateType,
    pos: { x: 300 + 120 * i, y: 200 },
  }));
  return {
    nodes: [...base.nodes, ...gateNodes],
    wires: wires.map(([source, target], i) => {
      const fromId = level.inputs.includes(source) ? inputTerminalId(source) : source;
      const [toNode, toPort] = level.outputs.includes(target)
        ? [outputTerminalId(target), 'in0']
        : target.split('.');
      return {
        id: `w${i}`,
        from: { nodeId: fromId, port: 'out' as const },
        to: { nodeId: toNode!, port: toPort as InputPortId },
      };
    }),
  };
}

type Recipe = { gates: Record<string, GateType>; wires: [string, string][] };

export const SOLUTIONS: Record<string, Recipe> = {
  'level-1': {
    gates: { g1: 'AND' },
    wires: [
      ['A', 'g1.in0'],
      ['B', 'g1.in1'],
      ['g1', 'Q'],
    ],
  },
  'level-2': {
    gates: { g1: 'OR' },
    wires: [
      ['A', 'g1.in0'],
      ['B', 'g1.in1'],
      ['g1', 'Q'],
    ],
  },
  'level-3': {
    gates: { g1: 'NOT' },
    wires: [
      ['A', 'g1.in0'],
      ['g1', 'Q'],
    ],
  },
  'level-4': {
    gates: { g1: 'AND', g2: 'NOT' },
    wires: [
      ['A', 'g1.in0'],
      ['B', 'g1.in1'],
      ['g1', 'g2.in0'],
      ['g2', 'Q'],
    ],
  },
  'level-5': {
    gates: { g1: 'OR', g2: 'NOT' },
    wires: [
      ['A', 'g1.in0'],
      ['B', 'g1.in1'],
      ['g1', 'g2.in0'],
      ['g2', 'Q'],
    ],
  },
  'level-6': {
    gates: { nA: 'NAND', nB: 'NAND', g: 'NAND' },
    wires: [
      ['A', 'nA.in0'],
      ['A', 'nA.in1'],
      ['B', 'nB.in0'],
      ['B', 'nB.in1'],
      ['nA', 'g.in0'],
      ['nB', 'g.in1'],
      ['g', 'Q'],
    ],
  },
  'level-7': {
    gates: { and: 'AND', or: 'OR' },
    wires: [
      ['A', 'and.in0'],
      ['B', 'and.in1'],
      ['and', 'or.in0'],
      ['C', 'or.in1'],
      ['or', 'Q'],
    ],
  },
  'level-8': {
    gates: { or: 'OR', and: 'AND', not: 'NOT', out: 'AND' },
    wires: [
      ['A', 'or.in0'],
      ['B', 'or.in1'],
      ['A', 'and.in0'],
      ['B', 'and.in1'],
      ['and', 'not.in0'],
      ['or', 'out.in0'],
      ['not', 'out.in1'],
      ['out', 'Q'],
    ],
  },
  'level-9': {
    gates: { x1: 'XOR', x2: 'XOR' },
    wires: [
      ['A', 'x1.in0'],
      ['B', 'x1.in1'],
      ['x1', 'x2.in0'],
      ['C', 'x2.in1'],
      ['x2', 'Q'],
    ],
  },
  'level-10': {
    // A·(B + C) + B·C
    gates: { bOrC: 'OR', aAnd: 'AND', bAndC: 'AND', out: 'OR' },
    wires: [
      ['B', 'bOrC.in0'],
      ['C', 'bOrC.in1'],
      ['A', 'aAnd.in0'],
      ['bOrC', 'aAnd.in1'],
      ['B', 'bAndC.in0'],
      ['C', 'bAndC.in1'],
      ['aAnd', 'out.in0'],
      ['bAndC', 'out.in1'],
      ['out', 'Q'],
    ],
  },
};
