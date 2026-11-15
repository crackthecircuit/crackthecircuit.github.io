import { useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { CircuitBackdrop } from '../components/menu/CircuitBackdrop';
import { HowToPlay } from '../components/menu/HowToPlay';
import { SoundToggle } from '../components/ui/SoundToggle';
import { LEVELS } from '../levels/levels';
import { useAppStore } from '../store/appStore';
import { useProgressStore } from '../store/progressStore';
import styles from './TitleScreen.module.css';

interface MenuItem {
  label: string;
  detail?: string;
  action: () => void;
}

export function TitleScreen() {
  const go = useAppStore((s) => s.go);
  const stars = useProgressStore((s) => s.stars);
  const [helpOpen, setHelpOpen] = useState(false);
  const [active, setActive] = useState(0);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const cracked = LEVELS.filter((l) => stars[l.id]).length;
  const totalStars = Object.values(stars).reduce((a, b) => a + b, 0);
  const nextLevel = LEVELS.find((l) => !stars[l.id]);

  const items: MenuItem[] = [];
  if (cracked === 0) {
    items.push({
      label: 'Start',
      detail: `Level 1 · ${LEVELS[0]!.title}`,
      action: () => go({ name: 'level', levelId: LEVELS[0]!.id }),
    });
  } else if (nextLevel) {
    items.push({
      label: 'Continue',
      detail: `Level ${nextLevel.number} · ${nextLevel.title}`,
      action: () => go({ name: 'level', levelId: nextLevel.id }),
    });
  }
  items.push({
    label: 'Level Select',
    detail: nextLevel ? undefined : `All ${LEVELS.length} cracked. Go for three stars`,
    action: () => go({ name: 'map' }),
  });
  items.push({
    label: 'Sandbox',
    detail: 'Free build, no target',
    action: () => go({ name: 'sandbox' }),
  });
  items.push({ label: 'How to Play', action: () => setHelpOpen(true) });

  const focusItem = (i: number) => {
    const index = (i + items.length) % items.length;
    setActive(index);
    itemRefs.current[index]?.focus();
  };

  // Arrow keys (or W/S) move through the menu like a game; Enter or Space picks.
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
      e.preventDefault();
      focusItem(active + 1);
    } else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
      e.preventDefault();
      focusItem(active - 1);
    }
  };

  return (
    <main className={styles.screen}>
      <CircuitBackdrop />
      <div className={styles.shade} aria-hidden />

      <div className={styles.content}>
        <div className={styles.brand}>
          <h1 className={styles.title}>
            Crack the <span className={styles.lit}>Circuit</span>
          </h1>
          <p className={styles.tagline}>Build. Connect. Compute.</p>
        </div>

        <nav className={styles.menu} aria-label="Main menu" onKeyDown={onKeyDown}>
          {items.map((item, i) => (
            <button
              key={item.label}
              ref={(el) => {
                itemRefs.current[i] = el;
              }}
              type="button"
              className={styles.item}
              data-active={active === i || undefined}
              style={{ animationDelay: `${900 + i * 90}ms` }}
              autoFocus={i === 0}
              onFocus={() => setActive(i)}
              onMouseEnter={() => focusItem(i)}
              onClick={item.action}
            >
              <span className={styles.pin} aria-hidden />
              <span className={styles.label}>{item.label}</span>
              {item.detail && <span className={styles.detail}>{item.detail}</span>}
            </button>
          ))}
        </nav>
      </div>

      <footer className={styles.footer}>
        {cracked > 0 ? (
          <span className={styles.progress}>
            <span className={styles.star} aria-hidden>
              ★
            </span>{' '}
            {totalStars}/{LEVELS.length * 3}
            <span className={styles.sep} aria-hidden>
              ·
            </span>
            {cracked}/{LEVELS.length} cracked
          </span>
        ) : (
          <span className={styles.hintKeys}>
            <kbd>↑</kbd> <kbd>↓</kbd> to choose · <kbd>Enter</kbd> to select
          </span>
        )}
        <span className={styles.footerRight}>
          <SoundToggle />
          <span className={styles.version}>v1.0</span>
        </span>
      </footer>

      <HowToPlay open={helpOpen} onClose={() => setHelpOpen(false)} />
    </main>
  );
}
