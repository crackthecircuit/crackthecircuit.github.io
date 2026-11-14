import { useEffect, useMemo, useRef, useState } from 'react';
import { circuitExpression, countGates, simulate } from '../engine';
import { Workspace } from '../components/board/Workspace';
import type { WorkspaceHandle } from '../components/board/Workspace';
import { HowToPlay } from '../components/menu/HowToPlay';
import { LiveTruthTable } from '../components/panels/LiveTruthTable';
import { Palette } from '../components/panels/Palette';
import { Button } from '../components/ui/Button';
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
import { useEditorKeys, useEditSounds, usePaletteDrag } from './editor';
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
  const hasSelection = useCircuitStore((s) => s.selection !== null);
  const canUndo = useCircuitStore((s) => s.past.length > 0);
  const canRedo = useCircuitStore((s) => s.future.length > 0);

  const workspaceRef = useRef<WorkspaceHandle>(null);
  const [deleteHover, setDeleteHover] = useState(false);
  const [inspected, setInspected] = useState<number | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);

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
  useEditorKeys({ locked: false, onEscape: () => setInspected(null) });
  const { paletteRef, onPalettePointerDown, isOverPalette, ghostElement } = usePaletteDrag(
    workspaceRef,
    !ready,
  );

  const changeInputs = (n: number) => {
    if (n === inputCount || !ready) return;
    setInspected(null);
    const next = sandboxLevel(n, unlockedGates);
    useCircuitStore.getState().relayout(next, adaptCircuit(circuit, next));
  };

  const gateCount = countGates(circuit);

  return (
    <div className={layout.screen}>
      <header className={layout.header}>
        <Button variant="ghost" onClick={() => go({ name: 'title' })}>
          ← Menu
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
        <span className={layout.chip}>gates up to 4 inputs</span>
        <div className={layout.headerRight}>
          <SoundToggle />
          <Button
            variant="ghost"
            onClick={() => setHelpOpen(true)}
            aria-label="How to play"
            title="How to play"
          >
            ?
          </Button>
        </div>
      </header>

      <aside className={layout.left}>
        <Palette
          ref={paletteRef}
          gates={level.palette}
          deleteHover={deleteHover}
          onGatePointerDown={onPalettePointerDown}
        />
      </aside>

      <main className={layout.center}>
        <div className={layout.boardArea}>
          {ready && (
            <Workspace
              ref={workspaceRef}
              isOverDeleteZone={isOverPalette}
              onDeleteHover={setDeleteHover}
              wireValues={row?.wireValues}
              inputValues={row?.inputs}
              unusedGateIds={result.unusedGateIds}
            />
          )}
        </div>

        <div className={layout.toolbar}>
          <div className={layout.tools}>
            <Button variant="ghost" disabled={!canUndo} onClick={() => useCircuitStore.getState().undo()}>
              Undo
            </Button>
            <Button variant="ghost" disabled={!canRedo} onClick={() => useCircuitStore.getState().redo()}>
              Redo
            </Button>
            <Button
              variant="ghost"
              disabled={!hasSelection}
              onClick={() => useCircuitStore.getState().removeSelection()}
            >
              Delete
            </Button>
            <Button variant="ghost" onClick={() => useCircuitStore.getState().reset()}>
              Reset
            </Button>
          </div>
          <span key={gateCount} className={layout.gateCount}>
            {gateCount} gate{gateCount === 1 ? '' : 's'}
          </span>
        </div>
      </main>

      <aside className={layout.right}>
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

      {ghostElement}
      <HowToPlay open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}
