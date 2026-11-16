import { GATE_TYPES } from '../engine';
import type { Circuit, GateType, Level } from '../engine';
import { createStartingCircuit } from './startingCircuit';

export const SANDBOX_ID = 'sandbox';
export const SANDBOX_INPUT_LABELS = ['A', 'B', 'C', 'D'] as const;
export const SANDBOX_MIN_INPUTS = 1;
export const SANDBOX_MAX_INPUTS = 4;
export const SANDBOX_DEFAULT_INPUTS = 2;

/** Gates every player has; earned gates (NAND, NOR, XOR) join once unlocked. */
const BASE_GATES: GateType[] = ['AND', 'OR', 'NOT'];

/**
 * The sandbox as a Level, so the board, store and engine work unchanged. It has no target: `expected` is a
 * placeholder the sandbox never compares against, and nothing is scored.
 */
export function sandboxLevel(inputCount: number, unlockedGates: readonly GateType[]): Level {
  const n = Math.min(Math.max(Math.round(inputCount), SANDBOX_MIN_INPUTS), SANDBOX_MAX_INPUTS);
  return {
    id: SANDBOX_ID,
    number: 0,
    title: 'Sandbox',
    brief: 'Build anything. The truth table shows what your circuit does.',
    inputs: SANDBOX_INPUT_LABELS.slice(0, n),
    outputs: ['Q'],
    expected: { Q: Array.from({ length: 2 ** n }, () => 0 as const) },
    palette: GATE_TYPES.filter((g) => BASE_GATES.includes(g) || unlockedGates.includes(g)),
    maxGateInputs: 4,
    par: 0,
    hints: ['', '', ''],
  };
}

/** How many inputs a saved sandbox board has, or the default for a new one. */
export function sandboxInputCount(saved: Circuit | undefined): number {
  const count = saved?.nodes.filter((n) => n.kind === 'input').length ?? 0;
  return count >= SANDBOX_MIN_INPUTS && count <= SANDBOX_MAX_INPUTS ? count : SANDBOX_DEFAULT_INPUTS;
}

/**
 * Re-lay a circuit for a level with different terminals: gates stay put, terminals move to the new layout, and
 * wires to terminals that no longer exist are dropped.
 */
export function adaptCircuit(circuit: Circuit, level: Level): Circuit {
  const terminals = createStartingCircuit(level).nodes;
  const nodes = [...terminals, ...circuit.nodes.filter((n) => n.kind === 'gate')];
  const ids = new Set(nodes.map((n) => n.id));
  return {
    nodes,
    wires: circuit.wires.filter((w) => ids.has(w.from.nodeId) && ids.has(w.to.nodeId)),
  };
}
