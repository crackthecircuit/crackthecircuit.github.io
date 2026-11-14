import { GATE_SPECS } from '../engine';
import type { GateType, Level } from '../engine';

/** Allowed input counts for a gate type in a level. Levels default to 2-input gates. */
export function gateSizeRange(gateType: GateType, level: Level): { min: number; max: number } {
  const spec = GATE_SPECS[gateType];
  return {
    min: spec.minInputs,
    max: Math.max(spec.minInputs, Math.min(spec.maxInputs, level.maxGateInputs ?? 2)),
  };
}
