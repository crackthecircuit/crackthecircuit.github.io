import { beforeEach, describe, expect, it } from 'vitest';
import { simulate } from '../engine';
import { getLevel } from '../levels/levels';
import { useCircuitStore } from './circuitStore';

const level1 = getLevel('level-1')!; // palette: AND
const level4 = getLevel('level-4')!; // palette: AND, NOT
const store = () => useCircuitStore.getState();
const gates = () => store().circuit.nodes.filter((n) => n.kind === 'gate');

describe('circuit store', () => {
  beforeEach(() => store().loadLevel(level4));

  it('starts a level with only its terminals', () => {
    expect(store().circuit.nodes.map((n) => n.id)).toEqual(['in-A', 'in-B', 'out-Q']);
    expect(store().circuit.wires).toEqual([]);
  });

  it('only places gates from the level palette', () => {
    expect(store().addGate('AND', { x: 300, y: 200 })).toBe('g1');
    expect(store().addGate('OR', { x: 300, y: 300 })).toBeNull();
    expect(gates().map((g) => g.id)).toEqual(['g1']);
    expect(store().selection).toEqual({ kind: 'node', id: 'g1' });
  });

  it('builds a working circuit through store actions', () => {
    const and = store().addGate('AND', { x: 300, y: 200 })!;
    const not = store().addGate('NOT', { x: 500, y: 200 })!;
    store().connect('in-A', { nodeId: and, port: 'in0' });
    store().connect('in-B', { nodeId: and, port: 'in1' });
    store().connect(and, { nodeId: not, port: 'in0' });
    store().connect(not, { nodeId: 'out-Q', port: 'in0' });
    const result = simulate(store().circuit, level4);
    expect(result.status === 'ok' && result.allPassed).toBe(true);
  });

  it('rejects connections into input terminals, out of output terminals, or to missing ports', () => {
    const not = store().addGate('NOT', { x: 300, y: 200 })!;
    expect(store().connect(not, { nodeId: 'in-A', port: 'in0' })).toBe(false);
    expect(store().connect('out-Q', { nodeId: not, port: 'in0' })).toBe(false);
    expect(store().connect('in-A', { nodeId: not, port: 'in1' })).toBe(false);
    expect(store().circuit.wires).toEqual([]);
  });

  it('replaces the wire on an input that is already connected, and allows fan-out', () => {
    const and = store().addGate('AND', { x: 300, y: 200 })!;
    store().connect('in-A', { nodeId: and, port: 'in0' });
    store().connect('in-B', { nodeId: and, port: 'in0' }); // replaces A on in0
    store().connect('in-B', { nodeId: and, port: 'in1' }); // B fans out to both inputs
    expect(store().circuit.wires.map((w) => [w.from.nodeId, w.to.port])).toEqual([
      ['in-B', 'in0'],
      ['in-B', 'in1'],
    ]);
  });

  it('moves a wire end to another input in one undo step, or removes it', () => {
    const and = store().addGate('AND', { x: 300, y: 200 })!;
    store().connect('in-A', { nodeId: and, port: 'in0' });
    store().connect('in-B', { nodeId: and, port: 'in1' });
    const [wa] = store().circuit.wires;
    const steps = store().past.length;

    // Rerouting A onto in1 replaces B's wire there.
    expect(store().moveWireEnd(wa!.id, { nodeId: and, port: 'in1' })).toBe(true);
    expect(store().circuit.wires.map((w) => [w.from.nodeId, w.to.port])).toEqual([['in-A', 'in1']]);
    expect(store().past.length).toBe(steps + 1);

    expect(store().moveWireEnd(wa!.id, { nodeId: 'in-B', port: 'in0' })).toBe(false);
    expect(store().moveWireEnd(wa!.id, null)).toBe(true);
    expect(store().circuit.wires).toEqual([]);
    store().undo();
    store().undo();
    expect(store().circuit.wires).toHaveLength(2);
  });

  it('deletes a gate together with its wires, but never a terminal', () => {
    const and = store().addGate('AND', { x: 300, y: 200 })!;
    store().connect('in-A', { nodeId: and, port: 'in0' });
    store().connect(and, { nodeId: 'out-Q', port: 'in0' });
    store().select({ kind: 'node', id: and });
    store().removeSelection();
    expect(gates()).toEqual([]);
    expect(store().circuit.wires).toEqual([]);
    expect(store().selection).toBeNull();

    store().removeGate('in-A');
    expect(store().circuit.nodes.map((n) => n.id)).toEqual(['in-A', 'in-B', 'out-Q']);
  });

  it('undoes and redoes every edit, including reset', () => {
    const and = store().addGate('AND', { x: 300, y: 200 })!;
    store().moveGate(and, { x: 400, y: 260 });
    store().connect('in-A', { nodeId: and, port: 'in0' });
    store().reset();
    expect(gates()).toEqual([]);

    store().undo(); // undo reset
    expect(gates()).toHaveLength(1);
    expect(store().circuit.wires).toHaveLength(1);
    store().undo(); // undo connect
    store().undo(); // undo move
    expect(gates()[0]!.pos).toEqual({ x: 300, y: 200 });
    store().redo();
    expect(gates()[0]!.pos).toEqual({ x: 400, y: 260 });
    store().undo();
    store().undo(); // undo add
    expect(gates()).toEqual([]);
    store().undo(); // nothing left to undo
    expect(gates()).toEqual([]);
  });

  it('starts a new history branch after an edit following undo', () => {
    store().addGate('AND', { x: 300, y: 200 });
    store().undo();
    store().addGate('NOT', { x: 300, y: 200 });
    expect(store().future).toEqual([]);
    store().redo();
    expect(gates().map((g) => g.gateType)).toEqual(['NOT']);
  });

  it('does not record no-op moves or resets as history', () => {
    store().reset();
    const and = store().addGate('AND', { x: 300, y: 200 })!;
    store().moveGate(and, { x: 300, y: 200 });
    expect(store().past).toHaveLength(1);
  });

  it('restores an autosaved board without undo history', () => {
    store().addGate('AND', { x: 300, y: 200 });
    const saved = store().circuit;
    store().loadLevel(level1, saved);
    expect(store().circuit).toBe(saved);
    expect(store().past).toEqual([]);
  });
});

describe('gate width', () => {
  const level12 = getLevel('level-12')!; // OR, up to 4 inputs
  const level13 = getLevel('level-13')!;

  it('widens and narrows gates within the level limit, dropping wires on removed ports', () => {
    store().loadLevel(level12);
    const or = store().addGate('OR', { x: 300, y: 200 })!;
    expect(store().setGateInputs(or, 4)).toBe(true);
    for (const [label, port] of [
      ['A', 'in0'],
      ['B', 'in1'],
      ['C', 'in2'],
      ['D', 'in3'],
    ] as const) {
      store().connect(`in-${label}`, { nodeId: or, port });
    }
    expect(store().circuit.wires).toHaveLength(4);

    expect(store().setGateInputs(or, 5)).toBe(false);
    expect(store().setGateInputs(or, 3)).toBe(true);
    expect(store().circuit.wires.map((w) => w.to.port)).toEqual(['in0', 'in1', 'in2']);
    store().undo();
    expect(store().circuit.wires).toHaveLength(4);
  });

  it('keeps gates at 2 inputs on levels that do not allow wide gates, and NOT at 1', () => {
    store().loadLevel(level4);
    const and = store().addGate('AND', { x: 300, y: 200 })!;
    expect(store().setGateInputs(and, 3)).toBe(false);
    const not = store().addGate('NOT', { x: 300, y: 300 })!;
    expect(store().setGateInputs(not, 2)).toBe(false);
  });

  it('allows ports beyond in1 only on widened gates', () => {
    store().loadLevel(level13);
    const and = store().addGate('AND', { x: 300, y: 200 })!;
    expect(store().connect('in-A', { nodeId: and, port: 'in2' })).toBe(false);
    store().setGateInputs(and, 3);
    expect(store().connect('in-A', { nodeId: and, port: 'in2' })).toBe(true);
  });
});
