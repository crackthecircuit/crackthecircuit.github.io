// Plain-language names for board parts, used for screen-reader labels and announcements.
import { INPUT_PORTS, portsOf } from '../engine';
import type { Circuit, CircuitNode } from '../engine';
import type { PortRef } from './geometry';

/** "switch A", "lamp Q", "AND gate 2" (gate ids are g1, g2, …). */
export function nodeName(node: CircuitNode): string {
  switch (node.kind) {
    case 'input':
      return `switch ${node.label}`;
    case 'output':
      return `lamp ${node.label}`;
    case 'gate':
      return `${node.gateType} gate ${node.id.replace(/^g/, '')}`;
  }
}

/** "AND gate 2 input 1", "switch A output", "lamp Q". */
export function portName(circuit: Circuit, ref: PortRef): string {
  const node = circuit.nodes.find((n) => n.id === ref.nodeId);
  if (!node) return 'port';
  if (node.kind === 'output') return nodeName(node);
  if (ref.port === 'out') return `${nodeName(node)} output`;
  const count = portsOf(node).inputs.length;
  return count === 1
    ? `${nodeName(node)} input`
    : `${nodeName(node)} input ${INPUT_PORTS.indexOf(ref.port) + 1}`;
}

/** A port's name plus what it's wired to, for its accessible label. */
export function describePort(circuit: Circuit, ref: PortRef): string {
  const name = portName(circuit, ref);
  const byId = (id: string) => circuit.nodes.find((n) => n.id === id);
  if (ref.port === 'out') {
    const fanout = circuit.wires.filter((w) => w.from.nodeId === ref.nodeId).length;
    return fanout === 0
      ? `${name}, not connected`
      : `${name}, feeds ${fanout} input${fanout === 1 ? '' : 's'}`;
  }
  const wire = circuit.wires.find((w) => w.to.nodeId === ref.nodeId && w.to.port === ref.port);
  const from = wire && byId(wire.from.nodeId);
  return from ? `${name}, from ${nodeName(from)}` : `${name}, not connected`;
}
