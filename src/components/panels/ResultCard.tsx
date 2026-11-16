import { useEffect, useRef } from 'react';
import type { GateType } from '../../engine';
import { Button } from '../ui/Button';
import { Stars } from '../ui/Stars';
import styles from './ResultCard.module.css';

interface ResultCardProps {
  stars: number;
  gateCount: number;
  par: number;
  /** The most stars the hints shown still allow (3 = no cost). */
  starCap: number;
  unlockedGate?: GateType;
  isLastLevel: boolean;
  onNext: () => void;
  onKeepBuilding: () => void;
  onMap: () => void;
}

const HEADLINES = ['', 'Circuit cracked', 'Nicely cracked', 'Perfectly cracked'];

export function ResultCard(props: ResultCardProps) {
  const { stars, gateCount, par, starCap, unlockedGate, isLastLevel, onNext, onKeepBuilding, onMap } = props;
  const primary = useRef<HTMLButtonElement>(null);
  useEffect(() => primary.current?.focus(), []);

  const used = `${gateCount} gate${gateCount === 1 ? '' : 's'} used. ★★★ needs ${par} or fewer.`;
  const extra = gateCount - par;
  const parNote =
    starCap < 3
      ? `${gateCount} gate${gateCount === 1 ? '' : 's'} used. Hints capped this level at ${'★'.repeat(starCap)}.`
      : extra > 0
        ? `${used} Can you remove ${extra}?`
        : used;

  return (
    <div
      className={styles.card}
      role="dialog"
      aria-modal="false"
      aria-labelledby="result-title"
      aria-describedby="result-stars result-note result-unlock"
    >
      <span id="result-stars">
        <Stars count={stars} size={28} />
      </span>
      <h2 id="result-title" className={styles.title}>
        {isLastLevel ? 'Every circuit cracked!' : HEADLINES[stars]}
      </h2>
      <p id="result-note" className={styles.note}>
        {parNote}
      </p>
      {unlockedGate && (
        <p id="result-unlock" className={styles.unlock}>
          New gate unlocked: <strong>{unlockedGate}</strong>
        </p>
      )}
      <div className={styles.actions}>
        <Button variant="ghost" onClick={onKeepBuilding}>
          Keep building
        </Button>
        {isLastLevel ? (
          <Button ref={primary} variant="primary" onClick={onMap}>
            Back to the map
          </Button>
        ) : (
          <Button ref={primary} variant="primary" onClick={onNext}>
            Next level →
          </Button>
        )}
      </div>
    </div>
  );
}
