import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { circuitExpression, countGates, gateInputCount, score, simulate } from '../engine';
import type { Circuit, GateType, SimulationResult } from '../engine';
import { GateShape } from '../components/board/GateShape';
import { Workspace } from '../components/board/Workspace';
import type { WorkspaceHandle } from '../components/board/Workspace';
import { Hints } from '../components/panels/Hints';
import { Palette } from '../components/panels/Palette';
import { Problems } from '../components/panels/Problems';
import { ResultCard } from '../components/panels/ResultCard';
import { TruthTable } from '../components/panels/TruthTable';
import { Button } from '../components/ui/Button';
import { Expression, RichText } from '../components/ui/Expression';
import { Stars } from '../components/ui/Stars';
import { freeGatePosition, GATE_H, GATE_W, gatePositionAt } from '../lib/geometry';
import { getLevel, LEVELS } from '../levels/levels';
import { isUsableBoard } from '../levels/startingCircuit';
import { useAppStore } from '../store/appStore';
import { useCircuitStore } from '../store/circuitStore';
import { useProgressStore } from '../store/progressStore';
import styles from './LevelScreen.module.css';

/** Time between truth-table rows during the run sweep. */
const ROW_MS = 80;
/** How long the flowing-signal celebration plays before the result card. */
const CELEBRATE_MS = 650;

type Phase = 'sweep' | 'celebrate' | 'card' | 'review';

interface Run {
  /** The exact circuit object that was run. Any edit makes a new object, so the run goes stale. */
  circuit: Circuit;
  result: SimulationResult;
  revealed: number;
  inspected: number | null;
  phase: Phase;
  stars: number;
  gateCount: number;
}

/** Rows fully revealed, inspecting the first failing row (or the last row on a pass). */
function finished(run: Run): Run {
  if (run.result.status !== 'ok') return run;
  const rows = run.result.rows;
  const firstFail = rows.findIndex((r) => !r.pass);
  return {
    ...run,
    revealed: rows.length,
    inspected: firstFail >= 0 ? firstFail : rows.length - 1,
    phase: run.result.allPassed ? 'card' : 'review',
  };
}

/** A button or focusable row reached with the keyboard (not merely clicked). */
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

function paletteRule(palette: GateType[]): string {
  return palette.length === 1 ? `${palette[0]} only` : palette.join(' · ');
}

export function LevelScreen({ levelId }: { levelId: string }) {
  const level = getLevel(levelId)!;
  const levelIndex = LEVELS.indexOf(level);
  const go = useAppStore((s) => s.go);
  const circuit = useCircuitStore((s) => s.circuit);
  const ready = useCircuitStore((s) => s.level?.id === level.id);
  const hasSelection = useCircuitStore((s) => s.selection !== null);
  const canUndo = useCircuitStore((s) => s.past.length > 0);
  const canRedo = useCircuitStore((s) => s.future.length > 0);
  const bestStars = useProgressStore((s) => s.stars[level.id] ?? 0);

  const workspaceRef = useRef<WorkspaceHandle>(null);
  const paletteRef = useRef<HTMLElement>(null);
  const [deleteHover, setDeleteHover] = useState(false);
  const [ghost, setGhost] = useState<{ type: GateType; x: number; y: number; scale: number } | null>(null);
  const [run, setRun] = useState<Run | null>(null);

  // Open the level, restoring its autosaved board.
  useEffect(() => {
    const saved = useProgressStore.getState().boards[level.id];
    useCircuitStore.getState().loadLevel(level, isUsableBoard(saved, level) ? saved : undefined);
  }, [level]);

  // Autosave every edit (edits are discrete: drags commit once on release).
  useEffect(() => {
    if (ready) useProgressStore.getState().saveBoard(level.id, circuit);
  }, [circuit, ready, level.id]);

  const current = run && run.circuit === circuit ? run : null;
  const locked = current?.phase === 'sweep' || current?.phase === 'celebrate' || current?.phase === 'card';

  const startRun = useCallback(() => {
    const { circuit: c } = useCircuitStore.getState();
    useCircuitStore.getState().select(null);
    const result = simulate(c, level);
    const gateCount = countGates(c);
    if (result.status === 'invalid') {
      setRun({ circuit: c, result, revealed: 0, inspected: null, phase: 'review', stars: 0, gateCount });
      return;
    }
    const stars = score(result.allPassed, gateCount, level.par);
    if (result.allPassed) useProgressStore.getState().recordPass(level, stars);
    setRun({ circuit: c, result, revealed: 0, inspected: null, phase: 'sweep', stars, gateCount });
  }, [level]);

  // Sweep: reveal rows one by one, showing each row's signals on the board as it lands.
  useEffect(() => {
    if (!current || current.result.status !== 'ok') return;
    if (current.phase === 'sweep') {
      const total = current.result.rows.length;
      const allPassed = current.result.allPassed;
      const t = window.setTimeout(() => {
        setRun((r) => {
          if (!r) return r;
          const revealed = r.revealed + 1;
          if (revealed < total) return { ...r, revealed, inspected: revealed - 1 };
          return allPassed ? { ...r, revealed, inspected: revealed - 1, phase: 'celebrate' } : finished(r);
        });
      }, ROW_MS);
      return () => window.clearTimeout(t);
    }
    if (current.phase === 'celebrate') {
      const t = window.setTimeout(() => setRun((r) => r && { ...r, phase: 'card' }), CELEBRATE_MS);
      return () => window.clearTimeout(t);
    }
  }, [current]);

  // Any click or key skips the sweep.
  const sweeping = current?.phase === 'sweep' || current?.phase === 'celebrate';
  useEffect(() => {
    if (!sweeping) return;
    const skip = () => setRun((r) => r && finished(r));
    window.addEventListener('pointerdown', skip);
    window.addEventListener('keydown', skip);
    return () => {
      window.removeEventListener('pointerdown', skip);
      window.removeEventListener('keydown', skip);
    };
  }, [sweeping]);

  // Keyboard shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('input, textarea, select')) return;
      const store = useCircuitStore.getState();
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (!locked) (e.shiftKey ? store.redo : store.undo)();
      } else if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        if (!locked) store.redo();
      } else if (e.key === ' ' && !isKeyboardFocused(target)) {
        // Space always means Run, except on a control a keyboard user has tabbed to.
        // (A palette button that was just clicked keeps focus, but must not swallow Space.)
        e.preventDefault();
        if (!locked && !e.repeat) startRun();
      } else if ((e.key === '+' || e.key === '=' || e.key === '-' || e.key === '_') && !locked && !mod) {
        // Widen or narrow the selected gate.
        const sel = store.selection;
        const node = sel?.kind === 'node' ? store.circuit.nodes.find((n) => n.id === sel.id) : undefined;
        if (node?.kind === 'gate') {
          e.preventDefault();
          store.setGateInputs(node.id, gateInputCount(node) + (e.key === '+' || e.key === '=' ? 1 : -1));
        }
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && !locked) {
        e.preventDefault();
        store.removeSelection();
      } else if (e.key === 'Escape' && current?.phase === 'card') {
        setRun((r) => r && { ...r, phase: 'review' });
      }
    };
    // Buttons activate on Space *release*, so cancel that too or a clicked button fires as well as Run.
    const onKeyUp = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (e.key === ' ' && !target.closest('input, textarea, select') && !isKeyboardFocused(target))
        e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [locked, startRun, current?.phase]);

  // Palette: drag a gate onto the board, or click to drop it in a free spot.
  const onPalettePointerDown = (type: GateType, e: ReactPointerEvent) => {
    if (locked || !ready) return;
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

  const isOverPalette = useCallback((x: number, y: number) => {
    const r = paletteRef.current?.getBoundingClientRect();
    return !!r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  }, []);

  // What the board shows for the current run.
  const result = current?.result;
  const rows = result?.status === 'ok' ? result.rows : undefined;
  const inspectedRow = rows && current?.inspected != null ? rows[current.inspected] : undefined;
  const errors = result?.status === 'invalid' ? result.errors : [];
  const gateCount = countGates(circuit);
  const next = LEVELS[levelIndex + 1];

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <Button variant="ghost" onClick={() => go({ name: 'map' })}>
          ← Levels
        </Button>
        <div className={styles.titleBlock}>
          <span className={styles.levelNumber}>Level {level.number}</span>
          <h1 className={styles.title}>{level.title}</h1>
        </div>
        <span className={styles.chip}>{paletteRule(level.palette)}</span>
        {(level.maxGateInputs ?? 2) > 2 && (
          <span className={styles.chip} title="Select a gate and press + or − to change its inputs">
            gates up to {level.maxGateInputs} inputs
          </span>
        )}
        <div className={styles.headerRight}>
          <span className={styles.par}>Par {level.par}</span>
          <Stars count={bestStars} label={`Best: ${bestStars} of 3 stars`} />
        </div>
      </header>

      <aside className={styles.left}>
        <Palette
          ref={paletteRef}
          gates={level.palette}
          deleteHover={deleteHover}
          disabled={locked}
          onGatePointerDown={onPalettePointerDown}
        />
        <Hints key={level.id} hints={level.hints} />
      </aside>

      <main className={styles.center}>
        <div className={styles.boardArea}>
          {ready && (
            <Workspace
              ref={workspaceRef}
              locked={locked}
              isOverDeleteZone={isOverPalette}
              onDeleteHover={setDeleteHover}
              wireValues={inspectedRow?.wireValues}
              inputValues={inspectedRow?.inputs}
              unusedGateIds={rows ? result?.unusedGateIds : undefined}
              errorNodeIds={errors.flatMap((e) => e.nodeIds)}
              errorWireIds={errors.flatMap((e) => e.wireIds)}
              celebrate={current?.phase === 'celebrate'}
            />
          )}
          {errors.length > 0 && <Problems errors={errors} onDismiss={() => setRun(null)} />}
          {current?.phase === 'card' && (
            <ResultCard
              stars={current.stars}
              gateCount={current.gateCount}
              par={level.par}
              unlockedGate={level.unlocksGate}
              isLastLevel={!next}
              onNext={() => next && go({ name: 'level', levelId: next.id })}
              onKeepBuilding={() => setRun((r) => r && { ...r, phase: 'review' })}
              onMap={() => go({ name: 'map' })}
            />
          )}
        </div>

        <div className={styles.toolbar}>
          <div className={styles.tools}>
            <Button
              variant="ghost"
              disabled={locked || !canUndo}
              onClick={() => useCircuitStore.getState().undo()}
            >
              Undo
            </Button>
            <Button
              variant="ghost"
              disabled={locked || !canRedo}
              onClick={() => useCircuitStore.getState().redo()}
            >
              Redo
            </Button>
            <Button
              variant="ghost"
              disabled={locked || !hasSelection}
              onClick={() => useCircuitStore.getState().removeSelection()}
            >
              Delete
            </Button>
            <Button variant="ghost" disabled={locked} onClick={() => useCircuitStore.getState().reset()}>
              Reset
            </Button>
          </div>
          <span className={styles.gateCount} data-over={gateCount > level.par || undefined}>
            {gateCount} gate{gateCount === 1 ? '' : 's'} · par {level.par}
          </span>
          <Button variant="primary" size="lg" shortcut="Space" disabled={locked || !ready} onClick={startRun}>
            ▶ Run
          </Button>
        </div>
      </main>

      <aside className={styles.right}>
        <section className={styles.brief}>
          <h2 className={styles.sectionHeading}>Objective</h2>
          <p>
            <RichText text={level.brief} />
          </p>
        </section>
        {ready && (
          <section className={styles.equation} aria-label="Your circuit as a Boolean equation">
            <h2 className={styles.sectionHeading}>Your circuit</h2>
            <p>
              {level.outputs[0]} = <Expression expr={circuitExpression(circuit, level)} />
            </p>
          </section>
        )}
        <TruthTable
          level={level}
          rows={rows}
          revealed={current?.revealed ?? 0}
          inspected={current?.phase === 'review' || current?.phase === 'card' ? current.inspected : null}
          onInspect={
            current?.phase === 'review' ? (i) => setRun((r) => r && { ...r, inspected: i }) : undefined
          }
        />
      </aside>

      {ghost && (
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
      )}
    </div>
  );
}
