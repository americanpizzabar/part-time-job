"use client";

import { useEffect, useState, useRef } from "react";
import { WEATHER_META, WeatherType } from "@/lib/optis";

interface QuizData {
  id: number;
  question: string;
  options: string[];
  weatherType: string;
  explanation: string;
}

interface QuizBannerProps {
  onAnswered: () => void;
}

export default function QuizBanner({ onAnswered }: QuizBannerProps) {
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [hasShield, setHasShield] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [result, setResult] = useState<{ correct: boolean; explanation: string; expGained: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [layerUpMsg, setLayerUpMsg] = useState<string | null>(null);
  const startTime = useRef<number>(Date.now());

  useEffect(() => {
    fetch("/api/quiz")
      .then(r => r.json())
      .then(data => {
        setQuiz(data.quiz ?? null);
        setHasShield(data.hasShield ?? false);
      });
  }, []);

  // Don't show if no quiz, or user already has shield
  if (!quiz || hasShield) return null;

  const weatherMeta = WEATHER_META[quiz.weatherType as WeatherType] ?? WEATHER_META.NEUTRAL;

  async function submitAnswer(idx: number) {
    if (!quiz || submitting || result) return;
    setSelectedIndex(idx);
    setSubmitting(true);
    try {
      const r = await fetch(`/api/quiz/${quiz.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedIndex: idx, responseMs: Date.now() - startTime.current }),
      });
      const data = await r.json();
      setResult({
        correct: data.correct,
        explanation: data.explanation,
        expGained: data.expGained ?? 0,
      });
      if (data.layerChanged && data.layerDialogue) {
        const layerLabel = data.newLayer !== undefined ? `⬆️ Layer ${data.newLayer}` : "";
        setLayerUpMsg(layerLabel ? `${layerLabel} — ${data.layerDialogue}` : data.layerDialogue);
      }
    } finally {
      setSubmitting(false);
    }
  }

  function closeModal() {
    setShowModal(false);
    setResult(null);
    setSelectedIndex(null);
    setLayerUpMsg(null);
    if (result?.correct) {
      setHasShield(true);
      onAnswered();
    }
  }

  return (
    <>
      {/* Banner */}
      <button
        onClick={() => { startTime.current = Date.now(); setShowModal(true); }}
        className="w-full flex items-center gap-3 bg-red-950/80 border border-red-500/60 rounded-xl px-4 py-3 text-left animate-pulse hover:animate-none hover:border-red-400 transition-colors"
      >
        <span className="text-2xl">{weatherMeta.emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="text-red-300 font-bold text-sm">⚠️ 世界データに異常発生！</div>
          <div className="text-red-400/80 text-xs mt-0.5">ニュースをハックせよ → 経済の盾を獲得</div>
        </div>
        <div className="text-red-400 text-xs font-mono px-2 py-1 border border-red-500/40 rounded">
          HACK ▶
        </div>
      </button>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[80] p-4">
          <div className="bg-gray-950 border border-red-500/50 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-red-900/50 flex items-center gap-2">
              <span className="text-xl">{weatherMeta.emoji}</span>
              <div>
                <div className="font-bold text-red-300 text-sm">経済ウェザー: {weatherMeta.label}</div>
                <div className="text-red-600 text-xs">{weatherMeta.desc}</div>
              </div>
            </div>

            {/* Question */}
            <div className="p-4">
              <div className="text-white font-bold text-base mb-4 leading-relaxed">{quiz.question}</div>

              {!result ? (
                <div className="space-y-2">
                  {quiz.options.map((opt, idx) => (
                    <button
                      key={idx}
                      onClick={() => submitAnswer(idx)}
                      disabled={submitting}
                      className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-colors font-medium
                        ${selectedIndex === idx
                          ? "border-cyan-400 bg-cyan-900/40 text-cyan-200"
                          : "border-gray-700 bg-gray-900/60 text-gray-300 hover:border-gray-500"}`}
                    >
                      {String.fromCharCode(65 + idx)}. {opt}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className={`rounded-xl p-4 border ${result.correct
                    ? "bg-emerald-900/40 border-emerald-500/60"
                    : "bg-red-900/40 border-red-500/60"}`}>
                    <div className={`font-bold text-lg mb-2 ${result.correct ? "text-emerald-300" : "text-red-300"}`}>
                      {result.correct ? "✅ 正解！経済の盾を獲得！" : "❌ 不正解"}
                    </div>
                    {result.correct && result.expGained > 0 && (
                      <div className="text-yellow-300 font-bold text-sm mb-2">+{result.expGained} EXP</div>
                    )}
                    <div className="text-gray-300 text-sm leading-relaxed">{result.explanation}</div>
                  </div>
                  {layerUpMsg && (
                    <div className="rounded-xl p-4 border bg-purple-900/40 border-purple-500/60">
                      <div className="text-purple-200 text-sm font-medium leading-relaxed">{layerUpMsg}</div>
                    </div>
                  )}
                  <button
                    onClick={closeModal}
                    className="w-full bg-gray-800 border border-gray-600 text-gray-300 rounded-xl py-2.5 text-sm font-medium"
                  >
                    閉じる
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
