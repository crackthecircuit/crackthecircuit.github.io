import type { GateType } from '../../engine';

// IEEE distinctive-shape gate symbols in an 80×60 local box.
// Inputs enter at the left edge (y = 20 / 40, or 30 for NOT); the output leaves at (80, 30).

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
  /** x where the input stubs meet the body. */
  inX: number;
  /** x where the output stub starts. */
  outX: number;
  inputs: number[];
}

const SHAPES: Record<GateType, Shape> = {
  AND: { body: AND_BODY, inX: 16, outX: 64, inputs: [20, 40] },
  NAND: { body: NAND_BODY, bubble: { cx: 64 }, inX: 16, outX: 68, inputs: [20, 40] },
  OR: { body: OR_BODY, inX: 17, outX: 66, inputs: [20, 40] },
  NOR: { body: NOR_BODY, bubble: { cx: 64 }, inX: 17, outX: 68, inputs: [20, 40] },
  XOR: { body: XOR_BODY, extra: XOR_BACK, inX: 15, outX: 66, inputs: [20, 40] },
  NOT: { body: NOT_BODY, bubble: { cx: 60 }, inX: 18, outX: 64, inputs: [30] },
};

export function GateShape({ type, className }: { type: GateType; className?: string }) {
  const s = SHAPES[type];
  return (
    <g className={className}>
      {s.inputs.map((y) => (
        <line key={y} data-part="stub" x1={0} y1={y} x2={s.inX} y2={y} />
      ))}
      <line data-part="stub" x1={s.outX} y1={30} x2={80} y2={30} />
      {s.extra && <path data-part="extra" d={s.extra} />}
      <path data-part="body" d={s.body} />
      {s.bubble && <circle data-part="body" cx={s.bubble.cx} cy={30} r={4} />}
    </g>
  );
}
