"use client";

import { useMemo } from "react";

interface ConfettiProps {
  count?: number;
  colors?: string[];
}

// 画面全体に降る紙吹雪(CSSアニメ)
export default function Confetti({ count = 60, colors }: ConfettiProps) {
  const palette = colors ?? ["#f59e0b", "#3b82f6", "#ec4899", "#22c55e", "#a855f7", "#fde047"];
  const pieces = useMemo(
    () =>
      Array.from({ length: count }).map((_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.6,
        duration: 1.6 + Math.random() * 1.8,
        color: palette[i % palette.length],
        rotate: Math.random() * 360,
        round: Math.random() > 0.6,
        size: 7 + Math.random() * 8,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [count]
  );

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-[90]">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            background: p.color,
            width: p.size,
            height: p.round ? p.size : p.size * 1.4,
            borderRadius: p.round ? "50%" : "2px",
            transform: `rotate(${p.rotate}deg)`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  );
}
