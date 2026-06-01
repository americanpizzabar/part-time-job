"use client";

import { useEffect, useRef, useState } from "react";
import { RARITY_META, Rarity } from "@/lib/optis";

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

export default function RouletteModal({ onClose, onDone }: RouletteModalProps) {
  const [phase, setPhase] = useState<"spinning" | "result" | "error">("spinning");
  const [result, setResult] = useState<SpinResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      const res = await fetch("/api/optis/spin", { method: "POST" });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        setErrorMsg(e.error ?? "ルーレットを回せませんでした");
        setPhase("error");
        return;
      }
      const data: SpinResult = await res.json();
      setResult(data);
      // 回転演出のあと結果表示
      setTimeout(() => {
        setPhase("result");
        onDone?.();
      }, 3000);
    })();
  }, [onDone]);

  const targetIndex = result ? SEGMENTS.indexOf(result.rarity) : 0;
  const spinDeg = 1440 + (targetIndex >= 0 ? targetIndex : 0) * (360 / SEGMENTS.length);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
        {phase === "error" ? (
          <>
            <div className="text-4xl mb-3">🎰</div>
            <p className="text-sm text-gray-600">{errorMsg}</p>
            <button onClick={onClose} className="mt-5 w-full bg-gray-800 text-white py-2.5 rounded-xl font-semibold">
              閉じる
            </button>
          </>
        ) : (
          <>
            <h2 className="font-bold text-gray-800 mb-1">
              {result?.boosted ? "⚡ 確変ジャックポット！" : "🎰 ラッキー・ジャックポット"}
            </h2>
            {result?.boosted && phase === "spinning" && (
              <p className="text-xs text-orange-500 mb-2">ノーマネーデー達成でレア確率UP中！</p>
            )}

            <div className="relative mx-auto my-5" style={{ width: 220, height: 220 }}>
              {/* 指針 */}
              <div className="absolute left-1/2 -top-1 -translate-x-1/2 z-10 text-2xl">▼</div>
              <div
                className="w-full h-full rounded-full border-4 border-gray-800 overflow-hidden"
                style={
                  phase === "spinning"
                    ? ({ "--spin": `${spinDeg}deg` } as React.CSSProperties)
                    : { transform: `rotate(${spinDeg}deg)` }
                }
              >
                <div
                  className={`w-full h-full ${phase === "spinning" ? "wheel-spin" : ""}`}
                  style={{
                    background: `conic-gradient(${SEGMENTS.map((s, i) => {
                      const seg = 100 / SEGMENTS.length;
                      return `${RARITY_META[s].color} ${i * seg}% ${(i + 1) * seg}%`;
                    }).join(", ")})`,
                  }}
                />
              </div>
            </div>

            {phase === "result" && result ? (
              <div className="exp-pop-none">
                <div
                  className="inline-block px-3 py-1 rounded-full text-sm font-bold text-white mb-2"
                  style={{ background: RARITY_META[result.rarity].color }}
                >
                  {RARITY_META[result.rarity].label}
                </div>
                <div className="text-lg font-bold text-gray-800">{result.reward.label}</div>
                <button
                  onClick={onClose}
                  className="mt-5 w-full bg-blue-600 text-white py-2.5 rounded-xl font-semibold hover:bg-blue-700"
                >
                  受け取る
                </button>
              </div>
            ) : (
              <p className="text-sm text-gray-400">回転中…</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
