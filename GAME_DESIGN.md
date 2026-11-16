# Crack the Circuit — Game Design

*Build. Connect. Compute.* This document records the approved gameplay mechanics and rules.
It holds only decisions agreed in the design workshop. Discuss changes before you edit it.

## Learning scope
Learning objectives: the basic operations of Boolean algebra, and simplifying a Boolean expression (algebra or a
Karnaugh map).

| Topic | Where it appears in the game |
|---|---|
| AND, OR, NOT; AND before OR | Levels 1–3 and 6; the live equation and hints use this precedence |
| NAND, NOR, XOR; multi-input gates (XOR = odd number of 1s) | Built and earned in levels 4, 5 and 7, used from level 6 on; wide gates from level 15 |
| Identities, De Morgan's theorem | Levels 10–11 (NAND-only and NOR-only circuits; hints show the De Morgan step) and 22 |
| Combinational circuit = truth table + graphical symbols + Boolean equation | Truth table, board, and the live **Your circuit** equation |
| Sum of products / product of sums | Levels 13, 17, 23 and 24 are SOP-shaped puzzles; hint 2 of levels 12 and 23 shows each answer's SOP form next to a shorter one |
| Algebraic simplification, K-maps (2–4 variables) | Stars reward fewer gates, so simplifying earns 3★. Levels 21–25 reward simplifying; level 24's hint mentions K-map grouping |

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
| AND, OR | 2, widenable to 3–4 | Wide AND = all inputs 1; wide OR = any input 1 |
| NOT | 1 | Never widens |
| NAND, NOR | 2, widenable to 3–4 | Invert AND/OR. **Earned:** NAND by beating level 4, NOR by beating level 5 |
| XOR | 2, widenable to 3–4 | Wide XOR = an odd number of inputs are 1. **Earned** by beating level 7 |

**Earned gates.** Every player starts with AND, OR and NOT. NAND, NOR and XOR are each earned by building them from
gates the player already has. The result card announces the new gate, and from then on it is in the palette of every
later level (except the "only X" puzzles) and in the sandbox. Par assumes the player uses what they earned, so an
earned gate is the way to 3★: Matching Switches takes 2 gates with XOR and at least 3 without it.

**Gate width is a per-level rule.** Every gate is placed with 2 inputs. A level's `maxGateInputs` (default 2) sets how
wide a gate may be made. Levels 1–14 stay 2-input, so building wider functions from 2-input gates is still the
puzzle there. Wide gates arrive at level 15. A wide gate counts as **one** gate for par.

## Level progression
Every level is a truth-table puzzle. Objectives describe a behaviour or scenario and never give the formula; Boolean
expressions only appear in hint 2.

Levels 1–3 are tutorials that offer exactly the gate being taught. After that a level offers either the **toolbox**
(AND, OR, NOT plus every gate earned so far) or a deliberately **restricted palette**, where the restriction is the
puzzle (build a gate you don't have yet, NAND only, NOR only, AND only).

Difficulty climbs in steps: 2 inputs, then 3, then 4; one gate, then chains, then wide gates; plain switches, then
word problems; and par gets harder to meet. Each chapter opens with an easy level that introduces its idea and ends with
a harder one that combines it with what came before.

| # | Level | Palette | Par | Teaches |
|---|---|---|---|---|
| | **Basics** | | | |
| 1 | Both Switches: A·B | AND | 1 | Place, wire, run |
| 2 | Either Switch: A + B | OR | 1 | Reading truth tables |
| 3 | Opposite Day: A' | NOT | 1 | Single-input gates |
| | **Build it, earn it** | | | |
| 4 | Not Both: (AB)' | AND, NOT | 2 | Chaining gates; **earns NAND** |
| 5 | Neither Switch: (A + B)' | OR, NOT | 2 | De Morgan setup; **earns NOR** |
| 6 | Three-Way Switch: AB + C | toolbox | 2 | 3 inputs, 8 rows; AND before OR |
| 7 | Exactly One: build XOR | toolbox | 3 | (A + B)(AB)' with the earned NAND; **earns XOR** |
| | **Use what you earned** | | | |
| 8 | Matching Switches: A = B | toolbox | 2 | (A ⊕ B)'; XOR beats AND/OR |
| 9 | Odd One Out (3 switches) | XOR only | 2 | Chaining XOR as parity |
| 10 | Universal Gate: OR | NAND only | 3 | NAND is universal |
| 11 | NOR Only: AND | NOR only | 3 | NOR is universal too |
| 12 | Smart Lamp: B, off when curtains open (A) and daytime (C) | toolbox | 2 | B(AC)' with one NAND; simplified A'BC' + A'BC + ABC' |
| 13 | The Vault: ≥2 of 3 guards agree | toolbox | 4 | Word problem; factoring AB + AC + BC |
| 14 | Four-Key Lock: ABCD | AND (2-input) | 3 | 4 inputs, 16 rows; chaining 2-input gates |
| | **Four switches, wide gates** | | | |
| 15 | Any Alarm: A + B + C + D | OR (≤4) | 1 | Widening a gate |
| 16 | Silent Room: no sensor on | toolbox (≤4) | 1 | Wide NOR |
| 17 | Two Pairs: AB + CD | toolbox (≤4) | 3 | Sum of products; widening doesn't help |
| 18 | Even Count | toolbox (≤4) | 2 | (A ⊕ B ⊕ C ⊕ D)'; wide XOR as parity |
| 19 | Mismatch Alarm: A ≠ B or C ≠ D | toolbox (≤4) | 3 | XOR as "these disagree" |
| 20 | Security System: armed · (door + window) · maintenance off | toolbox (≤3) | 3 | Word problem; A(B + C)D' with a 3-input AND |
| | **Real circuits** | | | |
| 21 | Quiz Buzzer: exactly one of three pressing | toolbox (≤3) | 3 | (A ⊕ B ⊕ C)(ABC)': wide XOR and wide NAND together |
| 22 | Equal Codes: 2-bit AB = CD | toolbox (≤4) | 3 | ((A ⊕ C) + (B ⊕ D))': De Morgan on the Mismatch Alarm |
| 23 | Selector Switch: B picks whether Q copies A or C | toolbox (≤3) | 3 | AB' + BC takes 4 gates; A ⊕ B(A ⊕ C) takes 3 |
| 24 | Vending Machine: powered, and coin in coin mode or card in card mode | toolbox (≤3) | 4 | BC'D + ACD, found by grouping a 4-variable K-map |
| 25 | Bigger Number: 2-bit AB > CD | toolbox (≤3) | 5 | Comparator; AC' + BC'D' + ABD' is 6 gates, sharing A ⊕ C makes 5 |

Par values will be tuned in playtesting. Each level ships with a reference solution that meets par (verified by tests),
and every par was checked by an exhaustive search to be the fewest gates possible (levels 1–24; level 25 has no
4-gate solution).

Levels have stable ids (`smart-lamp`), used in saved progress and the URL (`#/level/smart-lamp`). Saves and links
from the earlier 18-level numbering are moved to the new ids. A level stays open once it is passed, so a new level
added before it never locks it again.

## Scoring
- Passing all rows = **1★** and unlocks the next level.
- Stars go up to **3★** by meeting the level's par gate count: **3★** at or under par, **2★** within 2 gates of par, otherwise **1★**.
- The gate count includes **every gate on the board**, including unused ones.
- Hints cap stars: the nudge is free, revealing the expression caps the level at **2★**, and the structure clue caps
  it at **1★**. Passing still always earns 1★ and unlocks the next level, and a best score earned earlier is kept.
- **Wording:** "par" is the internal term. Players never see it: the header says "3 gates for ★★★" next to
  "Best ★★☆", the gate counter says "2 gates · 3 for ★★★", and the result card says "2 gates used. ★★★ needs 3 or
  fewer." (adding "Can you remove N?" when over).

## Hints
Up to 3 per level, each revealed on demand:
1. A concept nudge.
2. The Boolean expression.
3. A structure / gate-count clue.

Each reveal button shows its cost ("free", "max ★★", "max ★"). Revealed hints are saved per level, stay shown when
the player comes back, and keep capping that level until progress is reset. While a cap applies, the gate counter says
"2 gates · hints: max ★★" and the result card says "Hints capped this level at ★★."

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
- **Placement:** drag from the palette onto the board, where gates snap to the grid. Clicking or tapping a palette
  gate adds it in a free spot near the middle of the view. Drag a placed gate to move it; its wires follow.
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
- **Board (canvas):** an open canvas with a dot grid and no visible edge, like a design tool. Switches and lamps keep
  their places in the original 960×600 area; gates can go anywhere within a hidden limit one board-size beyond it on
  every side (x −960…1920, y −600…1200). 100% means one board unit per screen pixel.
  - A level opens at **fit circuit**: zoomed to show every switch, lamp and gate, but never below 60%, so gates stay
    finger-sized on a phone. When the circuit is wider than that, the view starts at the switches on the left and
    the rest is reached by panning. The view isn't saved.
  - The mouse wheel or a trackpad/touch pinch zooms at the pointer (25–300%). Dragging empty canvas pans at any zoom
    (a press that doesn't move still clears the selection). The `− 100% +` control in the board's corner zooms in
    steps, and clicking the percentage fits the circuit again.
- **Off-screen markers:** a switch or lamp outside the view shows as a small arrow chip on the nearest edge of the
  board (e.g. `← A`, `Q →`). Clicking or tapping it pans to that terminal.
- **Edge pan:** dragging a gate, a wire end or a gate from the palette within 40px of the board's edge scrolls the
  canvas that way, faster nearer the edge.
- **Wiring bar:** while a click-click (or tap-tap) wire waits for its second port, a chip at the top of the board says
  what to pick next ("Tap an input to connect") and has a Cancel button.
- **Row stepper:** after a run (and in the sandbox once its table is complete), a `‹ Row 3/8 ✗ ›` control in the
  board's bottom-left corner steps through the rows, lighting each row's signals like tapping a truth-table row.
- **Long press (touch):** holding a finger on a gate or wire for half a second without moving selects it and opens a
  small **Delete** bubble beside it (a selected gate also shows its `− N inputs +` control). Tapping elsewhere closes it.
- **Magnifier (touch):** while a finger drags a wire, a round loupe above the finger shows the board under it at twice
  the zoom, with the snapped port and the wire's loose end, so the finger doesn't hide where the wire will land.
- **Touch zoom:** besides pinching, a double tap on empty canvas zooms in 2× there, and a two-finger tap zooms out 2×.
- **Undo toast:** deleting a gate or wire (any way) or pressing Reset shows "Gate deleted · Undo" (or "Wire deleted",
  "Board cleared") at the bottom of the board for 4 seconds. Its Undo button is the same as Undo; another edit or the
  timeout hides it.
- **Layout (all devices):** the canvas fills the screen and the rest floats over it (see DESIGN.md).
  - **Toolbar** (bottom centre): the gates as icon buttons (drag one out, tap it to add, drop a gate back on them to
    delete it; each has a tooltip with its name and what it does), then Undo, Redo, Delete and Reset as icons with
    tooltips, the gate count, and Run.
  - **Panel** (right): objective, the player's equation, truth table and hints. Its **–** button collapses it to a
    **Table** tab on the right edge, and the tab opens it again. It starts open on laptops and tablets and closed on
    phones. A failed run opens it.
  - **Fit circuit**, the off-screen markers and edge pan all use the part of the canvas the floating pieces don't
    cover, so a fitted circuit never sits under the panel.
  - **Phones** (600px wide or less, or 480px tall or less): the same pieces, smaller. The toolbar's gate group becomes a
    **Gates** button that pops the gates up above the bar. The panel becomes a sheet over the board: from the bottom
    when upright, from the right when sideways. The page doesn't scroll, bounce or pull to refresh, and controls keep
    clear of notches and the home bar.
  - The level map shows three chips per row up to 640px wide.
  - Touch: a finger snaps to the nearest port within about 22 screen pixels (capped at 34 board units), the gate
    `− N inputs +` control grows to finger size, buttons are at least 40px tall, and keyboard-shortcut labels hide.
- **How to Play** on a touch screen lists gestures (tap, drag, tap-tap wiring, hold to delete, pinch, double tap,
  two-finger tap, edge markers) instead of keyboard shortcuts.
- **Install:** a web app manifest lets players add the game to their home screen, where it opens full-screen without
  the browser bar. There's no offline mode.
- **Autosave:** each level's board is saved along with progress, and solved levels can be replayed for more stars.

## Accessibility
- **Keyboard play:** the whole game works without a pointer. Enter on a palette button adds that gate in a free spot near the middle of the view.
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
- The palette has every gate the player has: AND, OR, NOT, plus NAND, NOR and XOR once earned. Gates widen up to 4 inputs.
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
