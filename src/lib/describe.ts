// Plain-language names for board parts, used for screen-reader labels and announcements.
import { gateInputCount, INPUT_PORTS, portsOf } from '../engine';
import type { Circuit, CircuitNode, GateNode } from '../engine';
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

/** What a new edit deleted, if anything: the undo toast's message. */
export function deletionMessage(before: Circuit, after: Circuit): string | null {
  const gates = (c: Circuit) => c.nodes.filter((n): n is GateNode => n.kind === 'gate');
  const terminals = (c: Circuit) => c.nodes.length - gates(c).length;
  const [g0, g1] = [gates(before), gates(after)];
  if (terminals(before) !== terminals(after)) return null; // the sandbox's input count changed
  if (g1.length < g0.length) return g0.length - g1.length > 1 ? 'Board cleared' : 'Gate deleted';
  if (after.wires.length >= before.wires.length) return null;
  // Narrowing a gate drops the wires on its removed ports: that's a resize, not a delete.
  const widths = new Map(g0.map((g) => [g.id, gateInputCount(g)]));
  if (g1.some((g) => widths.get(g.id) !== gateInputCount(g))) return null;
  return before.wires.length - after.wires.length > 1 ? 'Wires deleted' : 'Wire deleted';
}
