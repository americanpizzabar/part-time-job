"use client";

import { useState, useRef } from "react";
import { today } from "@/lib/dateUtils";
import { EXPENSE_CATEGORIES } from "@/lib/budget";

interface QuickAddModalProps {
  onClose: () => void;
  onSaved: (info: { expGain: number; tag: "NEEDS" | "WANTS"; awakened?: boolean }) => void;
}

type Step = "amount" | "sort" | "done";

export default function QuickAddModal({ onClose, onSaved }: QuickAddModalProps) {
  const [step, setStep] = useState<Step>("amount");
  const [digits, setDigits] = useState("");
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [dragX, setDragX] = useState(0);
  const [committed, setCommitted] = useState<"NEEDS" | "WANTS" | null>(null);
  const [saving, setSaving] = useState(false);
  const dragging = useRef(false);
  const startX = useRef(0);

  const amount = Number(digits || "0");

  function press(d: string) {
    if (d === "del") {
      setDigits(s => s.slice(0, -1));
    } else if (d === "clr") {
      setDigits("");
    } else {
      if (digits.length >= 7) return;
      if (digits === "" && d === "0") return;
      setDigits(s => s + d);
    }
  }

  function onPointerDown(e: React.PointerEvent) {
    dragging.current = true;
    startX.current = e.clientX;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragging.current) return;
    setDragX(e.clientX - startX.current);
  }
  function onPointerUp() {
    if (!dragging.current) return;
    dragging.current = false;
    const threshold = 70;
    if (dragX <= -threshold) commit("NEEDS");
    else if (dragX >= threshold) commit("WANTS");
    else setDragX(0);
  }

  async function commit(tag: "NEEDS" | "WANTS") {
    if (saving) return;
    setCommitted(tag);
    setSaving(true);
    setStep("done");
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "EXPENSE",
          amount,
          category,
          needsWants: tag,
          date: today(),
          reportedAt: new Date().toISOString(),
        }),
      });
      const data = await res.json().catch(() => ({ expGain: 0 }));
      // 吸収アニメーションを見せてから閉じる
      setTimeout(() => {
        onSaved({ expGain: data.expGain ?? 0, tag, awakened: data.awakened ?? false });
      }, 700);
    } finally {
      setSaving(false);
    }
  }

  const tilt = Math.max(-1, Math.min(1, dragX / 120));

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white w-full max-w-md sm:rounded-2xl rounded-t-2xl shadow-xl overflow-hidden">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-bold text-gray-800">
            {step === "amount" ? "いくら使った？" : step === "sort" ? "どっち？スワイプで仕分け" : "吸収中…"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* STEP 1: 金額 */}
        {step === "amount" && (
          <div className="p-5">
            <div className="text-center text-4xl font-bold text-gray-800 mb-4 tracking-tight">
              ¥{amount.toLocaleString()}
            </div>
            <div className="mb-3">
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {EXPENSE_CATEGORIES.map(c => (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border
                      ${category === c ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-500"}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "clr", "0", "del"].map(k => (
                <button
                  key={k}
                  onClick={() => press(k)}
                  className={`py-4 rounded-xl text-xl font-semibold transition-colors
                    ${k === "clr" || k === "del" ? "bg-gray-100 text-gray-500 text-base" : "bg-gray-50 text-gray-800 hover:bg-gray-100"}`}
                >
                  {k === "del" ? "⌫" : k === "clr" ? "C" : k}
                </button>
              ))}
            </div>
            <button
              onClick={() => amount > 0 && setStep("sort")}
              disabled={amount <= 0}
              className="mt-4 w-full bg-blue-600 text-white py-3.5 rounded-xl font-semibold disabled:opacity-40"
            >
              つぎへ
            </button>
          </div>
        )}

        {/* STEP 2: スワイプ仕分け */}
        {step === "sort" && (
          <div className="relative h-80 flex">
            <div
              className="flex-1 flex flex-col items-center justify-center transition-colors"
              style={{ background: tilt < -0.15 ? "#3b82f6" : "#eff6ff" }}
            >
              <span className={`text-3xl mb-1 ${tilt < -0.15 ? "" : "opacity-40"}`}>🧠</span>
              <span className={`font-bold ${tilt < -0.15 ? "text-white" : "text-blue-600"}`}>Needs</span>
              <span className={`text-[11px] ${tilt < -0.15 ? "text-blue-100" : "text-blue-400"}`}>自己投資・必要</span>
            </div>
            <div
              className="flex-1 flex flex-col items-center justify-center transition-colors"
              style={{ background: tilt > 0.15 ? "#ec4899" : "#fdf2f8" }}
            >
              <span className={`text-3xl mb-1 ${tilt > 0.15 ? "" : "opacity-40"}`}>🎉</span>
              <span className={`font-bold ${tilt > 0.15 ? "text-white" : "text-pink-600"}`}>Wants</span>
              <span className={`text-[11px] ${tilt > 0.15 ? "text-pink-100" : "text-pink-400"}`}>楽しさ・欲しい</span>
            </div>

            {/* ドラッグするチップ */}
            <div
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 touch-none cursor-grab active:cursor-grabbing"
              style={{ transform: `translate(calc(-50% + ${dragX}px), -50%) rotate(${tilt * 12}deg)` }}
            >
              <div className="bg-white rounded-2xl shadow-2xl border-2 border-gray-200 px-6 py-5 text-center">
                <div className="text-2xl font-bold text-gray-800">¥{amount.toLocaleString()}</div>
                <div className="text-xs text-gray-400 mt-0.5">{category}</div>
                <div className="text-[10px] text-gray-300 mt-1">← スワイプ →</div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: 吸収 */}
        {step === "done" && (
          <div className="p-10 flex flex-col items-center justify-center h-72">
            <div className="absorb-fly" style={{ ["--ax" as string]: committed === "NEEDS" ? "-40px" : "40px" }}>
              <div
                className="rounded-2xl px-6 py-5 text-white font-bold shadow-2xl"
                style={{ background: committed === "NEEDS" ? "#3b82f6" : "#ec4899" }}
              >
                ¥{amount.toLocaleString()}
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-4">Optisがエネルギーを吸収！</p>
          </div>
        )}
      </div>
    </div>
  );
}
