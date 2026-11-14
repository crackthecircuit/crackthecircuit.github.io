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
import { playSound } from '../../lib/sound';
import { FIT_VIEW, MAX_ZOOM, MIN_ZOOM, panBy, viewBoxOf, ZOOM_STEP, zoomAround } from '../../lib/view';
import type { View } from '../../lib/view';
import { gateSizeRange } from '../../levels/rules';
import { useCircuitStore } from '../../store/circuitStore';
import { Board } from './Board';
import type { BoardProps } from './Board';
import styles from './Workspace.module.css';

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

/** Dragging empty board pans the view; a press that doesn't move clears the selection. */
type PanDrag = {
  kind: 'pan';
  start: Point;
  from: View;
  /** World units per screen pixel when the pan started. */
  unitsPerPx: number;
  moved: boolean;
};

type Drag = GateDrag | WireDrag | PanDrag;

/** Wheel delta in pixels, whatever unit the device reports. */
const wheelPixels = (e: WheelEvent) => e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1);

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

  // Zoom/pan. Read by native listeners through the ref.
  const [view, setViewState] = useState<View>(FIT_VIEW);
  const viewRef = useRef(view);
  const setView = (v: View) => {
    viewRef.current = v;
    setViewState(v);
  };

  const clientToWorld = (clientX: number, clientY: number, clamp = false): Point | null => {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return null;
    const p = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
    // Zoomed in, a point beside the board element can still map onto the world, so check the element too.
    const r = svg.getBoundingClientRect();
    const onElement = clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom;
    const inside = onElement && p.x >= 0 && p.y >= 0 && p.x <= BOARD_WIDTH && p.y <= BOARD_HEIGHT;
    return inside || clamp ? { x: p.x, y: p.y } : null;
  };
  const clientToWorldRef = useRef(clientToWorld);
  clientToWorldRef.current = clientToWorld;

  /** Zoom by `factor` around a screen point, or around the middle of the view. */
  const zoomBy = (factor: number, client?: Point) => {
    const v = viewRef.current;
    const anchor = (client && clientToWorldRef.current(client.x, client.y, true)) || v.center;
    setView(zoomAround(v, anchor, v.zoom * factor));
  };
  const zoomByRef = useRef(zoomBy);
  zoomByRef.current = zoomBy;

  // Wheel and trackpad pinch (a wheel event with ctrlKey) zoom at the pointer. React's onWheel is passive,
  // so it can't stop the page from scrolling; use a native listener.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const px = wheelPixels(e);
      zoomByRef.current(Math.exp(-px * (e.ctrlKey ? 0.01 : 0.0015)), { x: e.clientX, y: e.clientY });
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, []);

  // Two-finger pinch on a touch screen. Runs in the capture phase so the second finger never starts an edit.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const touches = new Map<number, Point>();
    let pinch: { distance: number; from: View; anchor: Point } | null = null;
    const spread = () => {
      const [a, b] = [...touches.values()];
      return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
    };
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return;
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (touches.size !== 2) return;
      e.stopPropagation();
      dragRef.current = null;
      setDragState(null);
      const [a, b] = [...touches.values()] as [Point, Point];
      const mid = clientToWorldRef.current((a.x + b.x) / 2, (a.y + b.y) / 2, true);
      pinch = { distance: spread(), from: viewRef.current, anchor: mid ?? viewRef.current.center };
    };
    const onMove = (e: PointerEvent) => {
      if (!touches.has(e.pointerId)) return;
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && touches.size === 2 && pinch.distance > 0) {
        setView(zoomAround(pinch.from, pinch.anchor, (pinch.from.zoom * spread()) / pinch.distance));
      }
    };
    const onEnd = (e: PointerEvent) => {
      touches.delete(e.pointerId);
      if (touches.size < 2) pinch = null;
    };
    svg.addEventListener('pointerdown', onDown, true);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onEnd);
    window.addEventListener('pointercancel', onEnd);
    return () => {
      svg.removeEventListener('pointerdown', onDown, true);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onEnd);
      window.removeEventListener('pointercancel', onEnd);
    };
  }, []);

  useImperativeHandle(ref, () => ({
    clientToWorld: (x, y) => clientToWorld(x, y),
    scale: () => svgRef.current?.getScreenCTM()?.a ?? 1,
  }));

  const rejectAt = (target: PortRef) => {
    playSound('reject');
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
      if (d.kind === 'pan') {
        if (moved) {
          const dx = (e.clientX - d.start.x) * d.unitsPerPx;
          const dy = (e.clientY - d.start.y) * d.unitsPerPx;
          setView(panBy(d.from, dx, dy));
        }
        if (moved !== d.moved) setDrag({ ...d, moved });
      } else if (d.kind === 'wire') {
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
      if (d.kind === 'pan') {
        setDrag(null);
        if (!d.moved) store.select(null);
        return;
      }
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

  // Cancel any edit if editing gets locked (e.g. Run pressed mid-wire). Panning is only a view change.
  useEffect(() => {
    if (locked && dragRef.current?.kind !== 'pan') setDrag(null);
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

  const onBackgroundPointerDown = (e: ReactPointerEvent) => {
    if (dragRef.current?.kind === 'wire') return setDrag(null);
    if (e.button !== 0 && e.button !== 1) return;
    if (e.button === 1) e.preventDefault(); // no autoscroll on middle-drag
    const ctm = svgRef.current?.getScreenCTM();
    setDrag({
      kind: 'pan',
      start: { x: e.clientX, y: e.clientY },
      from: viewRef.current,
      unitsPerPx: ctm ? 1 / ctm.a : 1,
      moved: false,
    });
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

  const percent = Math.round(view.zoom * 100);
  return (
    <>
      <Board
        {...display}
        circuit={shown}
        svgRef={svgRef}
        viewBox={viewBoxOf(view)}
        pannable={view.zoom > 1}
        panning={drag?.kind === 'pan' && drag.moved}
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
      <div className={styles.zoom} role="group" aria-label="Zoom">
        <button
          type="button"
          className={styles.zoomButton}
          aria-label="Zoom out"
          title="Zoom out (scroll wheel)"
          disabled={view.zoom <= MIN_ZOOM}
          onClick={() => zoomBy(1 / ZOOM_STEP)}
        >
          −
        </button>
        <button
          type="button"
          className={styles.zoomLevel}
          aria-label={`Zoom ${percent}%. Fit the board`}
          title="Fit the board"
          onClick={() => setView(FIT_VIEW)}
        >
          {percent}%
        </button>
        <button
          type="button"
          className={styles.zoomButton}
          aria-label="Zoom in"
          title="Zoom in (scroll wheel)"
          disabled={view.zoom >= MAX_ZOOM}
          onClick={() => zoomBy(ZOOM_STEP)}
        >
          +
        </button>
      </div>
    </>
  );
});
