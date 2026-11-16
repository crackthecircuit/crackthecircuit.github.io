import { describe, expect, it } from 'vitest';
import { getLevel } from '../levels/levels';
import { createStartingCircuit } from '../levels/startingCircuit';
import { parseHash, screenHash } from '../store/appStore';
import { BOARD_HEIGHT, BOARD_WIDTH, CANVAS } from './board';
import {
  circuitBox,
  freeGatePosition,
  GATE_H,
  GATE_W,
  gatePositionAt,
  nearestPort,
  nodeAt,
  portPosition,
  wireDropTarget,
} from './geometry';
import { buildCircuit } from '../levels/solutions';

const level = getLevel('both-switches')!;

describe('geometry', () => {
  it('finds the port under the pointer, within a forgiving radius', () => {
    const circuit = createStartingCircuit(level);
    const a = circuit.nodes.find((n) => n.id === 'in-A')!;
    const p = portPosition(a, 'out');
    expect(nearestPort(circuit, { x: p.x + 10, y: p.y - 8 })).toEqual({ nodeId: 'in-A', port: 'out' });
    expect(nearestPort(circuit, { x: p.x + 60, y: p.y })).toBeNull();
  });

  it('reaches further for a finger when given a wider radius', () => {
    const circuit = createStartingCircuit(level);
    const a = circuit.nodes.find((n) => n.id === 'in-A')!;
    const p = portPosition(a, 'out');
    const beside = { x: p.x + 30, y: p.y };
    expect(nearestPort(circuit, beside)).toBeNull();
    expect(nearestPort(circuit, beside, 34)).toEqual({ nodeId: 'in-A', port: 'out' });
  });

  describe('dropping a wire', () => {
    // A 3-input AND g (Security System allows 3 inputs) right of the switches; A's output is the wire's origin.
    const vault = getLevel('security-system')!;
    const base = buildCircuit(vault, { g: ['AND', 3] }, [['B', 'g.in1']]);
    const circuit = {
      ...base,
      nodes: base.nodes.map((n) => (n.id === 'g' ? { ...n, pos: { x: 400, y: 200 } } : n)),
    };
    const g = circuit.nodes.find((n) => n.id === 'g')!;
    const fromA = { nodeId: 'in-A', port: 'out' as const };
    const middle = { x: g.pos.x + GATE_W / 2, y: portPosition(g, 'in1').y };

    it('lands on a port of the needed kind near the pointer', () => {
      const p = portPosition(g, 'in2');
      expect(wireDropTarget(circuit, fromA, { x: p.x + 5, y: p.y })).toEqual({ nodeId: 'g', port: 'in2' });
    });

    it('lands on the free input nearest the pointer when dropped on a gate body', () => {
      // in1 is taken by B, so a drop level with it takes the closest free one.
      const target = wireDropTarget(circuit, fromA, middle);
      expect(target?.nodeId).toBe('g');
      expect(['in0', 'in2']).toContain(target?.port);
      const low = { x: middle.x, y: portPosition(g, 'in2').y + 4 };
      expect(wireDropTarget(circuit, fromA, low)).toEqual({ nodeId: 'g', port: 'in2' });
    });

    it('replaces the nearest input when every input is taken, and treats a rerouted wire’s input as free', () => {
      const full = buildCircuit(vault, { g: ['AND', 3] }, [
        ['B', 'g.in0'],
        ['C', 'g.in1'],
        ['D', 'g.in2'],
      ]);
      const placed = { ...full, nodes: full.nodes.map((n) => (n.id === 'g' ? { ...n, pos: g.pos } : n)) };
      expect(wireDropTarget(placed, fromA, middle)).toEqual({ nodeId: 'g', port: 'in1' });
      const top = { x: middle.x, y: portPosition(g, 'in0').y };
      expect(wireDropTarget(placed, fromA, top, undefined, placed.wires[0]!.id)).toEqual({
        nodeId: 'g',
        port: 'in0',
      });
    });

    it('lands on the lamp body, and on a gate or switch body when the wire needs an output', () => {
      const lamp = circuit.nodes.find((n) => n.kind === 'output')!;
      expect(wireDropTarget(circuit, fromA, lamp.pos)).toEqual({ nodeId: lamp.id, port: 'in0' });
      const fromLamp = { nodeId: lamp.id, port: 'in0' as const };
      expect(wireDropTarget(circuit, fromLamp, middle)).toEqual({ nodeId: 'g', port: 'out' });
      const c = circuit.nodes.find((n) => n.id === 'in-C')!;
      expect(wireDropTarget(circuit, fromLamp, c.pos)).toEqual({ nodeId: 'in-C', port: 'out' });
    });

    it('never loops back onto its own gate, and lands nowhere on empty canvas', () => {
      expect(wireDropTarget(circuit, { nodeId: 'g', port: 'out' }, middle)).toBeNull();
      expect(wireDropTarget(circuit, fromA, { x: 2000, y: 2000 })).toBeNull();
      expect(nodeAt(circuit, { x: 2000, y: 2000 })).toBeNull();
    });

    it('still lands on a nearby port of the wrong kind, so the drop is rejected visibly', () => {
      const p = portPosition(g, 'out');
      expect(wireDropTarget(circuit, fromA, { x: p.x + 3, y: p.y })).toEqual({ nodeId: 'g', port: 'out' });
    });
  });

  it('snaps dropped gates to the grid, anywhere on the open canvas but inside its limits', () => {
    expect(gatePositionAt({ x: 413, y: 247 })).toEqual({ x: 380, y: 220 });
    // Past the old 960×600 board is fine now.
    expect(gatePositionAt({ x: -200, y: 900 })).toEqual({ x: -240, y: 880 });
    const corner = gatePositionAt({ x: -1e6, y: 1e6 });
    expect(corner.x).toBeGreaterThanOrEqual(CANVAS.minX);
    expect(corner.y + GATE_H).toBeLessThanOrEqual(CANVAS.maxY);
    const right = gatePositionAt({ x: 1e6, y: -1e6 });
    expect(right.x + GATE_W).toBeLessThanOrEqual(CANVAS.maxX);
    expect(right.y).toBeGreaterThanOrEqual(CANVAS.minY);
  });

  it('places click-added gates near the middle of the view, clear of gates and terminals', () => {
    const circuit = createStartingCircuit(level);
    const first = freeGatePosition(circuit);
    circuit.nodes.push({ id: 'g1', kind: 'gate', gateType: 'AND', pos: first });
    const second = freeGatePosition(circuit);
    expect(second).not.toEqual(first);
    // Asked for a spot right on switch A, it moves off the switch.
    const a = circuit.nodes.find((n) => n.id === 'in-A')!;
    const box = circuitBox({ ...circuit, nodes: [a] });
    const p = freeGatePosition(circuit, a.pos);
    const overlaps = p.x < box.maxX && p.x + GATE_W > box.minX && p.y < box.maxY && p.y + GATE_H > box.minY;
    expect(overlaps).toBe(false);
  });

  it('measures the circuit for "fit circuit"', () => {
    const circuit = createStartingCircuit(level);
    const box = circuitBox(circuit);
    for (const n of circuit.nodes) {
      expect(n.pos.x).toBeGreaterThan(box.minX);
      expect(n.pos.x).toBeLessThan(box.maxX);
    }
    expect(circuitBox({ nodes: [], wires: [] })).toEqual({
      minX: 0,
      minY: 0,
      maxX: BOARD_WIDTH,
      maxY: BOARD_HEIGHT,
    });
  });
});

describe('screen hash', () => {
  it('round-trips screens through the URL hash', () => {
    for (const screen of [
      { name: 'title' as const },
      { name: 'map' as const },
      { name: 'sandbox' as const },
      { name: 'level' as const, levelId: 'three-way-switch' },
    ]) {
      expect(parseHash(screenHash(screen))).toEqual(screen);
    }
    expect(parseHash('#/level/99')).toEqual({ name: 'title' });
    expect(parseHash('#/level/no-such-level')).toEqual({ name: 'title' });
    // Old numbered links open the level that used to have that number.
    expect(parseHash('#/level/16')).toEqual({ name: 'level', levelId: 'smart-lamp' });
    expect(parseHash('')).toEqual({ name: 'title' });
  });
});

describe('autosaved boards', () => {
  it('are only restored when they still fit the level', async () => {
    const { isUsableBoard } = await import('../levels/startingCircuit');
    const board = createStartingCircuit(level);
    expect(isUsableBoard(board, level)).toBe(true);
    expect(isUsableBoard(undefined, level)).toBe(false);
    expect(isUsableBoard({ ...board, nodes: board.nodes.filter((n) => n.id !== 'in-B') }, level)).toBe(false);
    const withOr = {
      ...board,
      nodes: [
        ...board.nodes,
        { id: 'g1', kind: 'gate' as const, gateType: 'OR' as const, pos: { x: 0, y: 0 } },
      ],
    };
    expect(isUsableBoard(withOr, level)).toBe(false); // level 1 only offers AND
  });
});
