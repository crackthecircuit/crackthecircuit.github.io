# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project
Crack the Circuit is a browser puzzle game about digital logic. The project is public: keep course names, lecture
material and personal details out of the game, docs and commit messages.
Players build combinational circuits from gates and wires to match a target truth table.
The approved specs are the source of truth. Read the relevant one before changing behaviour, and don't add features they don't list:
- `GAME_DESIGN.md`: mechanics, levels, scoring, interaction rules
- `DESIGN.md`: visual identity and design tokens
- `TECHNICAL_DESIGN.md`: architecture, data model, engine pipeline
- `ROADMAP.md`: milestones, team split, definition of done

**Status:** see the status line at the top of ROADMAP.md. The repo owner approves work directly.

## Commands
- `npm run dev`: Vite dev server
- `npm run build`: typecheck + production build into `dist/`
- `npm run typecheck` / `npm run lint`
- `npm test`: Vitest (`src/**/*.test.ts`); run a single file with `npx vitest run src/engine/__tests__/simulate.test.ts`,
  or a single test by name with `npx vitest run -t "feedback loop"`

## Where things live
- `src/engine/`: types, gates, `analyze`/`validate`, `simulate`, `score`. Import from `src/engine` (index.ts).
- `src/levels/`: `levels.ts` (level data; truth tables written as rules), `solutions.ts` (`buildCircuit` + one
  reference solution per level), `startingCircuit.ts` (terminal layout, ids `in-<label>` / `out-<label>`).
- `src/lib/board.ts` (960×600 home area, open-canvas limits, grid), `src/lib/geometry.ts` (port positions, wire paths,
  `nearestPort`, gate placement, `circuitBox`) and `src/lib/view.ts` (zoom/pan math, fit circuit, insets, edge pan).
- `src/components/board/`: `Board` only draws; `Workspace` owns drag/wire gestures. `src/screens/LevelScreen.tsx` owns the
  run flow (sweep, inspection, result card); `SandboxScreen.tsx` is free building with a live truth table; both use
  `screens/editor.tsx` for keyboard shortcuts, palette drag-and-drop, edit sounds, the undo toast and the floating
  layout (`useFloatingLayout`: canvas full-screen, pills/panel/toolbar over it, and the insets they cover), plus
  `screens/EditTools.tsx` for the toolbar's icon buttons.
- `src/store/`: zustand stores. `appStore.ts` holds the current screen, mirrored in the URL hash (`#/level/3`);
  `circuitStore.ts` holds the circuit being edited plus undo/redo; `progressStore.ts` holds scores and unlocks;
  `persistence.ts` is the localStorage layer.
- `src/engine/expression.ts` builds the live Boolean equation of the player's circuit shown in the UI.
- Pushing to `main` runs `.github/workflows/deploy.yml` (typecheck, lint, test, build) and deploys to GitHub Pages.
- ESLint blocks React/store/component imports inside `src/engine/`.

## Level text
Briefs and hints write Boolean expressions in standard notation between dollar signs, e.g. `"Q = $(AB)' + C$"`. Use
`'` for complement and juxtaposition for AND. Hint 2 must state the level's expression, and `levels.test.ts` checks it
against the truth table. To build a replacement string in a script, pass a function to `String.replace`: `$'` in a
replacement string means "the rest of the input".

## Architecture rules
- `src/engine/` is **pure TypeScript with no React or DOM imports**. Validation, simulation and scoring live only there,
  and the UI calls the engine instead of re-implementing logic. The UI reads per-row `wireValues` from the engine result.
- The simulator evaluates the player's real circuit over all 2^n rows. Never check "did they place gate X",
  and never treat a missing connection as 0. An invalid circuit returns `ValidationError`s and blocks Run.
- Circuits, levels and progress are plain JSON (see TECHNICAL_DESIGN.md). Store actions replace state immutably;
  undo history stores `Circuit` snapshots, and a drag is committed once on release.
- Gates have 2–4 inputs (NOT exactly 1); a level's `maxGateInputs` (default 2) caps width via `gateSizeRange()` in
  `src/levels/rules.ts`. Use `portsOf()`/`gateInputCount()`, never assume two ports. Level outputs are a list even though
  current levels have one output.
- Positions are world coordinates. Zoom/pan only changes the SVG viewBox (`src/lib/view.ts`), never stored positions.
- Styling uses CSS Modules + the CSS variables in `src/styles/tokens.css`. No hard-coded hex values in components.
  Colour means signal: amber = 1, cyan = selection/focus, green = pass, red = fail/invalid.
- localStorage access (key `crackthecircuit:v1`) always goes through try/catch with a fresh-state fallback.
- Keep dependencies minimal: no router, game engine or backend.

## Verification
Before calling any feature or fix done, run the `verify` skill (typecheck → lint → tests → browser smoke check
via the Playwright MCP server in `.mcp.json`). Every level needs a reference solution in `src/levels/solutions.ts`
that passes tests and meets par.

## Tooling notes
- A PostToolUse hook (`.claude/hooks/format.mjs`) runs Prettier on edited files once Prettier is installed in the project.
- The Playwright MCP server in `.mcp.json` can time out on connect. If it is unavailable, say so when reporting
  verification instead of claiming the browser smoke check passed.
- Project plugins: `frontend-design` (UI quality guidance) and `typescript-lsp` (needs `typescript-language-server` installed globally).
