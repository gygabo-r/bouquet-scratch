import { useCallback, useEffect, useRef, useState } from "react";
import { IMAGES } from "./images.ts";
import { paintFoil } from "./foil.ts";

const REVEAL_THRESHOLD = 0.99; // cleared fraction that marks the ticket revealed
const BRUSH = 24; // scratch radius in CSS px
const SAMPLE_EVERY_N_MOVES = 6; // run reveal detection every Nth move event
const ALPHA_STRIDE = 50; // sample every Nth pixel's alpha when measuring clearance
const RESIZE_DEBOUNCE_MS = 150;

type Point = { x: number; y: number };

interface ScratchCardProps {
  imgIdx: number;
  revealed: boolean;
  onRevealed: () => void;
}

export function ScratchCard({ imgIdx, revealed, onRevealed }: ScratchCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const drawing = useRef(false);
  const last = useRef<Point | null>(null);
  const moveCount = useRef(0);
  // Mirrors of state, read synchronously inside event handlers (whose closures
  // would otherwise capture a stale `revealed` prop / `started` state).
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
      }, RESIZE_DEBOUNCE_MS);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [setup, revealed]);

  const pos = (e: MouseEvent | TouchEvent): Point => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const pt = "touches" in e ? e.touches[0] : e;
    return { x: pt.clientX - rect.left, y: pt.clientY - rect.top };
  };

  // Fraction of the foil cleared, sampling every ALPHA_STRIDE-th pixel's alpha.
  const computeCleared = () => {
    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return 0;
    const { width, height } = canvas;
    const data = ctx.getImageData(0, 0, width, height).data;
    let cleared = 0;
    let total = 0;
    // i starts at 3 (the alpha byte of the first RGBA pixel).
    for (let i = 3; i < data.length; i += 4 * ALPHA_STRIDE) {
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

  // Reveal once enough foil is gone; a no-op after the reveal has fired, so
  // the user stays free to keep scratching off whatever foil is left.
  const maybeFinish = () => {
    if (!revealedRef.current && computeCleared() >= REVEAL_THRESHOLD) finish();
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
    if (++moveCount.current % SAMPLE_EVERY_N_MOVES === 0) maybeFinish();
  };

  const up = () => {
    if (drawing.current) maybeFinish();
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
