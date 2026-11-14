import type { KeyboardEvent } from 'react';
import { Button } from '../components/ui/Button';
import { Stars } from '../components/ui/Stars';
import { LEVELS } from '../levels/levels';
import { useAppStore } from '../store/appStore';
import { useProgressStore } from '../store/progressStore';
import styles from './LevelMap.module.css';

const W = 1040;
const H = 640;
const CHIP_W = 156;
const CHIP_H = 96;
const PER_ROW = 5;
const COLUMNS = [130, 325, 520, 715, 910];
const ROWS = [110, 320, 530];
/** How far traces swing past the chips when wrapping to the next row. */
const WRAP = 40;

/** Levels snake across the board: row 1 left to right, row 2 right to left, row 3 left to right. */
function chipCenter(index: number) {
  const row = Math.floor(index / PER_ROW);
  const col = row % 2 === 0 ? index % PER_ROW : PER_ROW - 1 - (index % PER_ROW);
  return { x: COLUMNS[col]!, y: ROWS[row]! };
}

/** 1 when a row runs left to right, -1 when it runs right to left. */
const rowDirection = (index: number) => (Math.floor(index / PER_ROW) % 2 === 0 ? 1 : -1);

/** Circuit-board trace from one chip to the next, wrapping around the side between rows. */
function tracePath(from: number, to: number) {
  const a = chipCenter(from);
  const b = chipCenter(to);
  if (a.y === b.y) {
    const dir = Math.sign(b.x - a.x);
    return `M ${a.x + (dir * CHIP_W) / 2} ${a.y} H ${b.x - (dir * CHIP_W) / 2}`;
  }
  const side = rowDirection(from);
  const edge = a.x + (side * CHIP_W) / 2;
  return `M ${edge} ${a.y} H ${edge + side * WRAP} V ${b.y} H ${b.x + (side * CHIP_W) / 2}`;
}

export function LevelMap() {
  const go = useAppStore((s) => s.go);
  const stars = useProgressStore((s) => s.stars);
  const isUnlocked = useProgressStore((s) => s.isUnlocked);
  const resetProgress = useProgressStore((s) => s.resetProgress);
  const total = Object.values(stars).reduce((a, b) => a + b, 0);
  const nextId = LEVELS.find((l) => isUnlocked(l.id) && !stars[l.id])?.id;

  const open = (levelId: string) => isUnlocked(levelId) && go({ name: 'level', levelId });
  const onKey = (e: KeyboardEvent, levelId: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      open(levelId);
    }
  };

  return (
    <main className={styles.screen}>
      <header className={styles.header}>
        <Button variant="ghost" onClick={() => go({ name: 'title' })}>
          ← Title
        </Button>
        <h1 className={styles.title}>Levels</h1>
        <span className={styles.total}>
          <Stars count={3} size={14} label="Stars" /> {total}/{LEVELS.length * 3}
        </span>
      </header>

      <div className={styles.boardWrap}>
        <svg className={styles.board} viewBox={`0 0 ${W} ${H}`} role="group" aria-label="Level map">
          {/* Power comes in from the left; the last trace runs out to the finish lamp. */}
          <path className={styles.trace} data-lit d={`M 0 ${ROWS[0]} H ${COLUMNS[0]! - CHIP_W / 2}`} />
          {(() => {
            const lastIndex = LEVELS.length - 1;
            const last = chipCenter(lastIndex);
            const dir = rowDirection(lastIndex);
            const lit = stars[LEVELS[lastIndex]!.id] ? true : undefined;
            const lampX = dir > 0 ? W - 22 : 22;
            return (
              <>
                <path
                  className={styles.trace}
                  data-lit={lit}
                  d={`M ${last.x + (dir * CHIP_W) / 2} ${last.y} H ${lampX - dir * 12}`}
                />
                <circle className={styles.vault} data-lit={lit} cx={lampX} cy={last.y} r={12} />
              </>
            );
          })()}

          {LEVELS.slice(0, -1).map((l, i) => (
            <path
              key={`t${i}`}
              className={styles.trace}
              data-lit={stars[l.id] ? true : undefined}
              d={tracePath(i, i + 1)}
            />
          ))}

          {LEVELS.map((level, i) => {
            const c = chipCenter(i);
            const unlocked = isUnlocked(level.id);
            const done = !!stars[level.id];
            const state = done ? 'done' : unlocked ? 'open' : 'locked';
            return (
              <g
                key={level.id}
                className={styles.chip}
                data-state={state}
                data-next={level.id === nextId || undefined}
                role="button"
                tabIndex={unlocked ? 0 : -1}
                aria-disabled={!unlocked}
                aria-label={`Level ${level.number}: ${level.title}${unlocked ? '' : ' (locked)'}${done ? `, ${stars[level.id]} stars` : ''}`}
                onClick={() => open(level.id)}
                onKeyDown={(e) => onKey(e, level.id)}
              >
                {/* IC pins */}
                {[-48, -16, 16, 48].map((dx) => (
                  <g key={dx} className={styles.pins}>
                    <line x1={c.x + dx} y1={c.y - CHIP_H / 2 - 7} x2={c.x + dx} y2={c.y - CHIP_H / 2} />
                    <line x1={c.x + dx} y1={c.y + CHIP_H / 2} x2={c.x + dx} y2={c.y + CHIP_H / 2 + 7} />
                  </g>
                ))}
                <rect
                  className={styles.chipBody}
                  x={c.x - CHIP_W / 2}
                  y={c.y - CHIP_H / 2}
                  width={CHIP_W}
                  height={CHIP_H}
                  rx={10}
                />
                <text className={styles.chipNumber} x={c.x - CHIP_W / 2 + 14} y={c.y - CHIP_H / 2 + 22}>
                  {String(level.number).padStart(2, '0')}
                </text>
                <text className={styles.chipTitle} x={c.x} y={c.y + 6}>
                  {level.title}
                </text>
                {state === 'locked' ? (
                  <text className={styles.chipStatus} x={c.x} y={c.y + 32}>
                    LOCKED
                  </text>
                ) : (
                  <foreignObject x={c.x - 40} y={c.y + 17} width={80} height={22}>
                    <div className={styles.chipStars}>
                      <Stars count={stars[level.id] ?? 0} size={15} />
                    </div>
                  </foreignObject>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      <footer className={styles.footer}>
        <Button
          variant="ghost"
          disabled={total === 0}
          onClick={() => {
            if (window.confirm('Reset all progress? Your stars and saved circuits will be erased.'))
              resetProgress();
          }}
        >
          Reset progress
        </Button>
      </footer>
    </main>
  );
}
