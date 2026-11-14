import { useProgressStore } from '../../store/progressStore';
import { Button } from './Button';
import styles from './SoundToggle.module.css';

/** Speaker button that mutes or unmutes sound effects (also the M key on editing screens). Saved with progress. */
export function SoundToggle() {
  const muted = useProgressStore((s) => s.muted);
  return (
    <Button
      variant="ghost"
      className={styles.toggle}
      aria-label="Sound effects"
      aria-pressed={!muted}
      title={muted ? 'Sound off (M)' : 'Sound on (M)'}
      onClick={() => useProgressStore.getState().setMuted(!muted)}
    >
      <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden>
        <path className={styles.speaker} d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
        {muted ? (
          <path className={styles.wave} d="M16 9.5l5 5M21 9.5l-5 5" />
        ) : (
          <>
            <path className={styles.wave} d="M15.5 9a4 4 0 0 1 0 6" />
            <path className={styles.wave} d="M18 6.5a7.5 7.5 0 0 1 0 11" />
          </>
        )}
      </svg>
    </Button>
  );
}
