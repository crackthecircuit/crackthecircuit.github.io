import { evaluateExpr, parseExpression, rowInputs } from '../engine';
import type { Bit, Level } from '../engine';

/**
 * Build a truth-table column from a rule. This is for authoring only: the engine compares the
 * player's circuit against the resulting array and never sees the rule.
 */
function column(inputs: string[], rule: (v: Record<string, Bit>) => boolean): Bit[] {
  return Array.from({ length: 2 ** inputs.length }, (_, i) => (rule(rowInputs(i, inputs)) ? 1 : 0));
}

function level(
  number: number,
  spec: Omit<Level, 'id' | 'number' | 'outputs' | 'expected'> & {
    rule: (v: Record<string, Bit>) => boolean;
  },
): Level {
  const { rule, ...rest } = spec;
  return {
    id: `level-${number}`,
    number,
    outputs: ['Q'],
    expected: { Q: column(spec.inputs, rule) },
    ...rest,
  };
}

/** How many inputs are 1 in a row. */
const onCount = (v: Record<string, Bit>) => Object.values(v).filter((b) => b === 1).length;

/** A level rule taken from a written expression, so the brief and the truth table can never disagree. */
const fromExpression = (src: string) => {
  const expr = parseExpression(src);
  return (v: Record<string, Bit>) => evaluateExpr(expr, v) === 1;
};

const AB = ['A', 'B'];
const ABC = ['A', 'B', 'C'];
const ABCD = ['A', 'B', 'C', 'D'];

export const LEVELS: Level[] = [
  level(1, {
    title: 'Both Switches',
    brief: 'The lamp Q should light only when switch A and switch B are both on.',
    inputs: AB,
    palette: ['AND'],
    par: 1,
    rule: ({ A, B }) => A === 1 && B === 1,
    hints: [
      'Drag the AND gate onto the board, then wire A and B into it and its output into Q.',
      'Q = $AB$',
      'One gate is all you need.',
    ],
  }),
  level(2, {
    title: 'Either Switch',
    brief: 'The lamp Q should light when switch A or switch B (or both) is on.',
    inputs: AB,
    palette: ['OR'],
    par: 1,
    rule: ({ A, B }) => A === 1 || B === 1,
    hints: [
      'Read the truth table: Q is 0 in only one row. Which row is it?',
      'Q = $A + B$',
      'One OR gate, with A and B as its inputs.',
    ],
  }),
  level(3, {
    title: 'Opposite Day',
    brief: 'The lamp Q should be on exactly when switch A is off.',
    inputs: ['A'],
    palette: ['NOT'],
    par: 1,
    rule: ({ A }) => A === 0,
    hints: ['A NOT gate flips its single input: 0 becomes 1, and 1 becomes 0.', "Q = $A'$", 'A → NOT → Q.'],
  }),
  level(4, {
    title: 'Not Both',
    brief: 'Build a NAND: Q is off only when A and B are both on. There is no NAND gate in the palette.',
    inputs: AB,
    palette: ['AND', 'NOT'],
    par: 2,
    rule: ({ A, B }) => !(A === 1 && B === 1),
    hints: [
      'Compare this truth table with level 1. Every output is flipped.',
      "Q = $(AB)'$",
      'Feed the AND gate’s output into a NOT gate.',
    ],
  }),
  level(5, {
    title: 'Neither Switch',
    brief: 'Build a NOR: Q is on only when both switches are off. There is no NOR gate in the palette.',
    inputs: AB,
    palette: ['OR', 'NOT'],
    par: 2,
    rule: ({ A, B }) => !(A === 1 || B === 1),
    hints: [
      'Compare this truth table with level 2. Every output is flipped.',
      "Q = $(A + B)'$",
      'Feed the OR gate’s output into a NOT gate.',
    ],
  }),
  level(6, {
    title: 'Universal Gate',
    brief: 'Build an OR circuit using only NAND gates. NAND can make every other gate.',
    inputs: AB,
    palette: ['NAND'],
    par: 3,
    rule: ({ A, B }) => A === 1 || B === 1,
    hints: [
      'Wire the same signal into both inputs of a NAND. What does it do then?',
      "Q = $A + B = (A'B')'$ (De Morgan)",
      'Two NANDs act as NOT A and NOT B; a third NAND combines them.',
    ],
  }),
  level(7, {
    title: 'Three-Way Switch',
    brief: 'Q should light when A and B are both on, or when C is on.',
    inputs: ABC,
    palette: ['AND', 'OR', 'NOT'],
    par: 2,
    rule: ({ A, B, C }) => (A === 1 && B === 1) || C === 1,
    hints: [
      'Three inputs means 8 rows. Look at the rows where C = 1 first.',
      'Q = $AB + C$',
      'One AND for A and B, then OR its result with C.',
    ],
  }),
  level(8, {
    title: 'Exactly One',
    brief: 'Build XOR: Q is on when exactly one switch is on, but not both. Beat this to earn the XOR gate.',
    inputs: AB,
    palette: ['AND', 'OR', 'NOT'],
    par: 4,
    unlocksGate: 'XOR',
    rule: ({ A, B }) => A !== B,
    hints: [
      'It’s like OR, except the row where both are on must be 0.',
      "Q = $(A + B)(AB)'$",
      'OR the inputs, NOT the AND of the inputs, then AND those two results.',
    ],
  }),
  level(9, {
    title: 'Odd One Out',
    brief: 'A lamp with three switches: Q lights when an odd number of switches are on.',
    inputs: ABC,
    palette: ['XOR'],
    par: 2,
    rule: (v) => onCount(v) % 2 === 1,
    hints: [
      'XOR is 1 when its two inputs differ, so it tracks whether a count is odd.',
      'Q = $A ⊕ B ⊕ C$',
      'XOR two switches, then XOR the result with the third.',
    ],
  }),
  level(10, {
    title: 'The Vault',
    brief:
      'Three guards each hold a key switch. The vault Q opens only when at least two of the three guards agree to open it.',
    inputs: ABC,
    palette: ['AND', 'OR'],
    par: 4,
    rule: (v) => onCount(v) >= 2,
    hints: [
      'List the pairs of guards that could open it together. Any one pair is enough.',
      'Q = $AB + AC + BC$',
      'Factor it: $A(B + C) + BC$ needs just four gates.',
    ],
  }),
  level(11, {
    title: 'Four-Key Lock',
    brief: 'Four switches, 16 rows. Q should light only when all four switches A, B, C and D are on.',
    inputs: ABCD,
    palette: ['AND'],
    par: 3,
    rule: (v) => onCount(v) === 4,
    hints: [
      'Each AND only takes two inputs. How can one AND’s result feed into the next?',
      'Q = $ABCD$',
      'Chain three ANDs: $AB$, then with C, then with D.',
    ],
  }),
  level(12, {
    title: 'Any Alarm',
    brief:
      'Gates can now take more inputs: select a gate and press + to widen it. Q should light when any of the four sensors is on.',
    inputs: ABCD,
    palette: ['OR'],
    maxGateInputs: 4,
    par: 1,
    rule: (v) => onCount(v) > 0,
    hints: [
      'An OR with more inputs is 1 when any of them is 1.',
      'Q = $A + B + C + D$',
      'Place one OR, select it, and press + twice to give it four inputs.',
    ],
  }),
  level(13, {
    title: 'Two Pairs',
    brief: 'Q should light when both A and B are on, or both C and D are on.',
    inputs: ABCD,
    palette: ['AND', 'OR'],
    maxGateInputs: 4,
    par: 3,
    rule: ({ A, B, C, D }) => (A === 1 && B === 1) || (C === 1 && D === 1),
    hints: [
      'Treat each pair separately, then combine the two answers.',
      'Q = $AB + CD$',
      'One AND per pair, then one OR. Wider gates won’t help here.',
    ],
  }),
  level(14, {
    title: 'Even Count',
    brief: 'Q should light when an even number of the four switches are on (none counts as even).',
    inputs: ABCD,
    palette: ['XOR', 'NOT'],
    maxGateInputs: 4,
    par: 2,
    rule: (v) => onCount(v) % 2 === 0,
    hints: [
      'A wide XOR is 1 when an odd number of its inputs are 1.',
      "Q = $(A ⊕ B ⊕ C ⊕ D)'$",
      'One 4-input XOR, then a NOT.',
    ],
  }),
  level(15, {
    title: 'Security System',
    brief:
      'A is the arm switch, B the door sensor, C the window sensor and D maintenance mode. The siren Q sounds when the system is armed, the door or window opens, and maintenance mode is off.',
    inputs: ABCD,
    palette: ['AND', 'OR', 'NOT'],
    maxGateInputs: 3,
    par: 3,
    rule: ({ A, B, C, D }) => A === 1 && (B === 1 || C === 1) && D === 0,
    hints: [
      'Three conditions must all hold at once. Write each one as its own signal first.',
      "Q = $A(B + C)D'$",
      'An OR for door/window and a NOT for maintenance, then one 3-input AND joins all three.',
    ],
  }),
  level(16, {
    title: 'Smart Lamp',
    brief:
      'B is the lamp switch. To save power, the lamp Q turns itself off when the curtains are open (A) and it is daytime (C).',
    inputs: ABC,
    palette: ['AND', 'OR', 'NOT'],
    maxGateInputs: 3,
    par: 3,
    rule: fromExpression("B(AC)'"),
    hints: [
      'The lamp needs B on. In which case is it switched off even though B is on?',
      "Q = $B(AC)' = A'BC' + A'BC + ABC'$",
      'AND A with C, NOT it, then AND with B: three gates.',
    ],
  }),
  level(17, {
    title: 'Selector Switch',
    brief: 'B chooses which sensor reaches the output: when B is 0, Q copies A; when B is 1, Q copies C.',
    inputs: ABC,
    palette: ['AND', 'OR', 'NOT'],
    par: 4,
    rule: fromExpression("AB' + BC"),
    hints: [
      'Handle the two cases separately (B = 0 and B = 1), then combine them.',
      "Q = $AB' + BC = (A + B)(B' + C)$",
      'One NOT for B, an AND for each case, then an OR.',
    ],
  }),
  level(18, {
    title: 'Vending Machine',
    brief:
      'D is the power switch, C is card mode, B is a coin and A is a card tap. The machine dispenses (Q) when it is powered and either a coin is inserted with card mode off, or a card is tapped with card mode on.',
    inputs: ABCD,
    palette: ['AND', 'OR', 'NOT'],
    maxGateInputs: 3,
    par: 4,
    rule: fromExpression("BC'D + ACD"),
    hints: [
      'Card mode C decides whether the coin (B) or the card (A) matters. Write one product term per mode; both need D.',
      "Q = $BC'D + ACD$",
      'One NOT for C, two 3-input ANDs, one OR. On a K-map these are two groups of two.',
    ],
  }),
];

export const getLevel = (id: string) => LEVELS.find((l) => l.id === id);
