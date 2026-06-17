"use client";

// ランチ写真スキャンカード: 撮影後に栄養ホログラムを表示するサイバーUI
// 子供画面の昼食入力時に使う。栄養スコアは Transaction に保存された値を受け取る。

import { useState } from "react";
import ImageUpload from "@/components/ImageUpload";

interface NutritionScores {
  nutriStaple: number | null;
  nutriProtein: number | null;
  nutriVeg: number | null;
  foodTitle: string | null;
  foodTitleEmoji: string | null;
}

interface LunchScanCardProps {
  imageUrl: string | null;
  onImageChange: (url: string | null) => void;
  scores?: NutritionScores | null; // 保存後にサーバーから返ってきた値
}

function ScoreBar({ label, letter, score, color }: { label: string; letter: string; score: number; color: string }) {
  const pct = Math.round((score / 3) * 100);
  const levelLabel = score === 0 ? "少ない" : score === 1 ? "やや少ない" : score === 2 ? "良好" : "バッチリ！";
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center text-white font-black text-xs flex-shrink-0"
        style={{ background: color }}
      >
        {letter}
      </div>
      <div className="flex-1">
        <div className="flex justify-between text-[11px] mb-0.5">
          <span className="text-gray-300 font-medium">{label}</span>
          <span style={{ color }} className="font-bold">{levelLabel}</span>
        </div>
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${pct}%`, background: color }}
          />
        </div>
      </div>
    </div>
  );
}

export default function LunchScanCard({ imageUrl, onImageChange, scores }: LunchScanCardProps) {
  const [scanning, setScanning] = useState(false);

  function handleChange(url: string | null) {
    if (url) setScanning(true);
    onImageChange(url);
    // スキャン演出は保存後スコアが来るまでの間だけ表示
    if (url) setTimeout(() => setScanning(false), 1800);
  }

  return (
    <div>
      {/* カメラUI */}
      <div className="relative">
        <ImageUpload value={imageUrl} onChange={handleChange} allowCapture />
        {/* スキャン中のロックオン演出 */}
        {scanning && (
          <div className="absolute inset-0 rounded-lg flex items-center justify-center pointer-events-none overflow-hidden">
            <div className="absolute inset-0 bg-cyan-900/30" />
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 140" preserveAspectRatio="none">
              {/* スキャンライン */}
              <line x1="0" y1="70" x2="200" y2="70" stroke="#22d3ee" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.8" className="animate-pulse" />
              {/* コーナーマーカー */}
              {[[8,8],[192,8],[8,132],[192,132]].map(([cx,cy], i) => (
                <g key={i}>
                  <line x1={cx} y1={cy} x2={cx + (cx < 100 ? 14 : -14)} y2={cy} stroke="#22d3ee" strokeWidth="2.5" />
                  <line x1={cx} y1={cy} x2={cx} y2={cy + (cy < 70 ? 14 : -14)} stroke="#22d3ee" strokeWidth="2.5" />
                </g>
              ))}
            </svg>
            <div className="bg-black/70 rounded-lg px-3 py-1.5 text-cyan-300 text-xs font-bold tracking-widest animate-pulse z-10">
              SCANNING…
            </div>
          </div>
        )}
      </div>

      {/* ホログラム栄養表示(保存後スコアが届いたとき) */}
      {scores && scores.nutriStaple !== null && (
        <div
          className="mt-3 rounded-xl p-4 space-y-3 relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)", border: "1px solid #334155" }}
        >
          {/* 背景グリッド */}
          <div
            className="absolute inset-0 opacity-10 pointer-events-none"
            style={{ backgroundImage: "linear-gradient(rgba(34,211,238,0.2) 1px,transparent 1px),linear-gradient(90deg,rgba(34,211,238,0.2) 1px,transparent 1px)", backgroundSize: "18px 18px" }}
          />

          {/* 称号バッジ */}
          {scores.foodTitle && (
            <div className="flex items-center gap-2 z-10 relative">
              <span className="text-2xl">{scores.foodTitleEmoji}</span>
              <div>
                <div className="text-cyan-300 font-black text-sm tracking-wide">{scores.foodTitle}</div>
                <div className="text-gray-400 text-[10px]">FOOD TITLE</div>
              </div>
            </div>
          )}

          {/* 栄養バー */}
          <div className="space-y-2 z-10 relative">
            <ScoreBar label="主食（炭水化物）" letter="C" score={scores.nutriStaple ?? 0} color="#f59e0b" />
            <ScoreBar label="主菜（タンパク質）" letter="P" score={scores.nutriProtein ?? 0} color="#3b82f6" />
            <ScoreBar label="副菜（ビタミン）"   letter="V" score={scores.nutriVeg ?? 0}     color="#10b981" />
          </div>
        </div>
      )}
    </div>
  );
}
