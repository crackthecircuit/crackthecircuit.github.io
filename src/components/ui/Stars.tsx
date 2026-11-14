import styles from './Stars.module.css';

/** Three star slots, `count` of them lit. */
export function Stars({ count, size = 16, label }: { count: number; size?: number; label?: string }) {
  return (
    <span className={styles.stars} role="img" aria-label={label ?? `${count} of 3 stars`}>
      {[1, 2, 3].map((i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" data-on={i <= count || undefined}>
          <path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z" />
        </svg>
      ))}
    </span>
  );
}
