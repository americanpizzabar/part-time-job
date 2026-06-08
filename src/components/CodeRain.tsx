"use client";

import { useEffect, useRef } from "react";

interface CodeRainProps {
  color?: string;
  opacity?: number;
}

/**
 * マトリックス風「コード・ストリーム」背景。
 * 緑/白のソースコード片が縦に高速で流れ落ちる。裏モードの没入感を演出する。
 * pointer-events:none で操作は透過する。
 */
export default function CodeRain({ color = "#22c55e", opacity = 0.18 }: CodeRainProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const GLYPHS = "01{}<>[]();=+*/$#&|アイウエオカキクケコサシスセソ0123456789ABCDEF".split("");
    let width = 0, height = 0, columns = 0;
    let drops: number[] = [];
    const fontSize = 14;

    function resize() {
      width = canvas!.clientWidth;
      height = canvas!.clientHeight;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas!.width = width * dpr;
      canvas!.height = height * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      columns = Math.ceil(width / fontSize);
      drops = Array.from({ length: columns }, () => Math.floor((Math.random() * height) / fontSize));
    }
    resize();

    let raf = 0;
    let last = 0;
    const interval = 55; // ms — 流れる速度

    function frame(t: number) {
      raf = requestAnimationFrame(frame);
      if (t - last < interval) return;
      last = t;

      ctx!.fillStyle = "rgba(5,6,10,0.16)"; // 残像(フェード)
      ctx!.fillRect(0, 0, width, height);
      ctx!.font = `${fontSize}px monospace`;

      for (let i = 0; i < columns; i++) {
        const ch = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        const x = i * fontSize;
        const y = drops[i] * fontSize;
        // 先頭の1文字を白く光らせる
        ctx!.fillStyle = Math.random() > 0.975 ? "#e2fbe8" : color;
        ctx!.fillText(ch, x, y);
        if (y > height && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      }
    }
    raf = requestAnimationFrame(frame);

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [color]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ opacity }}
      aria-hidden
    />
  );
}
