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
  portPosition,
} from './geometry';

const level = getLevel('level-1')!;

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
    expect(circuitBox({ nodes: [], wires: [] })).toEqual({ minX: 0, minY: 0, maxX: BOARD_WIDTH, maxY: BOARD_HEIGHT });
  });
});

describe('screen hash', () => {
  it('round-trips screens through the URL hash', () => {
    for (const screen of [
      { name: 'title' as const },
      { name: 'map' as const },
      { name: 'sandbox' as const },
      { name: 'level' as const, levelId: 'level-7' },
    ]) {
      expect(parseHash(screenHash(screen))).toEqual(screen);
    }
    expect(parseHash('#/level/99')).toEqual({ name: 'title' });
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
