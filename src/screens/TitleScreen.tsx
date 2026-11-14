import { Button } from '../components/ui/Button';
import { LEVELS } from '../levels/levels';
import { useAppStore } from '../store/appStore';
import { useProgressStore } from '../store/progressStore';
import styles from './TitleScreen.module.css';

/** Animated mark: two switches feed an AND gate, then the lamp lights. */
function LogoMark() {
  return (
    <svg className={styles.mark} viewBox="0 0 220 110" aria-hidden>
      <path className={styles.traceA} d="M14 36 H70" />
      <path className={styles.traceB} d="M14 74 H70" />
      <circle className={styles.pinA} cx="14" cy="36" r="6" />
      <circle className={styles.pinB} cx="14" cy="74" r="6" />
      <path className={styles.gate} d="M70 20 H100 A35 35 0 0 1 100 90 H70 Z" />
      <path className={styles.traceOut} d="M135 55 H180" />
      <circle className={styles.lamp} cx="196" cy="55" r="15" />
    </svg>
  );
}

export function TitleScreen() {
  const go = useAppStore((s) => s.go);
  const stars = useProgressStore((s) => s.stars);
  const started = Object.keys(stars).length > 0;
  const nextLevel = LEVELS.find((l) => !stars[l.id]);

  return (
    <main className={styles.screen}>
      <div className={styles.hero}>
        <LogoMark />
        <h1 className={styles.title}>
          Crack the <span className={styles.lit}>Circuit</span>
        </h1>
        <p className={styles.tagline}>Build. Connect. Compute.</p>
        <p className={styles.pitch}>
          Every level is a locked truth table. Wire logic gates together until your circuit matches it, row
          for row.
        </p>
        <div className={styles.actions}>
          {started && nextLevel ? (
            <>
              <Button
                variant="primary"
                size="lg"
                autoFocus
                onClick={() => go({ name: 'level', levelId: nextLevel.id })}
              >
                Continue: Level {nextLevel.number}
              </Button>
              <Button size="lg" onClick={() => go({ name: 'map' })}>
                Level map
              </Button>
            </>
          ) : (
            <Button variant="primary" size="lg" autoFocus onClick={() => go({ name: 'map' })}>
              {started ? 'Level map' : 'Play'}
            </Button>
          )}
        </div>
      </div>
      <footer className={styles.footer}>BCIS 1302 · Digital Logic</footer>
    </main>
  );
}
