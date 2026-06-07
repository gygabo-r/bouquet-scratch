import { useRef, useState } from "react";
import { pickRandom } from "./images.ts";
import { burstConfetti } from "./confetti.ts";
import { ScratchCard } from "./ScratchCard.tsx";

export default function App() {
  const [imgIdx, setImgIdx] = useState(() => pickRandom(new Set<number>(), -1));
  const seen = useRef<Set<number>>(new Set([imgIdx]));
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
          {revealed ? "✦  REVEALED — you scratched it clean  ✦" : " "}
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
