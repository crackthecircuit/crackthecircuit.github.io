import type { GateType } from '../../engine';
import { gateHeightFor, inputPortYs } from '../../lib/geometry';

// IEEE distinctive-shape gate symbols, drawn for an 80×60 box and stretched vertically for wider gates.
// Inputs enter at the left edge; the output leaves at (80, height / 2).

const AND_BODY = 'M16 6 H40 A24 24 0 0 1 40 54 H16 Z';
const NAND_BODY = 'M16 6 H36 A24 24 0 0 1 36 54 H16 Z';
const OR_BODY = 'M12 6 Q32 6 48 15 Q60 22 66 30 Q60 38 48 45 Q32 54 12 54 Q24 30 12 6 Z';
const NOR_BODY = 'M12 6 Q30 6 44 15 Q55 22 60 30 Q55 38 44 45 Q30 54 12 54 Q24 30 12 6 Z';
const XOR_BODY = 'M18 6 Q36 6 50 15 Q61 22 66 30 Q61 38 50 45 Q36 54 18 54 Q30 30 18 6 Z';
const XOR_BACK = 'M10 54 Q22 30 10 6';
const NOT_BODY = 'M18 10 L56 30 L18 50 Z';

interface Shape {
  body: string;
  extra?: string;
  bubble?: { cx: number };
  /** x where input stubs end. The body's fill covers any overlap with a curved back. */
  inX: number;
  /** x where the output stub starts. */
  outX: number;
}

const SHAPES: Record<GateType, Shape> = {
  AND: { body: AND_BODY, inX: 16, outX: 64 },
  NAND: { body: NAND_BODY, bubble: { cx: 64 }, inX: 16, outX: 68 },
  OR: { body: OR_BODY, inX: 18, outX: 66 },
  NOR: { body: NOR_BODY, bubble: { cx: 64 }, inX: 18, outX: 68 },
  XOR: { body: XOR_BODY, extra: XOR_BACK, inX: 13, outX: 66 },
  NOT: { body: NOT_BODY, bubble: { cx: 60 }, inX: 18, outX: 64 },
};

export function GateShape({ type, inputs = type === 'NOT' ? 1 : 2 }: { type: GateType; inputs?: number }) {
  const s = SHAPES[type];
  const height = gateHeightFor(inputs);
  const mid = height / 2;
  const stretch = height / 60;
  return (
    <g>
      {inputPortYs(inputs).map((y) => (
        <line key={y} data-part="stub" x1={0} y1={y} x2={s.inX} y2={y} />
      ))}
      <line data-part="stub" x1={s.outX} y1={mid} x2={80} y2={mid} />
      <g transform={stretch === 1 ? undefined : `scale(1 ${stretch})`}>
        {s.extra && <path data-part="extra" d={s.extra} vectorEffect="non-scaling-stroke" />}
        <path data-part="body" d={s.body} vectorEffect="non-scaling-stroke" />
      </g>
      {s.bubble && <circle data-part="body" cx={s.bubble.cx} cy={mid} r={4} />}
    </g>
  );
}
