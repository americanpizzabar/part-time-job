"use client";

import { useEffect, useRef, useState } from "react";
import { RARITY_META, Rarity } from "@/lib/optis";
import Confetti from "@/components/Confetti";
import { playRouletteSpin, playRarityReveal } from "@/lib/sound";

interface SpinResult {
  rarity: Rarity;
  boosted: boolean;
  reward: { label: string };
}

interface RouletteModalProps {
  onClose: () => void;
  onDone?: () => void;
}

const SEGMENTS: Rarity[] = [
  "COMMON", "UNCOMMON", "COMMON", "RARE", "COMMON", "UNCOMMON", "COMMON", "LEGENDARY",
];

const RARITY_EMOJI: Record<Rarity, string> = {
  COMMON: "✨",
  UNCOMMON: "💎",
  RARE: "🌟",
  LEGENDARY: "👑",
};

export default function RouletteModal({ onClose, onDone }: RouletteModalProps) {
  const [phase, setPhase] = useState<"spinning" | "result" | "error">("spinning");
  const [result, setResult] = useState<SpinResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      playRouletteSpin();
      const res = await fetch("/api/optis/spin", { method: "POST" });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        setErrorMsg(e.error ?? "ルーレットを回せませんでした");
        setPhase("error");
        return;
      }
      const data: SpinResult = await res.json();
      setResult(data);
      setTimeout(() => {
        setPhase("result");
        playRarityReveal(data.rarity);
        onDone?.();
      }, 3000);
    })();
  }, [onDone]);

  const targetIndex = result ? SEGMENTS.indexOf(result.rarity) : 0;
  const spinDeg = 1440 + (targetIndex >= 0 ? targetIndex : 0) * (360 / SEGMENTS.length);

  const rmeta = result ? RARITY_META[result.rarity] : null;
  const isBig = result?.rarity === "RARE" || result?.rarity === "LEGENDARY";
  const isLegend = result?.rarity === "LEGENDARY";

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4 overflow-hidden">
      {/* 当選時の背景光線 */}
      {phase === "result" && isBig && rmeta && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className={`w-[150vmax] h-[150vmax] ${isLegend ? "ray-spin-fast" : "ray-spin"}`}
            style={{
              background: `repeating-conic-gradient(from 0deg, ${rmeta.color}33 0deg 8deg, transparent 8deg 16deg)`,
              opacity: isLegend ? 0.6 : 0.4,
            }}
          />
        </div>
      )}
      {phase === "result" && isBig && <Confetti count={isLegend ? 90 : 50} colors={isLegend ? ["#fde047", "#f59e0b", "#fbbf24", "#fff7cd"] : undefined} />}

      <div
        className={`relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center ${phase === "result" && isLegend ? "screen-shake" : ""}`}
      >
        {phase === "error" ? (
          <>
            <div className="text-4xl mb-3">🎰</div>
            <p className="text-sm text-gray-600">{errorMsg}</p>
            <button onClick={onClose} className="mt-5 w-full bg-gray-800 text-white py-2.5 rounded-xl font-semibold">
              閉じる
            </button>
          </>
        ) : phase === "spinning" ? (
          <>
            <h2 className="font-bold text-gray-800 mb-1">
              {result?.boosted ? "⚡ 確変ジャックポット！" : "🎰 ラッキー・ジャックポット"}
            </h2>
            {result?.boosted && (
              <p className="text-xs text-orange-500 mb-2">ノーマネーデー達成でレア確率UP中！</p>
            )}
            <div className="relative mx-auto my-5" style={{ width: 220, height: 220 }}>
              <div className="absolute left-1/2 -top-1 -translate-x-1/2 z-10 text-2xl">▼</div>
              <div className="w-full h-full rounded-full border-4 border-gray-800 overflow-hidden">
                <div
                  className="w-full h-full wheel-spin"
                  style={
                    {
                      "--spin": `${spinDeg}deg`,
                      background: `conic-gradient(${SEGMENTS.map((s, i) => {
                        const seg = 100 / SEGMENTS.length;
                        return `${RARITY_META[s].color} ${i * seg}% ${(i + 1) * seg}%`;
                      }).join(", ")})`,
                    } as React.CSSProperties
                  }
                />
              </div>
            </div>
            <p className="text-sm text-gray-400">回転中…</p>
          </>
        ) : (
          result && rmeta && (
            <div className="relative">
              {/* ショックウェーブ */}
              {isBig && (
                <div className="absolute left-1/2 top-16 -translate-x-1/2 pointer-events-none">
                  <div className="shockwave w-24 h-24 rounded-full border-4" style={{ borderColor: rmeta.color }} />
                </div>
              )}

              <div className="reward-pop">
                <div className="text-6xl mb-2">{RARITY_EMOJI[result.rarity]}</div>
                <div
                  className="inline-block px-4 py-1 rounded-full text-sm font-extrabold text-white mb-3 badge-glow"
                  style={{ background: rmeta.color, ["--gc" as string]: rmeta.glow }}
                >
                  {result.boosted && "⚡"} {rmeta.label}
                </div>
                <div className="text-xl font-bold text-gray-800">{result.reward.label}</div>
              </div>

              <button
                onClick={onClose}
                className="mt-6 w-full text-white py-2.5 rounded-xl font-semibold"
                style={{ background: isBig ? rmeta.color : "#2563eb" }}
              >
                受け取る
              </button>
            </div>
          )
        )}
      </div>
    </div>
  );
}
