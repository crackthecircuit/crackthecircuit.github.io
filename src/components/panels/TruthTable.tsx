import { rowInputs } from '../../engine';
import type { Level, RowResult } from '../../engine';
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

export function TruthTable({ level, rows, revealed, inspected, onInspect }: TruthTableProps) {
  const count = 2 ** level.inputs.length;
  const out = level.outputs[0]!;
  const passed = rows?.slice(0, revealed).filter((r) => r.pass).length ?? 0;

  return (
    <section className={styles.panel} aria-label="Truth table">
      <div className={styles.headingRow}>
        <h2 className={styles.heading}>Truth table</h2>
        {rows && (
          <span
            className={styles.score}
            data-all={passed === count && revealed >= count ? 'pass' : undefined}
          >
            {passed}/{count} passing
          </span>
        )}
      </div>
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
            const row = rows && i < revealed ? rows[i] : undefined;
            const status = row ? (row.pass ? 'pass' : 'fail') : undefined;
            const clickable = !!row && !!onInspect;
            return (
              <tr
                key={i}
                className={styles.row}
                data-status={status}
                data-inspected={inspected === i || undefined}
                data-clickable={clickable || undefined}
                onClick={clickable ? () => onInspect(i) : undefined}
                tabIndex={clickable ? 0 : undefined}
                onKeyDown={
                  clickable
                    ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onInspect(i);
                        }
                      }
                    : undefined
                }
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
      {rows && revealed >= count && (
        <p className={styles.tip}>Click a row to see its signals on the board.</p>
      )}
    </section>
  );
}
