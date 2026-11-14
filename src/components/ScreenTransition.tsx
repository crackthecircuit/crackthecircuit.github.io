import { useEffect, useState, type ReactNode } from 'react';
import styles from './ScreenTransition.module.css';

const EXIT_MS = 180;

interface Props {
  /** Changes when the screen changes; the old screen plays an exit before the new one enters. */
  id: string;
  children: ReactNode;
}

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

export function ScreenTransition({ id, children }: Props) {
  const [shown, setShown] = useState<{ id: string; node: ReactNode }>({ id, node: children });
  const leaving = id !== shown.id;

  useEffect(() => {
    if (!leaving) return;
    const t = window.setTimeout(() => setShown({ id, node: children }), prefersReducedMotion() ? 0 : EXIT_MS);
    return () => window.clearTimeout(t);
  }, [leaving, id, children]);

  return (
    <div key={shown.id} className={styles.layer} data-leaving={leaving || undefined}>
      {leaving ? shown.node : children}
    </div>
  );
}
