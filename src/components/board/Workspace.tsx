import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { Circuit, Point } from '../../engine';
import { BOARD_HEIGHT, BOARD_WIDTH } from '../../lib/board';
import {
  allPorts,
  GATE_H,
  GATE_W,
  gatePositionAt,
  isInputPort,
  nearestPort,
  portKey,
  portPosition,
} from '../../lib/geometry';
import type { PortRef } from '../../lib/geometry';
import { gateSizeRange } from '../../levels/rules';
import { useCircuitStore } from '../../store/circuitStore';
import { Board } from './Board';
import type { BoardProps } from './Board';

/** How far (in screen pixels) the pointer must travel before a press counts as a drag. */
const DRAG_THRESHOLD = 4;

export interface WorkspaceHandle {
  /** Board coordinates for a screen point, or null when the point is outside the board. */
  clientToWorld: (clientX: number, clientY: number) => Point | null;
  /** Screen pixels per board unit. */
  scale: () => number;
}

type DisplayProps = Pick<
  BoardProps,
  'wireValues' | 'inputValues' | 'unusedGateIds' | 'errorNodeIds' | 'errorWireIds' | 'celebrate'
>;

interface WorkspaceProps extends DisplayProps {
  /** Ignore edits (e.g. during the success sweep). */
  locked?: boolean;
  /** Whether a screen point is over the palette, where dropped gates are deleted. */
  isOverDeleteZone: (clientX: number, clientY: number) => boolean;
  onDeleteHover?: (over: boolean) => void;
}

type GateDrag = {
  kind: 'gate';
  id: string;
  /** Pointer offset from the gate's top-left corner. */
  grab: Point;
  pos: Point;
  start: Point;
  moved: boolean;
  overDelete: boolean;
};

type WireDrag = {
  kind: 'wire';
  /** The fixed end. For a reroute this is the wire's output end. */
  origin: PortRef;
  /** Wire whose input end is being moved, and the port it came from. */
  reroute?: { wireId: string; was: PortRef };
  pointer: Point;
  start: Point;
  moved: boolean;
  /** Click-click mode: the first click started the wire; the next click on a port finishes it. */
  sticky: boolean;
};

type Drag = GateDrag | WireDrag;

/** The interactive circuit editor: dragging gates, drawing and rerouting wires, selection. */
export const Workspace = forwardRef<WorkspaceHandle, WorkspaceProps>(function Workspace(props, ref) {
  const { locked, isOverDeleteZone, onDeleteHover, ...display } = props;
  const circuit = useCircuitStore((s) => s.circuit);
  const selection = useCircuitStore((s) => s.selection);
  const level = useCircuitStore((s) => s.level);
  const svgRef = useRef<SVGSVGElement>(null);
  const [shake, setShake] = useState<string | null>(null);

  // The drag lives in a ref (read by window listeners) and in state (to re-render).
  const [drag, setDragState] = useState<Drag | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const setDrag = (d: Drag | null) => {
    dragRef.current = d;
    setDragState(d);
  };
  const deleteZoneRef = useRef(isOverDeleteZone);
  deleteZoneRef.current = isOverDeleteZone;

  const clientToWorld = (clientX: number, clientY: number, clamp = false): Point | null => {
    const ctm = svgRef.current?.getScreenCTM();
    if (!ctm) return null;
    const p = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
    const inside = p.x >= 0 && p.y >= 0 && p.x <= BOARD_WIDTH && p.y <= BOARD_HEIGHT;
    return inside || clamp ? { x: p.x, y: p.y } : null;
  };

  useImperativeHandle(ref, () => ({
    clientToWorld: (x, y) => clientToWorld(x, y),
    scale: () => svgRef.current?.getScreenCTM()?.a ?? 1,
  }));

  const rejectAt = (target: PortRef) => {
    setShake(portKey(target));
    window.setTimeout(() => setShake(null), 320);
  };

  /** Finish a wire at `target`, or at nothing. */
  const finishWire = (d: WireDrag, target: PortRef | null) => {
    const store = useCircuitStore.getState();
    setDrag(null);
    if (d.reroute) {
      if (!target) {
        store.moveWireEnd(d.reroute.wireId, null); // dropped on empty board: detach
        return;
      }
      if (portKey(target) === portKey(d.reroute.was)) return;
      const port = target.port;
      if (!isInputPort(port) || !store.moveWireEnd(d.reroute.wireId, { nodeId: target.nodeId, port })) {
        rejectAt(target);
      }
      return;
    }
    if (!target || portKey(target) === portKey(d.origin)) return;
    const [out, input] = isInputPort(d.origin.port) ? [target, d.origin] : [d.origin, target];
    const port = input.port;
    const ok =
      out.port === 'out' && isInputPort(port) && store.connect(out.nodeId, { nodeId: input.nodeId, port });
    if (!ok) rejectAt(target);
  };
  const finishWireRef = useRef(finishWire);
  finishWireRef.current = finishWire;

  const dragging = drag !== null;
  useEffect(() => {
    if (!dragging) return;

    const onMove = (e: PointerEvent) => {
      const d = dragRef.current;
      const world = clientToWorld(e.clientX, e.clientY, true);
      if (!d || !world) return;
      const moved = d.moved || Math.hypot(e.clientX - d.start.x, e.clientY - d.start.y) > DRAG_THRESHOLD;
      if (d.kind === 'wire') {
        setDrag({ ...d, pointer: world, moved });
      } else {
        const pos = gatePositionAt({
          x: world.x - d.grab.x + GATE_W / 2,
          y: world.y - d.grab.y + GATE_H / 2,
        });
        setDrag({ ...d, pos, moved, overDelete: deleteZoneRef.current(e.clientX, e.clientY) });
      }
    };

    const onUp = () => {
      const d = dragRef.current;
      if (!d) return;
      const store = useCircuitStore.getState();
      if (d.kind === 'gate') {
        setDrag(null);
        if (!d.moved) return;
        if (d.overDelete) store.removeGate(d.id);
        else store.moveGate(d.id, d.pos);
        return;
      }
      if (d.sticky) return; // waiting for the second click
      if (d.moved) return finishWireRef.current(d, nearestPort(store.circuit, d.pointer));
      if (d.reroute) {
        // A plain click on a connected input selects its wire.
        setDrag(null);
        store.select({ kind: 'wire', id: d.reroute.wireId });
        return;
      }
      setDrag({ ...d, sticky: true });
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrag(null);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('keydown', onKey);
    };
  }, [dragging]);

  // Cancel any drag if editing gets locked (e.g. Run pressed mid-wire).
  useEffect(() => {
    if (locked) setDrag(null);
  }, [locked]);

  const gateOverDelete = drag?.kind === 'gate' && drag.overDelete;
  useEffect(() => onDeleteHover?.(gateOverDelete), [gateOverDelete, onDeleteHover]);

  const onPortPointerDown = (target: PortRef, e: ReactPointerEvent) => {
    if (locked || e.button !== 0) return;
    e.stopPropagation();
    const current = dragRef.current;
    if (current?.kind === 'wire' && current.sticky) return finishWire(current, target);
    const world = clientToWorld(e.clientX, e.clientY, true);
    if (!world) return;
    const existing = isInputPort(target.port)
      ? circuit.wires.find((w) => w.to.nodeId === target.nodeId && w.to.port === target.port)
      : undefined;
    setDrag({
      kind: 'wire',
      origin: existing ? { nodeId: existing.from.nodeId, port: 'out' } : target,
      reroute: existing ? { wireId: existing.id, was: target } : undefined,
      pointer: world,
      start: { x: e.clientX, y: e.clientY },
      moved: false,
      sticky: false,
    });
  };

  const onGatePointerDown = (id: string, e: ReactPointerEvent) => {
    if (locked || e.button !== 0) return;
    e.stopPropagation();
    if (dragRef.current?.kind === 'wire') return setDrag(null);
    const node = circuit.nodes.find((n) => n.id === id);
    const world = clientToWorld(e.clientX, e.clientY, true);
    if (!node || !world) return;
    useCircuitStore.getState().select({ kind: 'node', id });
    setDrag({
      kind: 'gate',
      id,
      grab: { x: world.x - node.pos.x, y: world.y - node.pos.y },
      pos: node.pos,
      start: { x: e.clientX, y: e.clientY },
      moved: false,
      overDelete: false,
    });
  };

  const onWirePointerDown = (id: string, e: ReactPointerEvent) => {
    if (locked || e.button !== 0) return;
    e.stopPropagation();
    useCircuitStore.getState().select({ kind: 'wire', id });
  };

  const onBackgroundPointerDown = () => {
    if (dragRef.current?.kind === 'wire') return setDrag(null);
    useCircuitStore.getState().select(null);
  };

  // What to draw this frame.
  let shown: Circuit = circuit;
  if (drag?.kind === 'gate') {
    shown = { ...circuit, nodes: circuit.nodes.map((n) => (n.id === drag.id ? { ...n, pos: drag.pos } : n)) };
  }

  let draftWire: BoardProps['draftWire'] = null;
  let portHints: BoardProps['portHints'];
  if (drag?.kind === 'wire') {
    const wantInput = !isInputPort(drag.origin.port);
    const hints: Record<string, 'origin' | 'valid' | 'invalid'> = {};
    for (const p of allPorts(circuit)) {
      const key = portKey(p);
      hints[key] =
        key === portKey(drag.origin) ? 'origin' : isInputPort(p.port) === wantInput ? 'valid' : 'invalid';
    }
    portHints = hints;

    const originNode = circuit.nodes.find((n) => n.id === drag.origin.nodeId);
    if (originNode) {
      // Snap the loose end onto a valid port near the pointer.
      const hover = nearestPort(circuit, drag.pointer);
      const hoverNode =
        hover && hints[portKey(hover)] === 'valid' ? circuit.nodes.find((n) => n.id === hover.nodeId) : null;
      const loose = hover && hoverNode ? portPosition(hoverNode, hover.port) : drag.pointer;
      const fixed = portPosition(originNode, drag.origin.port);
      draftWire = wantInput ? { from: fixed, to: loose } : { from: loose, to: fixed };
    }
  }

  // Offer − / + on a selected gate when this level allows it to change size.
  let gateResize: BoardProps['gateResize'] = null;
  const selectedGate =
    selection?.kind === 'node'
      ? circuit.nodes.find((n) => n.id === selection.id && n.kind === 'gate')
      : undefined;
  if (selectedGate?.kind === 'gate' && level && !locked && !drag) {
    const range = gateSizeRange(selectedGate.gateType, level);
    if (range.max > range.min) gateResize = { nodeId: selectedGate.id, ...range };
  }

  return (
    <Board
      {...display}
      circuit={shown}
      svgRef={svgRef}
      selection={selection}
      draftWire={draftWire}
      hiddenWireId={drag?.kind === 'wire' ? drag.reroute?.wireId : undefined}
      portHints={portHints}
      shakePortKey={shake}
      draggingGateId={drag?.kind === 'gate' && drag.moved ? drag.id : null}
      deletingGateId={drag?.kind === 'gate' && drag.overDelete ? drag.id : null}
      onPortPointerDown={onPortPointerDown}
      onGatePointerDown={onGatePointerDown}
      onWirePointerDown={onWirePointerDown}
      onBackgroundPointerDown={onBackgroundPointerDown}
      gateResize={gateResize}
      onResizeGate={(id, n) => useCircuitStore.getState().setGateInputs(id, n)}
    />
  );
});
