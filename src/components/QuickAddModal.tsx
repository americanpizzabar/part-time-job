"use client";

import { useState, useRef } from "react";
import { today } from "@/lib/dateUtils";
import { EXPENSE_CATEGORIES, QUICK_PRESETS } from "@/lib/budget";
import { ASSET_CATEGORIES, ASSET_META, AssetCategory } from "@/lib/optis";
import { playTick, playWhoosh, playCombo, playExpGain } from "@/lib/sound";
import { hapticTap, hapticHeavy, hapticSuccess, hapticCombo } from "@/lib/haptics";
import { bumpCombo } from "@/lib/combo";
import PulseDial from "@/components/PulseDial";
import LunchScanCard from "@/components/LunchScanCard";
import { recordUsage, getRankedPresets, DynamicPreset } from "@/lib/presetStats";

// 重い金額(エネルギー球がずっしり)を判定するしきい値
const HEAVY_AMOUNT = 3000;

interface QuickAddModalProps {
  onClose: () => void;
  onSaved: (info: { expGain: number; tag: "NEEDS" | "WANTS"; awakened?: boolean; careerFeedback?: string | null; encounterQuiz?: { id: number; question: string; options: string[]; layer: number; isHot: boolean; hotReward: number } | null }) => void;
}

type Step = "amount" | "sort" | "asset" | "photo" | "done";

export default function QuickAddModal({ onClose, onSaved }: QuickAddModalProps) {
  const [step, setStep] = useState<Step>("amount");
  const [digits, setDigits] = useState("");
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [dragX, setDragX] = useState(0);
  const [committed, setCommitted] = useState<"NEEDS" | "WANTS" | null>(null);
  const [assetCategory, setAssetCategory] = useState<AssetCategory | null>(null);
  const [saving, setSaving] = useState(false);
  const [careerFeedback, setCareerFeedback] = useState<string | null>(null);
  const [inputMode, setInputMode] = useState<"dial" | "keypad">("dial");
  const [combo, setCombo] = useState(0);
  const [orderedPresets] = useState<DynamicPreset[]>(() => getRankedPresets());
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [lunchScores, setLunchScores] = useState<{ nutriStaple: number | null; nutriProtein: number | null; nutriVeg: number | null; foodTitle: string | null; foodTitleEmoji: string | null } | null>(null);
  const dragging = useRef(false);
  const startX = useRef(0);
  // photo ステップ到達前に tag/asset を一時保存
  const pendingTag = useRef<"NEEDS" | "WANTS">("WANTS");
  const pendingAsset = useRef<AssetCategory | null>(null);

  const amount = Number(digits || "0");
  const heavy = amount >= HEAVY_AMOUNT;

  function press(d: string) {
    hapticTap();
    playTick();
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

  // 定番ショートカット: 金額+カテゴリを一気に確定して仕分けへ
  function applyPreset(presetAmount: number, presetCategory: string) {
    hapticTap();
    playTick(5);
    setDigits(String(presetAmount));
    setCategory(presetCategory);
    setStep("sort");
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
    // 重い金額(エネルギー球がずっしり)はより強いフリックが必要
    const threshold = heavy ? 110 : 70;
    if (dragX <= -threshold) selectTag("NEEDS");
    else if (dragX >= threshold) selectTag("WANTS");
    else setDragX(0);
  }

  function selectTag(tag: "NEEDS" | "WANTS") {
    setCommitted(tag);
    playWhoosh(tag);
    hapticSuccess();
    pendingTag.current = tag;
    pendingAsset.current = null;
    if (tag === "NEEDS") {
      setStep("asset");
    } else if (category === "昼食") {
      setStep("photo");
    } else {
      commit(tag, null);
    }
  }

  async function commit(tag: "NEEDS" | "WANTS", ac: AssetCategory | null, img?: string | null) {
    if (saving) return;
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
          assetCategory: ac ?? undefined,
          date: today(),
          reportedAt: new Date().toISOString(),
          imageUrl: img ?? undefined,
        }),
      });
      const data = await res.json().catch(() => ({ expGain: 0 }));
      if (data.careerFeedback) setCareerFeedback(data.careerFeedback);
      // 昼食写真付きのとき栄養スコアをホログラム表示
      if (img && data.nutriStaple !== undefined) {
        setLunchScores({
          nutriStaple: data.nutriStaple, nutriProtein: data.nutriProtein, nutriVeg: data.nutriVeg,
          foodTitle: data.foodTitle ?? null, foodTitleEmoji: data.foodTitleEmoji ?? null,
        });
      }
      recordUsage(amount, category);
      const { count } = bumpCombo();
      setCombo(count);
      playExpGain();
      if (count >= 2) {
        playCombo(count);
        hapticCombo(count);
      } else {
        hapticHeavy();
      }
      const delay = img && data.nutriStaple !== undefined ? 3200 : (data.careerFeedback ? 2200 : 700);
      setTimeout(() => {
        onSaved({ expGain: data.expGain ?? 0, tag, awakened: data.awakened ?? false, careerFeedback: data.careerFeedback, encounterQuiz: data.encounterQuiz ?? null });
      }, delay);
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
            {step === "amount" ? "いくら使った？"
              : step === "sort" ? "どっち？スワイプで仕分け"
              : step === "asset" ? "どんな自己投資？"
              : step === "photo" ? "ランチをスキャン📸"
              : step === "done" && careerFeedback ? "AIが分析中…" : "吸収中…"}
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
            {/* 定番ショートカット(浮遊チップ) */}
            <div className="flex gap-1.5 overflow-x-auto pb-2 mb-1 -mx-1 px-1">
              {orderedPresets.map(p => (
                <button
                  key={`${p.amount}_${p.category}`}
                  onClick={() => applyPreset(p.amount, p.category)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap
                    bg-gradient-to-br from-cyan-50 to-blue-50 border border-blue-200 text-blue-700 active:scale-95 transition-transform"
                >
                  <span>{p.emoji}</span>
                  <span>{p.label}</span>
                  <span className="text-blue-400">¥{p.amount}</span>
                </button>
              ))}
            </div>

            {/* カテゴリ */}
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

            {/* 入力モード切替 */}
            {inputMode === "dial" ? (
              <div className="py-2">
                <PulseDial value={amount} onChange={v => setDigits(v === 0 ? "" : String(v))} />
                <div className="text-center">
                  <button onClick={() => setInputMode("keypad")} className="text-xs text-gray-400 underline">
                    キーで入力する
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="text-center text-4xl font-bold text-gray-800 mb-4 tracking-tight">
                  ¥{amount.toLocaleString()}
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
                <div className="text-center mt-2">
                  <button onClick={() => setInputMode("dial")} className="text-xs text-gray-400 underline">
                    ダイアルで入力する
                  </button>
                </div>
              </>
            )}

            <button
              onClick={() => { if (amount > 0) { hapticTap(); setStep("sort"); } }}
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
              style={{ transform: `translate(calc(-50% + ${dragX}px), -50%) rotate(${tilt * 12}deg) scale(${heavy ? 1.12 : 1})` }}
            >
              <div
                className={`rounded-full shadow-2xl border-2 px-7 py-7 text-center
                  ${heavy ? "border-amber-300 bg-gradient-to-br from-amber-50 to-orange-100" : "border-gray-200 bg-white"}`}
                style={heavy ? { boxShadow: "0 12px 40px rgba(245,158,11,0.4)" } : undefined}
              >
                <div className="text-2xl font-bold text-gray-800">¥{amount.toLocaleString()}</div>
                <div className="text-xs text-gray-400 mt-0.5">{category}</div>
                <div className="text-[10px] text-gray-300 mt-1">
                  {heavy ? "⚡ずっしり…強くスワイプ→" : "← スワイプ →"}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2.5: 資産カテゴリ(Needsのみ) */}
        {step === "asset" && (
          <div className="p-5">
            <div className="text-center text-sm text-gray-500 mb-4">どんな自己投資か選んでね（スキップも可）</div>
            <div className="space-y-2">
              {ASSET_CATEGORIES.map(ac => {
                const meta = ASSET_META[ac];
                return (
                  <button
                    key={ac}
                    onClick={() => {
                      setAssetCategory(ac);
                      pendingAsset.current = ac;
                      if (category === "昼食") setStep("photo");
                      else commit("NEEDS", ac);
                    }}
                    className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-gray-200 hover:border-blue-400 transition-colors text-left"
                  >
                    <span className="text-3xl">{meta.emoji}</span>
                    <div>
                      <div className="font-bold text-gray-800">{meta.label}</div>
                      <div className="text-xs text-gray-500">{meta.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => {
                if (category === "昼食") setStep("photo");
                else commit("NEEDS", null);
              }}
              className="mt-3 w-full text-xs text-gray-400 py-2 hover:text-gray-600"
            >
              スキップ
            </button>
          </div>
        )}

        {/* STEP 2.7: 昼食写真 */}
        {step === "photo" && (
          <div className="p-5">
            <div className="text-center mb-4">
              <div className="text-3xl mb-1">📸</div>
              <div className="font-bold text-gray-800">今日の昼メシを記録しよう！</div>
              <div className="text-xs text-gray-400 mt-1">写真から栄養バランスをチェックするよ</div>
            </div>
            <LunchScanCard imageUrl={imageUrl} onImageChange={setImageUrl} scores={null} />
            <button
              onClick={() => commit(pendingTag.current, pendingAsset.current, imageUrl)}
              className="mt-4 w-full bg-blue-600 text-white py-3.5 rounded-xl font-semibold"
            >
              {imageUrl ? "📸 記録する" : "写真なしで記録する"}
            </button>
            {imageUrl && (
              <button
                onClick={() => { setImageUrl(null); commit(pendingTag.current, pendingAsset.current, null); }}
                className="mt-2 w-full text-xs text-gray-400 py-1.5 hover:text-gray-600"
              >
                写真なしでスキップ
              </button>
            )}
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
            {assetCategory && (
              <div className="text-sm text-gray-500 mt-2">
                {ASSET_META[assetCategory].emoji} {ASSET_META[assetCategory].label}
              </div>
            )}
            <p className="text-sm text-gray-500 mt-4">Optisがエネルギーを吸収！</p>
            {combo >= 2 && (
              <div className="mt-3 inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-sm font-bold px-4 py-1.5 rounded-full shadow-lg reward-pop">
                <span>🔥</span>
                <span>{combo}日連続コンボ！</span>
              </div>
            )}
          </div>
        )}
        {step === "done" && lunchScores && (
          <div className="px-5 pb-5 animate-fade-in">
            <LunchScanCard imageUrl={imageUrl} onImageChange={() => {}} scores={lunchScores} />
          </div>
        )}
        {step === "done" && careerFeedback && (
          <div className="p-5 text-center animate-fade-in">
            <div className="text-3xl mb-3">🧠</div>
            <div className="text-sm text-gray-500 mb-2 font-medium">Optisからの分析</div>
            <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl p-4 text-gray-800 text-sm leading-relaxed font-medium border border-purple-100">
              {careerFeedback}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
