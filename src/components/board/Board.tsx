import { useId } from 'react';
import { portsOf } from '../../engine';
import type { Bit, Circuit, CircuitNode, GateNode, InputNode, InputPortId, OutputNode } from '../../engine';
import { BOARD_HEIGHT, BOARD_WIDTH, GRID } from '../../lib/board';
import { GATE_H, GATE_W, portPosition, wirePath } from '../../lib/geometry';
import type { Selection } from '../../store/circuitStore';
import { GateShape } from './GateShape';
import styles from './Board.module.css';

export interface BoardProps {
  circuit: Circuit;
  /** Signal on each wire for the inspected truth-table row. Omit before a run. */
  wireValues?: Record<string, Bit>;
  /** Value of each input terminal for the inspected row, by label. */
  inputValues?: Record<string, Bit>;
  unusedGateIds?: string[];
  errorNodeIds?: string[];
  errorWireIds?: string[];
  selection?: Selection;
}

const signalAttr = (v: Bit | undefined) => (v === undefined ? undefined : String(v));

/** Draws a circuit. Interaction (dragging, wiring) is layered on in Week 2. */
export function Board({
  circuit,
  wireValues,
  inputValues,
  unusedGateIds = [],
  errorNodeIds = [],
  errorWireIds = [],
  selection = null,
}: BoardProps) {
  const gridId = useId();
  const nodes = new Map(circuit.nodes.map((n) => [n.id, n]));

  // Signal leaving each node's output, derived from the wires it drives.
  const nodeSignal = new Map<string, Bit>();
  for (const w of circuit.wires) {
    const v = wireValues?.[w.id];
    if (v !== undefined) nodeSignal.set(w.from.nodeId, v);
  }
  // Signal arriving at each input port, keyed "nodeId:port".
  const incoming = new Map<string, Bit>();
  for (const w of circuit.wires) {
    const v = wireValues?.[w.id];
    if (v !== undefined) incoming.set(`${w.to.nodeId}:${w.to.port}`, v);
  }

  const isSelected = (kind: 'node' | 'wire', id: string) => selection?.kind === kind && selection.id === id;

  return (
    <svg
      className={styles.board}
      viewBox={`0 0 ${BOARD_WIDTH} ${BOARD_HEIGHT}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Circuit board"
    >
      <defs>
        <pattern id={gridId} width={GRID} height={GRID} patternUnits="userSpaceOnUse">
          <circle className={styles.gridDot} cx={GRID / 2} cy={GRID / 2} r={1.2} />
        </pattern>
      </defs>
      <rect width={BOARD_WIDTH} height={BOARD_HEIGHT} fill={`url(#${gridId})`} />

      <g>
        {circuit.wires.map((w) => {
          const from = nodes.get(w.from.nodeId);
          const to = nodes.get(w.to.nodeId);
          if (!from || !to) return null;
          return (
            <path
              key={w.id}
              className={styles.wire}
              d={wirePath(portPosition(from, 'out'), portPosition(to, w.to.port))}
              data-signal={signalAttr(wireValues?.[w.id])}
              data-selected={isSelected('wire', w.id) || undefined}
              data-error={errorWireIds.includes(w.id) || undefined}
            />
          );
        })}
      </g>

      <g>
        {circuit.nodes.map((node) => {
          const error = errorNodeIds.includes(node.id) || undefined;
          switch (node.kind) {
            case 'gate':
              return (
                <Gate
                  key={node.id}
                  node={node}
                  selected={isSelected('node', node.id)}
                  unused={unusedGateIds.includes(node.id)}
                  error={error}
                  output={nodeSignal.get(node.id)}
                  inputs={{ in0: incoming.get(`${node.id}:in0`), in1: incoming.get(`${node.id}:in1`) }}
                />
              );
            case 'input':
              return (
                <InputTerminal
                  key={node.id}
                  node={node}
                  value={inputValues?.[node.label] ?? nodeSignal.get(node.id)}
                  error={error}
                />
              );
            case 'output':
              return (
                <OutputTerminal
                  key={node.id}
                  node={node}
                  value={incoming.get(`${node.id}:in0`)}
                  error={error}
                />
              );
          }
        })}
      </g>
    </svg>
  );
}

function Port({ node, port, value }: { node: CircuitNode; port: 'in0' | 'in1' | 'out'; value?: Bit }) {
  const p = portPosition(node, port);
  return <circle className={styles.port} cx={p.x} cy={p.y} r={5} data-signal={signalAttr(value)} />;
}

function Gate(props: {
  node: GateNode;
  selected: boolean;
  unused: boolean;
  error?: true;
  output?: Bit;
  inputs: Partial<Record<InputPortId, Bit>>;
}) {
  const { node, selected, unused, error, output, inputs } = props;
  return (
    <g
      className={styles.gate}
      data-selected={selected || undefined}
      data-unused={unused || undefined}
      data-error={error}
    >
      <g transform={`translate(${node.pos.x} ${node.pos.y})`}>
        <GateShape type={node.gateType} />
        <text className={styles.gateLabel} x={GATE_W / 2} y={GATE_H + 12}>
          {node.gateType}
        </text>
        {unused && (
          <text className={styles.unusedTag} x={GATE_W / 2} y={-6}>
            unused
          </text>
        )}
      </g>
      {portsOf(node).inputs.map((port) => (
        <Port key={port} node={node} port={port} value={inputs[port]} />
      ))}
      <Port node={node} port="out" value={output} />
    </g>
  );
}

function InputTerminal({ node, value, error }: { node: InputNode; value?: Bit; error?: true }) {
  const { x, y } = node.pos;
  return (
    <g className={styles.terminal} data-signal={signalAttr(value)} data-error={error}>
      <rect className={styles.terminalBody} x={x - 28} y={y - 22} width={56} height={44} rx={10} />
      <text className={styles.terminalLabel} x={x - 8} y={y + 5}>
        {node.label}
      </text>
      <text className={styles.terminalValue} x={x + 12} y={y + 5}>
        {value ?? '·'}
      </text>
      <Port node={node} port="out" value={value} />
    </g>
  );
}

function OutputTerminal({ node, value, error }: { node: OutputNode; value?: Bit; error?: true }) {
  const { x, y } = node.pos;
  return (
    <g className={styles.terminal} data-signal={signalAttr(value)} data-error={error}>
      <circle className={styles.lamp} cx={x} cy={y} r={22} />
      <text className={styles.terminalValue} x={x} y={y + 5}>
        {value ?? '·'}
      </text>
      <text className={styles.terminalLabel} x={x} y={y + 44}>
        {node.label}
      </text>
      <Port node={node} port="in0" value={value} />
    </g>
  );
}
