import { useSyncExternalStore } from 'react';
import { announcement, subscribeAnnouncements } from '../../lib/announce';
import styles from './Announcer.module.css';

/** The app's polite live region: screen readers read out whatever `announce()` last said. */
export function Announcer() {
  const text = useSyncExternalStore(subscribeAnnouncements, announcement, () => '');
  return (
    <div className={styles.srOnly} role="status" aria-live="polite" aria-atomic="true">
      {text}
    </div>
  );
}
