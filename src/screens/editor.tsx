// Editing pieces shared by the level screen and the sandbox: keyboard shortcuts and palette drag-and-drop.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, RefObject } from 'react';
import { gateInputCount } from '../engine';
import type { GateType } from '../engine';
import { GateShape } from '../components/board/GateShape';
import type { WorkspaceHandle } from '../components/board/Workspace';
import { freeGatePosition, GATE_H, GATE_W, gatePositionAt } from '../lib/geometry';
import { editSound, playSound } from '../lib/sound';
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

interface EditorKeyOptions {
  /** Ignore edits (e.g. during the success sweep). */
  locked: boolean;
  /** Space, unless a keyboard user has tabbed to a control (then Space presses that control). */
  onSpace?: () => void;
  onEscape?: () => void;
}

/** Undo/redo, Delete, + / − to resize the selected gate, M to mute, and optional Space and Escape actions. */
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

type Ghost = { type: GateType; x: number; y: number; scale: number };

/** Drag a gate from the palette onto the board, or click it to drop it in a free spot. */
export function usePaletteDrag(workspaceRef: RefObject<WorkspaceHandle | null>, disabled: boolean) {
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
      if (moved) setGhost({ type, x: ev.clientX, y: ev.clientY, scale });
    };
    const end = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
      setGhost(null);
      if (ev.type === 'pointercancel') return;
      const store = useCircuitStore.getState();
      if (!moved) return void store.addGate(type, freeGatePosition(store.circuit));
      const world = workspaceRef.current?.clientToWorld(ev.clientX, ev.clientY);
      if (world) store.addGate(type, gatePositionAt(world));
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
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

  return { paletteRef, onPalettePointerDown, isOverPalette, ghostElement };
}
