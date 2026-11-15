import { INPUT_PORTS, portsOf } from '../engine';
import type { Circuit, CircuitNode, InputPortId, PortId, Point } from '../engine';
import { BOARD_HEIGHT, BOARD_WIDTH, CANVAS, GRID, snapToGrid } from './board';
import type { Box } from './view';

/** Gates are drawn in an 80×60 box (taller when widened); `pos` is its top-left corner. */
export const GATE_W = 80;
export const GATE_H = 60;
/** Vertical gap between a gate's input ports. */
export const PORT_SPACING = 20;

/** Height of a gate's box: room for its inputs, never shorter than the standard 60. */
export const gateHeightFor = (inputCount: number) => Math.max(GATE_H, PORT_SPACING * (inputCount + 1));

/** Y of each input port inside a gate's box, top to bottom. */
export const inputPortYs = (inputCount: number): number[] =>
  inputCount === 1
    ? [gateHeightFor(1) / 2]
    : Array.from({ length: inputCount }, (_, i) => PORT_SPACING * (i + 1));
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
      const count = portsOf(node).inputs.length;
      if (port === 'out') return { x: x + GATE_W, y: y + gateHeightFor(count) / 2 };
      return { x, y: y + inputPortYs(count)[INPUT_PORTS.indexOf(port)]! };
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

/** The port nearest to `point` within `radius` board units (a finger gets a wider one), if any. */
export function nearestPort(circuit: Circuit, point: Point, radius = PORT_HIT_RADIUS): PortRef | null {
  let best: PortRef | null = null;
  let bestDist = radius;
  for (const p of allPorts(circuit)) {
    const d = Math.hypot(p.pos.x - point.x, p.pos.y - point.y);
    if (d <= bestDist) {
      best = { nodeId: p.nodeId, port: p.port };
      bestDist = d;
    }
  }
  return best;
}

/** Top-left for a gate centred on `point`, snapped to the grid and kept inside the canvas limits. */
export function gatePositionAt(point: Point): Point {
  return {
    x: Math.min(Math.max(snapToGrid(point.x - GATE_W / 2), CANVAS.minX), CANVAS.maxX - GATE_W),
    y: Math.min(Math.max(snapToGrid(point.y - GATE_H / 2), CANVAS.minY), CANVAS.maxY - GATE_H),
  };
}

/** Half the size of a terminal's drawing around its centre, port included. */
const TERMINAL_HALF_W = TERMINAL_PORT_OFFSET + 8;
const TERMINAL_HALF_H = 30;

/** The world box a node is drawn in. */
function nodeBox(node: CircuitNode): Box {
  if (node.kind === 'gate') {
    const height = gateHeightFor(portsOf(node).inputs.length);
    // The label sits under the gate.
    return { minX: node.pos.x, minY: node.pos.y, maxX: node.pos.x + GATE_W, maxY: node.pos.y + height + 16 };
  }
  return {
    minX: node.pos.x - TERMINAL_HALF_W,
    minY: node.pos.y - TERMINAL_HALF_H,
    maxX: node.pos.x + TERMINAL_HALF_W,
    maxY: node.pos.y + TERMINAL_HALF_H + 16,
  };
}

/** The smallest box holding every switch, lamp and gate (the home area for an empty circuit). */
export function circuitBox(circuit: Circuit): Box {
  if (circuit.nodes.length === 0) return { minX: 0, minY: 0, maxX: BOARD_WIDTH, maxY: BOARD_HEIGHT };
  const boxes = circuit.nodes.map(nodeBox);
  return {
    minX: Math.min(...boxes.map((b) => b.minX)),
    minY: Math.min(...boxes.map((b) => b.minY)),
    maxX: Math.max(...boxes.map((b) => b.maxX)),
    maxY: Math.max(...boxes.map((b) => b.maxY)),
  };
}

/**
 * A free spot near `near` (the middle of the view; by default the middle of the home area) for a gate added by
 * clicking or tapping the palette, or with Enter. It doesn't overlap another gate or a terminal.
 */
export function freeGatePosition(circuit: Circuit, near: Point = { x: BOARD_WIDTH / 2, y: BOARD_HEIGHT / 2 }): Point {
  const blockers = circuit.nodes.map(nodeBox);
  const taken = (p: Point) =>
    blockers.some(
      (b) => p.x < b.maxX && p.x + GATE_W > b.minX && p.y < b.maxY && p.y + GATE_H > b.minY,
    );
  const start = gatePositionAt(near);
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
