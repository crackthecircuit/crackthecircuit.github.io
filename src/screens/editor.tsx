// Editing pieces shared by the level screen and the sandbox: keyboard shortcuts and palette drag-and-drop.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent, RefObject } from 'react';
import { gateInputCount } from '../engine';
import type { GateType } from '../engine';
import { GateShape } from '../components/board/GateShape';
import type { WorkspaceHandle } from '../components/board/Workspace';
import { announce } from '../lib/announce';
import { GRID } from '../lib/board';
import { deletionMessage, nodeName } from '../lib/describe';
import { freeGatePosition, GATE_H, GATE_W, gatePositionAt } from '../lib/geometry';
import { editSound, playSound } from '../lib/sound';
import { PHONE, useMediaQuery } from '../lib/useMediaQuery';
import type { Insets } from '../lib/view';
import { useCircuitStore } from '../store/circuitStore';
import { useProgressStore } from '../store/progressStore';
import styles from './editor.module.css';

/**
 * Whether the focused control was reached with Tab (not by clicking). Chrome treats the Space press itself as
 * keyboard use, so :focus-visible can't tell a clicked button from a tabbed-to one; we track it ourselves.
 */
let focusedByTab = false;
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (e) => e.key === 'Tab' && (focusedByTab = true), true);
  window.addEventListener('pointerdown', () => (focusedByTab = false), true);
}
const isKeyboardFocused = (el: HTMLElement) => focusedByTab && !!el.closest('button, [tabindex]');
const inTextField = (el: HTMLElement) => !!el.closest('input, textarea, select, dialog[open]');

const ARROWS: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

interface EditorKeyOptions {
  /** Ignore edits (e.g. during the success sweep). */
  locked: boolean;
  /** Space, unless a keyboard user has tabbed to a control (then Space presses that control). */
  onSpace?: () => void;
  onEscape?: () => void;
}

/**
 * Undo/redo, Delete, + / − to resize and arrow keys to move the selected gate, M to mute, and optional Space and
 * Escape actions.
 */
export function useEditorKeys({ locked, onSpace, onEscape }: EditorKeyOptions) {
  const options = useRef({ locked, onSpace, onEscape });
  useLayoutEffect(() => {
    options.current = { locked, onSpace, onEscape };
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (inTextField(target)) return;
      const { locked, onSpace, onEscape } = options.current;
      const store = useCircuitStore.getState();
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (!locked) (e.shiftKey ? store.redo : store.undo)();
      } else if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        if (!locked) store.redo();
      } else if (e.key === ' ' && onSpace && !isKeyboardFocused(target)) {
        // A palette button that was just clicked keeps focus, but must not swallow Space.
        e.preventDefault();
        if (!e.repeat) onSpace();
      } else if ((e.key === '+' || e.key === '=' || e.key === '-' || e.key === '_') && !locked && !mod) {
        const sel = store.selection;
        const node = sel?.kind === 'node' ? store.circuit.nodes.find((n) => n.id === sel.id) : undefined;
        if (node?.kind === 'gate') {
          e.preventDefault();
          store.setGateInputs(node.id, gateInputCount(node) + (e.key === '+' || e.key === '=' ? 1 : -1));
        }
      } else if (e.key in ARROWS && !locked && !mod && !target.closest('tr, [role="radio"]')) {
        const sel = store.selection;
        const node = sel?.kind === 'node' ? store.circuit.nodes.find((n) => n.id === sel.id) : undefined;
        if (node?.kind === 'gate') {
          e.preventDefault();
          const [dx, dy] = ARROWS[e.key]!;
          const step = e.shiftKey ? GRID * 4 : GRID;
          store.moveGate(
            node.id,
            gatePositionAt({
              x: node.pos.x + dx * step + GATE_W / 2,
              y: node.pos.y + dy * step + GATE_H / 2,
            }),
          );
        }
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && !locked) {
        e.preventDefault();
        store.removeSelection();
      } else if (e.key === 'Escape') {
        onEscape?.();
      } else if ((e.key === 'm' || e.key === 'M') && !mod && !e.altKey) {
        const progress = useProgressStore.getState();
        progress.setMuted(!progress.muted);
      }
    };
    // Buttons activate on Space *release*, so cancel that too or a clicked button fires as well as the action.
    const onKeyUp = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (e.key === ' ' && options.current.onSpace && !inTextField(target) && !isKeyboardFocused(target))
        e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);
}

/** Play a sound for every edit to the board, including undo and redo, but not for opening a level. */
export function useEditSounds() {
  useEffect(
    () =>
      useCircuitStore.subscribe((state, prev) => {
        if (state.circuit === prev.circuit) return;
        if (state.past.length === 0 && state.future.length === 0) return; // a level was (re)loaded
        const sound = editSound(prev.circuit, state.circuit);
        if (sound) playSound(sound);
      }),
    [],
  );
}

/** How long the undo toast stays up. */
const TOAST_MS = 4000;

/**
 * After a delete or Reset, "Gate deleted · Undo" at the bottom of the board for a few seconds. Undo and redo don't
 * show it; any other edit replaces or hides it. Returns the toast and `reset`, which Reset buttons call so the
 * message says "Board cleared" (a board with one gate looks the same either way).
 */
export function useUndoToast() {
  const [toast, setToast] = useState<{ text: string; id: number } | null>(null);
  const resetting = useRef(false);
  useEffect(
    () =>
      useCircuitStore.subscribe((state, prev) => {
        if (state.circuit === prev.circuit) return;
        const fresh = state.past.length > 0 && state.future.length === 0 && state.circuit !== prev.future[0]; // not a redo
        let text = fresh ? deletionMessage(prev.circuit, state.circuit) : null;
        if (text && resetting.current) text = 'Board cleared';
        setToast(text ? { text, id: Date.now() } : null);
      }),
    [],
  );
  const reset = useCallback(() => {
    resetting.current = true;
    useCircuitStore.getState().reset();
    resetting.current = false;
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), TOAST_MS);
    return () => window.clearTimeout(t);
  }, [toast]);

  const element = toast && (
    <div key={toast.id} className={styles.toast} role="status">
      <span>{toast.text}</span>
      <button
        type="button"
        className={styles.toastUndo}
        onClick={() => {
          useCircuitStore.getState().undo();
          setToast(null);
        }}
      >
        Undo
      </button>
    </div>
  );
  return { toast: element, reset };
}

/** Floating layout sizes (screen pixels); the CSS in LevelScreen.module.css reads them as variables. */
const EDGE = 12;
const GAP = 8;
const PILL_H = { wide: 48, phone: 44 };
const TOOLBAR_H = { wide: 62, phone: 52 };
const PANEL_W = { wide: 340, narrow: 300 };

/**
 * The floating layout shared by the level screen and the sandbox: whether the panel (and on a phone the gate tray)
 * is open, how much of the canvas the floating pieces cover, and those sizes as CSS variables for the screen.
 * The panel starts open, except on phones.
 */
export function useFloatingLayout() {
  const phone = useMediaQuery(PHONE);
  const narrow = useMediaQuery('(max-width: 1000px)');
  const [panelOpen, setPanelOpen] = useState(() => typeof window === 'undefined' || !window.matchMedia(PHONE).matches);
  const [trayOpen, setTrayOpen] = useState(false);
  const panelW = narrow ? PANEL_W.narrow : PANEL_W.wide;
  const insets: Insets = {
    top: EDGE + (phone ? PILL_H.phone : PILL_H.wide) + GAP,
    // On a phone the panel is a sheet over the board, so it doesn't narrow the canvas.
    right: panelOpen && !phone ? panelW + EDGE + GAP : 0,
    bottom: EDGE + (phone ? TOOLBAR_H.phone : TOOLBAR_H.wide) + GAP,
    left: 0,
  };
  const style = {
    '--edge': `${EDGE}px`,
    '--pill-h': `${phone ? PILL_H.phone : PILL_H.wide}px`,
    '--toolbar-h': `${phone ? TOOLBAR_H.phone : TOOLBAR_H.wide}px`,
    '--panel-w': `${panelW}px`,
    '--inset-top': `${insets.top}px`,
    '--inset-right': `${insets.right}px`,
    '--inset-bottom': `${insets.bottom}px`,
  } as CSSProperties;
  return { phone, panelOpen, setPanelOpen, trayOpen, setTrayOpen, insets, style };
}

type Ghost = { type: GateType; x: number; y: number; scale: number };

/**
 * Drag a gate from the palette onto the board, or click it to drop it in a free spot near the middle of the view.
 * `onAdded` runs after a click (or Enter) adds a gate and `onDragMove` once a drag gets going: the phone gate tray
 * closes on either.
 */
export function usePaletteDrag(
  workspaceRef: RefObject<WorkspaceHandle | null>,
  disabled: boolean,
  { onAdded, onDragMove }: { onAdded?: () => void; onDragMove?: () => void } = {},
) {
  const paletteRef = useRef<HTMLElement>(null);
  const [ghost, setGhost] = useState<Ghost | null>(null);

  const onPalettePointerDown = (type: GateType, e: ReactPointerEvent) => {
    if (disabled) return;
    e.preventDefault();
    const start = { x: e.clientX, y: e.clientY };
    const scale = workspaceRef.current?.scale() ?? 1;
    let moved = false;
    const move = (ev: PointerEvent) => {
      moved ||= Math.hypot(ev.clientX - start.x, ev.clientY - start.y) > 4;
      if (!moved) return;
      setGhost({ type, x: ev.clientX, y: ev.clientY, scale });
      onDragMove?.();
      workspaceRef.current?.edgePan({ x: ev.clientX, y: ev.clientY });
    };
    const end = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
      workspaceRef.current?.edgePan(null);
      setGhost(null);
      if (ev.type === 'pointercancel') return;
      const store = useCircuitStore.getState();
      if (!moved) {
        store.addGate(type, freeGatePosition(store.circuit, workspaceRef.current?.viewCenter()));
        onAdded?.();
        return;
      }
      const world = workspaceRef.current?.clientToWorld(ev.clientX, ev.clientY);
      if (world) store.addGate(type, gatePositionAt(world));
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
  };

  /** Keyboard activation of a palette button (Enter/Space): add the gate in a free spot. */
  const onPaletteActivate = (type: GateType) => {
    if (disabled) return;
    const store = useCircuitStore.getState();
    const id = store.addGate(type, freeGatePosition(store.circuit, workspaceRef.current?.viewCenter()));
    onAdded?.();
    const node = id && useCircuitStore.getState().circuit.nodes.find((n) => n.id === id);
    if (node) announce(`Added ${nodeName(node)}. Tab to the board to wire it.`);
  };

  /** Gates dropped on the palette are deleted. */
  const isOverPalette = useCallback((x: number, y: number) => {
    const r = paletteRef.current?.getBoundingClientRect();
    return !!r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  }, []);

  const ghostElement = ghost && (
    <svg
      className={styles.ghost}
      viewBox={`0 0 ${GATE_W} ${GATE_H}`}
      style={{
        left: ghost.x - (GATE_W * ghost.scale) / 2,
        top: ghost.y - (GATE_H * ghost.scale) / 2,
        width: GATE_W * ghost.scale,
        height: GATE_H * ghost.scale,
      }}
      aria-hidden
    >
      <GateShape type={ghost.type} />
    </svg>
  );

  return { paletteRef, onPalettePointerDown, onPaletteActivate, isOverPalette, ghostElement };
}
