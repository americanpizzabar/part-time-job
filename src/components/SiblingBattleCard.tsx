"use client";

import { useState, useEffect } from "react";

interface BattleRow {
  id: string; name: string; avatar: string; color: string;
  quizAccuracy: number | null; budgetAchievement: number | null;
  syncScore: number | null; rank: number;
}

const RANK_MEDAL = ["🥇", "🥈", "🥉"];

// 子向け: きょうだい対抗シンクロバトル(率のみ・金額は非公開)。
// きょうだいが2人以上いるときだけ表示。健全な競争心を刺激する没頭ギミック。
export default function SiblingBattleCard() {
  const [ranking, setRanking] = useState<BattleRow[]>([]);
  const [meId, setMeId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [b, a] = await Promise.all([
          fetch("/api/family/battle").then(r => r.json()),
          fetch("/api/family/active-child").then(r => r.json()),
        ]);
        if (b && Array.isArray(b.ranking)) setRanking(b.ranking);
        setMeId(a?.activeChildId ?? null);
      } catch { /* 未ペアリング等は無視 */ }
    })();
  }, []);

  if (ranking.length < 2) return null;

  const leader = ranking[0];
  const me = ranking.find(r => r.id === meId);
  const headline = me && me.id === leader.id
    ? "いまトップ! このちょうしでいこう 🔥"
    : me
      ? `${leader.name}に ${Math.max(0, (leader.syncScore ?? 0) - (me.syncScore ?? 0))}% 差。おいつけ! 💪`
      : "きょうだいで シンクロ率しょうぶ!";

  return (
    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-4 text-white shadow-lg">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-black">⚔️ きょうだいバトル</div>
        <span className="text-[9px] text-white/60">今週 · 金額はひみつ</span>
      </div>
      <p className="text-xs text-white/90 mb-3">{headline}</p>
      <div className="space-y-1.5">
        {ranking.map(c => {
          const isMe = c.id === meId;
          return (
            <div key={c.id}
              className={`flex items-center gap-2 rounded-xl px-2.5 py-1.5 ${isMe ? "bg-white/25 ring-2 ring-white/70" : "bg-white/10"}`}>
              <span className="text-sm w-5 text-center">{c.rank <= 3 ? RANK_MEDAL[c.rank - 1] : c.rank}</span>
              <span className="text-lg">{c.avatar}</span>
              <span className="text-sm font-bold flex-1">
                {c.name}{isMe && <span className="text-[10px] font-normal text-white/70"> (きみ)</span>}
              </span>
              <div className="text-right">
                <div className="text-[9px] text-white/60">シンクロ率</div>
                <div className="text-lg font-black leading-none">
                  {c.syncScore ?? "—"}{c.syncScore !== null && <span className="text-xs">%</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-[9px] text-white/50 mt-2 text-center">
        クイズの正答率と週予算の達成率できそう。お金の中身は見えません。
      </p>
    </div>
  );
}
