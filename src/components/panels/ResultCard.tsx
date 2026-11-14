import { useEffect, useRef } from 'react';
import type { GateType } from '../../engine';
import { Button } from '../ui/Button';
import { Stars } from '../ui/Stars';
import styles from './ResultCard.module.css';

interface ResultCardProps {
  stars: number;
  gateCount: number;
  par: number;
  unlockedGate?: GateType;
  isLastLevel: boolean;
  onNext: () => void;
  onKeepBuilding: () => void;
  onMap: () => void;
}

const HEADLINES = ['', 'Circuit cracked', 'Nicely cracked', 'Perfectly cracked'];

export function ResultCard(props: ResultCardProps) {
  const { stars, gateCount, par, unlockedGate, isLastLevel, onNext, onKeepBuilding, onMap } = props;
  const primary = useRef<HTMLButtonElement>(null);
  useEffect(() => primary.current?.focus(), []);

  const parNote =
    gateCount <= par
      ? `${gateCount} gate${gateCount === 1 ? '' : 's'}: at par.`
      : `${gateCount} gates. Par is ${par}. Can you trim ${gateCount - par}?`;

  return (
    <div className={styles.card} role="dialog" aria-modal="false" aria-labelledby="result-title">
      <Stars count={stars} size={28} />
      <h2 id="result-title" className={styles.title}>
        {isLastLevel ? 'Every circuit cracked!' : HEADLINES[stars]}
      </h2>
      <p className={styles.note}>{parNote}</p>
      {unlockedGate && (
        <p className={styles.unlock}>
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
