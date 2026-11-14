import { useState } from 'react';
import { RichText } from '../ui/Expression';
import styles from './Hints.module.css';

const TIER_NAMES = ['Nudge', 'Expression', 'Structure'];

/** Up to three hints, revealed one at a time. Remount with a new `key` per level. */
export function Hints({ hints }: { hints: readonly string[] }) {
  const [shown, setShown] = useState(0);
  return (
    <section className={styles.panel} aria-label="Hints">
      <h2 className={styles.heading}>
        Hints{' '}
        <span className={styles.count}>
          {shown}/{hints.length}
        </span>
      </h2>
      <ol className={styles.list}>
        {hints.slice(0, shown).map((hint, i) => (
          <li key={i} className={styles.hint}>
            <span className={styles.tier}>{TIER_NAMES[i]}</span>
            <span>
              <RichText text={hint} />
            </span>
          </li>
        ))}
      </ol>
      {shown < hints.length && (
        <button type="button" className={styles.reveal} onClick={() => setShown(shown + 1)}>
          {shown === 0 ? 'Stuck? Show a hint' : 'Show another hint'}
        </button>
      )}
    </section>
  );
}
