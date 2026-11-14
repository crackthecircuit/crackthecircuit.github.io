---
name: verify
description: Run Crack the Circuit's verification gate (typecheck, lint, unit tests, browser smoke check) before declaring any feature or fix complete.
---

# Verify a Crack the Circuit change

Run these steps in order and stop at the first failure. Fix the problem and start again from step 1.
Report each step's result honestly, including failures and anything you skipped.

1. `npm run typecheck`: no TypeScript errors.
2. `npm run lint`: no ESLint errors.
3. `npm test`: all Vitest tests pass. For an engine change (`src/engine/`, `src/levels/`), also confirm:
   - each level's reference solution still passes and meets par,
   - every invalid-circuit case still has a test (floating input, unconnected output, multiple drivers, invalid wire, cycle).
4. **Browser smoke check** (skip only if the change can't affect the UI, and say that you skipped it):
   - Start `npm run dev` in the background and note the local URL.
   - Use the Playwright MCP tools to open the page, go to the affected screen, and exercise the change
     (e.g. drag a gate, draw a wire, press Run, inspect a row).
   - Check the browser console for errors.
   - Take a screenshot and compare it against DESIGN.md: token colours, colour = signal, the board is the dominant element.
   - Stop the dev server.

A feature is done only when all four steps pass.
