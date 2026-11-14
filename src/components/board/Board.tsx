import { useEffect, useId, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, Ref } from 'react';
import { portsOf } from '../../engine';
import type { Bit, Circuit, CircuitNode, GateNode, InputNode, OutputNode, Point, PortId } from '../../engine';
import { BOARD_HEIGHT, BOARD_WIDTH, GRID } from '../../lib/board';
import { GATE_W, gateHeightFor, portKey, portPosition, wirePath } from '../../lib/geometry';
import type { PortRef } from '../../lib/geometry';
import type { Selection } from '../../store/circuitStore';
import { GateShape } from './GateShape';
import styles from './Board.module.css';

type PointerHandler<T> = (target: T, event: ReactPointerEvent) => void;

export interface BoardProps {
  circuit: Circuit;
  svgRef?: Ref<SVGSVGElement>;
  /** Visible part of the world (zoom/pan). Defaults to the whole board. */
  viewBox?: { x: number; y: number; width: number; height: number };
  /** The background can be dragged to pan (zoomed in), and is being dragged now. */
  pannable?: boolean;
  panning?: boolean;

  // Simulation display
  /** Signal on each wire for the inspected truth-table row. Omit before a run. */
  wireValues?: Record<string, Bit>;
  /** Value of each input terminal for the inspected row, by label. */
  inputValues?: Record<string, Bit>;
  unusedGateIds?: string[];
  errorNodeIds?: string[];
  errorWireIds?: string[];
  /** Flowing-signal animation on every wire (success sweep). */
  celebrate?: boolean;

  // Editing display
  selection?: Selection;
  /** Wire currently being drawn, from its output end to its input end. */
  draftWire?: { from: Point; to: Point } | null;
  /** A wire being rerouted is hidden while its draft is shown. */
  hiddenWireId?: string;
  /** Port states while a wire is being drawn: valid targets glow, invalid ones dim. */
  portHints?: Record<string, 'origin' | 'valid' | 'invalid'>;
  /** Port that just rejected a connection (plays a shake). */
  shakePortKey?: string | null;
  /** Gate being dragged over the palette, about to be deleted. */
  deletingGateId?: string | null;
  draggingGateId?: string | null;
  /** Show the input-count control on this gate, with the sizes it allows. */
  gateResize?: { nodeId: string; min: number; max: number } | null;
  onResizeGate?: (nodeId: string, inputs: number) => void;

  // Interaction
  onPortPointerDown?: PointerHandler<PortRef>;
  onGatePointerDown?: PointerHandler<string>;
  onWirePointerDown?: PointerHandler<string>;
  onBackgroundPointerDown?: (event: ReactPointerEvent) => void;
}

const GHOST_MS = 200;

const signalAttr = (v: Bit | undefined) => (v === undefined ? undefined : String(v));
const flag = (v: boolean | undefined) => (v ? 'true' : undefined);

/** Draws a circuit and reports pointer presses. Editing logic lives in Workspace. */
export function Board(props: BoardProps) {
  const {
    circuit,
    svgRef,
    viewBox = { x: 0, y: 0, width: BOARD_WIDTH, height: BOARD_HEIGHT },
    pannable,
    panning,
    wireValues,
    inputValues,
    unusedGateIds = [],
    errorNodeIds = [],
    errorWireIds = [],
    celebrate,
    selection = null,
    draftWire,
    hiddenWireId,
    portHints,
    shakePortKey,
    deletingGateId,
    draggingGateId,
    onBackgroundPointerDown,
    onWirePointerDown,
  } = props;
  const gridId = useId();
  const nodes = new Map(circuit.nodes.map((n) => [n.id, n]));

  // A removed gate lingers for a moment as a fading, non-interactive ghost.
  const previousGates = useRef(new Map<string, GateNode>());
  const [ghosts, setGhosts] = useState<GateNode[]>([]);
  useEffect(() => {
    const current = new Map<string, GateNode>();
    for (const n of circuit.nodes) if (n.kind === 'gate') current.set(n.id, n);
    const removed = [...previousGates.current.values()].filter((g) => !current.has(g.id));
    previousGates.current = current;
    if (removed.length === 0) return;
    setGhosts((g) => [...g, ...removed]);
    const t = window.setTimeout(
      () => setGhosts((g) => g.filter((x) => !removed.some((r) => r.id === x.id))),
      GHOST_MS,
    );
    return () => window.clearTimeout(t);
  }, [circuit.nodes]);

  // Signal leaving each node's output, and arriving at each input port ("nodeId:port").
  const outgoing = new Map<string, Bit>();
  const incoming = new Map<string, Bit>();
  for (const w of circuit.wires) {
    const v = wireValues?.[w.id];
    if (v === undefined) continue;
    outgoing.set(w.from.nodeId, v);
    incoming.set(`${w.to.nodeId}:${w.to.port}`, v);
  }

  const isSelected = (kind: 'node' | 'wire', id: string) => selection?.kind === kind && selection.id === id;

  const port = (node: CircuitNode, p: PortId, value?: Bit) => (
    <Port
      key={p}
      node={node}
      port={p}
      value={value}
      hint={portHints?.[portKey({ nodeId: node.id, port: p })]}
      shake={shakePortKey === portKey({ nodeId: node.id, port: p })}
      onPointerDown={props.onPortPointerDown}
    />
  );

  return (
    <svg
      ref={svgRef}
      className={styles.board}
      viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
      preserveAspectRatio="xMidYMid meet"
      role="application"
      aria-label="Circuit board"
      data-wiring={flag(!!draftWire)}
      data-celebrate={flag(celebrate)}
      data-pannable={flag(pannable)}
      data-panning={flag(panning)}
    >
      <defs>
        <pattern id={gridId} width={GRID} height={GRID} patternUnits="userSpaceOnUse">
          <circle className={styles.gridDot} cx={GRID / 2} cy={GRID / 2} r={1.2} />
        </pattern>
      </defs>
      {/* Everything around the board (visible when zoomed out) behaves like empty board. */}
      <rect
        className={styles.background}
        x={-BOARD_WIDTH * 4}
        y={-BOARD_HEIGHT * 4}
        width={BOARD_WIDTH * 9}
        height={BOARD_HEIGHT * 9}
        fill="transparent"
        onPointerDown={onBackgroundPointerDown}
      />
      <rect
        className={styles.background}
        width={BOARD_WIDTH}
        height={BOARD_HEIGHT}
        fill={`url(#${gridId})`}
        onPointerDown={onBackgroundPointerDown}
      />
      <rect className={styles.frame} width={BOARD_WIDTH} height={BOARD_HEIGHT} aria-hidden />

      <g>
        {circuit.wires.map((w) => {
          const from = nodes.get(w.from.nodeId);
          const to = nodes.get(w.to.nodeId);
          if (!from || !to || w.id === hiddenWireId) return null;
          const d = wirePath(portPosition(from, 'out'), portPosition(to, w.to.port));
          return (
            <g key={w.id} className={styles.wireGroup} onPointerDown={(e) => onWirePointerDown?.(w.id, e)}>
              <path className={styles.wireHit} d={d} />
              <path
                className={styles.wire}
                d={d}
                style={
                  { '--delay': `${Math.round((from.pos.x / BOARD_WIDTH) * 300)}ms` } as React.CSSProperties
                }
                data-signal={signalAttr(wireValues?.[w.id])}
                data-selected={flag(isSelected('wire', w.id))}
                data-error={flag(errorWireIds.includes(w.id))}
              />
            </g>
          );
        })}
        {draftWire && <path className={styles.draftWire} d={wirePath(draftWire.from, draftWire.to)} />}
      </g>

      {ghosts.map((g) => (
        <g key={`ghost-${g.id}`} className={styles.ghost} aria-hidden>
          <g transform={`translate(${g.pos.x} ${g.pos.y})`}>
            <GateShape type={g.gateType} inputs={portsOf(g).inputs.length} />
          </g>
        </g>
      ))}

      <g>
        {circuit.nodes.map((node) => {
          const error = errorNodeIds.includes(node.id);
          switch (node.kind) {
            case 'gate':
              return (
                <Gate
                  key={node.id}
                  node={node}
                  selected={isSelected('node', node.id)}
                  unused={unusedGateIds.includes(node.id)}
                  error={error}
                  deleting={deletingGateId === node.id}
                  dragging={draggingGateId === node.id}
                  onPointerDown={props.onGatePointerDown}
                  resize={props.gateResize?.nodeId === node.id ? props.gateResize : null}
                  onResize={props.onResizeGate}
                >
                  {portsOf(node).inputs.map((p) => port(node, p, incoming.get(`${node.id}:${p}`)))}
                  {port(node, 'out', outgoing.get(node.id))}
                </Gate>
              );
            case 'input': {
              const value = inputValues?.[node.label] ?? outgoing.get(node.id);
              return (
                <InputTerminal key={node.id} node={node} value={value} error={error}>
                  {port(node, 'out', value)}
                </InputTerminal>
              );
            }
            case 'output': {
              const value = incoming.get(`${node.id}:in0`);
              return (
                <OutputTerminal key={node.id} node={node} value={value} error={error}>
                  {port(node, 'in0', value)}
                </OutputTerminal>
              );
            }
          }
        })}
      </g>
    </svg>
  );
}

function Port(props: {
  node: CircuitNode;
  port: PortId;
  value?: Bit;
  hint?: 'origin' | 'valid' | 'invalid';
  shake: boolean;
  onPointerDown?: PointerHandler<PortRef>;
}) {
  const { node, port, value, hint, shake, onPointerDown } = props;
  const p = portPosition(node, port);
  return (
    <g
      className={styles.portGroup}
      data-hint={hint}
      data-shake={flag(shake)}
      style={{ transformOrigin: `${p.x}px ${p.y}px` }}
      onPointerDown={(e) => onPointerDown?.({ nodeId: node.id, port }, e)}
    >
      <circle className={styles.portHit} cx={p.x} cy={p.y} r={14} />
      <circle className={styles.port} cx={p.x} cy={p.y} r={5} data-signal={signalAttr(value)} />
    </g>
  );
}

function Gate(props: {
  node: GateNode;
  selected: boolean;
  unused: boolean;
  error: boolean;
  deleting: boolean;
  dragging: boolean;
  onPointerDown?: PointerHandler<string>;
  resize: { min: number; max: number } | null;
  onResize?: (nodeId: string, inputs: number) => void;
  children: React.ReactNode;
}) {
  const { node, selected, unused, error, deleting, dragging, onPointerDown, resize, onResize, children } =
    props;
  const inputs = portsOf(node).inputs.length;
  const height = gateHeightFor(inputs);
  return (
    <g
      className={styles.gate}
      data-selected={flag(selected)}
      data-unused={flag(unused)}
      data-error={flag(error)}
      data-deleting={flag(deleting)}
      data-dragging={flag(dragging)}
    >
      <g
        className={styles.gateBody}
        transform={`translate(${node.pos.x} ${node.pos.y})`}
        onPointerDown={(e) => onPointerDown?.(node.id, e)}
      >
        <rect className={styles.gateHit} x={10} y={0} width={GATE_W - 20} height={height} />
        <GateShape type={node.gateType} inputs={inputs} />
        <text className={styles.gateLabel} x={GATE_W / 2} y={height + 12}>
          {node.gateType}
        </text>
        {unused && !resize && (
          <text className={styles.unusedTag} x={GATE_W / 2} y={-6}>
            unused
          </text>
        )}
      </g>
      {children}
      {resize && (
        <ResizeControl
          x={node.pos.x + GATE_W / 2}
          y={node.pos.y - 22}
          inputs={inputs}
          {...resize}
          onChange={(n) => onResize?.(node.id, n)}
        />
      )}
    </g>
  );
}

/** "−  3 inputs  +" pill above a selected gate. */
function ResizeControl(props: {
  x: number;
  y: number;
  inputs: number;
  min: number;
  max: number;
  onChange: (inputs: number) => void;
}) {
  const { x, y, inputs, min, max, onChange } = props;
  const button = (dx: number, label: string, next: number, name: string) => {
    const disabled = next < min || next > max;
    return (
      <g
        className={styles.resizeButton}
        data-disabled={flag(disabled)}
        role="button"
        aria-label={name}
        aria-disabled={disabled}
        onPointerDown={(e) => {
          e.stopPropagation();
          if (!disabled) onChange(next);
        }}
      >
        <circle cx={x + dx} cy={y} r={11} />
        <text x={x + dx} y={y + 5}>
          {label}
        </text>
      </g>
    );
  };
  return (
    <g className={styles.resize} onPointerDown={(e) => e.stopPropagation()}>
      <rect x={x - 58} y={y - 14} width={116} height={28} rx={14} />
      {button(-44, '−', inputs - 1, 'Fewer inputs')}
      <text className={styles.resizeLabel} x={x} y={y + 4}>
        {inputs} inputs
      </text>
      {button(44, '+', inputs + 1, 'More inputs')}
    </g>
  );
}

function InputTerminal(props: { node: InputNode; value?: Bit; error: boolean; children: React.ReactNode }) {
  const { node, value, error, children } = props;
  const { x, y } = node.pos;
  return (
    <g className={styles.terminal} data-signal={signalAttr(value)} data-error={flag(error)}>
      <rect className={styles.terminalBody} x={x - 28} y={y - 22} width={56} height={44} rx={10} />
      <text className={styles.terminalLabel} x={x - 8} y={y + 5}>
        {node.label}
      </text>
      <text className={styles.terminalValue} x={x + 12} y={y + 5}>
        {value ?? '·'}
      </text>
      {children}
    </g>
  );
}

function OutputTerminal(props: { node: OutputNode; value?: Bit; error: boolean; children: React.ReactNode }) {
  const { node, value, error, children } = props;
  const { x, y } = node.pos;
  return (
    <g className={styles.terminal} data-signal={signalAttr(value)} data-error={flag(error)}>
      <circle className={styles.lamp} cx={x} cy={y} r={22} />
      <text className={styles.terminalValue} x={x} y={y + 5}>
        {value ?? '·'}
      </text>
      <text className={styles.terminalLabel} x={x} y={y + 44}>
        {node.label}
      </text>
      {children}
    </g>
  );
}
