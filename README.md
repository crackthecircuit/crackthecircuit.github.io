# Crack the Circuit

**Build. Connect. Compute.**

A browser-based puzzle game about digital logic. Each level gives a target truth table. You build a circuit from logic
gates and wires that produces it, and a real simulator tests your circuit against every input combination.

Made for **BCIS 1302 — Introduction to Computer Organization and Architecture** (Topic 10: Digital Logic).

## Status
The game is playable: 15 levels (up to 4 inputs and 16-row truth tables), the circuit editor with widenable gates, the run/inspect flow, progress saving and deployment. See [ROADMAP.md](ROADMAP.md).

## Documentation
| File | Contents |
|---|---|
| [GAME_DESIGN.md](GAME_DESIGN.md) | Gameplay loop, levels, scoring, hints, interaction rules |
| [DESIGN.md](DESIGN.md) | Visual identity, design tokens, typography, motion |
| [TECHNICAL_DESIGN.md](TECHNICAL_DESIGN.md) | Stack, architecture, data model, simulation engine, testing |
| [ROADMAP.md](ROADMAP.md) | Milestones, team split, definition of done |

**Play:** https://crackthecircuit.github.io

## Setup
Requires Node.js 20+ and npm.

```bash
npm install
npm run dev        # start the dev server
npm test           # run the unit tests
npm run typecheck  # TypeScript checks
npm run lint       # ESLint
npm run build      # production build into dist/
```
