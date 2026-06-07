const CONFETTI_COLORS = ["#c9a227", "#e9d585", "#d6453d", "#2f9c8b", "#ffffff", "#e8923a"];

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  g: number;
  s: number;
  rot: number;
  vr: number;
  c: string;
  shape: "r" | "c";
  life: number;
}

// One-shot confetti burst on the given full-viewport overlay canvas.
// Returns a cancel function that stops the animation early.
export function burstConfetti(canvas: HTMLCanvasElement): () => void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return () => {};
  // Capture as a non-null const so the narrowing survives into `frame` below
  // (TS widens `ctx` back to `... | null` inside the nested closure).
  const c = ctx;
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.clientWidth;
  const H = canvas.clientHeight;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  c.scale(dpr, dpr);

  const parts: Particle[] = [];
  const n = 130;
  for (let i = 0; i < n; i++) {
    parts.push({
      x: W / 2 + (Math.random() - 0.5) * W * 0.3,
      y: H * 0.42,
      vx: (Math.random() - 0.5) * 13,
      vy: -7 - Math.random() * 11,
      g: 0.32 + Math.random() * 0.12,
      s: 5 + Math.random() * 7,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.4,
      c: CONFETTI_COLORS[(Math.random() * CONFETTI_COLORS.length) | 0],
      shape: Math.random() > 0.5 ? "r" : "c",
      life: 1,
    });
  }

  let raf = 0;
  const start = performance.now();
  function frame(t: number) {
    const elapsed = t - start;
    c.clearRect(0, 0, W, H);
    let alive = false;
    for (const p of parts) {
      p.vy += p.g;
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.99;
      p.rot += p.vr;
      if (elapsed > 1400) p.life -= 0.04;
      if (p.life > 0 && p.y < H + 30) alive = true;
      c.save();
      c.globalAlpha = Math.max(0, p.life);
      c.translate(p.x, p.y);
      c.rotate(p.rot);
      c.fillStyle = p.c;
      if (p.shape === "r") c.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6);
      else {
        c.beginPath();
        c.arc(0, 0, p.s / 2, 0, Math.PI * 2);
        c.fill();
      }
      c.restore();
    }
    if (alive && elapsed < 3000) raf = requestAnimationFrame(frame);
    else c.clearRect(0, 0, W, H);
  }
  raf = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(raf);
}
