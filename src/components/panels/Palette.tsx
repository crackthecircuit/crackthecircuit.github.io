import { forwardRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { GateType } from '../../engine';
import { GateShape } from '../board/GateShape';
import styles from './Palette.module.css';

const DESCRIPTIONS: Record<GateType, string> = {
  AND: '1 when all inputs are 1',
  OR: '1 when any input is 1',
  NOT: 'Flips its input',
  NAND: 'NOT of AND',
  NOR: 'NOT of OR',
  XOR: '1 when an odd number of inputs are 1',
};

interface PaletteProps {
  gates: GateType[];
  /** A gate is being dragged over the palette and will be deleted on release. */
  deleteHover: boolean;
  disabled?: boolean;
  onGatePointerDown: (type: GateType, event: ReactPointerEvent) => void;
  /** Enter/Space on a gate button (pointer clicks go through onGatePointerDown). */
  onGateActivate: (type: GateType) => void;
}

export const Palette = forwardRef<HTMLElement, PaletteProps>(function Palette(props, ref) {
  const { gates, deleteHover, disabled, onGatePointerDown, onGateActivate } = props;
  return (
    <section
      ref={ref}
      className={styles.palette}
      data-delete={deleteHover || undefined}
      aria-label="Gate palette"
    >
      <h2 className={styles.heading}>Gates</h2>
      <ul className={styles.list}>
        {gates.map((type) => (
          <li key={type}>
            <button
              type="button"
              className={styles.item}
              disabled={disabled}
              onPointerDown={(e) => e.button === 0 && onGatePointerDown(type, e)}
              onClick={(e) => e.detail === 0 && onGateActivate(type)} // keyboard only
              aria-label={`${type} gate: ${DESCRIPTIONS[type]}. Drag onto the board, or press to add`}
            >
              <svg className={styles.icon} viewBox="0 0 80 60" aria-hidden>
                <GateShape type={type} />
              </svg>
              <span className={styles.text}>
                <span className={styles.name}>{type}</span>
                <span className={styles.desc}>{DESCRIPTIONS[type]}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <p className={styles.tip}>Drag onto the board, or click or tap to add.</p>
      <div className={styles.deleteZone} aria-hidden>
        Drop to delete
      </div>
    </section>
  );
});
