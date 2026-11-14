import type { Circuit, Level } from '../engine';
import { BOARD_HEIGHT, GRID, INPUT_TERMINAL_X, OUTPUT_TERMINAL_X, snapToGrid } from '../lib/board';

export const inputTerminalId = (label: string) => `in-${label}`;
export const outputTerminalId = (label: string) => `out-${label}`;

/** Spread `count` terminals evenly down the board, snapped to the grid. */
function terminalYs(count: number): number[] {
  const spacing = Math.min(160, (BOARD_HEIGHT - 4 * GRID) / count);
  const top = BOARD_HEIGHT / 2 - (spacing * (count - 1)) / 2;
  return Array.from({ length: count }, (_, i) => snapToGrid(top + i * spacing));
}

/**
 * Whether an autosaved board still fits the level: every terminal is present and every gate is one the
 * palette offers. Boards saved before a level-data change are discarded instead of loading broken.
 */
export function isUsableBoard(saved: Circuit | undefined, level: Level): saved is Circuit {
  if (!saved) return false;
  const ids = new Set(saved.nodes.map((n) => n.id));
  return (
    level.inputs.every((l) => ids.has(inputTerminalId(l))) &&
    level.outputs.every((l) => ids.has(outputTerminalId(l))) &&
    saved.nodes.every((n) => n.kind !== 'gate' || level.palette.includes(n.gateType))
  );
}

/** The board a level starts with: its input terminals on the left, output terminals on the right, nothing else. */
export function createStartingCircuit(level: Level): Circuit {
  const inYs = terminalYs(level.inputs.length);
  const outYs = terminalYs(level.outputs.length);
  return {
    nodes: [
      ...level.inputs.map((label, i) => ({
        id: inputTerminalId(label),
        kind: 'input' as const,
        label,
        pos: { x: INPUT_TERMINAL_X, y: inYs[i]! },
      })),
      ...level.outputs.map((label, i) => ({
        id: outputTerminalId(label),
        kind: 'output' as const,
        label,
        pos: { x: OUTPUT_TERMINAL_X, y: outYs[i]! },
      })),
    ],
    wires: [],
  };
}
