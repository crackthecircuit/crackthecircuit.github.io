# Crack the Circuit — Game Design

*Build. Connect. Compute.* This document records the approved gameplay mechanics and rules.
It holds only decisions agreed in the design workshop. Discuss changes before you edit it.

## Learning scope
Learning objectives: the basic operations of Boolean algebra, and simplifying a Boolean expression (algebra or a
Karnaugh map).

| Topic | Where it appears in the game |
|---|---|
| AND, OR, NOT; AND before OR | Levels 1–3; the live equation and hints use this precedence |
| NAND, NOR, XOR; multi-input gates (XOR = odd number of 1s) | Levels 4–9, wide gates from level 12 |
| Identities, De Morgan's theorem | Levels 5–6 and 16 (hints show the De Morgan step) |
| Combinational circuit = truth table + graphical symbols + Boolean equation | Truth table, board, and the live **Your circuit** equation |
| Sum of products / product of sums | Levels 10, 13 and 17 are SOP-shaped puzzles; hint 2 of levels 16 and 17 shows each answer's SOP and POS forms |
| Algebraic simplification, K-maps (2–4 variables) | Stars reward fewer gates, so simplifying earns 3★. Levels 16–18 reward simplifying; level 18's hint mentions K-map grouping |

Digital logic: Boolean algebra, truth tables, Boolean expressions and combinational circuits built from AND, OR,
NOT, NAND, NOR and XOR gates.
**Out of scope:** sequential logic, flip-flops, memory and CPU architecture.

## Core loop
1. Read the level brief and the **full target truth table**.
2. Drag gates from the level's palette onto the board.
3. Draw wires between input terminals, gate ports and the output terminal.
4. Press **Run** (button or Space).
5. The truth-table rows fill in ✓/✗, one per input combination (all 2^n).
6. Click a failing row to see every wire's 0/1 value for that input, then fix the circuit.
7. When every row passes, a result card shows stars and the next level unlocks.

## Gates
| Gate | Inputs | Notes |
|---|---|---|
| AND, OR, NAND, NOR | 2, widenable to 3–4 | Wide AND = all inputs 1; wide OR = any input 1; NAND/NOR invert them |
| NOT | 1 | Never widens |
| XOR | 2, widenable to 3–4 | Wide XOR = an odd number of inputs are 1. **Earned:** added to the palette after beating level 8 |

**Gate width is a per-level rule.** Every gate is placed with 2 inputs. A level's `maxGateInputs` (default 2) sets how
wide a gate may be made. Levels 1–11 stay 2-input, so building wider functions from 2-input gates is still the
puzzle there. Wide gates arrive at level 12. A wide gate counts as **one** gate for par.

## Level progression
Every level is a truth-table puzzle. Objectives describe a behaviour or scenario and never give the formula; Boolean
expressions only appear in hint 2.

Levels 1–3 are tutorials that offer exactly the gate being taught. Later levels **restrict the palette**,
and that restriction is where the puzzle comes from.

| # | Goal | Palette | Par | Teaches |
|---|------|---------|-----|---------|
| 1 | AND | AND | 1 | Place, wire, run |
| 2 | OR | OR | 1 | Reading truth tables |
| 3 | NOT | NOT | 1 | Single-input gates |
| 4 | NAND | AND, NOT | 2 | Chaining gates |
| 5 | NOR | OR, NOT | 2 | Chaining; De Morgan setup |
| 6 | OR | NAND only | 3 | Universal gates |
| 7 | (A·B)+C | AND, OR, NOT | 2 | 3 inputs, 8 rows |
| 8 | Build XOR | AND, OR, NOT | 4 | (A+B)·¬(A·B); unlocks XOR |
| 9 | Odd-parity lamp (3 switches) | XOR | 2 | Using an earned gate |
| 10 | Vault: opens when ≥2 of 3 guards agree | AND, OR | 4 | Word problem → Boolean function; A(B+C)+BC |
| 11 | Four-Key Lock: A·B·C·D | AND (2-input) | 3 | 4 inputs, 16 rows; chaining 2-input gates |
| 12 | Any Alarm: A+B+C+D | OR (≤4 inputs) | 1 | Introduces widening a gate |
| 13 | Two Pairs: A·B + C·D | AND, OR (≤4) | 3 | Sum of products; widening doesn't help |
| 14 | Even Count (even number of switches on) | XOR (≤4), NOT | 2 | ¬(A⊕B⊕C⊕D); wide XOR as parity |
| 15 | Security System: armed · (door + window) · ¬maintenance | AND, OR, NOT (≤3) | 3 | Word problem; A·(B+C)·¬D with a 3-input AND |
| 16 | Smart Lamp: on with B, off when curtains open (A) and daytime (C) | AND, OR, NOT (≤3) | 3 | B(AC)', the simplified form of A'BC' + A'BC + ABC' |
| 17 | Selector Switch: B picks whether Q copies A or C | AND, OR, NOT | 4 | AB' + BC, equivalent to the POS form (A + B)(B' + C) |
| 18 | Vending Machine: powered, and coin in coin mode or card in card mode | AND, OR, NOT (≤3) | 4 | BC'D + ACD, found by grouping a 4-variable K-map |

Par values will be tuned in playtesting. Each level ships with a reference solution that meets par (verified by tests).

## Scoring
- Passing all rows = **1★** and unlocks the next level.
- Stars go up to **3★** by meeting the level's par gate count: **3★** at or under par, **2★** within 2 gates of par, otherwise **1★**.
- The gate count includes **every gate on the board**, including unused ones.
- Hints never reduce stars.
- **Wording:** "par" is the internal term. Players never see it: the header says "3 gates for ★★★" next to
  "Best ★★☆", the gate counter says "2 gates · 3 for ★★★", and the result card says "2 gates used. ★★★ needs 3 or
  fewer." (adding "Can you remove N?" when over).

## Hints
Up to 3 per level, each revealed on demand:
1. A concept nudge.
2. The Boolean expression.
3. A structure / gate-count clue.

Hints never place gates for the player.

## Representations
- **Truth table:** the target is always shown as a truth table. A K-map view was tried and removed to keep levels
  focused on building. Simplifying with a K-map is left to the player, as in the exam.
- **Your circuit:** the player's circuit is read back as a live Boolean equation in standard notation (overbar for NOT,
  AB or A·B for AND, + for OR, ⊕ for XOR). Unconnected inputs show as a red ?, and feedback loops as ↻.
- **Hints and briefs** write expressions in the same notation.

## Mistakes and feedback
- **Failed run:** each row is marked ✓/✗. Clicking a row inspects that input and shows each wire as 0 or 1.
- **Invalid circuit:** Run is **blocked**, the offending ports or wires pulse red, and a plain-language message explains
  the problem (e.g. "Gate 2 input B isn't connected"). This doesn't count as a failed attempt. Invalid cases:
  - a gate input with nothing connected (floating input),
  - an output terminal with nothing connected,
  - an input port driven by more than one wire,
  - an output→output or input→input wire,
  - a feedback loop (cycle).
- Incomplete connections are **never** treated as 0.
- **Unused gates** (gates that don't feed the output) are skipped by validation and simulation. They're dimmed with an
  "unused" tag but still count toward the gate total.

## Success
A skippable sequence of about 1.5s: rows tick ✓ one by one and wires pulse from inputs to output. Then a result card shows
the stars, gates used vs par, and **Next Level**.

## Interaction
- **Placement:** drag from the palette onto the board, where gates snap to the grid. Drag a placed gate to move it; its wires follow.
  Dropping a gate back on the palette deletes it.
- **Wiring:** press on a port, drag (a live wire follows the cursor), and release on a compatible port. Click one port, then
  another, as a fallback. While dragging, valid targets glow and invalid ones dim.
- **Connection rules:** an output may fan out to many inputs. Each input port takes exactly one wire, and dropping a new
  wire on an occupied input replaces the old one. Output→output and input→input wires are rejected with a shake.
- **Selecting and deleting:** click a gate or wire to select it, then press Delete/Backspace or the trash button. Deleting a gate
  removes its wires. Dragging a wire's input end away detaches or reroutes it. There is no multi-select in the MVP.
- **Widening gates** (levels that allow it): selecting a gate shows a `− N inputs +` control above it; the + and −
  keys do the same. Narrowing removes wires on the ports that disappear. It's undoable like any edit.
- **Undo/redo:** Ctrl+Z / Ctrl+Shift+Z for every edit.
- **Reset:** clears the board straight away (terminals stay) and can be undone. There's no confirm dialog.
- **Board:** fixed size (960×600 world units) and fitted to the window at 100%. The mouse wheel or a trackpad/touch pinch
  zooms at the pointer (50–300%). Dragging empty board pans while zoomed in (a press that doesn't move still clears the
  selection). The `− 100% +` control in the board's corner zooms in steps, and clicking the percentage fits the board
  again. Zoomed out, the whole board always stays in view. The view resets when a level opens and isn't saved.
- **Devices:** laptop/desktop (1280px+) and tablets, by mouse, keyboard or touch (Pointer Events). Phones aren't
  supported yet: screens under 600px wide or 480px tall show a "built for a laptop, desktop or tablet" notice.
  - Tablets held sideways (and small laptops) keep the three-column layout with narrower side panels.
  - Upright tablets (up to 900px wide) get one scrolling column: header, a row of compact gate buttons, the board
    (8:5) with its toolbar, then objective and truth table beside the hints. The result card sits at the bottom
    of the screen there.
  - Touch: a finger snaps to the nearest port within about 22 screen pixels (capped at 34 board units), the gate
    `− N inputs +` control grows to finger size, buttons are at least 40px tall, and keyboard-shortcut labels hide.
- **Autosave:** each level's board is saved along with progress, and solved levels can be replayed for more stars.

## Accessibility
- **Keyboard play:** the whole game works without a pointer. Enter on a palette button adds that gate in a free spot.
  On the board, Tab reaches every port and gate. Enter (or Space) on a port starts a wire, and Enter on a second port
  finishes it (the same rules and rejections as the mouse), while Escape cancels. Delete on a connected input port
  removes its wire. Focusing a gate selects it: Delete removes it, + / − resize it, and the arrow keys move it one grid
  step (Shift for four).
- **Screen readers:** ports and gates have names that say what they're wired to (e.g. "AND gate 1 input 2, from
  switch B"). A polite live region announces wiring steps, gates added, rejected wires, and a failed run's first failing
  row. Validation problems are an alert, and the result card is a dialog described by its stars and par note.
- **Colour and motion:** colour is never the only signal (wire values also show as 0/1 on terminals and ports, and rows
  show ✓/✗). All text meets 4.5:1 contrast. `prefers-reduced-motion` shortens every animation.

## Sound
Short synthesised sound effects (Web Audio, no audio files). They're **on by default**. A speaker button on the main
menu, level screen and sandbox (or the **M** key while editing) mutes them, and the choice is saved with progress
(a progress reset keeps it).
- **Editing:** placing a gate, connecting or rerouting a wire, deleting, moving a gate, widening a gate and changing the
  sandbox inputs each have a sound, and so do undo and redo. A rejected wire buzzes with its shake.
- **Running:** each truth-table row ticks as the sweep reveals it (higher for ✓, lower for ✗). A pass plays a rising
  chord, then a chime per star on the result card, and the unlock jingle when the level earns a gate. A failed run plays a
  falling two-note phrase. A blocked (invalid) run buzzes.

## Sandbox
Free building, opened from **Sandbox** on the main menu (`#/sandbox`). It's always available.
- The player picks **1–4 inputs** (A–D) with an `Inputs 1 2 3 4` control. There's one output, Q.
- The palette has every gate the player has: AND, OR, NOT, NAND, NOR, plus XOR once earned. Gates widen up to 4 inputs.
- There's no target, no Run, no stars and no par. The truth table (inputs | Q) and the **Your circuit** equation
  follow the circuit **live** on every edit. While the circuit is incomplete, Q shows `?` and the table lists up to three
  of the validation messages in place of a red overlay.
- Clicking a row shows that row's signals on the board; clicking it again (or Escape) clears them.
- Changing the number of inputs keeps the gates, moves the terminals, and removes wires from inputs that disappear.
  It's one undoable step: undo brings the inputs and their wires back.
- The board is autosaved like a level's, and is cleared by a progress reset.

## Out of scope
- **Multi-output levels** (e.g. a half adder) are not planned. Every level has one output, although the data model
  stores outputs as a list.
