import type { Bit, CircuitNode, GateType, InputPortId } from './types';

interface GateSpec {
  inputs: readonly InputPortId[];
  evaluate: (a: Bit, b: Bit) => Bit;
}

const bit = (value: boolean): Bit => (value ? 1 : 0);

export const GATE_SPECS: Record<GateType, GateSpec> = {
  AND: { inputs: ['in0', 'in1'], evaluate: (a, b) => bit(a === 1 && b === 1) },
  OR: { inputs: ['in0', 'in1'], evaluate: (a, b) => bit(a === 1 || b === 1) },
  NOT: { inputs: ['in0'], evaluate: (a) => bit(a === 0) },
  NAND: { inputs: ['in0', 'in1'], evaluate: (a, b) => bit(!(a === 1 && b === 1)) },
  NOR: { inputs: ['in0', 'in1'], evaluate: (a, b) => bit(!(a === 1 || b === 1)) },
  XOR: { inputs: ['in0', 'in1'], evaluate: (a, b) => bit(a !== b) },
};

export const GATE_TYPES = Object.keys(GATE_SPECS) as GateType[];

/** Evaluate a gate. NOT ignores its second argument. */
export function evaluateGate(type: GateType, a: Bit, b: Bit = 0): Bit {
  return GATE_SPECS[type].evaluate(a, b);
}

/** Which input ports a node has, and whether it has an output port. */
export function portsOf(node: CircuitNode): { inputs: readonly InputPortId[]; hasOutput: boolean } {
  switch (node.kind) {
    case 'input':
      return { inputs: [], hasOutput: true };
    case 'output':
      return { inputs: ['in0'], hasOutput: false };
    case 'gate':
      return { inputs: GATE_SPECS[node.gateType].inputs, hasOutput: true };
  }
}

/** Player-facing name for an input port, e.g. "top input". */
export function describePort(node: CircuitNode, port: InputPortId): string {
  if (node.kind !== 'gate' || GATE_SPECS[node.gateType].inputs.length === 1) return 'input';
  return port === 'in0' ? 'top input' : 'bottom input';
}
