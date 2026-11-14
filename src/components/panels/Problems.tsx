import type { ValidationError } from '../../engine';
import styles from './Problems.module.css';

/** Why Run was blocked. The matching ports and wires pulse red on the board. */
export function Problems({ errors, onDismiss }: { errors: ValidationError[]; onDismiss: () => void }) {
  return (
    <div className={styles.box} role="alert">
      <div className={styles.header}>
        <strong>
          Can’t run yet: {errors.length} problem{errors.length === 1 ? '' : 's'}
        </strong>
        <button type="button" className={styles.close} onClick={onDismiss} aria-label="Dismiss">
          ×
        </button>
      </div>
      <ul className={styles.list}>
        {errors.map((e, i) => (
          <li key={i}>{e.message}</li>
        ))}
      </ul>
    </div>
  );
}
