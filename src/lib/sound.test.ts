import { describe, expect, it } from 'vitest';
import type { Circuit } from '../engine';
import { getLevel } from '../levels/levels';
import { buildCircuit } from '../levels/solutions';
import { createStartingCircuit } from '../levels/startingCircuit';
import { editSound, playSound } from './sound';

const level = getLevel('level-7')!; // A, B, C → Q
const empty = createStartingCircuit(level);
const withGate = buildCircuit(level, { g1: 'AND' }, []);
const wired = buildCircuit(level, { g1: 'AND' }, [['A', 'g1.in0']]);

describe('edit sounds', () => {
  it('names the kind of edit', () => {
    expect(editSound(empty, withGate)).toBe('place');
    expect(editSound(withGate, empty)).toBe('remove');
    expect(editSound(withGate, wired)).toBe('connect');
    expect(editSound(wired, withGate)).toBe('remove');
    expect(editSound(wired, wired)).toBeNull();
  });

  it('hears a reroute, a resize and a move', () => {
    const rerouted: Circuit = {
      ...wired,
      wires: wired.wires.map((w) => ({ ...w, to: { ...w.to, port: 'in1' as const } })),
    };
    expect(editSound(wired, rerouted)).toBe('connect');
    const widen = (c: Circuit): Circuit => ({
      ...c,
      nodes: c.nodes.map((n) => (n.kind === 'gate' ? { ...n, inputs: 3 } : n)),
    });
    expect(editSound(withGate, widen(withGate))).toBe('resize');
    const moved: Circuit = {
      ...withGate,
      nodes: withGate.nodes.map((n) => (n.kind === 'gate' ? { ...n, pos: { x: 0, y: 0 } } : n)),
    };
    expect(editSound(withGate, moved)).toBe('drop');
  });

  it('is silent where there is no Web Audio', () => {
    expect(() => playSound('success')).not.toThrow();
  });
});
