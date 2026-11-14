import { describe, expect, it } from 'vitest';
import { getLevel } from '../levels/levels';
import { createStartingCircuit } from '../levels/startingCircuit';
import { parseHash, screenHash } from '../store/appStore';
import { BOARD_HEIGHT, BOARD_WIDTH } from './board';
import { freeGatePosition, GATE_H, GATE_W, gatePositionAt, nearestPort, portPosition } from './geometry';

const level = getLevel('level-1')!;

describe('geometry', () => {
  it('finds the port under the pointer, within a forgiving radius', () => {
    const circuit = createStartingCircuit(level);
    const a = circuit.nodes.find((n) => n.id === 'in-A')!;
    const p = portPosition(a, 'out');
    expect(nearestPort(circuit, { x: p.x + 10, y: p.y - 8 })).toEqual({ nodeId: 'in-A', port: 'out' });
    expect(nearestPort(circuit, { x: p.x + 60, y: p.y })).toBeNull();
  });

  it('snaps dropped gates to the grid and keeps them on the board', () => {
    expect(gatePositionAt({ x: 413, y: 247 })).toEqual({ x: 380, y: 220 });
    const corner = gatePositionAt({ x: -50, y: 5000 });
    expect(corner.x).toBeGreaterThanOrEqual(0);
    expect(corner.y + GATE_H).toBeLessThanOrEqual(BOARD_HEIGHT);
    const right = gatePositionAt({ x: 5000, y: 0 });
    expect(right.x + GATE_W).toBeLessThanOrEqual(BOARD_WIDTH);
  });

  it('places click-added gates where they do not overlap', () => {
    const circuit = createStartingCircuit(level);
    const first = freeGatePosition(circuit);
    circuit.nodes.push({ id: 'g1', kind: 'gate', gateType: 'AND', pos: first });
    const second = freeGatePosition(circuit);
    expect(second).not.toEqual(first);
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
