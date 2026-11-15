import styles from './RowStepper.module.css';

interface RowStepperProps {
  /** Number of truth-table rows. */
  count: number;
  /** The row being shown on the board, or null for none yet. */
  index: number | null;
  /** Whether that row passes; omit where rows have no target (the sandbox). */
  pass?: boolean;
  onChange: (index: number) => void;
}

/** `‹ Row 3/8 ✗ ›` over the board's corner: steps through the truth-table rows without opening the table. */
export function RowStepper({ count, index, pass, onChange }: RowStepperProps) {
  const go = (delta: number) => onChange(index === null ? 0 : (index + delta + count) % count);
  const mark = index === null || pass === undefined ? null : pass ? '✓' : '✗';
  return (
    <div className={styles.stepper} role="group" aria-label="Truth table rows">
      <button type="button" className={styles.step} aria-label="Previous row" onClick={() => go(-1)}>
        ‹
      </button>
      <span className={styles.label} aria-live="polite">
        {index === null ? `${count} rows` : `Row ${index + 1}/${count}`}
        {mark && (
          <span className={styles.mark} data-pass={pass} aria-label={pass ? 'passes' : 'fails'}>
            {mark}
          </span>
        )}
      </span>
      <button type="button" className={styles.step} aria-label="Next row" onClick={() => go(1)}>
        ›
      </button>
    </div>
  );
}
