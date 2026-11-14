import { useState } from 'react';
import type { KeyboardEvent } from 'react';
import { rowInputs } from '../../engine';
import type { Level, RowResult } from '../../engine';
import { bits, hasKMap, kmapLayout } from '../../lib/kmap';
import styles from './TruthTable.module.css';

interface TruthTableProps {
  level: Level;
  /** Results from the latest run, if it is still current. */
  rows?: RowResult[];
  /** How many rows of the run have been revealed (the sweep fills them in one by one). */
  revealed: number;
  inspected: number | null;
  onInspect?: (index: number) => void;
}

type View = 'table' | 'kmap';
const VIEW_KEY = 'crackthecircuit:truthTableView';

/** The viewer's last choice. Storage can be unavailable, so every access is guarded. */
function savedView(): View {
  try {
    return localStorage.getItem(VIEW_KEY) === 'kmap' ? 'kmap' : 'table';
  } catch {
    return 'table';
  }
}

type RowState = { row?: RowResult; status?: 'pass' | 'fail'; clickable: boolean };

export function TruthTable({ level, rows, revealed, inspected, onInspect }: TruthTableProps) {
  const count = 2 ** level.inputs.length;
  const out = level.outputs[0]!;
  const passed = rows?.slice(0, revealed).filter((r) => r.pass).length ?? 0;
  const [preferred, setPreferred] = useState<View>(savedView);
  const canMap = hasKMap(level.inputs);
  const view: View = canMap ? preferred : 'table';

  const choose = (next: View) => {
    setPreferred(next);
    try {
      localStorage.setItem(VIEW_KEY, next);
    } catch {
      // The choice just won't be remembered.
    }
  };

  const rowState = (i: number): RowState => {
    const row = rows && i < revealed ? rows[i] : undefined;
    return { row, status: row ? (row.pass ? 'pass' : 'fail') : undefined, clickable: !!row && !!onInspect };
  };

  const keyActivate = (i: number) => (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onInspect?.(i);
    }
  };

  return (
    <section className={styles.panel} aria-label="Truth table">
      <div className={styles.headingRow}>
        <h2 className={styles.heading}>{view === 'kmap' ? 'K-map' : 'Truth table'}</h2>
        {canMap && (
          <div className={styles.toggle} role="group" aria-label="Show as">
            <button type="button" aria-pressed={view === 'table'} onClick={() => choose('table')}>
              Table
            </button>
            <button type="button" aria-pressed={view === 'kmap'} onClick={() => choose('kmap')}>
              K-map
            </button>
          </div>
        )}
        {rows && (
          <span
            className={styles.score}
            data-all={passed === count && revealed >= count ? 'pass' : undefined}
          >
            {passed}/{count} passing
          </span>
        )}
      </div>

      {view === 'kmap' ? (
        <KMap
          level={level}
          rowState={rowState}
          inspected={inspected}
          onInspect={onInspect}
          keyActivate={keyActivate}
        />
      ) : (
        <table className={styles.table} data-dense={count >= 16 || undefined}>
          <thead>
            <tr>
              {level.inputs.map((label) => (
                <th key={label} scope="col">
                  {label}
                </th>
              ))}
              <th scope="col" className={styles.divider}>
                Target {out}
              </th>
              <th scope="col">Yours</th>
              <th scope="col">
                <span className={styles.srOnly}>Result</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: count }, (_, i) => {
              const inputs = rowInputs(i, level.inputs);
              const { row, status, clickable } = rowState(i);
              return (
                <tr
                  key={i}
                  className={styles.row}
                  data-status={status}
                  data-inspected={inspected === i || undefined}
                  data-clickable={clickable || undefined}
                  onClick={clickable ? () => onInspect?.(i) : undefined}
                  tabIndex={clickable ? 0 : undefined}
                  onKeyDown={clickable ? keyActivate(i) : undefined}
                  aria-label={clickable ? `Inspect row ${i + 1}` : undefined}
                >
                  {level.inputs.map((label) => (
                    <td key={label} data-bit={inputs[label]}>
                      {inputs[label]}
                    </td>
                  ))}
                  <td className={styles.divider} data-bit={level.expected[out]![i]}>
                    {level.expected[out]![i]}
                  </td>
                  <td data-bit={row?.outputs[out]}>{row ? row.outputs[out] : '·'}</td>
                  <td className={styles.mark} aria-label={status}>
                    {status === 'pass' ? '✓' : status === 'fail' ? '✗' : ''}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {rows && revealed >= count && (
        <p className={styles.tip}>
          Click a {view === 'kmap' ? 'cell' : 'row'} to see its signals on the board.
        </p>
      )}
      {view === 'kmap' && !rows && (
        <p className={styles.tip}>
          Cells show target {out}. Neighbouring cells differ in one variable, so groups of 1s point to simpler
          terms.
        </p>
      )}
    </section>
  );
}

interface KMapProps {
  level: Level;
  rowState: (i: number) => RowState;
  inspected: number | null;
  onInspect?: (index: number) => void;
  keyActivate: (i: number) => (e: KeyboardEvent) => void;
}

/** The target output as a Karnaugh map, laid out like the lecture slides. */
function KMap({ level, rowState, inspected, onInspect, keyActivate }: KMapProps) {
  const out = level.outputs[0]!;
  const { rowVars, colVars, rowCodes, colCodes, cells } = kmapLayout(level.inputs);
  return (
    <table className={styles.kmap} aria-label={`K-map of ${out}`}>
      <thead>
        <tr>
          <th className={styles.corner}>
            {rowVars.length > 0 && <span className={styles.rowAxis}>{rowVars.join('')}</span>}
            <span className={styles.colAxis}>{colVars.join('')}</span>
          </th>
          {colCodes.map((c) => (
            <th key={c} scope="col">
              {bits(c, colVars.length)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {cells.map((cellRow, r) => (
          <tr key={r}>
            <th scope="row">{rowVars.length > 0 ? bits(rowCodes[r]!, rowVars.length) : ''}</th>
            {cellRow.map((i) => {
              const { row, status, clickable } = rowState(i);
              const target = level.expected[out]![i];
              return (
                <td
                  key={i}
                  className={styles.cell}
                  data-bit={target}
                  data-status={status}
                  data-inspected={inspected === i || undefined}
                  data-clickable={clickable || undefined}
                  onClick={clickable ? () => onInspect?.(i) : undefined}
                  onKeyDown={clickable ? keyActivate(i) : undefined}
                  tabIndex={clickable ? 0 : undefined}
                  title={row ? `Target ${target}, yours ${row.outputs[out]}` : undefined}
                  aria-label={clickable ? `Inspect row ${i + 1}` : undefined}
                >
                  {target}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
