import { evaluateExpr, parseExpression, rowInputs } from '../engine';
import type { Bit, GateType, Level } from '../engine';

/**
 * Build a truth-table column from a rule. This is for authoring only: the engine compares the
 * player's circuit against the resulting array and never sees the rule.
 */
function column(inputs: string[], rule: (v: Record<string, Bit>) => boolean): Bit[] {
  return Array.from({ length: 2 ** inputs.length }, (_, i) => (rule(rowInputs(i, inputs)) ? 1 : 0));
}

type LevelSpec = Omit<Level, 'id' | 'number' | 'outputs' | 'expected' | 'palette'> & {
  /** A fixed palette, or 'toolbox': the basic gates plus every gate earned in an earlier level. */
  palette: GateType[] | 'toolbox';
  rule: (v: Record<string, Bit>) => boolean;
};

/** Gates every player starts with. NAND, NOR and XOR are earned by building them. */
export const BASIC_GATES: GateType[] = ['AND', 'OR', 'NOT'];

/** Number the levels in order and resolve each 'toolbox' palette from the gates earned before it. */
function buildLevels(specs: [id: string, spec: LevelSpec][]): Level[] {
  const earned: GateType[] = [...BASIC_GATES];
  return specs.map(([id, { rule, palette, ...rest }], i) => {
    const level: Level = {
      id,
      number: i + 1,
      outputs: ['Q'],
      expected: { Q: column(rest.inputs, rule) },
      palette: palette === 'toolbox' ? [...earned] : palette,
      ...rest,
    };
    if (rest.unlocksGate && !earned.includes(rest.unlocksGate)) earned.push(rest.unlocksGate);
    return level;
  });
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

/**
 * Levels in play order. Chapters: basics (1–3), build a gate to earn it (4–7), use what you earned (8–14),
 * four switches and wide gates (15–20), real circuits (21–25). Par assumes the player uses the gates they earned.
 */
export const LEVELS: Level[] = buildLevels([
  // ---------- Basics ----------
  [
    'both-switches',
    {
      title: 'Both Switches',
      brief: 'The lamp Q should light only when switch A and switch B are both ON.',
      inputs: AB,
      palette: ['AND'],
      par: 1,
      rule: ({ A, B }) => A === 1 && B === 1,
      hints: [
        'Drag the AND gate onto the board, then wire A and B into it and its output into Q.',
        'Q = $AB$',
        'One gate is all you need.',
      ],
    },
  ],
  [
    'either-switch',
    {
      title: 'Either Switch',
      brief: 'The lamp Q should light when switch A or switch B (or both) is ON.',
      inputs: AB,
      palette: ['OR'],
      par: 1,
      rule: ({ A, B }) => A === 1 || B === 1,
      hints: [
        'Read the truth table: Q is 0 in only one row. Which row is it?',
        'Q = $A + B$',
        'One OR gate, with A and B as its inputs.',
      ],
    },
  ],
  [
    'opposite-day',
    {
      title: 'Opposite Day',
      brief: 'The lamp Q should be ON exactly when switch A is OFF.',
      inputs: ['A'],
      palette: ['NOT'],
      par: 1,
      rule: ({ A }) => A === 0,
      hints: ['A NOT gate flips its single input: 0 becomes 1, and 1 becomes 0.', "Q = $A'$", 'A → NOT → Q.'],
    },
  ],

  // ---------- Build it, earn it ----------
  [
    'not-both',
    {
      title: 'Not Both',
      brief:
        'Build a NAND: Q is OFF only when A and B are both ON. There is no NAND gate yet. Beat this to earn it.',
      inputs: AB,
      palette: ['AND', 'NOT'],
      par: 2,
      unlocksGate: 'NAND',
      rule: ({ A, B }) => !(A === 1 && B === 1),
      hints: [
        'Compare this truth table with level 1. Every output is flipped.',
        "Q = $(AB)'$",
        'Feed the AND gate’s output into a NOT gate.',
      ],
    },
  ],
  [
    'neither-switch',
    {
      title: 'Neither Switch',
      brief:
        'Build a NOR: Q is ON only when both switches are OFF. There is no NOR gate yet. Beat this to earn it.',
      inputs: AB,
      palette: ['OR', 'NOT'],
      par: 2,
      unlocksGate: 'NOR',
      rule: ({ A, B }) => !(A === 1 || B === 1),
      hints: [
        'Compare this truth table with level 2. Every output is flipped.',
        "Q = $(A + B)'$",
        'Feed the OR gate’s output into a NOT gate.',
      ],
    },
  ],
  [
    'three-way-switch',
    {
      title: 'Three-Way Switch',
      brief: 'Q should light when A and B are both ON, or when C is ON.',
      inputs: ABC,
      palette: 'toolbox',
      par: 2,
      rule: ({ A, B, C }) => (A === 1 && B === 1) || C === 1,
      hints: [
        'Three inputs means 8 rows. Look at the rows where C = 1 first.',
        'Q = $AB + C$',
        'One AND for A and B, then OR its result with C.',
      ],
    },
  ],
  [
    'exactly-one',
    {
      title: 'Exactly One',
      brief:
        'Build XOR: Q is ON when exactly one switch is ON, but not both. Beat this to earn the XOR gate.',
      inputs: AB,
      palette: 'toolbox',
      par: 3,
      unlocksGate: 'XOR',
      rule: ({ A, B }) => A !== B,
      hints: [
        'It’s like OR, except the row where both are on must be 0. Which gate you earned is 0 only in that row?',
        "Q = $(A + B)(AB)'$",
        'OR the inputs, NAND the inputs, then AND the two results.',
      ],
    },
  ],

  // ---------- Use what you earned ----------
  [
    'matching-switches',
    {
      title: 'Matching Switches',
      brief: 'Q should light when switches A and B are in the same position: both ON, or both OFF.',
      inputs: AB,
      palette: 'toolbox',
      par: 2,
      rule: ({ A, B }) => A === B,
      hints: [
        'Compare this truth table with the one you built in the last level.',
        "Q = $AB + A'B' = (A ⊕ B)'$",
        'XOR, then NOT. Without XOR it takes at least three gates.',
      ],
    },
  ],
  [
    'odd-one-out',
    {
      title: 'Odd One Out',
      brief: 'A lamp with three switches: Q lights when an odd number of switches are ON.',
      inputs: ABC,
      palette: ['XOR'],
      par: 2,
      rule: (v) => onCount(v) % 2 === 1,
      hints: [
        'XOR is 1 when its two inputs differ, so it tracks whether a count is odd.',
        'Q = $A ⊕ B ⊕ C$',
        'XOR two switches, then XOR the result with the third.',
      ],
    },
  ],
  [
    'universal-gate',
    {
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
    },
  ],
  [
    'nor-only',
    {
      title: 'NOR Only',
      brief: 'Now the other way round: build an AND circuit using only NOR gates.',
      inputs: AB,
      palette: ['NOR'],
      par: 3,
      rule: ({ A, B }) => A === 1 && B === 1,
      hints: [
        'A NOR with the same signal on both inputs is a NOT gate, just like NAND was.',
        "Q = $AB = (A' + B')'$ (De Morgan)",
        'Two NORs act as NOT A and NOT B; a third NOR combines them.',
      ],
    },
  ],
  [
    'smart-lamp',
    {
      title: 'Smart Lamp',
      brief:
        'B is the lamp switch. To save power, the lamp Q turns itself OFF when the curtains are open (A) and it is daytime (C).',
      inputs: ABC,
      palette: 'toolbox',
      par: 2,
      rule: fromExpression("B(AC)'"),
      hints: [
        'The lamp needs B on. In which case is it switched off even though B is on?',
        "Q = $B(AC)' = A'BC' + A'BC + ABC'$",
        'One of your earned gates does “AND, then NOT” on its own. AND its result with B.',
      ],
    },
  ],
  [
    'the-vault',
    {
      title: 'The Vault',
      brief:
        'Three guards each hold a key switch. The vault Q opens only when at least two of the three guards agree to open it.',
      inputs: ABC,
      palette: 'toolbox',
      par: 4,
      rule: (v) => onCount(v) >= 2,
      hints: [
        'List the pairs of guards that could open it together. Any one pair is enough.',
        'Q = $AB + AC + BC$',
        'Factor it: $A(B + C) + BC$ needs just four gates.',
      ],
    },
  ],
  [
    'four-key-lock',
    {
      title: 'Four-Key Lock',
      brief: 'Four switches, 16 rows. Q should light only when all four switches A, B, C and D are ON.',
      inputs: ABCD,
      palette: ['AND'],
      par: 3,
      rule: (v) => onCount(v) === 4,
      hints: [
        'Each AND only takes two inputs. How can one AND’s result feed into the next?',
        'Q = $ABCD$',
        'Chain three ANDs: $AB$, then with C, then with D.',
      ],
    },
  ],

  // ---------- Four switches, wide gates ----------
  [
    'any-alarm',
    {
      title: 'Any Alarm',
      brief:
        'Gates can now take more inputs: select a gate and press + to widen it. Q should light when any of the four sensors is ON.',
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
    },
  ],
  [
    'silent-room',
    {
      title: 'Silent Room',
      brief: 'The all-clear light Q is ON only when none of the four motion sensors detects anything.',
      inputs: ABCD,
      palette: 'toolbox',
      maxGateInputs: 4,
      par: 1,
      rule: (v) => onCount(v) === 0,
      hints: [
        'This is the last level flipped: Q is 1 in exactly one row.',
        "Q = $(A + B + C + D)'$",
        'One earned gate, widened to four inputs.',
      ],
    },
  ],
  [
    'two-pairs',
    {
      title: 'Two Pairs',
      brief: 'Q should light when both A and B are ON, or both C and D are ON.',
      inputs: ABCD,
      palette: 'toolbox',
      maxGateInputs: 4,
      par: 3,
      rule: ({ A, B, C, D }) => (A === 1 && B === 1) || (C === 1 && D === 1),
      hints: [
        'Treat each pair separately, then combine the two answers.',
        'Q = $AB + CD$',
        'One AND per pair, then one OR. Wider gates won’t help here.',
      ],
    },
  ],
  [
    'even-count',
    {
      title: 'Even Count',
      brief: 'Q should light when an even number of the four switches are ON (none counts as even).',
      inputs: ABCD,
      palette: 'toolbox',
      maxGateInputs: 4,
      par: 2,
      rule: (v) => onCount(v) % 2 === 0,
      hints: [
        'A wide XOR is 1 when an odd number of its inputs are 1.',
        "Q = $(A ⊕ B ⊕ C ⊕ D)'$",
        'One 4-input XOR, then a NOT.',
      ],
    },
  ],
  [
    'mismatch-alarm',
    {
      title: 'Mismatch Alarm',
      brief:
        'Two pairs of sensors watch the same doors: A and B should always agree, and so should C and D. Q raises the alarm when either pair disagrees.',
      inputs: ABCD,
      palette: 'toolbox',
      maxGateInputs: 4,
      par: 3,
      rule: ({ A, B, C, D }) => A !== B || C !== D,
      hints: [
        'Which earned gate tells you that two signals disagree?',
        'Q = $(A ⊕ B) + (C ⊕ D)$',
        'One XOR per pair, then an OR.',
      ],
    },
  ],
  [
    'security-system',
    {
      title: 'Security System',
      brief:
        'A is the arm switch, B the door sensor, C the window sensor and D maintenance mode. The siren Q sounds when the system is armed, the door or window opens, and maintenance mode is OFF.',
      inputs: ABCD,
      palette: 'toolbox',
      maxGateInputs: 3,
      par: 3,
      rule: ({ A, B, C, D }) => A === 1 && (B === 1 || C === 1) && D === 0,
      hints: [
        'Three conditions must all hold at once. Write each one as its own signal first.',
        "Q = $A(B + C)D'$",
        'An OR for door/window and a NOT for maintenance, then one 3-input AND joins all three.',
      ],
    },
  ],

  // ---------- Real circuits ----------
  [
    'quiz-buzzer',
    {
      title: 'Quiz Buzzer',
      brief: 'Three players share a quiz buzzer. Q lights when exactly one of them (A, B or C) is pressing.',
      inputs: ABC,
      palette: 'toolbox',
      maxGateInputs: 3,
      par: 3,
      rule: (v) => onCount(v) === 1,
      hints: [
        'A 3-input XOR is 1 when one or all three are pressing. Which row do you need to remove?',
        "Q = $AB'C' + A'BC' + A'B'C = (A ⊕ B ⊕ C)(ABC)'$",
        'A 3-input XOR and a 3-input NAND, joined by an AND.',
      ],
    },
  ],
  [
    'equal-codes',
    {
      title: 'Equal Codes',
      brief:
        'A lock compares two 2-bit codes: the key typed in (A, B) and the stored code (C, D). Q opens the lock when A matches C and B matches D.',
      inputs: ABCD,
      palette: 'toolbox',
      maxGateInputs: 4,
      par: 3,
      rule: ({ A, B, C, D }) => A === C && B === D,
      hints: [
        'Like the Mismatch Alarm, but pairing A with C and B with D, and the lock opens when no pair disagrees.',
        "Q = $(A ⊕ C)'(B ⊕ D)' = ((A ⊕ C) + (B ⊕ D))'$",
        'One XOR per bit pair, then one gate that is 1 only when both XORs are 0.',
      ],
    },
  ],
  [
    'selector-switch',
    {
      title: 'Selector Switch',
      brief: 'B chooses which sensor reaches the output: when B is 0, Q copies A; when B is 1, Q copies C.',
      inputs: ABC,
      palette: 'toolbox',
      maxGateInputs: 3,
      par: 3,
      rule: fromExpression("AB' + BC"),
      hints: [
        'Handle the two cases (B = 0 and B = 1) separately, then combine them. That takes four gates; three is possible.',
        "Q = $AB' + BC = A ⊕ B(A ⊕ C)$",
        'Start from A. XOR A with C, AND that with B, then XOR the result back with A: when B is 1, the two As cancel.',
      ],
    },
  ],
  [
    'vending-machine',
    {
      title: 'Vending Machine',
      brief:
        'D is the power switch, C is card mode, B is a coin and A is a card tap. The machine dispenses (Q) when it is powered and either a coin is inserted with card mode OFF, or a card is tapped with card mode ON.',
      inputs: ABCD,
      palette: 'toolbox',
      maxGateInputs: 3,
      par: 4,
      rule: fromExpression("BC'D + ACD"),
      hints: [
        'Card mode C decides whether the coin (B) or the card (A) matters. Write one product term per mode; both need D.',
        "Q = $BC'D + ACD$",
        'One NOT for C, two 3-input ANDs, one OR. On a K-map these are two groups of two.',
      ],
    },
  ],
  [
    'bigger-number',
    {
      title: 'Bigger Number',
      brief:
        'Two 2-bit numbers: AB (A is the high bit) and CD (C is the high bit). Q lights when AB is bigger than CD.',
      inputs: ABCD,
      palette: 'toolbox',
      maxGateInputs: 3,
      par: 5,
      rule: fromExpression("AC' + BC'D' + ABD'"),
      hints: [
        'Compare the high bits A and C first. Only when they are equal do the low bits B and D decide.',
        "Q = $AC' + BC'D' + ABD'$",
        'Let X be A XOR C (the high bits differ). When X is 1, Q is just A; when X is 0, Q is B AND NOT D. Five gates: X, A AND X, X NOR D, B AND that, then an OR.',
      ],
    },
  ],
]);

export const getLevel = (id: string) => LEVELS.find((l) => l.id === id);
