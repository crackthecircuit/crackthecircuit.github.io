import { hintStarCap } from '../../engine';
import { RichText } from '../ui/Expression';
import styles from './Hints.module.css';

const TIER_NAMES = ['Nudge', 'Expression', 'Structure'];
const REVEAL_LABELS = ['Stuck? Show a hint', 'Show the expression', 'Show the structure'];

interface HintsProps {
  hints: readonly string[];
  /** Hints already revealed for this level (saved with progress). */
  shown: number;
  onReveal: () => void;
}

/** Up to three hints, revealed one at a time. The nudge is free; the next two cap the level's stars. */
export function Hints({ hints, shown, onReveal }: HintsProps) {
  const cap = hintStarCap(shown);
  const nextCap = hintStarCap(shown + 1);
  const costs = nextCap < cap;
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
        <button
          type="button"
          className={styles.reveal}
          onClick={onReveal}
          aria-label={
            costs
              ? `${REVEAL_LABELS[shown]}. This level then gives at most ${nextCap} of 3 stars.`
              : undefined
          }
        >
          <span>{REVEAL_LABELS[shown]}</span>
          <span className={styles.cost} data-free={!costs || undefined}>
            {costs ? `max ${'★'.repeat(nextCap)}` : 'free'}
          </span>
        </button>
      )}
    </section>
  );
}
