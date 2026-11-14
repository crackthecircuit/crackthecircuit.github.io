import { rowInputs } from '../../engine';
import type { Level, SimulationResult } from '../../engine';
import styles from './TruthTable.module.css';

interface LiveTruthTableProps {
  level: Level;
  /** Simulation of the circuit as it is now. */
  result: SimulationResult;
  inspected: number | null;
  onInspect: (index: number | null) => void;
}

/** The sandbox's truth table: what the player's circuit does, updated on every edit. There is no target. */
export function LiveTruthTable({ level, result, inspected, onInspect }: LiveTruthTableProps) {
  const count = 2 ** level.inputs.length;
  const out = level.outputs[0]!;
  const rows = result.status === 'ok' ? result.rows : undefined;
  const ones = rows?.filter((r) => r.outputs[out] === 1).length ?? 0;

  return (
    <section className={styles.panel} aria-label="Truth table of your circuit">
      <div className={styles.headingRow}>
        <h2 className={styles.heading}>Truth table</h2>
        <span className={styles.score}>{rows ? `${ones}/${count} rows give 1` : 'incomplete'}</span>
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
              {out}
            </th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: count }, (_, i) => {
            const inputs = rowInputs(i, level.inputs);
            const value = rows?.[i]?.outputs[out];
            const selected = inspected === i;
            return (
              <tr
                key={i}
                className={styles.row}
                data-inspected={(selected && !!rows) || undefined}
                data-clickable={rows ? true : undefined}
                onClick={rows ? () => onInspect(selected ? null : i) : undefined}
                tabIndex={rows ? 0 : undefined}
                onKeyDown={
                  rows
                    ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onInspect(selected ? null : i);
                        }
                      }
                    : undefined
                }
                aria-label={
                  rows
                    ? `${level.inputs.map((l) => `${l} ${inputs[l]}`).join(', ')}: ${out} is ${value}. Show signals`
                    : undefined
                }
              >
                {level.inputs.map((label) => (
                  <td key={label} data-bit={inputs[label]}>
                    {inputs[label]}
                  </td>
                ))}
                <td className={styles.divider} data-bit={value}>
                  {value ?? '?'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {rows ? (
        <p className={styles.tip}>Click a row to see its signals on the board.</p>
      ) : (
        <ul className={styles.problems}>
          {result.status === 'invalid' &&
            result.errors.slice(0, 3).map((e, i) => <li key={i}>{e.message}</li>)}
        </ul>
      )}
    </section>
  );
}
