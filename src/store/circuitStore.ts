import { create } from 'zustand';
import { portsOf } from '../engine';
import type { Circuit, GateType, InputPortId, Level, Point, Wire } from '../engine';
import { createStartingCircuit } from '../levels/startingCircuit';

const HISTORY_LIMIT = 100;

export type Selection = { kind: 'node' | 'wire'; id: string } | null;

export interface CircuitState {
  level: Level | null;
  circuit: Circuit;
  past: Circuit[];
  future: Circuit[];
  selection: Selection;

  /** Open a level, restoring an autosaved board if there is one. Clears undo history. */
  loadLevel: (level: Level, saved?: Circuit) => void;
  /** Place a gate from the palette. Returns its id, or null if the level's palette doesn't allow it. */
  addGate: (gateType: GateType, pos: Point) => string | null;
  /** Commit a gate's new position (call once when a drag ends). */
  moveGate: (nodeId: string, pos: Point) => void;
  /**
   * Wire an output port to an input port. A wire already on that input is replaced.
   * Returns false (and changes nothing) if the ports can't be connected.
   */
  connect: (fromNodeId: string, to: { nodeId: string; port: InputPortId }) => boolean;
  removeWire: (wireId: string) => void;
  /** Delete a gate and its wires. Terminals can't be deleted. */
  removeGate: (nodeId: string) => void;
  removeSelection: () => void;
  /** Clear every gate and wire, keeping the terminals. Undoable. */
  reset: () => void;
  select: (selection: Selection) => void;
  undo: () => void;
  redo: () => void;
}

const EMPTY: Circuit = { nodes: [], wires: [] };

/** Next free id like "g3" or "w12". */
function nextId(prefix: string, ids: string[]): string {
  let n = 1;
  const taken = new Set(ids);
  while (taken.has(`${prefix}${n}`)) n++;
  return `${prefix}${n}`;
}

/** Whether a wire from `fromNodeId`'s output to `to` would be well-formed. */
export function canConnect(circuit: Circuit, fromNodeId: string, to: { nodeId: string; port: InputPortId }) {
  const from = circuit.nodes.find((n) => n.id === fromNodeId);
  const target = circuit.nodes.find((n) => n.id === to.nodeId);
  if (!from || !target) return false;
  return portsOf(from).hasOutput && portsOf(target).inputs.includes(to.port);
}

export const useCircuitStore = create<CircuitState>()((set, get) => {
  /** Apply an edit as one undoable step. */
  const commit = (next: Circuit, selection: Selection = get().selection) => {
    const { circuit, past } = get();
    set({ circuit: next, past: [...past, circuit].slice(-HISTORY_LIMIT), future: [], selection });
  };

  return {
    level: null,
    circuit: EMPTY,
    past: [],
    future: [],
    selection: null,

    loadLevel: (level, saved) =>
      set({ level, circuit: saved ?? createStartingCircuit(level), past: [], future: [], selection: null }),

    addGate: (gateType, pos) => {
      const { level, circuit } = get();
      if (!level || !level.palette.includes(gateType)) return null;
      const id = nextId(
        'g',
        circuit.nodes.map((n) => n.id),
      );
      commit(
        { ...circuit, nodes: [...circuit.nodes, { id, kind: 'gate', gateType, pos }] },
        { kind: 'node', id },
      );
      return id;
    },

    moveGate: (nodeId, pos) => {
      const { circuit } = get();
      const node = circuit.nodes.find((n) => n.id === nodeId);
      if (!node || node.kind !== 'gate' || (node.pos.x === pos.x && node.pos.y === pos.y)) return;
      commit({ ...circuit, nodes: circuit.nodes.map((n) => (n.id === nodeId ? { ...n, pos } : n)) });
    },

    connect: (fromNodeId, to) => {
      const { circuit } = get();
      if (!canConnect(circuit, fromNodeId, to)) return false;
      const existing = circuit.wires.find((w) => w.to.nodeId === to.nodeId && w.to.port === to.port);
      if (existing?.from.nodeId === fromNodeId) return true; // already wired exactly like this
      const wire: Wire = {
        id: nextId(
          'w',
          circuit.wires.map((w) => w.id),
        ),
        from: { nodeId: fromNodeId, port: 'out' },
        to,
      };
      commit({ ...circuit, wires: [...circuit.wires.filter((w) => w !== existing), wire] });
      return true;
    },

    removeWire: (wireId) => {
      const { circuit, selection } = get();
      if (!circuit.wires.some((w) => w.id === wireId)) return;
      commit(
        { ...circuit, wires: circuit.wires.filter((w) => w.id !== wireId) },
        selection?.id === wireId ? null : selection,
      );
    },

    removeGate: (nodeId) => {
      const { circuit, selection } = get();
      const node = circuit.nodes.find((n) => n.id === nodeId);
      if (!node || node.kind !== 'gate') return;
      commit(
        {
          nodes: circuit.nodes.filter((n) => n.id !== nodeId),
          wires: circuit.wires.filter((w) => w.from.nodeId !== nodeId && w.to.nodeId !== nodeId),
        },
        selection?.id === nodeId ? null : selection,
      );
    },

    removeSelection: () => {
      const { selection, removeGate, removeWire } = get();
      if (selection?.kind === 'node') removeGate(selection.id);
      else if (selection?.kind === 'wire') removeWire(selection.id);
    },

    reset: () => {
      const { level, circuit } = get();
      if (!level) return;
      const fresh = createStartingCircuit(level);
      const unchanged = circuit.wires.length === 0 && circuit.nodes.every((n) => n.kind !== 'gate');
      if (!unchanged)
        commit({ nodes: circuit.nodes.filter((n) => n.kind !== 'gate'), wires: fresh.wires }, null);
    },

    select: (selection) => set({ selection }),

    undo: () => {
      const { past, circuit, future } = get();
      const previous = past.at(-1);
      if (!previous) return;
      set({ circuit: previous, past: past.slice(0, -1), future: [circuit, ...future], selection: null });
    },

    redo: () => {
      const { past, circuit, future } = get();
      const [next, ...rest] = future;
      if (!next) return;
      set({ circuit: next, past: [...past, circuit], future: rest, selection: null });
    },
  };
});
