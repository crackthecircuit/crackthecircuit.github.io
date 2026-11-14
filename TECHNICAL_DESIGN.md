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

There's no router dependency: the current screen is a field in the store.

## Layering rule
`src/engine/` is **pure TypeScript with no React or DOM imports**. It owns the circuit types, validation, simulation and
scoring. The UI calls the engine and never re-implements logic. This keeps the simulator testable on its own and lets
the engine and the UI be built in parallel.

## Folder structure
```
src/
  engine/      types.ts · gates.ts · validate.ts · simulate.ts · score.ts · __tests__/
  levels/      levels.ts (level data) · solutions.ts (reference circuits, used by tests only)
  store/       circuitStore.ts (board + selection + undo) · progressStore.ts (persisted progress)
  components/
    board/     Board · GateNode · Port · Wire · DragPreview
    panels/    Palette · TruthTable · Hints · ResultCard
  screens/     TitleScreen · LevelMap · LevelScreen
  lib/         geometry.ts (grid snap, bezier paths, port positions)
  styles/      tokens.css · global.css
```

## Data model
Everything is plain JSON, so undo snapshots, autosave and level files work the same way.

```ts
type GateType = 'AND' | 'OR' | 'NOT' | 'NAND' | 'NOR' | 'XOR';
type PortId = 'in0' | 'in1' | 'out';

// A node is a discriminated union on `kind`. Positions are world coordinates (ready for zoom/pan).
type CircuitNode =
  | { id: string; kind: 'input'; label: string; pos: Point }   // switch, e.g. 'A'
  | { id: string; kind: 'output'; label: string; pos: Point }  // lamp, e.g. 'Q'
  | { id: string; kind: 'gate'; gateType: GateType; pos: Point };
// Ports come from kind/type: input terminal → out · output terminal → in0 ·
// NOT → in0, out · other gates → in0, in1, out
// Terminal ids are `in-<label>` / `out-<label>` (see src/levels/startingCircuit.ts).

interface Wire {
  id: string;
  from: { nodeId: string; port: 'out' };
  to:   { nodeId: string; port: 'in0' | 'in1' };
}

interface Circuit { nodes: CircuitNode[]; wires: Wire[] }

interface Level {
  id: string;                               // 'level-1'
  number: number;
  title: string;
  brief: string;
  inputs: string[];                         // ['A', 'B', 'C']
  outputs: string[];                        // ['Q'] (list, ready for multi-output)
  expected: Record<string, (0 | 1)[]>;      // output → value for each row
  palette: GateType[];
  par: number;
  hints: [string, string, string];
  unlocksGate?: GateType;                   // level 8 → 'XOR'
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
4. **`score(allPassed, gateCount, par)`** → 0–3 stars (see GAME_DESIGN.md §Scoring). `countGates()` counts every gate on the board.

Level truth tables are written as rules in `src/levels/levels.ts` and expanded into arrays at load time. The engine
only ever compares against the arrays. `src/levels/solutions.ts` holds a reference circuit per level (via
`buildCircuit()`), and `levels.test.ts` checks that each one passes every row at exactly par using only palette gates.

## State
- **`circuitStore`:** the current circuit, the selection, and actions `addGate`, `moveGate`, `connect`, `disconnect`,
  `remove`, `reset`, `undo`, `redo`. Every action replaces the circuit immutably. History is a past/future stack of `Circuit` snapshots;
  a drag is committed **once, on release**, not on every pointer move.
- **`progressStore`:** stars, unlocked gates and autosaved boards.

## Persistence
A single localStorage key, `crackthecircuit:v1`:
```json
{ "version": 1, "stars": { "level-1": 3 }, "boards": { "level-1": { "nodes": [], "wires": [] } }, "unlockedGates": ["XOR"] }
```
Every read and write is wrapped in try/catch. Missing, corrupt or unknown-version data falls back to a fresh state.

## Testing
Vitest unit tests cover:
- the truth table of every gate type,
- each level's reference solution passing and meeting par,
- each invalid case: floating input, unconnected output, multiple drivers, invalid wire, cycle,
- unused gates being ignored by simulation but counted for score,
- star scoring,
- progress load, version mismatch and corrupt-data fallback.

The UI is checked by a manual playtest checklist and by browser checks through Playwright MCP (see CLAUDE.md).
