# Crack the Circuit — Roadmap

> **Status: approved — Week 1 in progress.** Done so far: scaffold, tokens, engine + tests, level data + reference solutions.

Timeline: MVP in about 2 weeks, then 1 week of extra features, with a buffer up to 6 weeks in total.

## Milestones

### Week 1 — Foundations (all in parallel)
- Project scaffold: Vite + React + TS, ESLint, Prettier, Vitest, npm scripts (`dev`, `build`, `typecheck`, `lint`, `test`).
- `tokens.css` + global styles + font loading.
- Engine: types, gates, validate, simulate, score, with full unit tests.
- Store: circuit actions + undo/redo; progress store + persistence.
- Static board rendering: IEEE gate SVGs, ports, bezier wires drawn from hard-coded circuits.
- Level data for all 10 levels + reference solutions + hints.

**Exit check:** engine tests green, and every reference solution passes and meets par.

### Week 2 — Playable MVP
- Drag from palette, grid snap, move, delete.
- Wiring interactions: drag-to-connect, click-click fallback, valid-target glow, reject shake, replace on drop, detach by dragging an end.
- Run flow: validation messages + red pulses, truth table ✓/✗, row inspection.
- Hints panel, result card, stars.
- Title screen, circuit-board level map, unlocking, XOR unlock after level 8, autosave.
- First deployment to GitHub Pages (`https://crackthecircuit.github.io`) via a GitHub Actions workflow.

**Exit check:** the MVP definition of done (below).

### Week 3 — Extras
- Polish the success sweep (row ticks + wire pulse).
- Sandbox mode.
- Zoom / pan.
- Playtest with classmates and tune par values and hints.

### Weeks 4–6 — Buffer / stretch
- A half-adder level (multi-output).
- Sound.
- An accessibility pass.
- Report and demo preparation.

## Team split (5 members)
| # | Area | Owns |
|---|---|---|
| 1 | Engine & tests | `src/engine/`, engine tests, scoring |
| 2 | Board interactions | Dragging, wiring, selection, grid snap, Pointer Events |
| 3 | State & persistence | Zustand stores, undo/redo, autosave, unlocking |
| 4 | Visual design system | Tokens, gate art, panels, truth table, result card, animations |
| 5 | Content, screens & QA | Level data, hints, reference solutions, title + level map, playtesting, deployment |

## Definition of done (MVP)
- All 10 levels can be solved end to end in the browser.
- Every reference solution passes in tests and meets par.
- Every invalid-circuit case is detected and has a test.
- Progress and boards survive a page refresh.
- `npm run typecheck`, `npm run lint` and `npm test` all pass.
- No console errors during a full playthrough.
- Works in current desktop Chrome, Edge and Firefox.
- `https://crackthecircuit.github.io` is live.
