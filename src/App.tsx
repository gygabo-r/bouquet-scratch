import { useCallback, useEffect, useRef, useState } from "react";
import { IMAGES, pickRandom } from "./images.ts";
import { paintFoil } from "./foil.ts";
import { burstConfetti } from "./confetti.ts";

const REVEAL_THRESHOLD = 0.99; // cleared fraction that marks the ticket revealed
const BRUSH = 24; // scratch radius in CSS px

interface ScratchCardProps {
  imgIdx: number;
  revealed: boolean;
  onRevealed: () => void;
}

function ScratchCard({ imgIdx, revealed, onRevealed }: ScratchCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const moveCount = useRef(0);
  const startedRef = useRef(false);
  const revealedRef = useRef(false);
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
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctxRef.current = ctx;
    paintFoil(ctx, rect.width, rect.height);
    drawing.current = false;
    last.current = null;
    moveCount.current = 0;
    startedRef.current = false;
    revealedRef.current = false;
    setStarted(false);
  }, []);

  // (re)paint when the image changes
  useEffect(() => {
    setup();
  }, [imgIdx, setup]);

  // Repaint once fonts are ready so the engraved labels use the real
  // typeface rather than a fallback baked into the bitmap. Only safe while
  // the user hasn't started scratching and the ticket isn't revealed.
  useEffect(() => {
    let cancelled = false;
    document.fonts.ready.then(() => {
      if (!cancelled && !startedRef.current && !revealedRef.current) setup();
    });
    return () => {
      cancelled = true;
    };
  }, [imgIdx, setup]);

  // repaint on resize (debounced) while not yet revealed
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const onResize = () => {
      clearTimeout(t);
      t = setTimeout(() => {
        if (!revealed) setup();
      }, 150);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [setup, revealed]);

  const pos = (e: MouseEvent | TouchEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const pt = "touches" in e ? e.touches[0] : e;
    return { x: pt.clientX - rect.left, y: pt.clientY - rect.top };
  };

  // Fraction of the foil cleared, sampling every 50th pixel's alpha.
  const computeCleared = () => {
    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return 0;
    const { width, height } = canvas;
    const data = ctx.getImageData(0, 0, width, height).data;
    let cleared = 0;
    let total = 0;
    for (let i = 3; i < data.length; i += 4 * 50) {
      total++;
      if (data[i] === 0) cleared++;
    }
    return total === 0 ? 0 : cleared / total;
  };

  const scratch = (x: number, y: number) => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    ctx.globalCompositeOperation = "destination-out";
    ctx.lineWidth = BRUSH * 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (last.current) {
      ctx.beginPath();
      ctx.moveTo(last.current.x, last.current.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(x, y, BRUSH, 0, Math.PI * 2);
    ctx.fill();
    last.current = { x, y };
  };

  // Mark revealed once. The leftover foil is intentionally NOT cleared.
  const finish = () => {
    if (revealedRef.current) return;
    revealedRef.current = true;
    drawing.current = false;
    onRevealed();
  };

  const down = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    drawing.current = true;
    if (!startedRef.current) {
      startedRef.current = true;
      setStarted(true);
    }
    const p = pos(e.nativeEvent);
    last.current = null;
    scratch(p.x, p.y);
  };

  const move = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing.current) return;
    e.preventDefault();
    const p = pos(e.nativeEvent);
    scratch(p.x, p.y);
    // Detection only matters until the reveal fires; after that the user is
    // free to keep scratching off whatever foil is left.
    if (!revealedRef.current && ++moveCount.current % 6 === 0 && computeCleared() >= REVEAL_THRESHOLD)
      finish();
  };

  const up = () => {
    if (drawing.current && !revealedRef.current && computeCleared() >= REVEAL_THRESHOLD) finish();
    drawing.current = false;
    last.current = null;
  };

  return (
    <div className="scratch-wrap">
      <img className="prize-img" src={IMAGES[imgIdx]} alt="" draggable={false} />
      <div className={"reveal-flash" + (revealed ? " on" : "")}></div>
      <canvas
        ref={canvasRef}
        className="scratch-canvas"
        onMouseDown={down}
        onMouseMove={move}
        onMouseUp={up}
        onMouseLeave={up}
        onTouchStart={down}
        onTouchMove={move}
        onTouchEnd={up}
      ></canvas>
      {!started && !revealed && <div className="finger-hint">👆</div>}
    </div>
  );
}

export default function App() {
  const seen = useRef<Set<number>>(new Set());
  const [imgIdx, setImgIdx] = useState<number>(() => {
    const first = pickRandom(seen.current, -1);
    seen.current.add(first);
    return first;
  });
  const [revealed, setRevealed] = useState(false);
  const confettiRef = useRef<HTMLCanvasElement>(null);

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
          <div className="corner tl"></div>
          <div className="corner tr"></div>
          <div className="corner bl"></div>
          <div className="corner br"></div>
        </div>

        <div className={"verdict" + (revealed ? " show" : "")}>
          {revealed ? "✦  REVEALED — you scratched it clean  ✦" : " "}
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
