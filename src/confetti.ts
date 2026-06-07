const CONFETTI_COLORS = ["#c9a227", "#e9d585", "#d6453d", "#2f9c8b", "#ffffff", "#e8923a"];

interface Particle {
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
  life: number; // opacity / remaining lifetime, 1 -> 0
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

  const parts: Particle[] = [];
  const n = 130;
  for (let i = 0; i < n; i++) {
    parts.push({
      x: W / 2 + (Math.random() - 0.5) * W * 0.3,
      y: H * 0.42,
      vx: (Math.random() - 0.5) * 13,
      vy: -7 - Math.random() * 11,
      gravity: 0.32 + Math.random() * 0.12,
      size: 5 + Math.random() * 7,
      rotation: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 0.4,
      color: CONFETTI_COLORS[(Math.random() * CONFETTI_COLORS.length) | 0],
      shape: Math.random() > 0.5 ? "rect" : "circle",
      life: 1,
    });
  }

  let raf = 0;
  const start = performance.now();
  function frame(t: number) {
    const elapsed = t - start;
    ctx.clearRect(0, 0, W, H);
    let alive = false;
    for (const p of parts) {
      p.vy += p.gravity;
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.99;
      p.rotation += p.spin;
      if (elapsed > 1400) p.life -= 0.04;
      if (p.life > 0 && p.y < H + 30) alive = true;
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;
      if (p.shape === "rect") ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      else {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    if (alive && elapsed < 3000) raf = requestAnimationFrame(frame);
    else ctx.clearRect(0, 0, W, H);
  }
  raf = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(raf);
}
