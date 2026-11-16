import type { Circuit } from './types';

/** Every gate on the board counts, including unused ones. */
export function countGates(circuit: Circuit): number {
  return circuit.nodes.filter((n) => n.kind === 'gate').length;
}

/**
 * The most stars a level can still give after `hintsShown` hints. The nudge is free, the expression caps the level
 * at 2 and the structure clue at 1. Passing always gives at least 1.
 */
export function hintStarCap(hintsShown: number): 1 | 2 | 3 {
  if (hintsShown >= 3) return 1;
  if (hintsShown === 2) return 2;
  return 3;
}

/**
 * 0 = not passed · 1 = passed · 2 = within 2 gates of par · 3 = at or under par, then capped by the hints shown.
 */
export function score(allPassed: boolean, gateCount: number, par: number, hintsShown = 0): 0 | 1 | 2 | 3 {
  if (!allPassed) return 0;
  const byGates = gateCount <= par ? 3 : gateCount <= par + 2 ? 2 : 1;
  return Math.min(byGates, hintStarCap(hintsShown)) as 1 | 2 | 3;
}
