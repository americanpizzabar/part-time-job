"use client";

import { useEffect, useState } from "react";
import Confetti from "@/components/Confetti";
import { playEvolution, playEvolutionFanfare, playRarityReveal } from "@/lib/sound";

interface BoostSequenceProps {
  mode: "boost" | "complete";
  amount?: number;        // ブースト額(mode=boost)
  projectName: string;
  onClose: () => void;
}

// 親のブーストエネルギー検出 → 合体シーケンス演出
export default function BoostSequence({ mode, amount, projectName, onClose }: BoostSequenceProps) {
  const [count, setCount] = useState(mode === "boost" ? 3 : -1);
  const [phase, setPhase] = useState<"countdown" | "burst">(mode === "boost" ? "countdown" : "burst");

  useEffect(() => {
    if (mode === "complete") {
      playEvolution();
      const t = setTimeout(playEvolutionFanfare, 600);
      return () => clearTimeout(t);
    }
    // boost: 3,2,1 → BURST
    playRarityReveal("RARE");
    const timers: ReturnType<typeof setTimeout>[] = [];
    [1, 2].forEach((n) => timers.push(setTimeout(() => setCount(3 - n), n * 700)));
    timers.push(
      setTimeout(() => {
        setPhase("burst");
        playEvolutionFanfare();
      }, 2100)
    );
    return () => timers.forEach(clearTimeout);
  }, [mode]);

  const accent = mode === "complete" ? "#fde047" : "#34d399";
  const bg = mode === "complete" ? "#f59e0b" : "#10b981";

  return (
    <div
      className="fixed inset-0 z-[95] flex flex-col items-center justify-center overflow-hidden text-center px-6"
      style={{ background: `radial-gradient(circle at 50% 45%, ${bg}, #05060a 75%)` }}
    >
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          className="w-[160vmax] h-[160vmax] ray-spin"
          style={{ background: `repeating-conic-gradient(from 0deg, ${accent}33 0deg 7deg, transparent 7deg 14deg)`, opacity: 0.5 }}
        />
      </div>

      {phase === "countdown" ? (
        <>
          <div className="text-cyan-200 text-sm tracking-[0.3em] mb-3 neon-flicker">
            親のブーストエネルギーを検出！
          </div>
          <div className="text-sm text-white/70 mb-6">合体シーケンス開始…</div>
          <div
            key={count}
            className="text-[120px] font-black leading-none reward-pop"
            style={{ color: "#fff", textShadow: `0 0 40px ${accent}` }}
          >
            {count > 0 ? count : "GO"}
          </div>
        </>
      ) : (
        <>
          <Confetti count={mode === "complete" ? 110 : 70} colors={[accent, bg, "#ffffff", "#fde047"]} />
          <div className="relative reward-pop">
            <div className="text-7xl mb-3">{mode === "complete" ? "🎉" : "⚡"}</div>
            <h1
              className="text-4xl font-black tracking-wider text-white mb-2"
              style={{ textShadow: `0 0 18px ${accent}` }}
            >
              {mode === "complete" ? "PROJECT CLEAR!" : "BOOST!"}
            </h1>
            <p className="text-lg font-bold" style={{ color: accent }}>
              {mode === "complete"
                ? `「${projectName}」達成！`
                : `親ブースト +¥${(amount ?? 0).toLocaleString()} を吸収！`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="relative mt-10 bg-white text-gray-900 font-bold px-10 py-3 rounded-full shadow-xl active:scale-95 transition-transform"
          >
            {mode === "complete" ? "やったー！" : "ナイス！"}
          </button>
        </>
      )}
    </div>
  );
}
