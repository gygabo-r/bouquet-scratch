const CONFETTI_COLORS = ["#c9a227", "#e9d585", "#d6453d", "#2f9c8b", "#ffffff", "#e8923a"];

const FLAKE_COUNT = 130;
const SPAWN_Y_FRACTION = 0.42; // launch height as a fraction of canvas height
const DRAG = 0.99; // horizontal velocity damping per frame
const FADE_START_MS = 1400; // flakes begin fading after this long
const FADE_PER_FRAME = 0.04; // life lost per frame once fading
const MAX_DURATION_MS = 3000; // hard stop for the animation
const OFFSCREEN_MARGIN = 30; // px below the canvas before a flake is "dead"

class Flake {
  x: number;
  y: number;
  vx: number; // velocity x (px/frame)
  vy: number; // velocity y (px/frame)
  gravity: number; // added to vy each frame
  size: number; // rect/circle dimension in px
  rotation: number; // current angle in radians
  spin: number; // rotation change per frame
  color: string;
  shape: "rect" | "circle";
  life = 1; // opacity / remaining lifetime, 1 -> 0

  constructor(w: number, h: number) {
    this.x = w / 2 + (Math.random() - 0.5) * w * 0.3;
    this.y = h * SPAWN_Y_FRACTION;
    this.vx = (Math.random() - 0.5) * 13;
    this.vy = -7 - Math.random() * 11;
    this.gravity = 0.32 + Math.random() * 0.12;
    this.size = 5 + Math.random() * 7;
    this.rotation = Math.random() * Math.PI;
    this.spin = (Math.random() - 0.5) * 0.4;
    this.color = CONFETTI_COLORS[(Math.random() * CONFETTI_COLORS.length) | 0];
    this.shape = Math.random() > 0.5 ? "rect" : "circle";
  }

  update(fading: boolean): void {
    this.vy += this.gravity;
    this.x += this.vx;
    this.y += this.vy;
    this.vx *= DRAG;
    this.rotation += this.spin;
    if (fading) this.life -= FADE_PER_FRAME;
  }

  isAlive(h: number): boolean {
    return this.life > 0 && this.y < h + OFFSCREEN_MARGIN;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.life);
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.fillStyle = this.color;
    if (this.shape === "rect") {
      ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size * 0.6);
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

// One-shot confetti burst on the given full-viewport overlay canvas.
// Returns a cancel function that stops the animation early.
export function burstConfetti(canvas: HTMLCanvasElement): () => void {
  const maybeCtx = canvas.getContext("2d");
  if (!maybeCtx) return () => {};
  // Capture as a non-null const so the narrowing survives into `frame` below
  // (TS widens it back to `... | null` inside the nested closure).
  const ctx = maybeCtx;
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.clientWidth;
  const H = canvas.clientHeight;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.scale(dpr, dpr);

  const flakes = Array.from({ length: FLAKE_COUNT }, () => new Flake(W, H));

  let raf = 0;
  const start = performance.now();
  function frame(t: number) {
    const elapsed = t - start;
    ctx.clearRect(0, 0, W, H);
    const fading = elapsed > FADE_START_MS;
    let alive = false;
    for (const flake of flakes) {
      flake.update(fading);
      flake.draw(ctx);
      if (flake.isAlive(H)) alive = true;
    }
    if (alive && elapsed < MAX_DURATION_MS) raf = requestAnimationFrame(frame);
    else ctx.clearRect(0, 0, W, H);
  }
  raf = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(raf);
}
