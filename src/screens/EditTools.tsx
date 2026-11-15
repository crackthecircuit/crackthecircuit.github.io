import type { ReactNode } from 'react';
import { Button } from '../components/ui/Button';
import { DeleteIcon, RedoIcon, ResetIcon, UndoIcon } from '../components/ui/icons';
import { useCircuitStore } from '../store/circuitStore';
import styles from './LevelScreen.module.css';

/** Undo, Redo, Delete and Reset as icon buttons in the toolbar; each has a tooltip naming it and its shortcut. */
export function EditTools({ locked = false, onReset }: { locked?: boolean; onReset: () => void }) {
  const hasSelection = useCircuitStore((s) => s.selection !== null);
  const canUndo = useCircuitStore((s) => s.past.length > 0);
  const canRedo = useCircuitStore((s) => s.future.length > 0);
  const tool = (
    label: string,
    tip: string,
    icon: ReactNode,
    disabled: boolean,
    onClick: () => void,
  ) => (
    <Button
      variant="ghost"
      className={styles.iconButton}
      aria-label={label}
      title={tip}
      disabled={disabled}
      onClick={onClick}
    >
      {icon}
    </Button>
  );
  const store = useCircuitStore.getState;
  return (
    <div className={styles.tools}>
      {tool('Undo', 'Undo (Ctrl+Z)', <UndoIcon />, locked || !canUndo, () => store().undo())}
      {tool('Redo', 'Redo (Ctrl+Shift+Z)', <RedoIcon />, locked || !canRedo, () => store().redo())}
      {tool(
        'Delete',
        'Delete the selected gate or wire (Delete)',
        <DeleteIcon />,
        locked || !hasSelection,
        () => store().removeSelection(),
      )}
      {tool('Reset', 'Reset: clear the board (undoable)', <ResetIcon />, locked, onReset)}
    </div>
  );
}
