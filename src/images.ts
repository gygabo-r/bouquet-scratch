import autumn from "./assets/autumn.png";
import spring from "./assets/spring.png";
import summer from "./assets/summer.png";
import winter from "./assets/winter.png";

// Imported URLs are hashed and base-path-aware (see vite.config base).
export const IMAGES: string[] = [autumn, spring, summer, winter];

// Preload so reveals are instant.
IMAGES.forEach((src) => {
  const img = new Image();
  img.src = src;
});

// Pick a random image not yet shown this session. `seen` is a Set of indices
// already displayed; once everything has been seen the pool resets (but we
// still avoid immediately repeating the current image).
export function pickRandom(seen: Set<number>, current: number): number {
  let pool = IMAGES.map((_, i) => i).filter((i) => !seen.has(i));
  if (pool.length === 0) pool = IMAGES.map((_, i) => i).filter((i) => i !== current);
  if (pool.length === 0) pool = IMAGES.map((_, i) => i);
  return pool[Math.floor(Math.random() * pool.length)];
}
