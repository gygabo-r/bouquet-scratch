# CLAUDE.md

Coding style and project-setup conventions. Apply these from the start so we don't have to
refactor into them later.

## Coding style

- **Descriptive names over terse ones.** No single-letter or cryptic identifiers except tiny
  loop counters. Prefer `ctx` over `c`, `gravity`/`rotation` over `g`/`rot`, `Flake` over
  `Particle`-style placeholders. Names should say what the thing is.
- **No magic numbers.** Pull literals into named `const`s near the top of the file with a unit
  in the name or a short comment (`FADE_START_MS`, `REVEAL_THRESHOLD`, `RESIZE_DEBOUNCE_MS`).
- **Small, single-purpose modules.** One component per file. Keep the top-level `App`/page a
  thin shell; push real logic into dedicated components and util modules.
- **Break up long imperative routines** into named steps. A long canvas/drawing function should
  read as a table of contents that calls `drawX` / `drawY` helpers.
- **Model entities as classes** when an object has both data and behavior (e.g. a particle with
  `update()` / `draw()` / `isAlive()`). One instance = one real thing; the loop body becomes
  readable.
- **Comment the *why*, not the *what*.** Especially non-obvious patterns (e.g. a ref that
  mirrors state so an event handler reads the latest value).
- **TypeScript strict.** After a null guard, capture into a non-null `const` so the narrowing
  survives into nested closures (`const ctx = maybeCtx`). Don't sprinkle `!`.
- **React rules.** Never read a ref's `.current` during render. Respect the `react-hooks`
  lint rules rather than disabling them.
- **Format consistently.** Match the surrounding file's style; keep comment density and naming
  idioms consistent.

## Setting up a project like this (Vite + React + TS, deployed to GitHub Pages as a PWA)

Do these up front — each one is something we had to retrofit:

1. **Scaffold** with Vite's `react-ts` template. Commit **both** `package.json` and
   `package-lock.json` (CI's `npm ci` and the Node cache need the lockfile).
2. **Set the base path** in `vite.config.ts` to the repo sub-path (`base: '/<repo>/'`) — Pages
   serves from `https://<user>.github.io/<repo>/`, and every asset URL must resolve under it.
3. **Add ESLint (flat config) + a `lint` script from day one.** `@eslint/js` +
   `typescript-eslint` + `react-hooks` + `react-refresh`, with `globals.browser` declared and
   `dist` ignored. Catching issues early is cheaper than refactoring later.
4. **Reference assets via ES `import`, never string paths.** Vite only hashes/rewrites imported
   URLs; hardcoded paths break under a sub-path. Keep assets in `src/assets/`.
5. **PWA manifest must be base-aware.** Put `manifest.webmanifest` in `public/`, set
   `start_url`/`scope` to the sub-path, and link it from `index.html` with `%BASE_URL%`
   (same for icon links). A root `start_url: "/"` 404s the installed app.
6. **Generate proper icon sizes** (192, 512 `purpose: any`, plus a maskable 512 padded to ~80%
   on a solid background) from one high-res source kept *out* of `public/` so it isn't shipped.
7. **Canvas + web fonts:** wait on `document.fonts.ready` before drawing text to a canvas, then
   repaint — otherwise a fallback font is baked into the bitmap.
8. **Deploy via GitHub Actions** (`actions/upload-pages-artifact` + `actions/deploy-pages`):
   run `npm ci` → `npm run lint` → `npm run build`, so lint failures block the deploy. Enable
   **Pages → Source → "GitHub Actions"** in repo settings before the first run.
