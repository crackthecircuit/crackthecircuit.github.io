// Week 1 visual check for the board renderer. Replaced by the real screens in Week 2.
// Shows every gate type fed by A and B; only the AND gate drives Q, so the rest render as "unused".
// Use ?row=0..3 to inspect a different truth-table row.
import { simulate } from '../engine';
import type { Circuit, GateType } from '../engine';
import { Board } from '../components/board/Board';
import { getLevel } from '../levels/levels';
import { createStartingCircuit } from '../levels/startingCircuit';

const level = getLevel('level-1')!;
const GALLERY: [GateType, number, number][] = [
  ['AND', 560, 330],
  ['OR', 360, 140],
  ['NAND', 560, 140],
  ['NOR', 760, 140],
  ['XOR', 360, 520],
  ['NOT', 760, 520],
];

function galleryCircuit(): Circuit {
  const base = createStartingCircuit(level);
  const wires: Circuit['wires'] = [];
  const nodes = [...base.nodes];
  GALLERY.forEach(([gateType, x, y], i) => {
    const id = `g${i}`;
    nodes.push({ id, kind: 'gate', gateType, pos: { x, y } });
    wires.push({ id: `${id}a`, from: { nodeId: 'in-A', port: 'out' }, to: { nodeId: id, port: 'in0' } });
    if (gateType !== 'NOT')
      wires.push({ id: `${id}b`, from: { nodeId: 'in-B', port: 'out' }, to: { nodeId: id, port: 'in1' } });
  });
  wires.push({ id: 'q', from: { nodeId: 'g0', port: 'out' }, to: { nodeId: 'out-Q', port: 'in0' } });
  return { nodes, wires };
}

export function BoardPreview() {
  const circuit = galleryCircuit();
  const row = Number(new URLSearchParams(location.search).get('row') ?? 2);
  const result = simulate(circuit, level);
  const inspected = result.status === 'ok' ? result.rows[row] : undefined;
  return (
    <div style={{ height: '100%', display: 'grid', gridTemplateRows: 'auto 1fr' }}>
      <header
        style={{
          padding: 'var(--s-3) var(--s-6)',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-panel)',
          fontFamily: 'var(--font-mono)',
          fontSize: 13,
          color: 'var(--text-2)',
        }}
      >
        Board preview · row {row}: A={inspected?.inputs.A} B={inspected?.inputs.B} → Q={inspected?.outputs.Q}
      </header>
      <Board
        circuit={circuit}
        wireValues={inspected?.wireValues}
        inputValues={inspected?.inputs}
        unusedGateIds={result.unusedGateIds}
      />
    </div>
  );
}
