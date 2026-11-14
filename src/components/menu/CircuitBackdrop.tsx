import { memo } from 'react';
import styles from './CircuitBackdrop.module.css';

// A circuit board that "powers on" behind the main menu: traces draw themselves in, then amber
// signals pulse along them. Generated from a fixed seed so it looks the same on every visit.

const W = 1600;
const H = 900;
const CELL = 40;

/** Small deterministic random generator (mulberry32). */
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Trace {
  d: string;
  end: { x: number; y: number };
  pulse?: { duration: number; delay: number };
}

interface Chip {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** PCB-style traces: orthogonal runs with 45° chamfers at the corners, ending in a via. */
function generate(): { traces: Trace[]; chips: Chip[] } {
  const rand = rng(1302);
  const chips: Chip[] = [
    { x: 1040, y: 200, w: 200, h: 120 },
    { x: 1200, y: 560, w: 160, h: 100 },
    { x: 760, y: 640, w: 120, h: 80 },
  ];
  const traces: Trace[] = [];
  const snap = (v: number) => Math.round(v / CELL) * CELL;

  for (let i = 0; i < 34; i++) {
    // Start on a chip edge (pins) or anywhere on the board.
    const chip = chips[i % chips.length]!;
    const fromChip = i < 18;
    let x = fromChip ? snap(chip.x + rand() * chip.w) : snap(rand() * W);
    let y = fromChip ? (rand() < 0.5 ? chip.y : chip.y + chip.h) : snap(rand() * H);
    let dir = fromChip ? (y === chip.y ? 3 : 1) : Math.floor(rand() * 4); // 0 → 1 ↓ 2 ← 3 ↑
    const points = [{ x, y }];
    const turns = 2 + Math.floor(rand() * 4);
    for (let t = 0; t < turns; t++) {
      const len = CELL * (2 + Math.floor(rand() * 6));
      const dx = [1, 0, -1, 0][dir]!;
      const dy = [0, 1, 0, -1][dir]!;
      x += dx * len;
      y += dy * len;
      points.push({ x, y });
      dir = (dir + (rand() < 0.5 ? 1 : 3)) % 4; // turn left or right
    }
    // Chamfer every corner by 12 units so the traces look etched rather than drawn.
    let d = `M ${points[0]!.x} ${points[0]!.y}`;
    for (let p = 1; p < points.length; p++) {
      const prev = points[p - 1]!;
      const cur = points[p]!;
      const next = points[p + 1];
      if (!next) {
        d += ` L ${cur.x} ${cur.y}`;
        continue;
      }
      const c = 12;
      const inX = cur.x - Math.sign(cur.x - prev.x) * c;
      const inY = cur.y - Math.sign(cur.y - prev.y) * c;
      const outX = cur.x + Math.sign(next.x - cur.x) * c;
      const outY = cur.y + Math.sign(next.y - cur.y) * c;
      d += ` L ${inX} ${inY} L ${outX} ${outY}`;
    }
    traces.push({
      d,
      end: points.at(-1)!,
      pulse: rand() < 0.6 ? { duration: 3 + rand() * 5, delay: 1.2 + rand() * 6 } : undefined,
    });
  }
  return { traces, chips };
}

const BOARD = generate();

export const CircuitBackdrop = memo(function CircuitBackdrop() {
  return (
    <svg
      className={styles.backdrop}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      {BOARD.traces.map((t, i) => (
        <g key={i}>
          <path
            className={styles.trace}
            d={t.d}
            pathLength={1000}
            style={{ animationDelay: `${(i % 12) * 60}ms` }}
          />
          <circle className={styles.via} cx={t.end.x} cy={t.end.y} r={5} />
          {t.pulse && (
            <path
              className={styles.pulse}
              d={t.d}
              pathLength={1000}
              style={{ animationDuration: `${t.pulse.duration}s`, animationDelay: `${t.pulse.delay}s` }}
            />
          )}
        </g>
      ))}
      {BOARD.chips.map((c, i) => (
        <g key={i} className={styles.chip}>
          <rect x={c.x} y={c.y} width={c.w} height={c.h} rx={8} />
          {Array.from({ length: Math.floor(c.w / 40) }, (_, p) => (
            <g key={p}>
              <line x1={c.x + 20 + p * 40} y1={c.y - 8} x2={c.x + 20 + p * 40} y2={c.y} />
              <line x1={c.x + 20 + p * 40} y1={c.y + c.h} x2={c.x + 20 + p * 40} y2={c.y + c.h + 8} />
            </g>
          ))}
        </g>
      ))}
    </svg>
  );
});
