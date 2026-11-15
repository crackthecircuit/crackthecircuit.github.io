import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { circuitExpression, countGates, simulate } from '../engine';
import { Workspace } from '../components/board/Workspace';
import type { WorkspaceHandle } from '../components/board/Workspace';
import { HowToPlay } from '../components/menu/HowToPlay';
import { LiveTruthTable } from '../components/panels/LiveTruthTable';
import { Palette } from '../components/panels/Palette';
import { RowStepper } from '../components/panels/RowStepper';
import { Button } from '../components/ui/Button';
import { CollapseIcon } from '../components/ui/icons';
import { Expression } from '../components/ui/Expression';
import { SoundToggle } from '../components/ui/SoundToggle';
import {
  adaptCircuit,
  SANDBOX_ID,
  SANDBOX_MAX_INPUTS,
  SANDBOX_MIN_INPUTS,
  sandboxInputCount,
  sandboxLevel,
} from '../levels/sandbox';
import { isUsableBoard } from '../levels/startingCircuit';
import { useAppStore } from '../store/appStore';
import { useCircuitStore } from '../store/circuitStore';
import { useProgressStore } from '../store/progressStore';
import { EditTools } from './EditTools';
import { useEditorKeys, useEditSounds, useFloatingLayout, usePaletteDrag, useUndoToast } from './editor';
import layout from './LevelScreen.module.css';
import styles from './SandboxScreen.module.css';

const INPUT_CHOICES = Array.from(
  { length: SANDBOX_MAX_INPUTS - SANDBOX_MIN_INPUTS + 1 },
  (_, i) => SANDBOX_MIN_INPUTS + i,
);

/** Free building: no target, every unlocked gate, and a truth table that follows the circuit live. */
export function SandboxScreen() {
  const go = useAppStore((s) => s.go);
  const unlockedGates = useProgressStore((s) => s.unlockedGates);
  const circuit = useCircuitStore((s) => s.circuit);
  const ready = useCircuitStore((s) => s.level?.id === SANDBOX_ID);
  // The input count lives in the circuit (its input terminals), so undo/redo restores it with the board.
  const inputCount = sandboxInputCount(ready ? circuit : undefined);
  const level = useMemo(() => sandboxLevel(inputCount, unlockedGates), [inputCount, unlockedGates]);

  const workspaceRef = useRef<WorkspaceHandle>(null);
  const [deleteHover, setDeleteHover] = useState(false);
  const [inspected, setInspected] = useState<number | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  // The canvas fills the screen; the toolbar, panel and pills float over it.
  const { phone, panelOpen, setPanelOpen, trayOpen, setTrayOpen, insets, style } = useFloatingLayout();

  // Open the sandbox with its saved board.
  useEffect(() => {
    const saved = useProgressStore.getState().boards[SANDBOX_ID];
    const initial = sandboxLevel(sandboxInputCount(saved), useProgressStore.getState().unlockedGates);
    useCircuitStore.getState().loadLevel(initial, isUsableBoard(saved, initial) ? saved : undefined);
  }, []);

  // Keep the store's level in step with the circuit (undo/redo can change the terminals).
  useEffect(() => {
    if (ready && useCircuitStore.getState().level !== level) useCircuitStore.getState().setLevel(level);
  }, [ready, level]);

  useEffect(() => {
    if (ready) useProgressStore.getState().saveBoard(SANDBOX_ID, circuit);
  }, [circuit, ready]);

  const result = useMemo(() => simulate(circuit, level), [circuit, level]);
  const row = result.status === 'ok' && inspected !== null ? result.rows[inspected] : undefined;

  useEditSounds();
  const { toast: undoToast, reset } = useUndoToast();
  useEditorKeys({ locked: false, onEscape: () => setInspected(null) });
  const closeTray = useCallback(() => setTrayOpen(false), [setTrayOpen]);
  const { paletteRef, onPalettePointerDown, onPaletteActivate, isOverPalette, ghostElement } = usePaletteDrag(
    workspaceRef,
    !ready,
    { onAdded: closeTray, onDragMove: closeTray },
  );

  const changeInputs = (n: number) => {
    if (n === inputCount || !ready) return;
    setInspected(null);
    const next = sandboxLevel(n, unlockedGates);
    useCircuitStore.getState().relayout(next, adaptCircuit(circuit, next));
  };

  const gateCount = countGates(circuit);
  const gateCountText = `${gateCount} gate${gateCount === 1 ? '' : 's'}`;

  return (
    <div
      className={layout.screen}
      style={style}
      data-panel={panelOpen || undefined}
      data-tray={(phone && trayOpen) || undefined}
    >
      <main className={layout.canvas}>
        {ready && (
          <Workspace
            ref={workspaceRef}
            isOverDeleteZone={isOverPalette}
            onDeleteHover={setDeleteHover}
            insets={insets}
            wireValues={row?.wireValues}
            inputValues={row?.inputs}
            unusedGateIds={result.unusedGateIds}
          />
        )}
        {undoToast}
        {result.status === 'ok' && (
          <RowStepper count={result.rows.length} index={inspected} onChange={setInspected} />
        )}
      </main>

      <header className={layout.topLeft}>
        <Button variant="ghost" className={layout.back} onClick={() => go({ name: 'title' })} title="Menu">
          ← <span className={layout.backText}>Menu</span>
        </Button>
        <div className={layout.titleBlock}>
          <span className={layout.levelNumber}>Free build</span>
          <h1 className={layout.title}>Sandbox</h1>
        </div>
        <div className={styles.inputs} role="radiogroup" aria-label="Number of inputs">
          <span className={styles.inputsLabel} aria-hidden>
            Inputs
          </span>
          {INPUT_CHOICES.map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={n === inputCount}
              aria-label={`${n} input${n === 1 ? '' : 's'}`}
              className={styles.inputChoice}
              title={n < inputCount ? 'Removes the extra inputs and their wires (undoable)' : undefined}
              onClick={() => changeInputs(n)}
            >
              {n}
            </button>
          ))}
        </div>
      </header>

      <div className={layout.topRight}>
        <SoundToggle />
        <Button variant="ghost" onClick={() => setHelpOpen(true)} aria-label="How to play" title="How to play">
          ?
        </Button>
      </div>

      {!panelOpen && (
        <button
          type="button"
          className={layout.panelTab}
          aria-expanded={false}
          aria-controls="sandbox-panel"
          onClick={() => setPanelOpen(true)}
        >
          Truth table
        </button>
      )}

      <aside className={layout.panel} id="sandbox-panel" aria-label="Sandbox and truth table">
        <div className={layout.panelHeader}>
          <span className={layout.panelCount}>{gateCountText} · gates up to 4 inputs</span>
          <Button
            variant="ghost"
            className={layout.iconButton}
            aria-label="Hide the panel"
            title="Hide the panel"
            aria-expanded={panelOpen}
            aria-controls="sandbox-panel"
            onClick={() => setPanelOpen(false)}
          >
            <CollapseIcon />
          </Button>
        </div>
        <section className={layout.brief}>
          <h2 className={layout.sectionHeading}>Sandbox</h2>
          <p>Build anything. The truth table follows your circuit as you edit it.</p>
        </section>
        {ready && (
          <section className={layout.equation} aria-label="Your circuit as a Boolean equation">
            <h2 className={layout.sectionHeading}>Your circuit</h2>
            <p>
              {level.outputs[0]} = <Expression expr={circuitExpression(circuit, level)} />
            </p>
          </section>
        )}
        <LiveTruthTable level={level} result={result} inspected={inspected} onInspect={setInspected} />
      </aside>

      <div className={layout.toolbar} role="group" aria-label="Gates and editing tools">
        {phone && (
          <button
            type="button"
            className={layout.gatesToggle}
            aria-expanded={trayOpen}
            aria-controls="gate-tray"
            onClick={() => setTrayOpen((o) => !o)}
          >
            Gates {trayOpen ? '▾' : '▴'}
          </button>
        )}
        <div className={layout.gates} id="gate-tray">
          <Palette
            ref={paletteRef}
            gates={level.palette}
            deleteHover={deleteHover}
            onGatePointerDown={onPalettePointerDown}
            onGateActivate={onPaletteActivate}
          />
        </div>
        <span className={layout.divider} aria-hidden />
        <EditTools onReset={reset} />
        <span className={layout.divider} aria-hidden />
        <span key={gateCount} className={layout.gateCount}>
          {gateCountText}
        </span>
      </div>

      {ghostElement}
      <HowToPlay open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}
