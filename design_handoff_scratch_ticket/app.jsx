const { useRef, useState, useEffect, useCallback } = React;

/* ---------- assets ---------- */
const IMAGES = [
  "assets/art-01.png","assets/art-02.png","assets/art-03.png","assets/art-04.png",
  "assets/art-05.png","assets/art-06.png","assets/art-07.png","assets/art-08.png",
];
const CONFETTI_COLORS = ["#c9a227","#e9d585","#d6453d","#2f9c8b","#ffffff","#e8923a"];
const REVEAL_THRESHOLD = 0.58;   // fraction scratched before auto-clear
const BRUSH = 24;                // scratch radius in CSS px

/* preload so reveals are instant */
IMAGES.forEach((s) => { const i = new Image(); i.src = s; });

// Pick a random image not yet shown this session. `seen` is a Set of indices
// already displayed; once everything has been seen, the pool resets (but we
// still avoid immediately repeating the current image).
function pickRandom(seen, current) {
  let pool = IMAGES.map((_, i) => i).filter((i) => !seen.has(i));
  if (pool.length === 0) pool = IMAGES.map((_, i) => i).filter((i) => i !== current);
  if (pool.length === 0) pool = IMAGES.map((_, i) => i);
  return pool[Math.floor(Math.random() * pool.length)];
}

/* ---------- foil painting ---------- */
function paintFoil(ctx, w, h) {
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0.00, "#ecd98f");
  g.addColorStop(0.38, "#bd9438");
  g.addColorStop(0.52, "#d8b552");
  g.addColorStop(0.70, "#b48a30");
  g.addColorStop(1.00, "#9c7a2b");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // sheen bands
  ctx.save();
  ctx.globalCompositeOperation = "soft-light";
  for (let i = -h; i < w + h; i += 54) {
    const grad = ctx.createLinearGradient(i, 0, i + 26, h);
    grad.addColorStop(0, "rgba(255,255,255,0)");
    grad.addColorStop(0.5, "rgba(255,248,210,0.55)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(i, 0); ctx.lineTo(i + 26, 0); ctx.lineTo(i + 26 + h, h); ctx.lineTo(i + h, h);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();

  // repeated diagonal "SCRATCH HERE" texture
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.rotate(-Math.PI / 9);
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = "#6e5417";
  ctx.font = '700 17px "Space Mono", monospace';
  ctx.textBaseline = "middle";
  const phrase = "SCRATCH HERE  ✦  ";
  const unit = ctx.measureText(phrase).width;
  const span = Math.hypot(w, h) * 1.2;
  for (let y = -span / 2; y < span / 2; y += 34) {
    let line = "";
    while (ctx.measureText(line).width < span) line += phrase;
    ctx.fillText(line, -span / 2, y);
  }
  ctx.restore();

  // grain
  ctx.save();
  ctx.globalAlpha = 0.05;
  for (let i = 0; i < (w * h) / 90; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? "#fff" : "#000";
    ctx.fillRect(Math.random() * w, Math.random() * h, 1.4, 1.4);
  }
  ctx.restore();

  // centred coin + label
  const cx = w / 2, cy = h / 2;
  ctx.save();
  ctx.shadowColor = "rgba(80,55,0,0.4)";
  ctx.shadowBlur = 8; ctx.shadowOffsetY = 2;
  const coinR = Math.min(w, h) * 0.11;
  const cg = ctx.createRadialGradient(cx - coinR * 0.3, cy - coinR * 0.4 - 38, coinR * 0.2, cx, cy - 38, coinR);
  cg.addColorStop(0, "#fff3c4"); cg.addColorStop(0.6, "#e6c356"); cg.addColorStop(1, "#a9821f");
  ctx.fillStyle = cg;
  ctx.beginPath(); ctx.arc(cx, cy - 38, coinR, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = "rgba(110,84,23,0.6)"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(cx, cy - 38, coinR * 0.78, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = "#7a5d18";
  ctx.font = `800 ${coinR * 0.9}px "Archivo", sans-serif`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText("★", cx, cy - 34);

  ctx.fillStyle = "#5f4815";
  ctx.font = '800 19px "Archivo", sans-serif';
  ctx.fillText("SCRATCH TO REVEAL", cx, cy + coinR + 6);
  ctx.font = '400 12.5px "Space Mono", monospace';
  ctx.fillStyle = "rgba(95,72,21,0.8)";
  ctx.fillText("drag across the panel", cx, cy + coinR + 30);
}

/* ---------- confetti ---------- */
function burstConfetti(canvas) {
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.clientWidth, H = canvas.clientHeight;
  canvas.width = W * dpr; canvas.height = H * dpr; ctx.scale(dpr, dpr);
  const parts = [];
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
  let raf;
  const start = performance.now();
  function frame(t) {
    const elapsed = t - start;
    ctx.clearRect(0, 0, W, H);
    let alive = false;
    for (const p of parts) {
      p.vy += p.g; p.x += p.vx; p.y += p.vy; p.vx *= 0.99; p.rot += p.vr;
      if (elapsed > 1400) p.life -= 0.04;
      if (p.life > 0 && p.y < H + 30) alive = true;
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.c;
      if (p.shape === "r") ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6);
      else { ctx.beginPath(); ctx.arc(0, 0, p.s / 2, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
    }
    if (alive && elapsed < 3000) raf = requestAnimationFrame(frame);
    else ctx.clearRect(0, 0, W, H);
  }
  raf = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(raf);
}

/* ---------- scratch card ---------- */
function ScratchCard({ imgIdx, onRevealed, revealed }) {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const ctxRef = useRef(null);
  const drawing = useRef(false);
  const last = useRef(null);
  const moveCount = useRef(0);
  const startedRef = useRef(false);
  const [started, setStarted] = useState(false);

  const setup = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctxRef.current = ctx;
    paintFoil(ctx, rect.width, rect.height);
    canvas.style.opacity = "1";
    canvas.style.pointerEvents = "auto";
    drawing.current = false; last.current = null; moveCount.current = 0;
    startedRef.current = false; setStarted(false);
  }, []);

  // (re)paint when image changes
  useEffect(() => { setup(); }, [imgIdx, setup]);

  // handle resize
  useEffect(() => {
    let t;
    const onResize = () => { clearTimeout(t); t = setTimeout(() => { if (!revealed) setup(); }, 150); };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [setup, revealed]);

  const pos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const pt = e.touches ? e.touches[0] : e;
    return { x: pt.clientX - rect.left, y: pt.clientY - rect.top };
  };

  const computeCleared = () => {
    const ctx = ctxRef.current, canvas = canvasRef.current;
    if (!ctx) return 0;
    const { width, height } = canvas;
    const data = ctx.getImageData(0, 0, width, height).data;
    let cleared = 0, total = 0;
    for (let i = 3; i < data.length; i += 4 * 50) { total++; if (data[i] === 0) cleared++; }
    return cleared / total;
  };

  const scratch = (x, y) => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    ctx.globalCompositeOperation = "destination-out";
    ctx.lineWidth = BRUSH * 2;
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    if (last.current) {
      ctx.beginPath();
      ctx.moveTo(last.current.x, last.current.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(x, y, BRUSH, 0, Math.PI * 2); ctx.fill();
    last.current = { x, y };
  };

  const down = (e) => {
    if (revealed) return;
    e.preventDefault();
    drawing.current = true;
    if (!startedRef.current) { startedRef.current = true; setStarted(true); }
    const p = pos(e); last.current = null; scratch(p.x, p.y);
  };
  const move = (e) => {
    if (!drawing.current || revealed) return;
    e.preventDefault();
    const p = pos(e); scratch(p.x, p.y);
    if (++moveCount.current % 6 === 0) {
      if (computeCleared() >= REVEAL_THRESHOLD) finish();
    }
  };
  const up = () => { drawing.current = false; last.current = null; };

  const finish = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawing.current = false;
    canvas.style.transition = "opacity 620ms ease";
    canvas.style.opacity = "0";
    canvas.style.pointerEvents = "none";
    onRevealed();
    setTimeout(() => { if (canvas) canvas.style.transition = ""; }, 700);
  };

  return (
    <div className="scratch-wrap" ref={wrapRef}>
      <img className="prize-img" src={IMAGES[imgIdx]} alt="" draggable="false" />
      <div className={"reveal-flash" + (revealed ? " on" : "")}></div>
      <canvas
        ref={canvasRef}
        className="scratch-canvas"
        onMouseDown={down} onMouseMove={move} onMouseUp={up} onMouseLeave={up}
        onTouchStart={down} onTouchMove={move} onTouchEnd={up}
      ></canvas>
      {!started && !revealed && <div className="finger-hint">👆</div>}
    </div>
  );
}

/* ---------- app ---------- */
function App() {
  const seen = useRef(new Set());
  const [imgIdx, setImgIdx] = useState(() => {
    const first = pickRandom(seen.current, -1);
    seen.current.add(first);
    return first;
  });
  const [revealed, setRevealed] = useState(false);
  const confettiRef = useRef(null);

  const handleRevealed = () => {
    if (revealed) return;
    setRevealed(true);
    if (confettiRef.current) burstConfetti(confettiRef.current);
  };

  const newTicket = () => {
    setImgIdx((cur) => {
      const next = pickRandom(seen.current, cur);
      seen.current.add(next);
      return next;
    });
    setRevealed(false);
  };

  return (
    <div className="stage">
      <canvas className="confetti" ref={confettiRef}></canvas>

      <div className="ticket">
        <div className="window">
          <ScratchCard imgIdx={imgIdx} revealed={revealed} onRevealed={handleRevealed} />
          <div className="corner tl"></div><div className="corner tr"></div>
          <div className="corner bl"></div><div className="corner br"></div>
        </div>

        <div className={"verdict" + (revealed ? " show" : "")}>
          {revealed ? "✦  REVEALED — you scratched it clean  ✦" : "\u00A0"}
        </div>

        <div className="perf"></div>

        <button className="new-btn" onClick={newTicket}>
          <span>I want new</span>
          <span className="arr">→</span>
        </button>
      </div>
    </div>
  );
}

/* ---------- styles (injected) ---------- */
const css = `
.stage{ position:relative; width:min(440px,100%); z-index:1; display:flex; flex-direction:column; align-items:center; }
.confetti{ position:fixed; inset:0; width:100%; height:100%; pointer-events:none; z-index:50; }

.masthead{ text-align:center; margin-bottom:14px; }
.brand{ display:flex; align-items:center; justify-content:center; gap:14px; }
.brand h1{
  margin:0; font-size:clamp(32px,8vw,42px); font-weight:900; letter-spacing:0.04em;
  color:var(--ink);
  background:linear-gradient(180deg,#caa23a,#9c7a26 60%,#7c5f1c);
  -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent;
  text-shadow:0 1px 0 rgba(255,255,255,0.4);
}
.brand .star{ color:var(--accent); font-size:20px; transform:translateY(-3px); }
.tag{ margin:6px 0 0; font-size:13.5px; color:var(--ink-soft); font-weight:500; }

.ticket{
  width:100%;
  background:
    linear-gradient(180deg, oklch(0.985 0.008 90), oklch(0.955 0.014 85));
  border-radius:22px;
  padding:18px 18px 16px;
  box-shadow:
    0 1px 0 rgba(255,255,255,0.8) inset,
    0 18px 40px -18px rgba(70,50,10,0.45),
    0 4px 14px -6px rgba(70,50,10,0.3);
  border:1px solid var(--line);
  position:relative;
}
.ticket::before, .ticket::after{
  content:""; position:absolute; top:50%; width:26px; height:26px; border-radius:50%;
  background:radial-gradient(circle at 50% 50%, oklch(0.9 0.03 70) 0%, oklch(0.9 0.03 70) 60%, transparent 62%);
  background:#e7dcc7; transform:translateY(-50%);
  box-shadow:inset 0 0 0 1px var(--line);
}
.ticket::before{ left:-13px; }
.ticket::after{ right:-13px; }

.ticket-top{ display:flex; align-items:baseline; gap:8px; padding:2px 4px 12px; }
.ticket-top .label{ font-family:'Space Mono',monospace; font-size:12px; color:var(--ink-soft); }
.ticket-top .code{ font-family:'Space Mono',monospace; font-weight:700; font-size:15px; letter-spacing:0.06em; color:var(--ink); }
.ticket-top .series{ margin-left:auto; font-family:'Space Mono',monospace; font-size:10.5px; letter-spacing:0.18em; color:var(--gold-deep); border:1px solid var(--gold); padding:3px 8px; border-radius:999px; }

.window{
  position:relative; border-radius:14px; overflow:hidden;
  aspect-ratio:1122/1402;
  background:#111;
  box-shadow:inset 0 0 0 1px rgba(0,0,0,0.12), 0 8px 20px -12px rgba(0,0,0,0.5);
}
.scratch-wrap{ position:absolute; inset:0; }
.prize-img{ position:absolute; inset:0; width:100%; height:100%; object-fit:cover; user-select:none; -webkit-user-drag:none; }
.scratch-canvas{ position:absolute; inset:0; width:100%; height:100%; cursor:crosshair; touch-action:none; }

.reveal-flash{ position:absolute; inset:0; background:radial-gradient(circle at 50% 45%, rgba(255,255,255,0.9), transparent 60%); opacity:0; pointer-events:none; }
.reveal-flash.on{ animation:flash 700ms ease-out; }
@keyframes flash{ 0%{opacity:0;} 25%{opacity:0.85;} 100%{opacity:0;} }

.finger-hint{
  position:absolute; left:50%; top:62%; transform:translate(-50%,-50%);
  font-size:34px; pointer-events:none; filter:drop-shadow(0 3px 4px rgba(0,0,0,.3));
  animation:wiggle 1.5s ease-in-out infinite;
}
@keyframes wiggle{ 0%,100%{ transform:translate(-50%,-50%) rotate(-12deg);} 50%{ transform:translate(-30%,-40%) rotate(8deg);} }
@media (prefers-reduced-motion: reduce){ .finger-hint{ animation:none; } }

.corner{ position:absolute; width:14px; height:14px; border:2px solid rgba(255,255,255,0.65); pointer-events:none; }
.corner.tl{ top:8px; left:8px; border-right:0; border-bottom:0; border-radius:4px 0 0 0; }
.corner.tr{ top:8px; right:8px; border-left:0; border-bottom:0; border-radius:0 4px 0 0; }
.corner.bl{ bottom:8px; left:8px; border-right:0; border-top:0; border-radius:0 0 0 4px; }
.corner.br{ bottom:8px; right:8px; border-left:0; border-top:0; border-radius:0 0 4px 0; }

.verdict{ text-align:center; height:20px; margin:11px 0 4px; font-family:'Space Mono',monospace; font-size:12px; letter-spacing:0.08em; color:var(--gold-deep); opacity:0; transition:opacity .4s ease; }
.verdict.show{ opacity:1; }

.perf{ height:1px; margin:6px -18px 14px; border-top:2px dashed var(--line); position:relative; }

.new-btn{
  width:100%; display:inline-flex; align-items:center; justify-content:center; gap:10px;
  font-family:'Archivo',sans-serif; font-weight:700; font-size:16px; color:#fff; white-space:nowrap;
  background:linear-gradient(180deg,#cf4a40,#b1392f); border:0; border-radius:12px;
  padding:15px 20px; cursor:pointer;
  box-shadow:0 1px 0 rgba(255,255,255,0.25) inset, 0 8px 16px -8px rgba(177,57,47,0.8);
  transition:transform .12s ease, box-shadow .12s ease, filter .12s ease;
}
.new-btn:hover{ filter:brightness(1.05); transform:translateY(-1px); }
.new-btn:active{ transform:translateY(1px); box-shadow:0 1px 0 rgba(255,255,255,0.25) inset; }
.new-btn .arr{ transition:transform .15s ease; }
.new-btn:hover .arr{ transform:translateX(3px); }

.foot{ margin-top:18px; font-family:'Space Mono',monospace; font-size:11px; color:var(--ink-soft); text-align:center; opacity:0.8; }
`;
const styleEl = document.createElement("style");
styleEl.textContent = css;
document.head.appendChild(styleEl);

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
