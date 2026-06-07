// Paints the gold scratch-off foil onto a 2D context, sized in CSS pixels.
// The caller is responsible for the devicePixelRatio transform before calling.
export function paintFoil(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0.0, "#ecd98f");
  g.addColorStop(0.38, "#bd9438");
  g.addColorStop(0.52, "#d8b552");
  g.addColorStop(0.7, "#b48a30");
  g.addColorStop(1.0, "#9c7a2b");
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
    ctx.moveTo(i, 0);
    ctx.lineTo(i + 26, 0);
    ctx.lineTo(i + 26 + h, h);
    ctx.lineTo(i + h, h);
    ctx.closePath();
    ctx.fill();
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
  const cx = w / 2;
  const cy = h / 2;
  ctx.save();
  ctx.shadowColor = "rgba(80,55,0,0.4)";
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 2;
  const coinR = Math.min(w, h) * 0.11;
  const cg = ctx.createRadialGradient(
    cx - coinR * 0.3,
    cy - coinR * 0.4 - 38,
    coinR * 0.2,
    cx,
    cy - 38,
    coinR,
  );
  cg.addColorStop(0, "#fff3c4");
  cg.addColorStop(0.6, "#e6c356");
  cg.addColorStop(1, "#a9821f");
  ctx.fillStyle = cg;
  ctx.beginPath();
  ctx.arc(cx, cy - 38, coinR, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = "rgba(110,84,23,0.6)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy - 38, coinR * 0.78, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "#7a5d18";
  ctx.font = `800 ${coinR * 0.9}px "Archivo", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("★", cx, cy - 34);

  ctx.fillStyle = "#5f4815";
  ctx.font = '800 19px "Archivo", sans-serif';
  ctx.fillText("SCRATCH TO REVEAL", cx, cy + coinR + 6);
  ctx.font = '400 12.5px "Space Mono", monospace';
  ctx.fillStyle = "rgba(95,72,21,0.8)";
  ctx.fillText("drag across the panel", cx, cy + coinR + 30);
}
