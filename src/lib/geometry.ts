import { portsOf } from '../engine';
import type { CircuitNode, PortId, Point } from '../engine';

/** Gates are drawn in an 80×60 box; `pos` is its top-left corner. */
export const GATE_W = 80;
export const GATE_H = 60;
/** Terminals are drawn centred on `pos`; their port sits this far to the side. */
export const TERMINAL_PORT_OFFSET = 36;

/** Where a port sits on the board, in world coordinates. */
export function portPosition(node: CircuitNode, port: PortId): Point {
  const { x, y } = node.pos;
  switch (node.kind) {
    case 'input':
      return { x: x + TERMINAL_PORT_OFFSET, y };
    case 'output':
      return { x: x - TERMINAL_PORT_OFFSET, y };
    case 'gate': {
      if (port === 'out') return { x: x + GATE_W, y: y + GATE_H / 2 };
      const single = portsOf(node).inputs.length === 1;
      if (single) return { x, y: y + GATE_H / 2 };
      return { x, y: y + (port === 'in0' ? 20 : 40) };
    }
  }
}

/** Smooth wire from an output port to an input port, leaving and entering horizontally. */
export function wirePath(from: Point, to: Point): string {
  const pull = Math.max(40, Math.abs(to.x - from.x) / 2);
  return `M ${from.x} ${from.y} C ${from.x + pull} ${from.y}, ${to.x - pull} ${to.y}, ${to.x} ${to.y}`;
}
