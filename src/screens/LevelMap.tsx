import { useEffect, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Button } from '../components/ui/Button';
import { Stars } from '../components/ui/Stars';
import { LEVELS } from '../levels/levels';
import { useMediaQuery } from '../lib/useMediaQuery';
import { useAppStore } from '../store/appStore';
import { useProgressStore } from '../store/progressStore';
import styles from './LevelMap.module.css';

const CHIP_W = 140;
const CHIP_H = 96;
/** How far traces swing past the chips when wrapping to the next row. */
const WRAP = 40;

/** How the chips are laid out: six to a row, or three on a phone. */
interface MapLayout {
  width: number;
  height: number;
  perRow: number;
  columns: number[];
  rows: number[];
}

/**
 * The side margin keeps the wrap traces and the finish lamp inside the drawing when it fills the screen edge to
 * edge (upright tablets, phones), where anything past the viewBox is cut off.
 */
function mapLayout(perRow: number, rowGap: number, margin: number): MapLayout {
  const columns = Array.from({ length: perRow }, (_, i) => margin + i * 168);
  const rowCount = Math.ceil(LEVELS.length / perRow);
  const rows = Array.from({ length: rowCount }, (_, i) => 110 + i * rowGap);
  return { width: columns[perRow - 1]! + margin, height: rows[rowCount - 1]! + 110, perRow, columns, rows };
}

const WIDE = mapLayout(6, 210, 112);
const NARROW = mapLayout(3, 190, 120);
/** Where six chips to a row would shrink their text past reading (keep in step with LevelMap.module.css). */
const NARROW_MAP = '(max-width: 640px)';

/** Levels snake across the board: the first row left to right, the next right to left, and so on. */
function chipCenter(m: MapLayout, index: number) {
  const row = Math.floor(index / m.perRow);
  const col = row % 2 === 0 ? index % m.perRow : m.perRow - 1 - (index % m.perRow);
  return { x: m.columns[col]!, y: m.rows[row]! };
}

/** 1 when a row runs left to right, -1 when it runs right to left. */
const rowDirection = (m: MapLayout, index: number) => (Math.floor(index / m.perRow) % 2 === 0 ? 1 : -1);

/** Circuit-board trace from one chip to the next, wrapping around the side between rows. */
function tracePath(m: MapLayout, from: number, to: number) {
  const a = chipCenter(m, from);
  const b = chipCenter(m, to);
  if (a.y === b.y) {
    const dir = Math.sign(b.x - a.x);
    return `M ${a.x + (dir * CHIP_W) / 2} ${a.y} H ${b.x - (dir * CHIP_W) / 2}`;
  }
  const side = rowDirection(m, from);
  const edge = a.x + (side * CHIP_W) / 2;
  return `M ${edge} ${a.y} H ${edge + side * WRAP} V ${b.y} H ${b.x + (side * CHIP_W) / 2}`;
}

/** Level ids that were completed when the map was last shown, so the next visit can animate what changed. */
let lastCompleted: Set<string> | null = null;

export function LevelMap() {
  const go = useAppStore((s) => s.go);
  const stars = useProgressStore((s) => s.stars);
  // Levels completed since the map was last shown: their trace lights up and the chip after them unlocks.
  const [fresh] = useState(() => {
    const ids = new Set<string>();
    if (lastCompleted)
      for (const id of Object.keys(stars)) if (stars[id] && !lastCompleted.has(id)) ids.add(id);
    return ids;
  });
  useEffect(() => {
    lastCompleted = new Set(Object.keys(stars).filter((id) => stars[id]));
  }, [stars]);
  const isUnlocked = useProgressStore((s) => s.isUnlocked);
  const resetProgress = useProgressStore((s) => s.resetProgress);
  const total = Object.values(stars).reduce((a, b) => a + b, 0);
  const nextId = LEVELS.find((l) => isUnlocked(l.id) && !stars[l.id])?.id;
  const m = useMediaQuery(NARROW_MAP) ? NARROW : WIDE;

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
        <span className={styles.total} role="img" aria-label={`${total} of ${LEVELS.length * 3} stars`}>
          <Stars count={3} size={14} label="" /> {total}/{LEVELS.length * 3}
        </span>
      </header>

      <div className={styles.boardWrap}>
        <svg className={styles.board} viewBox={`0 0 ${m.width} ${m.height}`} role="group" aria-label="Level map">
          {/* Power comes in from the left; the last trace runs out to the finish lamp. */}
          <path className={styles.trace} data-lit d={`M 0 ${m.rows[0]} H ${m.columns[0]! - CHIP_W / 2}`} />
          {(() => {
            const lastIndex = LEVELS.length - 1;
            const last = chipCenter(m, lastIndex);
            const dir = rowDirection(m, lastIndex);
            const lit = stars[LEVELS[lastIndex]!.id] ? true : undefined;
            const lampX = dir > 0 ? m.width - 22 : 22;
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
              data-fresh={fresh.has(l.id) || undefined}
              d={tracePath(m, i, i + 1)}
            />
          ))}

          {LEVELS.map((level, i) => {
            const c = chipCenter(m, i);
            const unlocked = isUnlocked(level.id);
            const done = !!stars[level.id];
            const state = done ? 'done' : unlocked ? 'open' : 'locked';
            return (
              <g
                key={level.id}
                className={styles.chip}
                data-state={state}
                data-next={level.id === nextId || undefined}
                data-fresh={(i > 0 && fresh.has(LEVELS[i - 1]!.id)) || undefined}
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
