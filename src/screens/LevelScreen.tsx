import { useCallback, useEffect, useRef, useState } from 'react';
import { circuitExpression, countGates, score, simulate } from '../engine';
import type { Circuit, GateType, SimulationResult } from '../engine';
import { Workspace } from '../components/board/Workspace';
import type { WorkspaceHandle } from '../components/board/Workspace';
import { Hints } from '../components/panels/Hints';
import { Palette } from '../components/panels/Palette';
import { Problems } from '../components/panels/Problems';
import { ResultCard } from '../components/panels/ResultCard';
import { RowStepper } from '../components/panels/RowStepper';
import { TruthTable } from '../components/panels/TruthTable';
import { Button } from '../components/ui/Button';
import { CollapseIcon } from '../components/ui/icons';
import { Expression, RichText } from '../components/ui/Expression';
import { SoundToggle } from '../components/ui/SoundToggle';
import { Stars } from '../components/ui/Stars';
import { HowToPlay } from '../components/menu/HowToPlay';
import { announce } from '../lib/announce';
import { playSound } from '../lib/sound';
import { getLevel, LEVELS } from '../levels/levels';
import { isUsableBoard } from '../levels/startingCircuit';
import { useAppStore } from '../store/appStore';
import { useCircuitStore } from '../store/circuitStore';
import { useProgressStore } from '../store/progressStore';
import { EditTools } from './EditTools';
import { useEditorKeys, useEditSounds, useFloatingLayout, usePaletteDrag, useUndoToast } from './editor';
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

function paletteRule(palette: GateType[]): string {
  return palette.length === 1 ? `${palette[0]} only` : palette.join(' · ');
}

export function LevelScreen({ levelId }: { levelId: string }) {
  const level = getLevel(levelId)!;
  const levelIndex = LEVELS.indexOf(level);
  const go = useAppStore((s) => s.go);
  const circuit = useCircuitStore((s) => s.circuit);
  const ready = useCircuitStore((s) => s.level?.id === level.id);
  const bestStars = useProgressStore((s) => s.stars[level.id] ?? 0);

  const workspaceRef = useRef<WorkspaceHandle>(null);
  const [deleteHover, setDeleteHover] = useState(false);
  const [run, setRun] = useState<Run | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  // The canvas fills the screen; the toolbar, panel and pills float over it.
  const { phone, panelOpen, setPanelOpen, trayOpen, setTrayOpen, insets, style } = useFloatingLayout();

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
      playSound('invalid'); // the Problems box is an alert, so it is read out
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

  // Sounds for the run (a tick per row as the sweep lands, then the outcome), and the outcome read out.
  const lastPhase = useRef<Phase | null>(null);
  useEffect(() => {
    const prev = lastPhase.current;
    lastPhase.current = current?.phase ?? null;
    if (!current || current.result.status !== 'ok') return;
    const { phase, revealed, result } = current;
    if (phase === 'sweep' && revealed > 0) {
      playSound(result.rows[revealed - 1]!.pass ? 'rowPass' : 'rowFail', revealed - 1);
    }
    if (phase === prev) return;
    if (phase === 'celebrate') playSound('success');
    if (phase === 'card') {
      if (prev === 'sweep') playSound('success'); // the sweep was skipped
      const delay = prev === 'sweep' ? 0.35 : 0.05;
      for (let i = 0; i < current.stars; i++) playSound('star', i, delay + i * 0.14);
      if (level.unlocksGate) playSound('unlock', 0, delay + current.stars * 0.14 + 0.1);
    }
    if (phase === 'review' && prev === 'sweep' && !result.allPassed) {
      playSound('fail');
      setPanelOpen(true); // show the table so the failing rows can be inspected
      const fail = result.rows.find((r) => !r.pass)!;
      const out = level.outputs[0]!;
      const inputs = level.inputs.map((l) => `${l} ${fail.inputs[l]}`).join(', ');
      announce(
        `${result.passedCount} of ${result.rows.length} rows pass. First failing row: ${inputs}. ` +
          `${out} should be ${fail.expected[out]} but is ${fail.outputs[out]}.`,
      );
    }
  }, [current, level, setPanelOpen]);

  useEditSounds();
  const { toast: undoToast, reset } = useUndoToast();
  useEditorKeys({
    locked,
    onSpace: () => !locked && startRun(),
    onEscape: () => current?.phase === 'card' && setRun((r) => r && { ...r, phase: 'review' }),
  });
  const closeTray = useCallback(() => setTrayOpen(false), [setTrayOpen]);
  const { paletteRef, onPalettePointerDown, onPaletteActivate, isOverPalette, ghostElement } = usePaletteDrag(
    workspaceRef,
    locked || !ready,
    { onAdded: closeTray, onDragMove: closeTray },
  );

  // What the board shows for the current run.
  const result = current?.result;
  const rows = result?.status === 'ok' ? result.rows : undefined;
  const inspectedRow = rows && current?.inspected != null ? rows[current.inspected] : undefined;
  const errors = result?.status === 'invalid' ? result.errors : [];
  const gateCount = countGates(circuit);
  const next = LEVELS[levelIndex + 1];
  const inspect = (i: number) => setRun((r) => r && { ...r, inspected: i });
  const gateCountText = `${gateCount} gate${gateCount === 1 ? '' : 's'} · ${level.par} for ★★★`;

  return (
    <div
      className={styles.screen}
      style={style}
      data-panel={panelOpen || undefined}
      data-tray={(phone && trayOpen) || undefined}
    >
      <main className={styles.canvas}>
        {ready && (
          <Workspace
            ref={workspaceRef}
            locked={locked}
            isOverDeleteZone={isOverPalette}
            onDeleteHover={setDeleteHover}
            insets={insets}
            wireValues={inspectedRow?.wireValues}
            inputValues={inspectedRow?.inputs}
            unusedGateIds={rows ? result?.unusedGateIds : undefined}
            errorNodeIds={errors.flatMap((e) => e.nodeIds)}
            errorWireIds={errors.flatMap((e) => e.wireIds)}
            celebrate={current?.phase === 'celebrate'}
          />
        )}
        {rows && current?.phase === 'review' && (
          <RowStepper
            count={rows.length}
            index={current.inspected}
            pass={current.inspected === null ? undefined : rows[current.inspected]!.pass}
            onChange={inspect}
          />
        )}
        {!locked && undoToast}
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
      </main>

      <header className={styles.topLeft}>
        <Button variant="ghost" className={styles.back} onClick={() => go({ name: 'map' })} title="Levels">
          ← <span className={styles.backText}>Levels</span>
        </Button>
        <div className={styles.titleBlock}>
          <span className={styles.levelNumber}>Level {level.number}</span>
          <h1 className={styles.title}>{level.title}</h1>
        </div>
        <span className={styles.chip}>{paletteRule(level.palette)}</span>
        {(level.maxGateInputs ?? 2) > 2 && (
          <span className={styles.chip} title="Select a gate and press + or − to change its inputs">
            up to {level.maxGateInputs} inputs
          </span>
        )}
      </header>

      <div className={styles.topRight}>
        <span className={styles.best}>
          <span className={styles.bestLabel} aria-hidden>
            Best
          </span>
          <Stars count={bestStars} label={`Best: ${bestStars} of 3 stars`} />
        </span>
        <SoundToggle />
        <Button variant="ghost" onClick={() => setHelpOpen(true)} aria-label="How to play" title="How to play">
          ?
        </Button>
      </div>

      {!panelOpen && (
        <button
          type="button"
          className={styles.panelTab}
          aria-expanded={false}
          aria-controls="level-panel"
          onClick={() => setPanelOpen(true)}
        >
          Truth table
          {rows && current?.phase === 'review' && result?.status === 'ok' && (
            <span className={styles.tabScore} data-all={result.allPassed || undefined}>
              {result.passedCount}/{rows.length}
            </span>
          )}
        </button>
      )}

      <aside className={styles.panel} id="level-panel" aria-label="Objective and truth table">
        <div className={styles.panelHeader}>
          <span className={styles.panelCount}>{gateCountText}</span>
          <Button
            variant="ghost"
            className={styles.iconButton}
            aria-label="Hide the panel"
            title="Hide the panel"
            aria-expanded={panelOpen}
            aria-controls="level-panel"
            onClick={() => setPanelOpen(false)}
          >
            <CollapseIcon />
          </Button>
        </div>
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
          onInspect={current?.phase === 'review' ? inspect : undefined}
        />
        <Hints key={level.id} hints={level.hints} />
      </aside>

      <div className={styles.toolbar} role="group" aria-label="Gates and editing tools">
        {phone && (
          <button
            type="button"
            className={styles.gatesToggle}
            aria-expanded={trayOpen}
            aria-controls="gate-tray"
            disabled={locked}
            onClick={() => setTrayOpen((o) => !o)}
          >
            Gates {trayOpen ? '▾' : '▴'}
          </button>
        )}
        <div className={styles.gates} id="gate-tray">
          <Palette
            ref={paletteRef}
            gates={level.palette}
            deleteHover={deleteHover}
            disabled={locked}
            onGatePointerDown={onPalettePointerDown}
            onGateActivate={onPaletteActivate}
          />
        </div>
        <span className={styles.divider} aria-hidden />
        <EditTools locked={locked} onReset={reset} />
        <span className={styles.divider} aria-hidden />
        <span key={gateCount} className={styles.gateCount} data-over={gateCount > level.par || undefined}>
          {gateCountText}
        </span>
        <Button variant="primary" className={styles.run} shortcut="Space" disabled={locked || !ready} onClick={startRun}>
          ▶ Run
        </Button>
      </div>

      {ghostElement}

      <HowToPlay open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}
