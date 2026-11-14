import { portsOf } from '../engine';
import type { Circuit, CircuitNode, InputPortId, PortId, Point } from '../engine';
import { BOARD_HEIGHT, BOARD_WIDTH, GRID, snapToGrid } from './board';

/** Gates are drawn in an 80×60 box; `pos` is its top-left corner. */
export const GATE_W = 80;
export const GATE_H = 60;
/** Terminals are drawn centred on `pos`; their port sits this far to the side. */
export const TERMINAL_PORT_OFFSET = 36;
/** How close (in board units) the pointer must be to a port to snap a wire onto it. */
export const PORT_HIT_RADIUS = 22;

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

export interface PortRef {
  nodeId: string;
  port: PortId;
}

export const portKey = (p: PortRef) => `${p.nodeId}:${p.port}`;
export const isInputPort = (port: PortId): port is InputPortId => port !== 'out';

/** Every port on the board. */
export function allPorts(circuit: Circuit): (PortRef & { pos: Point })[] {
  return circuit.nodes.flatMap((node) => {
    const { inputs, hasOutput } = portsOf(node);
    const ports: PortId[] = hasOutput ? [...inputs, 'out'] : [...inputs];
    return ports.map((port) => ({ nodeId: node.id, port, pos: portPosition(node, port) }));
  });
}

/** The port nearest to `point` within the hit radius, if any. */
export function nearestPort(circuit: Circuit, point: Point): PortRef | null {
  let best: PortRef | null = null;
  let bestDist = PORT_HIT_RADIUS;
  for (const p of allPorts(circuit)) {
    const d = Math.hypot(p.pos.x - point.x, p.pos.y - point.y);
    if (d <= bestDist) {
      best = { nodeId: p.nodeId, port: p.port };
      bestDist = d;
    }
  }
  return best;
}

/** Top-left for a gate centred on `point`, snapped to the grid and kept fully on the board. */
export function gatePositionAt(point: Point): Point {
  return {
    x: Math.min(Math.max(snapToGrid(point.x - GATE_W / 2), GRID), BOARD_WIDTH - GATE_W - GRID),
    y: Math.min(Math.max(snapToGrid(point.y - GATE_H / 2), GRID), BOARD_HEIGHT - GATE_H - GRID * 2),
  };
}

/** A free spot near the centre of the board for a gate added by clicking the palette. */
export function freeGatePosition(circuit: Circuit): Point {
  const taken = (p: Point) =>
    circuit.nodes.some(
      (n) => n.kind === 'gate' && Math.abs(n.pos.x - p.x) < GATE_W && Math.abs(n.pos.y - p.y) < GATE_H,
    );
  const start = gatePositionAt({ x: BOARD_WIDTH / 2, y: BOARD_HEIGHT / 2 });
  for (let ring = 0; ring < 12; ring++) {
    for (const [dx, dy] of [
      [0, 0],
      [1, 0],
      [0, 1],
      [-1, 0],
      [0, -1],
      [1, 1],
      [-1, 1],
      [1, -1],
      [-1, -1],
    ] as const) {
      const p = gatePositionAt({
        x: start.x + GATE_W / 2 + dx * ring * (GATE_W + GRID),
        y: start.y + GATE_H / 2 + dy * ring * (GATE_H + GRID * 2),
      });
      if (!taken(p)) return p;
    }
  }
  return start;
}
