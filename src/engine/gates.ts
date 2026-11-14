import type { Bit, CircuitNode, GateNode, GateType, InputPortId } from './types';

interface GateSpec {
  /** Smallest and largest number of inputs this gate type can have. */
  minInputs: number;
  maxInputs: number;
  evaluate: (inputs: Bit[]) => Bit;
}

const bit = (value: boolean): Bit => (value ? 1 : 0);
const all = (xs: Bit[]) => xs.every((x) => x === 1);
const any = (xs: Bit[]) => xs.some((x) => x === 1);

export const GATE_SPECS: Record<GateType, GateSpec> = {
  AND: { minInputs: 2, maxInputs: 4, evaluate: (xs) => bit(all(xs)) },
  OR: { minInputs: 2, maxInputs: 4, evaluate: (xs) => bit(any(xs)) },
  NOT: { minInputs: 1, maxInputs: 1, evaluate: ([a]) => bit(a === 0) },
  NAND: { minInputs: 2, maxInputs: 4, evaluate: (xs) => bit(!all(xs)) },
  NOR: { minInputs: 2, maxInputs: 4, evaluate: (xs) => bit(!any(xs)) },
  // Multi-input XOR is 1 when an odd number of inputs are 1 (the standard parity definition).
  XOR: { minInputs: 2, maxInputs: 4, evaluate: (xs) => bit(xs.filter((x) => x === 1).length % 2 === 1) },
};

export const GATE_TYPES = Object.keys(GATE_SPECS) as GateType[];

export const INPUT_PORTS: readonly InputPortId[] = ['in0', 'in1', 'in2', 'in3'];

/** Evaluate a gate on its input values, in port order. */
export function evaluateGate(type: GateType, inputs: Bit[]): Bit {
  return GATE_SPECS[type].evaluate(inputs);
}

/** How many inputs a gate has: its `inputs` setting clamped to what the type allows (default: the minimum). */
export function gateInputCount(node: GateNode): number {
  const { minInputs, maxInputs } = GATE_SPECS[node.gateType];
  return Math.min(Math.max(node.inputs ?? minInputs, minInputs), maxInputs);
}

/** Which input ports a node has, and whether it has an output port. */
export function portsOf(node: CircuitNode): { inputs: readonly InputPortId[]; hasOutput: boolean } {
  switch (node.kind) {
    case 'input':
      return { inputs: [], hasOutput: true };
    case 'output':
      return { inputs: ['in0'], hasOutput: false };
    case 'gate':
      return { inputs: INPUT_PORTS.slice(0, gateInputCount(node)), hasOutput: true };
  }
}

/** Player-facing name for an input port, e.g. "top input" or "input 3". */
export function describePort(node: CircuitNode, port: InputPortId): string {
  const count = portsOf(node).inputs.length;
  if (node.kind !== 'gate' || count === 1) return 'input';
  const index = INPUT_PORTS.indexOf(port);
  if (count === 2) return index === 0 ? 'top input' : 'bottom input';
  return `input ${index + 1} (from the top)`;
}
