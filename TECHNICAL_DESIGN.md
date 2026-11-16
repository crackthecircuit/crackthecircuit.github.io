# Crack the Circuit — Technical Design

## Stack
| Concern | Choice | Why |
|---|---|---|
| Build | Vite + React + TypeScript | Fast dev server, static output, no backend |
| State | Zustand | One small store, plain action functions, easy undo |
| Styling | CSS Modules + CSS-variable tokens | Tokens match DESIGN.md 1:1, styles are scoped per component, and SVG is easy to style |
| Rendering | SVG | The board is an interactive diagram, not a physics game |
| Tests | Vitest | Same config as Vite; fast unit tests for the engine |
| Persistence | localStorage | Per-player progress; no accounts |
| Hosting | GitHub Pages at `https://crackthecircuit.github.io` (repo `crackthecircuit/crackthecircuit.github.io`) | Free; root-level site, so Vite `base` stays `/` |

There's no router dependency: the current screen is a field in `appStore`, mirrored in the URL hash
(`#/`, `#/map`, `#/sandbox`, `#/level/smart-lamp`; old numbered links like `#/level/3` still work) so refresh and the back button work. A locked level opened by URL redirects to the map.

## Layering rule
`src/engine/` is **pure TypeScript with no React or DOM imports**. It owns the circuit types, validation, simulation and
scoring. The UI calls the engine and never re-implements logic. This keeps the simulator testable on its own and lets
the engine and the UI be built in parallel.

## Folder structure
```
src/
  engine/      types.ts · gates.ts · validate.ts · simulate.ts · score.ts · expression.ts · __tests__/
  levels/      levels.ts (level data) · solutions.ts (reference circuits, tests only) · startingCircuit.ts
               rules.ts (gate widths) · sandbox.ts (the sandbox as a Level) · legacy.ts (old level-<n> ids)
  store/       appStore.ts (screen + URL hash) · circuitStore.ts (board, selection, undo)
               progressStore.ts + persistence.ts (stars, unlocks, autosaved boards)
  components/
    board/     Board (pure SVG renderer) · Workspace (pointer interactions) · GateShape (IEEE symbols)
    panels/    Palette · TruthTable · LiveTruthTable (sandbox) · Hints · Problems · ResultCard
    ui/        Button · Stars
  screens/     TitleScreen · LevelMap · LevelScreen (run flow, sweep) · SandboxScreen
               editor.tsx (shortcuts + palette drag shared by both editing screens)
  lib/         board.ts (960×600 home area, canvas limits, grid) · geometry.ts (ports, wire paths, hit-testing, placement) · view.ts (zoom/pan)
               sound.ts (Web Audio synth, `editSound()` picks an edit's sound)
               describe.ts (screen-reader names for ports and gates) · announce.ts (live-region messages)
  styles/      tokens.css · global.css
```

## UI structure
- **Board** only draws. It takes the circuit plus display state (signals, errors, selection, draft wire, port hints)
  and reports pointer presses on ports, gates, wires and the background.
- **Workspace** owns editing gestures and calls store actions. A gate drag moves the gate on screen and commits
  `moveGate` once on release (dropping on the palette calls `removeGate`). A wire is drawn by dragging port → port,
  or by clicking one port then another. Pressing a connected input port picks up that wire's end:
  drop it on another input to reroute it (`moveWireEnd`), or on empty board to detach it. Drop targets are found with
  `nearestPort` (22-unit radius, wider for a finger), not by DOM hit-testing. Workspace also owns the **view**
  (zoom/pan) of the open canvas: a `{ scale, center }` (screen pixels per board unit, and the world point in the middle)
  that only changes the SVG `viewBox`, sized to the element so nothing is letterboxed. The math is pure and lives in
  `src/lib/view.ts` (`fitCircuit`, `zoomAround`, `panBy`, `worldToScreen`/`screenToWorld`), so stored positions stay in
  world units. Screen↔world conversion uses that math rather than `getScreenCTM()`, so edge-panning during a drag
  sees the new view before React re-renders. Workspace also draws the off-screen terminal markers, the wiring bar,
  the wiring magnifier (a `<use>` of the board's content group) and the long-press bubble as HTML over the board.
- **Floating layout:** LevelScreen and SandboxScreen put the canvas full-screen and float the top pills, the panel
  and the toolbar over it (`useFloatingLayout()` in `screens/editor.tsx`, styles in `LevelScreen.module.css`). The hook
  works out how much of each edge they cover and passes those **insets** to Workspace (fit circuit, markers, edge pan
  use the uncovered area) and to CSS as `--inset-*` variables (the zoom control, row stepper, toast, problems box and
  result card sit inside it). `EditTools` is the toolbar's Undo/Redo/Delete/Reset icon group.
- **LevelScreen** owns the run. `simulate()` runs on Run/Space. The result belongs to the exact `Circuit` object that
  was run, so any edit makes it stale automatically. Rows reveal every 80ms while the board shows each row's signals.
  A pass then plays a ~650ms flowing-wire celebration and the result card. Any click or key skips the sweep.
  Progress is recorded as soon as the run passes.
- **SandboxScreen** uses the same Workspace with a generated level from `sandboxLevel(inputs, unlockedGates)`: one
  output, every unlocked gate, `maxGateInputs` 4 and a placeholder `expected` that is never compared. It calls
  `simulate()` on every edit and shows the rows live. The input count is read from the circuit's input terminals, so
  `relayout()` (one undo step) changes it and undo/redo restores it; `setLevel()` then re-syncs the store's level.
- **Keyboard:** Board makes ports and gates focusable and reports Enter/Delete/focus; Workspace maps a port's Enter onto
  the existing click-click wiring mode, so keyboard and mouse share one code path. `components/ui/Announcer` is the
  app's single live region, fed by `announce()`.

## Data model
Everything is plain JSON, so undo snapshots, autosave and level files work the same way.

```ts
type GateType = 'AND' | 'OR' | 'NOT' | 'NAND' | 'NOR' | 'XOR';
type InputPortId = 'in0' | 'in1' | 'in2' | 'in3';   // top to bottom
type PortId = InputPortId | 'out';

// A node is a discriminated union on `kind`. Positions are world coordinates (zoom/pan only moves the view).
type CircuitNode =
  | { id: string; kind: 'input'; label: string; pos: Point }   // switch, e.g. 'A'
  | { id: string; kind: 'output'; label: string; pos: Point }  // lamp, e.g. 'Q'
  | { id: string; kind: 'gate'; gateType: GateType; inputs?: number; pos: Point };
// Ports come from kind/type: input terminal → out · output terminal → in0 ·
// NOT → in0, out · other gates → in0…in(n-1), out, where n = inputs (default 2, max 4; see GATE_SPECS)
// Terminal ids are `in-<label>` / `out-<label>` (see src/levels/startingCircuit.ts).

interface Wire {
  id: string;
  from: { nodeId: string; port: 'out' };
  to:   { nodeId: string; port: InputPortId };
}

interface Circuit { nodes: CircuitNode[]; wires: Wire[] }

interface Level {
  id: string;                               // stable slug: 'smart-lamp'
  number: number;
  title: string;
  brief: string;
  inputs: string[];                         // ['A', 'B', 'C']
  outputs: string[];                        // ['Q'] (list, ready for multi-output)
  expected: Record<string, (0 | 1)[]>;      // output → value for each row
  palette: GateType[];
  maxGateInputs?: number;                   // widest gate allowed; default 2 (src/levels/rules.ts)
  par: number;
  hints: [string, string, string];
  unlocksGate?: GateType;                   // 'not-both' → 'NAND', 'neither-switch' → 'NOR', 'exactly-one' → 'XOR'
}
```

**Row order:** binary counting, with the first input as the most significant bit (row `i` uses the bits of `i`).

## Engine pipeline
1. **`validate(circuit, level)` → `ValidationError[]`**
   `{ code, nodeIds, wireIds, message }` with codes `MISSING_TERMINAL`, `INVALID_WIRE`, `FLOATING_INPUT`,
   `OUTPUT_UNCONNECTED`, `MULTIPLE_DRIVERS`, `CYCLE`. It walks **backwards from the output terminals** to find the gates that matter, and only
   those are checked. Unused gates are reported separately as `unusedGateIds` (not an error). The UI stops invalid wires
   being drawn, but the engine still checks for them.
2. **Topological sort (Kahn's algorithm)** over the gates that matter: repeatedly take a gate whose inputs are all known.
   Any gates left over form a cycle and produce a `CYCLE` error that names them.
3. **`simulate(circuit, level)`:** for each of the 2^n rows, evaluate the gates in sorted order and return
   `{ inputs, wireValues: Record<wireId, 0|1>, outputs, pass }`, plus totals. `wireValues` drives row inspection
   and the success sweep, so the UI never computes signals itself.
4. **`score(allPassed, gateCount, par, hintsShown)`** → 0–3 stars, capped by `hintStarCap(hintsShown)` (see GAME_DESIGN.md §Scoring). `countGates()` counts every gate on the board.

Level truth tables are written as rules in `src/levels/levels.ts` and expanded into arrays at load time. The engine
only ever compares against the arrays. `src/levels/solutions.ts` holds a reference circuit per level (via
`buildCircuit()`), and `levels.test.ts` checks that each one passes every row at exactly par using only palette gates.

## State
- **`circuitStore`:** the current circuit, the selection, and actions `addGate`, `moveGate`, `connect`, `moveWireEnd`, `removeWire`,
  `removeGate`, `removeSelection`, `reset`, `select`, `undo`, `redo`, plus `relayout`/`setLevel` for the sandbox. Every action replaces the circuit immutably. History is a past/future stack of `Circuit` snapshots;
  a drag is committed **once, on release**, not on every pointer move.
- **`progressStore`:** stars, unlocked gates, autosaved boards, hints revealed per level and the `muted` setting (kept by `resetProgress`).

## Persistence
A single localStorage key, `crackthecircuit:v1`:
```json
{ "version": 1, "stars": { "both-switches": 3 }, "boards": { "both-switches": { "nodes": [], "wires": [] } }, "unlockedGates": ["NAND"], "hints": { "both-switches": 1 }, "muted": false }
```
The sandbox board is saved under `boards.sandbox`. Every read and write is wrapped in try/catch. Missing, corrupt or unknown-version data falls back to a fresh state.

## Testing
Vitest unit tests cover:
- the truth table of every gate type,
- each level's reference solution passing and meeting par,
- each invalid case: floating input, unconnected output, multiple drivers, invalid wire, cycle,
- unused gates being ignored by simulation but counted for score,
- star scoring,
- progress load, version mismatch and corrupt-data fallback.

The UI is checked by a manual playtest checklist and by browser checks through Playwright MCP (see CLAUDE.md).

## Boolean expressions
`src/engine/expression.ts` holds an `Expr` tree with three uses:
- `parseExpressions()` reads standard Boolean notation: juxtaposition or `·` for AND, `+` for OR, `⊕` for XOR, postfix `'` or
  prefix `¬` for NOT, and chains of equal forms joined by `=`.
- `circuitExpression()` reads the player's circuit backwards from the output into an `Expr`. Unconnected inputs become
  `unknown` and feedback loops become `loop`, never 0.
- `evaluateExpr()` evaluates an `Expr`. Levels 16–18 define their truth table with `fromExpression("…")`,
  so the brief and the table can't disagree.

Level text (briefs and hints) embeds expressions between dollar signs (`"Q = $A'B + AB'$"`), and `RichText` renders them.
`levels.test.ts` parses every embedded expression and checks that **hint 2's expressions match the level's truth table**.

## Deployment
`.github/workflows/deploy.yml` runs typecheck, lint, tests and build on every push and pull request. Pushes to `main`
deploy `dist/` to GitHub Pages (Pages source: GitHub Actions) at https://crackthecircuit.github.io.
