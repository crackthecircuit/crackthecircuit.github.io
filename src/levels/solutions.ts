// Reference solutions, one per level. Tests use them to prove each level is solvable at par.
// They are never shown to players.
import type { Circuit, GateType, InputPortId, Level } from '../engine';
import { createStartingCircuit, inputTerminalId, outputTerminalId } from './startingCircuit';

/**
 * Compact circuit builder.
 * - gates: id → gate type, or [gate type, number of inputs] for a widened gate
 * - wires: [source, target] where source is an input label ("A") or gate id,
 *   and target is "gateId.in0" / "gateId.in1" or an output label ("Q").
 */
export function buildCircuit(
  level: Level,
  gates: Record<string, GateSpec>,
  wires: [string, string][],
): Circuit {
  const base = createStartingCircuit(level);
  const gateNodes = Object.entries(gates).map(([id, spec], i) => {
    const [gateType, inputs] = Array.isArray(spec) ? spec : [spec, undefined];
    return { id, kind: 'gate' as const, gateType, inputs, pos: { x: 300 + 120 * i, y: 200 } };
  });
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

type GateSpec = GateType | [GateType, number];
type Recipe = { gates: Record<string, GateSpec>; wires: [string, string][] };

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
  'level-11': {
    // ((A·B)·C)·D with 2-input gates
    gates: { ab: 'AND', abc: 'AND', abcd: 'AND' },
    wires: [
      ['A', 'ab.in0'],
      ['B', 'ab.in1'],
      ['ab', 'abc.in0'],
      ['C', 'abc.in1'],
      ['abc', 'abcd.in0'],
      ['D', 'abcd.in1'],
      ['abcd', 'Q'],
    ],
  },
  'level-12': {
    gates: { any: ['OR', 4] },
    wires: [
      ['A', 'any.in0'],
      ['B', 'any.in1'],
      ['C', 'any.in2'],
      ['D', 'any.in3'],
      ['any', 'Q'],
    ],
  },
  'level-13': {
    gates: { ab: 'AND', cd: 'AND', or: 'OR' },
    wires: [
      ['A', 'ab.in0'],
      ['B', 'ab.in1'],
      ['C', 'cd.in0'],
      ['D', 'cd.in1'],
      ['ab', 'or.in0'],
      ['cd', 'or.in1'],
      ['or', 'Q'],
    ],
  },
  'level-14': {
    // A 4-input XOR is 1 for an odd count; NOT turns that into "even".
    gates: { odd: ['XOR', 4], even: 'NOT' },
    wires: [
      ['A', 'odd.in0'],
      ['B', 'odd.in1'],
      ['C', 'odd.in2'],
      ['D', 'odd.in3'],
      ['odd', 'even.in0'],
      ['even', 'Q'],
    ],
  },
  'level-15': {
    // A · (B + C) · ¬D
    gates: { entry: 'OR', notMaint: 'NOT', alarm: ['AND', 3] },
    wires: [
      ['B', 'entry.in0'],
      ['C', 'entry.in1'],
      ['D', 'notMaint.in0'],
      ['A', 'alarm.in0'],
      ['entry', 'alarm.in1'],
      ['notMaint', 'alarm.in2'],
      ['alarm', 'Q'],
    ],
  },
  'level-16': {
    // Smart Lamp: B·(AC)'
    gates: { ac: 'AND', nac: 'NOT', out: 'AND' },
    wires: [
      ['A', 'ac.in0'],
      ['C', 'ac.in1'],
      ['ac', 'nac.in0'],
      ['B', 'out.in0'],
      ['nac', 'out.in1'],
      ['out', 'Q'],
    ],
  },
  'level-17': {
    // Selector Switch: (A + B)(B' + C), the POS form of AB' + BC
    gates: { ab: 'OR', nb: 'NOT', bc: 'OR', out: 'AND' },
    wires: [
      ['A', 'ab.in0'],
      ['B', 'ab.in1'],
      ['B', 'nb.in0'],
      ['nb', 'bc.in0'],
      ['C', 'bc.in1'],
      ['ab', 'out.in0'],
      ['bc', 'out.in1'],
      ['out', 'Q'],
    ],
  },
  'level-18': {
    // Vending Machine: BC'D + ACD
    gates: { nc: 'NOT', g1: ['AND', 3], g2: ['AND', 3], out: 'OR' },
    wires: [
      ['C', 'nc.in0'],
      ['B', 'g1.in0'],
      ['nc', 'g1.in1'],
      ['D', 'g1.in2'],
      ['A', 'g2.in0'],
      ['C', 'g2.in1'],
      ['D', 'g2.in2'],
      ['g1', 'out.in0'],
      ['g2', 'out.in1'],
      ['out', 'Q'],
    ],
  },
};
