import type { Circuit } from './types';

/** Every gate on the board counts, including unused ones. */
export function countGates(circuit: Circuit): number {
  return circuit.nodes.filter((n) => n.kind === 'gate').length;
}

/** 0 = not passed · 1 = passed · 2 = within 2 gates of par · 3 = at or under par. */
export function score(allPassed: boolean, gateCount: number, par: number): 0 | 1 | 2 | 3 {
  if (!allPassed) return 0;
  if (gateCount <= par) return 3;
  if (gateCount <= par + 2) return 2;
  return 1;
}
