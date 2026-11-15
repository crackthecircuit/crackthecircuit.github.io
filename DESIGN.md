# Crack the Circuit — Visual Design

The approved visual identity, design tokens and UI guidelines.

## Direction
A **dark engineering lab crossed with a modern dev tool**: a near-black board with a faint dot grid, refined panels and
technical typography. The circuit board is always the visual centrepiece. The theme is dark only.

### The core rule: colour means signal
Only signals glow. Gates and chrome stay neutral, so a lit wire is always the brightest thing on screen.
Each colour has exactly one meaning:

| Meaning | Colour |
|---|---|
| Signal = 1 | Amber |
| Selection / hover / valid target | Cyan |
| Test passed | Green |
| Test failed / invalid circuit | Red |

## Tokens
Every colour is a CSS variable in `src/styles/tokens.css`. Components don't hard-code hex values.

| Token | Value | Use |
|---|---|---|
| `--bg-board` | `#0B0D10` | Board background |
| `--grid-dot` | `#1E242C` | Board dot grid |
| `--bg-panel` | `#12151A` | Side panels |
| `--bg-raised` | `#1A1F26` | Cards, popovers, buttons |
| `--border` | `#262C35` | Panel and card borders |
| `--text-1` | `#E6E8EB` | Primary text |
| `--text-2` | `#8B93A0` | Secondary text |
| `--text-3` | `#808895` | Muted text, disabled (kept at 4.5:1 or more on every surface) |
| `--signal-on` | `#FFB547` | Wire/port carrying 1 (with glow) |
| `--signal-off` | `#3A4250` | Wire/port carrying 0 |
| `--wire` | `#4A5363` | Idle wire (before any run) |
| `--focus` | `#5CC8FF` | Selection, hover, valid port targets |
| `--ok` | `#5BD68A` | Passing rows, success |
| `--err` | `#FF5D5D` | Failing rows, invalid-circuit pulses |
| `--gate-fill` | `#161A20` | Gate body |
| `--gate-stroke` | `#9AA3B0` | Gate outline (`--focus` when selected) |

## Typography
- **Space Grotesk:** headings, logo, buttons.
- **JetBrains Mono:** truth tables, port and gate labels, numbers. Use tabular alignment so 0/1 columns line up.
  16-row tables (4 inputs) use a denser row height so they fit on a 768px-tall screen.

No other font families.

## Gates and wires
- Gates use the **standard IEEE distinctive shapes** (D-shaped AND, curved OR, triangle + bubble for NOT, a bubble for
  NAND/NOR, and the double curve for XOR), restyled cleanly with a small mono label underneath. These are the standard symbols students learn in class.
- **Wide gates** (3–4 inputs) stretch the same symbol vertically: the box grows 20 units per extra input, ports stay
  20 apart, and strokes keep their width (`vector-effect: non-scaling-stroke`). A selected widenable gate shows a
  `− N inputs +` pill above it, outlined in the focus colour.
- Wires are **smooth bezier curves** from port to port.
- Unused gates are dimmed and carry an "unused" tag.

## Boolean notation
Expressions use standard Boolean notation: NOT is an **overbar** (nested overbars stack), AND is written side by side
(A̅BC̅) when every factor is a single variable and as A·B otherwise, OR is +, XOR is ⊕. Expressions use JetBrains Mono.
A sum never breaks inside a term: lines wrap only between terms.

## Motion
| Interaction | Timing |
|---|---|
| Hover / press | 120–150ms |
| Panels, cards | 200ms ease-out |
| Success sweep | 80ms per truth-table row |
| Rejected connection shake | 300ms |
| Screen change | 180ms fade out, 280ms fade and slide in |
| Gate placed / removed | 200ms pop-in; removed gates shrink and fade over 200ms; new wires fade in over 200ms |
| Success celebration | Wires light left to right (up to 300ms stagger) |
| Truth-table ✓/✗, gate-count change | 200ms pop |
| Stars on the result card | 400ms pop, 120ms apart |
| Level map after a win | Trace draws in (700ms), then the next chip wakes up |
| Dialog close | 160ms fade out |

Looping animations run once under `prefers-reduced-motion`.

The success sequence lasts about 1.5s and can be skipped.

## Screens
1. **Main menu:** a game-style menu over an animated circuit board. Traces etch in on load, then amber signals pulse
   along them, and "Circuit" flickers on in the logo. Menu items are Start/Continue (showing the next level), Level Select
   and How to Play. Arrow keys or W/S move, Enter selects, and the selected item's pin lights amber. The footer shows
   stars and levels cracked. The project is public, so the screen carries no course or school branding.
   **How to Play** is a modal dialog (also opened with the ? button in a level) covering the steps, scoring and shortcuts.
2. **Level map:** drawn as a circuit board. Each level is a chip, and the traces between chips light amber as levels are completed.
   Stars show on each chip.
3. **Level screen:** the canvas fills the whole screen and everything else floats over it, like a design tool.
   ```
   ┌───────────────────────────────────────────────────────────────┐
   │ ╭ ← Levels  LEVEL 1  Both Switches  AND only ╮  ★★☆ 🔊 ?       │
   │                                             ╭───────────────╮ │
   │   [A]──╮                                    │ Objective     │ │
   │        ╰──[AND]────────────(Q)              │ Your circuit  │ │
   │   [B]──╯                                    │ Truth table   │ │
   │                 canvas (dominant)           │ Hints         │ │
   │                                             ╰───────────────╯ │
   │ ‹ Row 3/4 ✗ ›                                       − 80% +    │
   │        ╭ AND OR NOT │ ↶ ↷ 🗑 ⟲ │ 1 gate · 1 for ★★★ │ ▶ Run ╮      │
   └───────────────────────────────────────────────────────────────┘
   ```
   Floating pieces are `--bg-panel` cards with a `--border` outline, 12px corners and a soft shadow, 12px from the
   screen edge. Top left: back, level name and the palette rule. Top right: best stars, sound and help. Right: the
   panel (objective, the player's equation, truth table, hints), which collapses to a small **Table** tab. Bottom
   centre: the toolbar, with the gates as icon buttons, the edit tools as icons with tooltips, the gate count and Run.
   The sandbox is the same with its inputs control in the top-left pill.

Scrollbars (the panel, dialogs, the level map) are the browser's own, restyled thin: a rounded `--border` thumb on a
transparent track that brightens to `--text-3` on hover.
