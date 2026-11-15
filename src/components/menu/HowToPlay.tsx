import { useEffect, useRef } from 'react';
import { GateShape } from '../board/GateShape';
import { Button } from '../ui/Button';
import { COARSE_POINTER, useMediaQuery } from '../../lib/useMediaQuery';
import styles from './HowToPlay.module.css';

/** On a touch screen, the same help as gestures. */
const GESTURES: [string, string][] = [
  ['Tap a gate', 'In the palette (or the Gates tray): add it'],
  ['Drag', 'Move a gate, or draw a wire from port to port'],
  ['Tap, tap', 'Wire one port to another without dragging'],
  ['Hold', 'On a gate or wire: Delete'],
  ['Pinch', 'Zoom the board'],
  ['Drag empty board', 'Pan around'],
  ['Double tap', 'Zoom in there'],
  ['Two-finger tap', 'Zoom out'],
  ['← A  Q →', 'Edge markers: tap to find a switch or lamp'],
];

const SHORTCUTS: [string, string][] = [
  ['Space', 'Run the circuit'],
  ['Delete', 'Remove the selected gate or wire'],
  ['Ctrl + Z', 'Undo'],
  ['Ctrl + Shift + Z', 'Redo'],
  ['+ / −', 'More or fewer inputs on the selected gate'],
  ['Arrows', 'Move the selected gate (Shift for bigger steps)'],
  ['Tab, Enter', 'Keyboard wiring: Enter on one port, then on another'],
  ['Esc', 'Cancel the wire you are drawing'],
  ['Scroll / pinch', 'Zoom the board; drag empty board to pan'],
  ['M', 'Sound on or off'],
];

/** Controls and rules, shown from the main menu and from inside a level. Uses a native modal dialog. */
export function HowToPlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const touch = useMediaQuery(COARSE_POINTER);
  const help = touch ? GESTURES : SHORTCUTS;

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) {
      // Play the exit animation, then really close.
      dialog.dataset.closing = 'true';
      const t = window.setTimeout(() => {
        delete dialog.dataset.closing;
        if (dialog.open) dialog.close();
      }, 160);
      return () => {
        window.clearTimeout(t);
        delete dialog.dataset.closing;
      };
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby="how-to-play-title"
      onClose={onClose}
      onCancel={(e) => {
        // Esc: let the parent close it so the exit animation can play.
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()} // click outside the panel
    >
      <div className={styles.panel}>
        <header className={styles.header}>
          <h2 id="how-to-play-title">How to play</h2>
          <Button variant="ghost" onClick={onClose} aria-label="Close">
            ✕
          </Button>
        </header>

        <ol className={styles.steps}>
          <li>
            <span className={styles.stepNumber}>1</span>
            <div>
              <h3>Read the truth table</h3>
              <p>
                Each level lists every combination of the switches and what the output Q must be for each one.
              </p>
            </div>
          </li>
          <li>
            <span className={styles.stepNumber}>2</span>
            <div>
              <h3>Build</h3>
              <p>
                Drag gates from the palette onto the board, or click (or tap) one to drop it in. Drag from one
                port to another to wire them (or click one port, then the other). Drag a wire’s end away to
                disconnect it. On a touch screen, pinch to zoom and hold a gate or wire to delete it.
              </p>
              <svg className={styles.gates} viewBox="0 0 280 60" aria-hidden>
                {(['AND', 'OR', 'NOT'] as const).map((type, i) => (
                  <g key={type} transform={`translate(${i * 100} 0)`}>
                    <GateShape type={type} />
                  </g>
                ))}
              </svg>
            </div>
          </li>
          <li>
            <span className={styles.stepNumber}>3</span>
            <div>
              <h3>Run and debug</h3>
              <p>
                Press <kbd>Space</kbd> or ▶ Run to test every row. Click any row to light up its signals on
                the board: amber wires carry a 1. Incomplete circuits won’t run; the problem parts pulse red.
              </p>
            </div>
          </li>
          <li>
            <span className={styles.stepNumber}>4</span>
            <div>
              <h3>Crack it in style</h3>
              <p>
                Passing every row earns ★. Each level shows how many gates earn ★★★: use that many or fewer.
                Up to two gates more earns ★★. Stuck? Each level has three hints.
              </p>
            </div>
          </li>
        </ol>

        <h3 className={styles.shortcutsTitle}>{touch ? 'Gestures' : 'Shortcuts'}</h3>
        <dl className={styles.shortcuts}>
          {help.map(([keys, action]) => (
            <div key={keys}>
              <dt>
                <kbd>{keys}</kbd>
              </dt>
              <dd>{action}</dd>
            </div>
          ))}
        </dl>
      </div>
    </dialog>
  );
}
