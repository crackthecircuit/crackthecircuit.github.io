# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project
Crack the Circuit is a browser puzzle game for BCIS 1302 (Digital Logic), built by a 5-person university team.
Players build combinational circuits from gates and wires to match a target truth table.
The approved specs are the source of truth. Read the relevant one before changing behaviour, and don't add features they don't list:
- `GAME_DESIGN.md`: mechanics, levels, scoring, interaction rules
- `DESIGN.md`: visual identity and design tokens
- `TECHNICAL_DESIGN.md`: architecture, data model, engine pipeline
- `ROADMAP.md`: milestones, team split, definition of done

**Status:** design approved, code not yet scaffolded. Don't start implementing until the team has approved ROADMAP.md.

## Commands (defined when the project is scaffolded)
- `npm run dev`: Vite dev server
- `npm run build`: production build
- `npm run typecheck` / `npm run lint`
- `npm test`: Vitest; run a single file with `npx vitest run src/engine/__tests__/simulate.test.ts`,
  or a single test with `npx vitest run -t "detects cycles"`

## Architecture rules
- `src/engine/` is **pure TypeScript with no React or DOM imports**. Validation, simulation and scoring live only there,
  and the UI calls the engine instead of re-implementing logic. The UI reads per-row `wireValues` from the engine result.
- The simulator evaluates the player's real circuit over all 2^n rows. Never check "did they place gate X",
  and never treat a missing connection as 0. An invalid circuit returns `ValidationError`s and blocks Run.
- Circuits, levels and progress are plain JSON (see TECHNICAL_DESIGN.md). Store actions replace state immutably;
  undo history stores `Circuit` snapshots, and a drag is committed once on release.
- Gates have fixed inputs (2, or 1 for NOT). Level outputs are a list even though MVP levels have one output.
- Positions are world coordinates (zoom/pan comes later).
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
- Project plugins: `frontend-design` (UI quality guidance) and `typescript-lsp` (needs `typescript-language-server` installed globally).
