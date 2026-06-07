# PRD: Scratch-to-Reveal Ticket

## Overview

A single-screen PWA: a gold foil "scratch-off lottery ticket". A foil panel sits over a randomly chosen seasonal image; the user drags (mouse or touch) to scratch the foil away and reveal the image beneath. A single **"I want new"** button loads another random image.

The app tracks which images have been shown **within the current session** and avoids repeating one until the whole set has cycled through, then resets.

No title, counter, ticket number, or other chrome — just the ticket and one button.

---

## Deployment

- **Host**: GitHub Pages — `https://gygabo-r.github.io/bouquet-scratch/`
- **Trigger**: push to `main` (or manual `workflow_dispatch`)
- **Pipeline** (`.github/workflows/deploy.yml`):
  1. `npm ci` → `npm run build`
  2. Upload `dist/` as a Pages artifact
  3. Deploy via the official `actions/deploy-pages` action
- Concurrent deployments are cancelled (only the latest push wins).
- **Vite base**: must be set to `'/bouquet-scratch/'` in `vite.config.ts` so all asset paths resolve correctly under the sub-path.
- GitHub repo settings: **Pages → Source** must be set to **"GitHub Actions"**.

---

## Stack

- **React 19 + TypeScript**, bundled with **Vite**
- **PWA** — installable only, no offline/caching requirements
  - A `manifest.webmanifest` in `public/` with a `<link rel="manifest">` in `index.html`; Vite copies it to the build output automatically — no plugin needed
  - Icon asset to be supplied separately (manifest `icons` array left empty in the interim)
  - No in-app install prompt or pinning UI — users who know how to pin can; others don't need to

---

## Images

Three seasonal reveal images, all **1122 × 1402 px** (4 : 5 portrait):

| File | Season |
|---|---|
| `assets/autumn.png` | Autumn |
| `assets/spring.png` | Spring |
| `assets/summer.png` | Summer |

Images are static assets bundled with the app. To add more, extend the `IMAGES` array.

---

## Screen: Scratch Ticket (the only screen)

### Layout

- Full-viewport stage, content centered on both axes.
- Warm-cream radial background + subtle film-grain overlay (fixed, `pointer-events: none`).
- A single centered **ticket card**: `width: min(440px, 100%)`, flex column.
- Card padding `18px 18px 16px`, `border-radius: 22px`, 1 px border, layered drop shadow.
- Two notch circles punched into the card's left & right mid-edges (classic ticket look), implemented with `::before` / `::after`.

Inside the card, top → bottom:

1. **Window** — image + scratch canvas, `aspect-ratio: 1122/1402`, `border-radius: 14px`, dark `#111` backing.
2. **Verdict line** — single centered caption, hidden until revealed.
3. **Perforation** — 2 px dashed horizontal divider that bleeds to card edges.
4. **"I want new" button** — full width.

### Window (image + scratch canvas)

Two absolutely-stacked layers filling the window:

- `<img>` (`object-fit: cover`, full size, non-draggable) — the prize image.
- `<canvas>` on top, same size, `cursor: crosshair`, `touch-action: none`.

Decorative elements on top of the canvas layer (pointer-events none):

- Four L-shaped corner brackets — 2 px, `rgba(255,255,255,0.65)`, 14 × 14 px, inset 8 px.
- On the **un-scratched foil**: centered gold "coin" (radial-gradient circle with a ★) + engraved labels **"SCRATCH TO REVEAL"** (Archivo 800, 19 px, `#5f4815`) and **"drag across the panel"** (Space Mono 400, 12.5 px, `rgba(95,72,21,0.8)`).
- A 👆 finger emoji hint (34 px) that wiggles near 62 % height until the first scratch stroke; hidden once scratching starts or after reveal. Suppressed under `prefers-reduced-motion`.
- A white radial "flash" overlay that plays a 700 ms fade animation at the moment of reveal.

### Verdict line

- Text: `✦  REVEALED — you scratched it clean  ✦`
- Space Mono 400, 12 px, letter-spacing 0.08 em, color `--gold-deep`.
- `opacity: 0 → 1` over 0.4 s when revealed; renders `&nbsp;` when hidden so layout height stays stable (height pinned at 20 px).

### "I want new" button

- Full width, inline-flex, centered, `gap: 10px`; label "I want new" + arrow "→".
- Archivo 700, 16 px, white text, `white-space: nowrap`.
- Background `linear-gradient(180deg, #cf4a40, #b1392f)`, `border-radius: 12px`, padding `15px 20px`.
- Shadow: `0 1px 0 rgba(255,255,255,0.25) inset, 0 8px 16px -8px rgba(177,57,47,0.8)`.
- Hover: `brightness(1.05)` + `translateY(-1px)`, arrow nudges `translateX(3px)` (0.15 s).
- Active: `translateY(1px)`, inset shadow only.

---

## Interactions & Behavior

### Scratch Mechanic

1. **Setup**: size the canvas bitmap to its CSS box × `devicePixelRatio`, then `ctx.setTransform(dpr,0,0,dpr,0,0)` so all drawing uses CSS pixels. Paint the foil (gradient + sheen bands + repeated diagonal "SCRATCH HERE" text + grain + coin + labels). Use `{ willReadFrequently: true }` on `getContext`.
2. **Scratching**: on pointer down/move, draw with `ctx.globalCompositeOperation = "destination-out"`:
   - A round-capped line from the previous point to the current point, `lineWidth = BRUSH * 2`.
   - A filled arc of radius `BRUSH` at the current point (so taps and direction changes erase cleanly).
   - `BRUSH = 24` (CSS px radius).
   - Track the previous point; reset it to `null` on pointer up so segments don't jump across gaps.
3. **No auto-reveal** — the foil must be scratched away entirely by the user. There is no threshold that clears the rest automatically.
4. **Reveal**: when the user lifts the pointer after scratching, the reveal is declared when the foil is gone enough that the image is clearly visible. Concretely: on pointer up, if the cleared fraction (sampled alpha) exceeds **`REVEAL_THRESHOLD = 0.90`**, trigger reveal — fade the canvas `opacity → 0` over 620 ms (CSS transition), set `pointer-events: none`, fire the flash animation + confetti, show the verdict line.
5. **New image** ("I want new"): pick a not-yet-seen random index, add it to the seen set, reset `revealed`, and repaint a fresh foil at full opacity. Scroll the window to top if needed.

Input must support **both** mouse (`mousedown / mousemove / mouseup / mouseleave`) and touch (`touchstart / touchmove / touchend`); read `e.touches[0]` when present. Call `e.preventDefault()` on touch events to stop page scroll/selection. Repaint the foil on window resize (debounced ~150 ms) **only when not yet revealed**.

### No-repeat session tracking

- Maintain a `Set<number>` of shown indices in a ref (in-memory; resets on full reload).
- `pickRandom(seen, current)`: choose from indices **not** in `seen`. If all have been seen, reset the pool to everything except the current image; then add the chosen index to `seen`.

### Confetti

- One-shot particle burst on reveal, drawn on a fixed full-viewport overlay canvas (`z-index: 50`, `pointer-events: none`).
- ~130 particles, mix of small rects and circles, launched upward from ~42 % height with gravity, rotation, slight horizontal drift; fade out after ~1.4 s; stop after ~3 s.
- Colors: `["#c9a227","#e9d585","#d6453d","#2f9c8b","#ffffff","#e8923a"]`.

---

## State

| Name | Type | Notes |
|---|---|---|
| `imgIdx` | `number` | Index into the image list currently shown |
| `revealed` | `boolean` | Whether the current ticket has been revealed |
| `seen` | `Set<number>` (ref) | Indices already shown this session — not reactive |

Refs: canvas, 2D context, `drawing` (pointer down flag), `last` point, move counter, `started` flag (controls finger hint).

---

## Design Tokens

### CSS custom properties (`:root`)

| Token | Value |
|---|---|
| `--paper` | `oklch(0.955 0.012 85)` |
| `--paper-2` | `oklch(0.93 0.018 80)` |
| `--ink` | `oklch(0.22 0.018 60)` |
| `--ink-soft` | `oklch(0.42 0.02 60)` |
| `--gold` | `oklch(0.78 0.11 90)` |
| `--gold-deep` | `oklch(0.62 0.11 85)` |
| `--accent` | `oklch(0.58 0.17 28)` |
| `--line` | `oklch(0.86 0.02 80)` |

Page background: `radial-gradient(120% 80% at 50% -10%, oklch(0.97 0.02 88), oklch(0.93 0.025 75) 60%, oklch(0.9 0.03 70))`.  
Card background: `linear-gradient(180deg, oklch(0.985 0.008 90), oklch(0.955 0.014 85))`.  
Button gradient: `linear-gradient(180deg, #cf4a40, #b1392f)`.

### Foil gradient (canvas, diagonal 0,0 → w,h)

`#ecd98f` @0 · `#bd9438` @0.38 · `#d8b552` @0.52 · `#b48a30` @0.70 · `#9c7a2b` @1.0.  
Engraved text color `#6e5417` (≈16 % alpha), labels `#5f4815`.

### Typography

- **Display / UI**: `Archivo` (Google Fonts), weights 400–900.
- **Mono / captions / engraved**: `Space Mono` (Google Fonts), 400 / 700.
- Button: Archivo 700, 16 px. Verdict: Space Mono 400, 12 px / 0.08 em.

### Spacing / radius / shadow

| Property | Value |
|---|---|
| Card radius | `22px` |
| Window radius | `14px` |
| Button radius | `12px` |
| Card padding | `18px 18px 16px` |
| Button padding | `15px 20px` |
| Card shadow | `0 1px 0 rgba(255,255,255,0.8) inset, 0 18px 40px -18px rgba(70,50,10,0.45), 0 4px 14px -6px rgba(70,50,10,0.3)` |
| Perforation | `2px dashed var(--line)`, negative margins to bleed to card edges |

### Behavior constants

| Constant | Value |
|---|---|
| `BRUSH` | `24` (CSS px scratch radius) |
| `REVEAL_THRESHOLD` | `0.90` (fraction of foil cleared before reveal triggers on pointer up) |
| Reveal fade | `620ms ease` |
| Flash duration | `700ms` |
| Verdict fade | `400ms` |

---

## PWA Manifest

```json
{
  "name": "Scratch & Reveal",
  "short_name": "Scratch",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#f0e8d8",
  "theme_color": "#f0e8d8",
  "icons": []
}
```

Icons: placeholder until the asset is delivered. Once the icon file is provided, add the required sizes (192 × 192, 512 × 512, maskable variant) to the manifest.

---

## Out of Scope

- Any in-app install / "Add to Home Screen" prompt or banner.
- Ticket number, series label, or any other header chrome.
- Server-side logic, authentication, or persistence beyond the current session.
- Auto-clearing the foil — the user must scratch it themselves.
