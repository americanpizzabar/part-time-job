"use client";

import { useEffect, useState, useRef } from "react";
import { GENRE_META, QuizGenre, BLACK_POD_MIN_LAYER } from "@/lib/optis";

interface QuizData {
  id: number;
  question: string;
  options: string[];
  explanation: string;
  genre: string;
  layer: number;
}

interface DataPodProps {
  onAnswered: () => void;
}

export default function DataPod({ onAnswered }: DataPodProps) {
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [answeredToday, setAnsweredToday] = useState(false);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
  const [perCorrect, setPerCorrect] = useState(0);
  const [hardBoost, setHardBoost] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [result, setResult] = useState<{ correct: boolean; explanation: string; expGained: number; bonusEarned: number; isHardPod: boolean } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const startTime = useRef<number>(Date.now());

  useEffect(() => {
    Promise.all([
      fetch("/api/quiz").then(r => r.json()),
      fetch("/api/config").then(r => r.json()),
    ]).then(([q, cfg]) => {
      setQuiz(q.quiz ?? null);
      setAnsweredToday(!!q.answeredToday);
      setLastCorrect(q.lastAnswered ? q.lastAnswered.correct : null);
      setPerCorrect(cfg.aggregation?.quizBonusPerCorrect ?? 0);
      setHardBoost(cfg.aggregation?.quizBonusHardBoost ?? 0);
    });
  }, []);

  // 報酬クイズ機能OFF(単価0)なら何も出さない
  if (perCorrect <= 0) return null;

  // 今日すでに挑戦済み: コンパクトな状態表示(再挑戦不可=ロックダウン)
  if (answeredToday) {
    return (
      <div className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 border
        ${lastCorrect
          ? "bg-amber-950/70 border-amber-500/50"
          : "bg-red-950/70 border-red-700/50"}`}>
        <span className="text-2xl">{lastCorrect ? "💰" : "🔒"}</span>
        <div className="flex-1 min-w-0">
          <div className={`font-bold text-sm ${lastCorrect ? "text-amber-300" : "text-red-300"}`}>
            {lastCorrect ? "今日のハック成功！報酬をプールに確保" : "ハック失敗。データはロックされた"}
          </div>
          <div className={`text-xs mt-0.5 ${lastCorrect ? "text-amber-400/70" : "text-red-400/70"}`}>
            また明日、新しいデータポッドが出現する
          </div>
        </div>
      </div>
    );
  }

  if (!quiz) return null;

  const isHardPod = quiz.layer >= BLACK_POD_MIN_LAYER && hardBoost > 0;
  const podBonus = isHardPod ? perCorrect + hardBoost : perCorrect;
  const genreMeta = GENRE_META[quiz.genre as QuizGenre] ?? GENRE_META.CURRENT;

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
        bonusEarned: data.bonusEarned ?? 0,
        isHardPod: data.isHardPod ?? false,
      });
    } finally {
      setSubmitting(false);
    }
  }

  function closeModal() {
    setShowModal(false);
    setSelectedIndex(null);
    setAnsweredToday(true);
    if (result) setLastCorrect(result.correct);
    setResult(null);
    onAnswered();
  }

  return (
    <>
      {/* データポッド(明滅する宝箱) */}
      <button
        onClick={() => { startTime.current = Date.now(); setShowModal(true); }}
        className={`w-full flex items-center gap-3 rounded-xl px-4 py-3.5 text-left border transition-all animate-pulse hover:animate-none
          ${isHardPod
            ? "bg-gradient-to-r from-zinc-950 to-purple-950/80 border-fuchsia-500/60 hover:border-fuchsia-400"
            : "bg-gradient-to-r from-amber-950/80 to-yellow-900/60 border-amber-500/60 hover:border-amber-400"}`}
      >
        <span className="text-3xl drop-shadow-[0_0_8px_rgba(251,191,36,0.7)]">{isHardPod ? "🛸" : "📦"}</span>
        <div className="flex-1 min-w-0">
          <div className={`font-bold text-sm ${isHardPod ? "text-fuchsia-300" : "text-amber-300"}`}>
            {isHardPod ? "⚠️ ブラックポッド出現（報酬アップ）" : "未解析データポッドを検知"}
          </div>
          <div className={`text-xs mt-0.5 ${isHardPod ? "text-fuchsia-400/80" : "text-amber-400/80"}`}>
            ハッキングに成功すると ¥{podBonus} を確保できる
          </div>
        </div>
        <div className={`text-xs font-mono px-2 py-1 border rounded
          ${isHardPod ? "text-fuchsia-300 border-fuchsia-500/50" : "text-amber-300 border-amber-500/50"}`}>
          HACK ▶
        </div>
      </button>

      {/* モーダル */}
      {showModal && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-[80] p-4">
          <div className={`bg-gray-950 border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden
            ${isHardPod ? "border-fuchsia-500/50" : "border-amber-500/50"}`}>
            {/* ヘッダー */}
            <div className="p-4 border-b border-gray-800 flex items-center gap-2">
              <span className="text-xl">{isHardPod ? "🛸" : "📦"}</span>
              <div className="flex-1">
                <div className={`font-bold text-sm ${isHardPod ? "text-fuchsia-300" : "text-amber-300"}`}>
                  {isHardPod ? "ブラックポッド・クラッキング" : "デイリー・コア・ハッキング"}
                </div>
                <div className="text-gray-500 text-xs">
                  {genreMeta.emoji} {genreMeta.label} ・ 正解報酬 ¥{podBonus}
                </div>
              </div>
            </div>

            <div className="p-4">
              {!result ? (
                <>
                  <div className="text-amber-200/90 text-xs mb-3">
                    親が承認したボーナス信号（¥{podBonus}）を検知！プロトコルを開始する。一発勝負だ。
                  </div>
                  <div className="text-white font-bold text-base mb-4 leading-relaxed">{quiz.question}</div>
                  <div className="space-y-2">
                    {quiz.options.map((opt, idx) => (
                      <button
                        key={idx}
                        onClick={() => submitAnswer(idx)}
                        disabled={submitting}
                        className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-colors font-medium
                          ${selectedIndex === idx
                            ? "border-amber-400 bg-amber-900/40 text-amber-200"
                            : "border-gray-700 bg-gray-900/60 text-gray-300 hover:border-gray-500"}`}
                      >
                        {String.fromCharCode(65 + idx)}. {opt}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  {result.correct ? (
                    <div className="rounded-xl p-5 border bg-gradient-to-b from-amber-900/50 to-yellow-900/30 border-amber-500/60 text-center relative overflow-hidden">
                      <div className="text-5xl mb-2 animate-bounce">💰</div>
                      <div className="font-bold text-xl text-amber-300 mb-1">ハッキング成功！</div>
                      {result.bonusEarned > 0 ? (
                        <div className="text-yellow-300 font-extrabold text-2xl mb-1 drop-shadow-[0_0_10px_rgba(251,191,36,0.8)]">
                          ＋¥{result.bonusEarned}
                        </div>
                      ) : null}
                      <div className="text-amber-200/80 text-xs">ボーナスプールにチャージされた（週末に親が精算）</div>
                      {result.expGained > 0 && (
                        <div className="text-yellow-200 text-xs mt-1">経験値 +{result.expGained} EXP も獲得！</div>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-xl p-5 border bg-red-950/50 border-red-600/60 text-center">
                      <div className="text-5xl mb-2">💥</div>
                      <div className="font-bold text-xl text-red-300 mb-1">ハック失敗</div>
                      <div className="text-red-300/80 text-xs">データがロックされた。また明日挑戦しろ。</div>
                    </div>
                  )}
                  <div className="rounded-xl p-4 border border-gray-700 bg-gray-900/60">
                    <div className="text-gray-300 text-sm leading-relaxed">{result.explanation}</div>
                  </div>
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
