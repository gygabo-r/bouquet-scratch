# Handoff: Scratch-to-Reveal Ticket

## Overview
A single-screen frontend feature: a gold "scratch-off lottery ticket". A foil panel
sits over a randomly chosen image; the user drags (mouse or touch) to scratch the foil
away and reveal the image beneath. Once enough of the foil is removed, the rest auto-clears
with a flash + confetti burst. A single **"I want new"** button loads another random image.

The app keeps track of which images have already been shown **within the current session**
and avoids repeating one until the whole set has been cycled through, then resets.

There is intentionally **no** title, counter, ticket number, or any other chrome — the user
asked to keep it minimal: just the ticket and one button.

## About the Design Files
The files in this bundle (`Scratcher.html`, `app.jsx`, `assets/`) are a **working design
reference built in HTML/React-via-Babel**. They demonstrate the intended look, feel, and
interaction — they are **not** meant to be shipped as-is. The task is to **recreate this
design in the target codebase** using its existing framework and conventions (React, Vue,
Svelte, SwiftUI, plain Canvas, etc.). If no codebase exists yet, pick the most appropriate
stack and implement it there.

The one part worth lifting almost verbatim is the **canvas scratch logic** (see
"Scratch Mechanic" below) — it is framework-agnostic and the trickiest piece to get right.

## Fidelity
**High-fidelity.** Final colors, typography, spacing, the foil texture, and all interactions
are intended to be reproduced faithfully. Exact values are documented under "Design Tokens".

## Screens / Views

### Screen: Scratch Ticket (the only screen)
- **Name**: Scratch Ticket
- **Purpose**: The user scratches a foil panel to reveal a hidden image, then can request a new one.
- **Layout**:
  - Full-viewport stage, content centered both axes, warm-cream radial background, light film grain overlay.
  - A single centered "ticket" card, `width: min(440px, 100%)`, vertically stacked (flex column).
  - Card padding `18px 18px 16px`, `border-radius: 22px`, 1px border, layered drop shadow.
  - Two notch circles punched into the card's left & right mid-edges (classic ticket look).
  - Inside the card, top → bottom:
    1. **Window** — the image + scratch surface. `aspect-ratio: 1122/1402` (i.e. 4:5 portrait), `border-radius: 14px`, `overflow: hidden`, dark `#111` backing.
    2. **Verdict line** — a single centered caption, hidden until revealed.
    3. **Perforation** — a 2px dashed horizontal divider that bleeds to the card edges.
    4. **"I want new" button** — full width.

- **Components**:

  **Window (image + scratch canvas)**
  - Two stacked layers filling the window absolutely:
    - `<img>` (`object-fit: cover`, full width/height, non-draggable) — the prize image.
    - `<canvas>` on top, same size, `cursor: crosshair`, `touch-action: none`.
  - Four decorative L-shaped corner brackets (2px, `rgba(255,255,255,0.65)`), 14×14px, inset 8px.
  - On the *un-scratched* foil, a centered gold "coin" (radial-gradient circle with a ★),
    plus engraved labels **"SCRATCH TO REVEAL"** (Archivo 800, 19px, `#5f4815`) and
    **"drag across the panel"** (Space Mono 400, 12.5px, `rgba(95,72,21,0.8)`).
  - A finger emoji 👆 hint (34px) wiggles near 62% height until the first scratch; hidden once scratching starts or after reveal. Suppressed under `prefers-reduced-motion`.
  - A white radial "flash" overlay plays a 700ms fade animation at the moment of reveal.

  **Verdict line**
  - Text: `✦  REVEALED — you scratched it clean  ✦`
  - Space Mono 400, 12px, letter-spacing 0.08em, color `--gold-deep`.
  - `opacity: 0` → `1` over 0.4s when revealed; renders a non-breaking space when hidden so layout height stays stable (height pinned at 20px).

  **"I want new" button**
  - Full width, inline-flex, centered, `gap: 10px`, contents: label "I want new" + arrow "→".
  - Archivo 700, 16px, white text, `white-space: nowrap`.
  - Background `linear-gradient(180deg,#cf4a40,#b1392f)`, `border-radius: 12px`, padding `15px 20px`.
  - Shadow: `0 1px 0 rgba(255,255,255,0.25) inset, 0 8px 16px -8px rgba(177,57,47,0.8)`.
  - Hover: `brightness(1.05)` + `translateY(-1px)`, arrow nudges `translateX(3px)` (0.15s).
  - Active: `translateY(1px)`, inset shadow only.

## Interactions & Behavior

### Scratch Mechanic (the core — reproduce this carefully)
1. **Setup**: size the canvas bitmap to its CSS box × `devicePixelRatio`, then
   `ctx.setTransform(dpr,0,0,dpr,0,0)` so you can draw in CSS pixels. Paint the foil
   (gradient + sheen + repeated diagonal "SCRATCH HERE" text + grain + coin + labels).
2. **Scratching**: on pointer down/move, draw with
   `ctx.globalCompositeOperation = "destination-out"` to erase the foil to transparency:
   - a round-capped line from the last point to the current point, `lineWidth = BRUSH*2`;
   - plus a filled arc of radius `BRUSH` at the current point (so taps and direction changes erase cleanly).
   - `BRUSH = 24` (CSS px radius).
   - Track the previous point; reset it to `null` on pointer up so segments don't jump.
3. **Reveal detection**: every ~6 move events, call `getImageData` over the whole canvas and
   sample the alpha channel with a stride (every 50th pixel for performance). Compute the
   fraction with `alpha === 0`. When it reaches **`REVEAL_THRESHOLD = 0.58`**, trigger reveal.
4. **Reveal**: fade the entire canvas `opacity → 0` over 620ms (CSS transition), set
   `pointer-events: none`, fire the flash animation + confetti, and show the verdict line.
5. **New image** ("I want new"): pick a not-yet-seen random index, add it to the seen set,
   reset `revealed`, and repaint a fresh foil at full opacity. (Re-run setup.)

Input handling must support **both** mouse (`mousedown/move/up/leave`) and touch
(`touchstart/move/end`); read `e.touches[0]` when present. Call `preventDefault()` on touch
to stop the page scrolling/selecting while scratching. `touch-action: none` on the canvas.
Repaint the foil on window resize (debounced ~150ms) **only when not yet revealed**.

### No-repeat session tracking
- Maintain a `Set` of shown image indices for the session (in-memory; resets on full reload).
- `pickRandom(seen, current)`: choose from indices **not** in `seen`. If all have been seen,
  reset the pool to everything except the current image; then add the chosen index to `seen`.

### Confetti
- One-shot particle burst on reveal, drawn on a fixed full-viewport overlay canvas (z-index 50, `pointer-events: none`).
- ~130 particles, mix of small rects and circles, launched upward from ~42% height with gravity, rotation, slight horizontal drift; fade out after ~1.4s; stop after ~3s.
- Colors: `["#c9a227","#e9d585","#d6453d","#2f9c8b","#ffffff","#e8923a"]`.

## State Management
- `imgIdx: number` — index into the image list currently shown.
- `revealed: boolean` — whether the current ticket has been revealed.
- `seen: Set<number>` — indices already shown this session (held in a ref, not reactive).
- Refs for the canvas, the 2D context, `drawing` (pointer down), `last` point, a move counter, and a "started" flag (controls the finger hint).
- Triggers: pointer events → scratch + threshold check → `revealed = true`; button click → new `imgIdx` + `revealed = false` + repaint.
- No data fetching. Images are static assets, bundled.

## Design Tokens

### Colors (CSS custom properties on `:root`)
| Token | Value |
|---|---|
| `--paper` | `oklch(0.955 0.012 85)` |
| `--paper-2` | `oklch(0.93 0.018 80)` |
| `--ink` | `oklch(0.22 0.018 60)` |
| `--ink-soft` | `oklch(0.42 0.02 60)` |
| `--gold` | `oklch(0.78 0.11 90)` |
| `--gold-deep` | `oklch(0.62 0.11 85)` |
| `--accent` (button red) | `oklch(0.58 0.17 28)` |
| `--line` (borders) | `oklch(0.86 0.02 80)` |

Page background: `radial-gradient(120% 80% at 50% -10%, oklch(0.97 0.02 88), oklch(0.93 0.025 75) 60%, oklch(0.9 0.03 70))`.
Card background: `linear-gradient(180deg, oklch(0.985 0.008 90), oklch(0.955 0.014 85))`.
Button gradient: `linear-gradient(180deg, #cf4a40, #b1392f)`.

### Foil gradient (canvas, diagonal 0,0 → w,h)
`#ecd98f` @0 · `#bd9438` @0.38 · `#d8b552` @0.52 · `#b48a30` @0.70 · `#9c7a2b` @1.0.
Engraved text color `#6e5417` (≈16% alpha), labels `#5f4815`.

### Typography
- **Display / UI**: `Archivo` (Google Fonts), weights 400–900.
- **Mono / captions / engraved text**: `Space Mono` (Google Fonts), 400/700.
- Button: Archivo 700, 16px. Verdict: Space Mono 400, 12px / 0.08em.

### Spacing / radius / shadow
- Card radius `22px`, window radius `14px`, button radius `12px`.
- Card padding `18px 18px 16px`; button padding `15px 20px`.
- Card shadow: `0 1px 0 rgba(255,255,255,0.8) inset, 0 18px 40px -18px rgba(70,50,10,0.45), 0 4px 14px -6px rgba(70,50,10,0.3)`.
- Perforation: `2px dashed var(--line)`, bled to card edges with negative margins.

### Behavior constants
- `BRUSH = 24` (scratch radius, CSS px)
- `REVEAL_THRESHOLD = 0.58`
- Reveal fade `620ms ease`; flash `700ms`; verdict fade `400ms`.

## Assets
- `assets/art-01.png` … `art-08.png` — **placeholder** abstract gradient art, generated for
  this prototype, each **1122×1402px** (4:5 portrait). **Replace these with the real images.**
  Real images are expected to be 1122×1402; the window aspect ratio matches so they fill
  without cropping. To use more or fewer images, edit the `IMAGES` array (in `app.jsx`).
- Fonts loaded from Google Fonts (Archivo, Space Mono). In a real app, self-host or use the
  codebase's existing font pipeline.
- No icon library — the ★, ✦, → and 👆 are plain Unicode glyphs.

## Files
- `Scratcher.html` — HTML shell: fonts, CSS variables, background, React/Babel script tags, mount point.
- `app.jsx` — all logic: image list + no-repeat picker, `paintFoil()`, `burstConfetti()`, the `ScratchCard` component (canvas + pointer handling + reveal detection), the `App` component, and the injected stylesheet.
- `assets/art-01.png` … `art-08.png` — placeholder reveal images (1122×1402).
