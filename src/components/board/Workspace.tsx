import { forwardRef, useEffect, useId, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { Circuit, Point } from '../../engine';
import { BOARD_HEIGHT, BOARD_WIDTH } from '../../lib/board';
import {
  allPorts,
  circuitBox,
  GATE_H,
  GATE_W,
  gatePositionAt,
  isInputPort,
  nearestPort,
  PORT_HIT_RADIUS,
  portKey,
  portPosition,
  wireDropTarget,
} from '../../lib/geometry';
import type { PortRef } from '../../lib/geometry';
import { nodeName, portName } from '../../lib/describe';
import { playSound } from '../../lib/sound';
import { announce } from '../../lib/announce';
import { COARSE_POINTER, useMediaQuery } from '../../lib/useMediaQuery';
import {
  clampView,
  edgePanStep,
  fitBox,
  MAX_SCALE,
  MIN_SCALE,
  NO_INSETS,
  openArea,
  panBy,
  screenToWorld,
  viewBoxOf,
  worldToScreen,
  ZOOM_STEP,
  zoomAround,
} from '../../lib/view';
import type { Insets, Size, View } from '../../lib/view';
import { gateSizeRange } from '../../levels/rules';
import { useCircuitStore } from '../../store/circuitStore';
import { Board } from './Board';
import type { BoardProps } from './Board';
import styles from './Workspace.module.css';

/** How far (in screen pixels) the pointer must travel before a press counts as a drag. */
const DRAG_THRESHOLD = 4;
/** A fingertip reaches about this far (screen pixels) from where it lands, so touch snaps to ports this close. */
const FINGER_RADIUS = 22;
/** Never snap a finger further than this (board units), or a press beside a gate would grab its ports. */
const MAX_TOUCH_SNAP = 34;
/** A mouse drops a wire onto a port this close (screen pixels), however far the board is zoomed out. */
const MOUSE_SNAP_PX = 18;
/** A mouse press starts a wire this close to a port (screen pixels), at any zoom. */
const MOUSE_PRESS_PX = 14;
/** Port press areas in board units: never smaller than drawn at 100%, and never so big they swallow a gate's body. */
const MIN_PORT_PRESS = 14;
const MAX_PORT_PRESS = 22;
/** On a touch screen the − / + buttons above a selected gate grow to at least this radius (screen pixels). */
const TOUCH_BUTTON_RADIUS = 16;
/** Holding a finger still this long on a gate or wire opens its Delete bubble. */
const LONG_PRESS_MS = 500;
/** Off-screen markers sit this far inside the board's edge (screen pixels). */
const MARKER_INSET = 28;
/** The wiring magnifier: its diameter, how much it enlarges, and how far above the finger it floats (screen pixels). */
const LOUPE_SIZE = 120;
const LOUPE_ZOOM = 2;
const LOUPE_LIFT = 100;
/** Two taps within this time and distance are a double tap; a two-finger touch this brief is a two-finger tap. */
const DOUBLE_TAP_MS = 300;
const DOUBLE_TAP_PX = 30;
const TWO_FINGER_TAP_MS = 250;

export interface WorkspaceHandle {
  /** Board coordinates for a screen point, or null when the point is outside the board element. */
  clientToWorld: (clientX: number, clientY: number) => Point | null;
  /** Screen pixels per board unit. */
  scale: () => number;
  /** The world point in the middle of the view (where tapped palette gates go). */
  viewCenter: () => Point;
  /** Scroll the canvas while something dragged from outside (a palette gate) is near its edge; null stops. */
  edgePan: (client: Point | null) => void;
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
  /** How much of each edge the floating panels cover: fitting, markers and edge pan use the rest. */
  insets?: Insets;
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
  /** How close (board units) the loose end must come to a port to snap onto it. Wider for a finger. */
  snap: number;
  /** Drawn by a finger: show the magnifier. */
  touch: boolean;
};

/** Dragging empty canvas pans the view; a press that doesn't move clears the selection. */
type PanDrag = {
  kind: 'pan';
  start: Point;
  from: View;
  moved: boolean;
  /** A finger: a second quick tap zooms in. */
  touch: boolean;
};

type Drag = GateDrag | WireDrag | PanDrag;

/** The Delete bubble opened by a long press, anchored to the world point that was pressed. */
type Bubble = { kind: 'node' | 'wire'; id: string; at: Point };

/** Wheel delta in pixels, whatever unit the device reports. */
const wheelPixels = (e: WheelEvent) => e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1);

const HOME_VIEW: View = { scale: 1, center: { x: BOARD_WIDTH / 2, y: BOARD_HEIGHT / 2 } };

/** The interactive circuit editor: an open canvas with dragging gates, drawing and rerouting wires, selection. */
export const Workspace = forwardRef<WorkspaceHandle, WorkspaceProps>(function Workspace(props, ref) {
  const { locked, isOverDeleteZone, onDeleteHover, insets = NO_INSETS, ...display } = props;
  const insetsRef = useRef(insets);
  insetsRef.current = insets;
  const circuit = useCircuitStore((s) => s.circuit);
  const selection = useCircuitStore((s) => s.selection);
  const level = useCircuitStore((s) => s.level);
  const svgRef = useRef<SVGSVGElement>(null);
  const contentId = useId();
  const [shake, setShake] = useState<string | null>(null);
  const lastTap = useRef<{ time: number; x: number; y: number } | null>(null);
  const coarse = useMediaQuery(COARSE_POINTER);

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
  const [view, setViewState] = useState<View>(HOME_VIEW);
  const viewRef = useRef(view);
  const setView = (v: View) => {
    viewRef.current = v;
    setViewState(v);
  };

  // The element's size, so the viewBox has its shape (no letterboxing). Measured before the first paint, when the
  // view is also fitted to the circuit.
  const [size, setSize] = useState<Size>({ width: BOARD_WIDTH, height: BOARD_HEIGHT });
  const fitted = useRef(false);
  useLayoutEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const measure = () => {
      const r = svg.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      setSize({ width: r.width, height: r.height });
      if (!fitted.current) {
        fitted.current = true;
        setView(fitBox(circuitBox(useCircuitStore.getState().circuit), r, true, insetsRef.current));
      }
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(svg);
    return () => observer.disconnect();
  }, []);

  /** Board coordinates for a screen point. Uses the view math, so it is right even before React re-renders. */
  const clientToWorld = (clientX: number, clientY: number, clamp = false): Point | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const r = svg.getBoundingClientRect();
    const onElement = clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom;
    if (!onElement && !clamp) return null;
    return screenToWorld(viewRef.current, r, { x: clientX - r.left, y: clientY - r.top });
  };
  const clientToWorldRef = useRef(clientToWorld);
  clientToWorldRef.current = clientToWorld;

  /** Zoom by `factor` around a screen point, or around the middle of the view. */
  const zoomBy = (factor: number, client?: Point) => {
    const v = viewRef.current;
    const anchor = (client && clientToWorldRef.current(client.x, client.y, true)) || v.center;
    setView(zoomAround(v, anchor, v.scale * factor));
  };
  const zoomByRef = useRef(zoomBy);
  zoomByRef.current = zoomBy;

  const fitCircuit = () =>
    setView(fitBox(circuitBox(useCircuitStore.getState().circuit), size, false, insetsRef.current));

  // ---------- Edge pan: scroll while a drag is held near the board's edge ----------
  const edge = useRef<{ client: Point | null; reapply: ((c: Point) => void) | null; frame: number }>({
    client: null,
    reapply: null,
    frame: 0,
  });
  const edgeTick = () => {
    const e = edge.current;
    const svg = svgRef.current;
    e.frame = 0;
    if (!e.client || !svg) return;
    const r = svg.getBoundingClientRect();
    // The open part of the canvas, between the floating panels.
    const open = openArea(r, insetsRef.current);
    const p = { x: e.client.x - r.left - open.x, y: e.client.y - r.top - open.y };
    // Only there: a gate carried over the toolbar (to delete it) or a panel must not scroll the canvas.
    if (p.x < 0 || p.y < 0 || p.x > open.width || p.y > open.height) return;
    const step = edgePanStep(p, open);
    if (step.x === 0 && step.y === 0) return;
    const v = viewRef.current;
    setView(panBy(v, -step.x / v.scale, -step.y / v.scale));
    e.reapply?.(e.client); // the dragged gate or wire end follows the pointer onto the newly shown canvas
    e.frame = requestAnimationFrame(edgeTick);
  };
  const edgeTickRef = useRef(edgeTick);
  edgeTickRef.current = edgeTick;
  const edgePan = (client: Point | null, reapply: ((c: Point) => void) | null = null) => {
    const e = edge.current;
    e.client = client;
    e.reapply = reapply;
    if (client && !e.frame) e.frame = requestAnimationFrame(() => edgeTickRef.current());
  };
  useEffect(() => () => cancelAnimationFrame(edge.current.frame), []);

  // Wheel and trackpad pinch (a wheel event with ctrlKey) zoom at the pointer. React's onWheel is passive,
  // so it can't stop the page from scrolling; use a native listener. Long presses must not open a context menu.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const px = wheelPixels(e);
      zoomByRef.current(Math.exp(-px * (e.ctrlKey ? 0.01 : 0.0015)), { x: e.clientX, y: e.clientY });
    };
    const onContextMenu = (e: Event) => e.preventDefault();
    svg.addEventListener('wheel', onWheel, { passive: false });
    svg.addEventListener('contextmenu', onContextMenu);
    return () => {
      svg.removeEventListener('wheel', onWheel);
      svg.removeEventListener('contextmenu', onContextMenu);
    };
  }, []);

  // ---------- Long press (touch): select a gate or wire and offer Delete ----------
  const [bubble, setBubble] = useState<Bubble | null>(null);
  const press = useRef<{ timer: number; start: Point } | null>(null);
  const cancelPress = () => {
    if (press.current) window.clearTimeout(press.current.timer);
    press.current = null;
  };
  const startPress = (e: ReactPointerEvent, open: () => void) => {
    cancelPress();
    if (e.pointerType === 'mouse') return;
    press.current = {
      start: { x: e.clientX, y: e.clientY },
      timer: window.setTimeout(() => {
        press.current = null;
        open();
      }, LONG_PRESS_MS),
    };
  };
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const p = press.current;
      if (p && Math.hypot(e.clientX - p.start.x, e.clientY - p.start.y) > DRAG_THRESHOLD * 2) cancelPress();
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', cancelPress);
    window.addEventListener('pointercancel', cancelPress);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', cancelPress);
      window.removeEventListener('pointercancel', cancelPress);
    };
  }, []);
  // Any new press on the board closes the bubble (the bubble itself is outside the SVG).
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !bubble) return;
    const close = () => setBubble(null);
    svg.addEventListener('pointerdown', close, true);
    return () => svg.removeEventListener('pointerdown', close, true);
  }, [bubble]);
  useEffect(() => {
    if (locked) setBubble(null);
  }, [locked]);

  // Two-finger pinch on a touch screen. Runs in the capture phase so the second finger never starts an edit.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const touches = new Map<number, Point>();
    let pinch: { distance: number; from: View; anchor: Point; at: number; moved: boolean } | null = null;
    const spread = () => {
      const [a, b] = [...touches.values()];
      return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
    };
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return;
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (touches.size !== 2) return;
      e.stopPropagation();
      cancelPress();
      edgePan(null);
      dragRef.current = null;
      setDragState(null);
      const [a, b] = [...touches.values()] as [Point, Point];
      const mid = clientToWorldRef.current((a.x + b.x) / 2, (a.y + b.y) / 2, true);
      pinch = {
        distance: spread(),
        from: viewRef.current,
        anchor: mid ?? viewRef.current.center,
        at: performance.now(),
        moved: false,
      };
    };
    const onMove = (e: PointerEvent) => {
      if (!touches.has(e.pointerId)) return;
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && touches.size === 2 && pinch.distance > 0) {
        if (Math.abs(spread() - pinch.distance) > DRAG_THRESHOLD * 3) pinch.moved = true;
        setView(zoomAround(pinch.from, pinch.anchor, (pinch.from.scale * spread()) / pinch.distance));
      }
    };
    const onEnd = (e: PointerEvent) => {
      if (!touches.delete(e.pointerId)) return;
      // Two fingers down and up again quickly, without pinching: zoom out.
      if (pinch && !pinch.moved && performance.now() - pinch.at < TWO_FINGER_TAP_MS) {
        setView(zoomAround(pinch.from, pinch.anchor, pinch.from.scale / 2));
      }
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
    scale: () => viewRef.current.scale,
    viewCenter: () => viewRef.current.center,
    edgePan: (client) => edgePan(client),
  }));

  /**
   * Snap radius (board units) for a wire's loose end. It is a fixed size on screen, so zooming out doesn't make
   * ports harder to hit; a finger gets a wider one.
   */
  const snapRadius = (e: { pointerType: string }) =>
    Math.min(
      Math.max(PORT_HIT_RADIUS, (e.pointerType === 'mouse' ? MOUSE_SNAP_PX : FINGER_RADIUS) / view.scale),
      MAX_TOUCH_SNAP,
    );
  /** How close (board units) a mouse press must be to a port to start a wire there. */
  const portPressRadius = Math.min(Math.max(MIN_PORT_PRESS, MOUSE_PRESS_PX / view.scale), MAX_PORT_PRESS);
  const pressRadius = (e: { pointerType: string }) =>
    e.pointerType === 'mouse' ? portPressRadius : snapRadius(e);

  /** Where the wire being drawn lands if released at `point`: a port, or the switch, gate or lamp under it. */
  const dropTarget = (d: WireDrag, point: Point, c: Circuit = circuit) =>
    wireDropTarget(c, d.origin, point, d.snap, d.reroute?.wireId);

  const rejectAt = (target: PortRef) => {
    playSound('reject');
    announce(`Can't connect to ${portName(useCircuitStore.getState().circuit, target)}.`);
    setShake(portKey(target));
    window.setTimeout(() => setShake(null), 320);
  };

  /** Finish a wire at `target`, or at nothing. */
  const finishWire = (d: WireDrag, target: PortRef | null) => {
    const store = useCircuitStore.getState();
    setDrag(null);
    if (d.reroute) {
      if (!target) {
        store.moveWireEnd(d.reroute.wireId, null); // dropped on empty canvas: detach
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
    if (!ok) return rejectAt(target);
    announce(`Connected ${portName(store.circuit, out)} to ${portName(store.circuit, input)}.`);
  };
  const finishWireRef = useRef(finishWire);
  finishWireRef.current = finishWire;
  const dropTargetRef = useRef(dropTarget);
  dropTargetRef.current = dropTarget;

  const cancelWiring = () => {
    setDrag(null);
    announce('Wiring cancelled.');
  };

  const dragging = drag !== null;
  useEffect(() => {
    if (!dragging) return;

    /** Follow the pointer at a screen point (also re-run after an edge pan moves the canvas under it). */
    const follow = (client: Point) => {
      const d = dragRef.current;
      const world = clientToWorldRef.current(client.x, client.y, true);
      if (!d || !world) return;
      const moved = d.moved || Math.hypot(client.x - d.start.x, client.y - d.start.y) > DRAG_THRESHOLD;
      if (d.kind === 'pan') {
        if (moved) {
          const dx = (client.x - d.start.x) / d.from.scale;
          const dy = (client.y - d.start.y) / d.from.scale;
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
        setDrag({ ...d, pos, moved, overDelete: deleteZoneRef.current(client.x, client.y) });
      }
    };

    const onMove = (e: PointerEvent) => {
      const client = { x: e.clientX, y: e.clientY };
      follow(client);
      const d = dragRef.current;
      const carrying = (d?.kind === 'gate' || (d?.kind === 'wire' && !d.sticky)) && d.moved;
      edgePan(carrying ? client : null, follow);
    };

    const onUp = () => {
      edgePan(null);
      const d = dragRef.current;
      if (!d) return;
      const store = useCircuitStore.getState();
      if (d.kind === 'pan') {
        setDrag(null);
        if (d.moved) return;
        store.select(null);
        // A finger's second quick tap in the same place zooms in there.
        const last = lastTap.current;
        const now = performance.now();
        if (
          d.touch &&
          last &&
          now - last.time < DOUBLE_TAP_MS &&
          Math.hypot(d.start.x - last.x, d.start.y - last.y) < DOUBLE_TAP_PX
        ) {
          lastTap.current = null;
          const at = clientToWorldRef.current(d.start.x, d.start.y, true);
          if (at) setView(zoomAround(viewRef.current, at, viewRef.current.scale * 2));
        } else {
          lastTap.current = d.touch ? { time: now, x: d.start.x, y: d.start.y } : null;
        }
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
      if (d.moved) return finishWireRef.current(d, dropTargetRef.current(d, d.pointer, store.circuit));
      if (d.reroute) {
        // A plain click on a connected input selects its wire.
        setDrag(null);
        store.select({ kind: 'wire', id: d.reroute.wireId });
        return;
      }
      setDrag({ ...d, sticky: true });
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (dragRef.current?.kind === 'wire' && dragRef.current.sticky) announce('Wiring cancelled.');
      setDrag(null);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('keydown', onKey);
      edgePan(null);
    };
  }, [dragging]);

  // Cancel any edit if editing gets locked (e.g. Run pressed mid-wire). Panning is only a view change.
  useEffect(() => {
    if (locked && dragRef.current?.kind !== 'pan') setDrag(null);
  }, [locked]);

  const gateOverDelete = drag?.kind === 'gate' && drag.overDelete;
  useEffect(() => onDeleteHover?.(gateOverDelete), [gateOverDelete, onDeleteHover]);

  const onPortPointerDown = (pressed: PortRef, e: ReactPointerEvent) => {
    if (locked || e.button !== 0) return;
    e.stopPropagation();
    const world = clientToWorld(e.clientX, e.clientY, true);
    if (!world) return;
    // Press areas overlap where ports sit close together (a wide gate's inputs): take the port nearest the press.
    // A press on a switch or lamp body is further away than that and keeps its own port.
    const target = nearestPort(circuit, world, pressRadius(e)) ?? pressed;
    const current = dragRef.current;
    if (current?.kind === 'wire' && current.sticky) return finishWire(current, target);
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
      snap: snapRadius(e),
      touch: e.pointerType !== 'mouse',
    });
  };

  const onGatePointerDown = (id: string, e: ReactPointerEvent) => {
    if (locked || e.button !== 0) return;
    e.stopPropagation();
    const node = circuit.nodes.find((n) => n.id === id);
    const world = clientToWorld(e.clientX, e.clientY, true);
    const current = dragRef.current;
    if (current?.kind === 'wire') {
      // Click-click wiring: a click on a gate's body connects to it, like dropping a dragged wire there.
      const target = current.sticky && world ? dropTarget(current, world) : null;
      return target ? finishWire(current, target) : setDrag(null);
    }
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
    startPress(e, () => {
      setDrag(null);
      setBubble({ kind: 'node', id, at: world });
    });
  };

  // Keyboard: Enter on a port starts a wire (the same click-click mode as the mouse); Enter on another finishes it.
  const onPortActivate = (target: PortRef) => {
    if (locked) return;
    const current = dragRef.current;
    if (current?.kind === 'wire' && current.sticky) {
      if (portKey(target) !== portKey(current.origin)) return finishWire(current, target);
      setDrag(null);
      announce('Wiring cancelled.');
      return;
    }
    const node = circuit.nodes.find((n) => n.id === target.nodeId);
    if (!node) return;
    setDrag({
      kind: 'wire',
      origin: target,
      pointer: portPosition(node, target.port),
      start: { x: 0, y: 0 },
      moved: false,
      sticky: true,
      snap: PORT_HIT_RADIUS,
      touch: false,
    });
    const want = isInputPort(target.port) ? 'an output' : 'an input';
    announce(`Wiring from ${portName(circuit, target)}. Go to ${want} and press Enter. Escape cancels.`);
  };

  const onPortClear = (target: PortRef) => {
    const wire = circuit.wires.find((w) => w.to.nodeId === target.nodeId && w.to.port === target.port);
    if (locked || !wire) return;
    useCircuitStore.getState().removeWire(wire.id);
    announce(`Removed the wire into ${portName(circuit, target)}.`);
  };

  const onGateFocus = (id: string) => {
    if (!locked) useCircuitStore.getState().select({ kind: 'node', id });
  };

  const onWirePointerDown = (id: string, e: ReactPointerEvent) => {
    if (locked || e.button !== 0) return;
    e.stopPropagation();
    useCircuitStore.getState().select({ kind: 'wire', id });
    const world = clientToWorld(e.clientX, e.clientY, true);
    if (world) startPress(e, () => setBubble({ kind: 'wire', id, at: world }));
  };

  const onBackgroundPointerDown = (e: ReactPointerEvent) => {
    // A finger that lands just beside a small port means that port.
    if (e.pointerType !== 'mouse' && !locked) {
      const world = clientToWorld(e.clientX, e.clientY, true);
      const near = world && nearestPort(circuit, world, snapRadius(e));
      if (near) return onPortPointerDown(near, e);
    }
    if (dragRef.current?.kind === 'wire') return setDrag(null);
    if (e.button !== 0 && e.button !== 1) return;
    if (e.button === 1) e.preventDefault(); // no autoscroll on middle-drag
    setDrag({
      kind: 'pan',
      start: { x: e.clientX, y: e.clientY },
      from: viewRef.current,
      moved: false,
      touch: e.pointerType === 'touch',
    });
  };

  // What to draw this frame.
  let shown: Circuit = circuit;
  if (drag?.kind === 'gate') {
    shown = { ...circuit, nodes: circuit.nodes.map((n) => (n.id === drag.id ? { ...n, pos: drag.pos } : n)) };
  }

  let draftWire: BoardProps['draftWire'] = null;
  let portHints: BoardProps['portHints'];
  /** Where the wire's loose end is (snapped onto a port when near one): what the magnifier shows. */
  let looseEnd: Point | null = null;
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
      // Snap the loose end onto where it would land: a valid port near the pointer, or one on the node under it.
      const hover = dropTarget(drag, drag.pointer);
      const hoverNode =
        hover && hints[portKey(hover)] === 'valid' ? circuit.nodes.find((n) => n.id === hover.nodeId) : null;
      const loose = hover && hoverNode ? portPosition(hoverNode, hover.port) : drag.pointer;
      looseEnd = loose;
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
    if (range.max > range.min) {
      // The buttons are 11 board units across; on a touch screen keep them finger-sized however small the board is.
      const scale = coarse ? Math.min(Math.max(TOUCH_BUTTON_RADIUS / (11 * view.scale), 1), 2.5) : 1;
      gateResize = { nodeId: selectedGate.id, ...range, scale };
    }
  }

  // Markers on the open area's edge for switches and lamps out of view (or hidden under a panel).
  const open = openArea(size, insets);
  const markers = circuit.nodes.flatMap((node) => {
    if (node.kind === 'gate') return [];
    const s = worldToScreen(view, size, node.pos);
    const [left, right] = [open.x, open.x + open.width];
    const [top, bottom] = [open.y, open.y + open.height];
    if (s.x >= left && s.x <= right && s.y >= top && s.y <= bottom) return [];
    const x = Math.min(Math.max(s.x, left + MARKER_INSET), right - MARKER_INSET);
    const y = Math.min(Math.max(s.y, top + MARKER_INSET), bottom - MARKER_INSET);
    const arrow = s.x < left ? '←' : s.x > right ? '→' : s.y < top ? '↑' : '↓';
    return [{ node, x, y, arrow }];
  });

  const wiring = drag?.kind === 'wire' && drag.sticky && !locked ? drag : null;

  // The magnifier floats above the finger (below it near the top edge), showing the loose end at twice the zoom.
  let loupe: { left: number; top: number; viewBox: string } | null = null;
  if (drag?.kind === 'wire' && drag.touch && drag.moved && !drag.sticky && looseEnd) {
    const finger = worldToScreen(view, size, drag.pointer);
    const half = LOUPE_SIZE / 2;
    const above = finger.y - LOUPE_LIFT - half >= 0;
    const span = LOUPE_SIZE / (view.scale * LOUPE_ZOOM);
    loupe = {
      left: Math.min(Math.max(finger.x, half), size.width - half),
      top: above ? finger.y - LOUPE_LIFT : finger.y + LOUPE_LIFT,
      viewBox: `${looseEnd.x - span / 2} ${looseEnd.y - span / 2} ${span} ${span}`,
    };
  }
  const bubbleAt = bubble && worldToScreen(view, size, bubble.at);
  const bubbleTarget =
    bubble &&
    (bubble.kind === 'node'
      ? circuit.nodes.some((n) => n.id === bubble.id)
      : circuit.wires.some((w) => w.id === bubble.id));

  const percent = Math.round(view.scale * 100);
  return (
    <>
      <Board
        {...display}
        circuit={shown}
        svgRef={svgRef}
        contentId={contentId}
        viewBox={viewBoxOf(view, size)}
        pannable
        panning={drag?.kind === 'pan' && drag.moved}
        selection={selection}
        draftWire={draftWire}
        hiddenWireId={drag?.kind === 'wire' ? drag.reroute?.wireId : undefined}
        portHints={portHints}
        shakePortKey={shake}
        draggingGateId={drag?.kind === 'gate' && drag.moved ? drag.id : null}
        deletingGateId={drag?.kind === 'gate' && drag.overDelete ? drag.id : null}
        portPressRadius={portPressRadius}
        onPortPointerDown={onPortPointerDown}
        onGatePointerDown={onGatePointerDown}
        onWirePointerDown={onWirePointerDown}
        onBackgroundPointerDown={onBackgroundPointerDown}
        onPortActivate={onPortActivate}
        onPortClear={onPortClear}
        onGateFocus={onGateFocus}
        gateResize={gateResize}
        onResizeGate={(id, n) => useCircuitStore.getState().setGateInputs(id, n)}
      />

      {markers.map(({ node, x, y, arrow }) => (
        <button
          key={node.id}
          type="button"
          className={styles.marker}
          style={{ left: x, top: y }}
          aria-label={`Show ${nodeName(node)}`}
          title={`Show ${nodeName(node)}`}
          onClick={() => {
            // Bring the terminal to the middle of the open area, not under a panel.
            const v = viewRef.current;
            const dx = (insets.left - insets.right) / 2 / v.scale;
            const dy = (insets.top - insets.bottom) / 2 / v.scale;
            setView(clampView({ ...v, center: { x: node.pos.x - dx, y: node.pos.y - dy } }));
          }}
        >
          {arrow === '→' || arrow === '↓' ? (
            <>
              {node.label} <span aria-hidden>{arrow}</span>
            </>
          ) : (
            <>
              <span aria-hidden>{arrow}</span> {node.label}
            </>
          )}
        </button>
      ))}

      {loupe && (
        <div className={styles.loupe} style={{ left: loupe.left, top: loupe.top }} aria-hidden>
          <svg viewBox={loupe.viewBox}>
            <use href={`#${contentId}`} />
          </svg>
        </div>
      )}

      {wiring && (
        <div className={styles.wiringBar} role="status">
          <span>
            {coarse ? 'Tap' : 'Click'} {isInputPort(wiring.origin.port) ? 'an output' : 'an input'} to connect
          </span>
          <button type="button" className={styles.wiringCancel} onClick={cancelWiring}>
            Cancel
          </button>
        </div>
      )}

      {bubble && bubbleAt && bubbleTarget && (
        <div className={styles.bubble} style={{ left: bubbleAt.x, top: bubbleAt.y }}>
          <button
            type="button"
            className={styles.bubbleButton}
            onClick={() => {
              const store = useCircuitStore.getState();
              if (bubble.kind === 'node') store.removeGate(bubble.id);
              else store.removeWire(bubble.id);
              setBubble(null);
            }}
          >
            Delete
          </button>
        </div>
      )}

      <div className={styles.zoom} role="group" aria-label="Zoom">
        <button
          type="button"
          className={styles.zoomButton}
          aria-label="Zoom out"
          title="Zoom out (scroll wheel)"
          disabled={view.scale <= MIN_SCALE}
          onClick={() => zoomBy(1 / ZOOM_STEP)}
        >
          −
        </button>
        <button
          type="button"
          className={styles.zoomLevel}
          aria-label={`Zoom ${percent}%. Fit the circuit`}
          title="Fit the circuit"
          onClick={fitCircuit}
        >
          {percent}%
        </button>
        <button
          type="button"
          className={styles.zoomButton}
          aria-label="Zoom in"
          title="Zoom in (scroll wheel)"
          disabled={view.scale >= MAX_SCALE}
          onClick={() => zoomBy(ZOOM_STEP)}
        >
          +
        </button>
      </div>
    </>
  );
});
