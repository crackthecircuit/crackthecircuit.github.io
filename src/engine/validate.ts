import { describePort, portsOf } from './gates';
import type { Circuit, CircuitNode, GateNode, Level, ValidationError, Wire } from './types';

export interface Analysis {
  errors: ValidationError[];
  /** Gates on the board that don't feed any output. Not an error: they're skipped, dimmed and still counted. */
  unusedGateIds: string[];
  /** Gates that feed an output, in evaluation order (each gate after the gates driving it). Empty when invalid. */
  evalOrder: GateNode[];
  /** Input terminal node id for each level input label. */
  inputNodeIds: Record<string, string>;
  /** Output terminal node id for each level output label. */
  outputNodeIds: Record<string, string>;
  /** Driving wire for each "nodeId:port", built from valid wires only. */
  drivers: Map<string, Wire[]>;
}

const portKey = (nodeId: string, port: string) => `${nodeId}:${port}`;

const nodeName = (node: CircuitNode) => (node.kind === 'gate' ? `${node.gateType} gate` : `"${node.label}"`);

/**
 * Check a circuit before simulation. Only the part of the circuit that feeds the output terminals is
 * validated; unused gates are reported separately. Incomplete connections are errors, never zeros.
 */
export function analyze(circuit: Circuit, level: Level): Analysis {
  const errors: ValidationError[] = [];
  const nodes = new Map(circuit.nodes.map((n) => [n.id, n]));

  // 1. Terminals must match the level.
  const inputNodeIds: Record<string, string> = {};
  const outputNodeIds: Record<string, string> = {};
  for (const [labels, kind, target] of [
    [level.inputs, 'input', inputNodeIds],
    [level.outputs, 'output', outputNodeIds],
  ] as const) {
    for (const label of labels) {
      const node = circuit.nodes.find((n) => n.kind === kind && n.label === label);
      if (node) target[label] = node.id;
      else
        errors.push({
          code: 'MISSING_TERMINAL',
          nodeIds: [],
          wireIds: [],
          message: `The ${kind} terminal "${label}" is missing from the board.`,
        });
    }
  }

  // 2. Every wire must run from an output port to an existing input port.
  const drivers = new Map<string, Wire[]>();
  for (const wire of circuit.wires) {
    const from = nodes.get(wire.from.nodeId);
    const to = nodes.get(wire.to.nodeId);
    const validFrom = from !== undefined && wire.from.port === 'out' && portsOf(from).hasOutput;
    const validTo = to !== undefined && portsOf(to).inputs.includes(wire.to.port);
    if (!validFrom || !validTo) {
      errors.push({
        code: 'INVALID_WIRE',
        nodeIds: [from?.id, to?.id].filter((id): id is string => id !== undefined),
        wireIds: [wire.id],
        message: 'This wire must run from an output (right side) to an input (left side).',
      });
      continue;
    }
    const key = portKey(wire.to.nodeId, wire.to.port);
    drivers.set(key, [...(drivers.get(key) ?? []), wire]);
  }

  // 3. Walk backwards from the outputs to find the gates that matter.
  const relevant = new Set<string>();
  const stack = Object.values(outputNodeIds);
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (relevant.has(id)) continue;
    relevant.add(id);
    const node = nodes.get(id)!;
    for (const port of portsOf(node).inputs) {
      for (const wire of drivers.get(portKey(id, port)) ?? []) stack.push(wire.from.nodeId);
    }
  }
  const relevantGates = circuit.nodes.filter((n): n is GateNode => n.kind === 'gate' && relevant.has(n.id));
  const unusedGateIds = circuit.nodes
    .filter((n) => n.kind === 'gate' && !relevant.has(n.id))
    .map((n) => n.id);

  // 4. Every input port in use needs exactly one driver.
  for (const id of relevant) {
    const node = nodes.get(id)!;
    for (const port of portsOf(node).inputs) {
      const wires = drivers.get(portKey(id, port)) ?? [];
      if (wires.length === 0) {
        errors.push(
          node.kind === 'output'
            ? {
                code: 'OUTPUT_UNCONNECTED',
                nodeIds: [id],
                wireIds: [],
                message: `Output ${nodeName(node)} isn't connected to anything.`,
              }
            : {
                code: 'FLOATING_INPUT',
                nodeIds: [id],
                wireIds: [],
                message: `The ${describePort(node, port)} of this ${nodeName(node)} isn't connected.`,
              },
        );
      } else if (wires.length > 1) {
        errors.push({
          code: 'MULTIPLE_DRIVERS',
          nodeIds: [id],
          wireIds: wires.map((w) => w.id),
          message: `The ${describePort(node, port)} of ${nodeName(node)} has ${wires.length} wires. Each input takes one.`,
        });
      }
    }
  }

  // 5. Order the gates (Kahn's algorithm). Gates that can never be ordered sit on a feedback loop.
  const gateIds = new Set(relevantGates.map((g) => g.id));
  const feeds = new Map<string, string[]>(); // gate id -> gates it drives
  const pending = new Map<string, number>(); // gate id -> number of gate-driven inputs not yet ordered
  for (const gate of relevantGates) pending.set(gate.id, 0);
  for (const gate of relevantGates) {
    for (const port of portsOf(gate).inputs) {
      for (const wire of drivers.get(portKey(gate.id, port)) ?? []) {
        if (!gateIds.has(wire.from.nodeId)) continue;
        feeds.set(wire.from.nodeId, [...(feeds.get(wire.from.nodeId) ?? []), gate.id]);
        pending.set(gate.id, pending.get(gate.id)! + 1);
      }
    }
  }
  const ready = relevantGates.filter((g) => pending.get(g.id) === 0).map((g) => g.id);
  const order: string[] = [];
  while (ready.length > 0) {
    const id = ready.shift()!;
    order.push(id);
    for (const next of feeds.get(id) ?? []) {
      const left = pending.get(next)! - 1;
      pending.set(next, left);
      if (left === 0) ready.push(next);
    }
  }
  if (order.length < relevantGates.length) {
    const loop = findLoopGates(
      relevantGates.map((g) => g.id).filter((id) => !order.includes(id)),
      feeds,
    );
    errors.push({
      code: 'CYCLE',
      nodeIds: loop,
      wireIds: circuit.wires
        .filter((w) => loop.includes(w.from.nodeId) && loop.includes(w.to.nodeId))
        .map((w) => w.id),
      message: 'These gates feed back into themselves. A signal loop has no stable answer here.',
    });
  }

  const evalOrder = errors.length === 0 ? order.map((id) => nodes.get(id) as GateNode) : [];
  return { errors, unusedGateIds, evalOrder, inputNodeIds, outputNodeIds, drivers };
}

/**
 * Kahn leaves behind the loop gates plus anything downstream of them. Peel off gates that don't
 * feed back into the leftover set, so only the gates actually on a loop get highlighted.
 */
function findLoopGates(leftover: string[], feeds: Map<string, string[]>): string[] {
  const remaining = new Set(leftover);
  let changed = true;
  while (changed) {
    changed = false;
    for (const id of remaining) {
      if (!(feeds.get(id) ?? []).some((next) => remaining.has(next))) {
        remaining.delete(id);
        changed = true;
      }
    }
  }
  return [...remaining];
}

export function validate(circuit: Circuit, level: Level): ValidationError[] {
  return analyze(circuit, level).errors;
}
