"use client";

import { useState, useEffect, useCallback } from "react";

interface BattleRow {
  id: string; name: string; avatar: string; color: string;
  quizAccuracy: number | null; quizCount: number;
  budgetAchievement: number | null; syncScore: number | null; rank: number;
}
interface BattleData { weekStart: string; weekEnd: string; weeklyBudget: number | null; ranking: BattleRow[] }

const RANK_MEDAL = ["🥇", "🥈", "🥉"];

// 親画面: ファミリー・インセンティブ
//  - 一括ブースト(全きょうだいに同時配信)
//  - きょうだい対抗シンクロバトル(率のみの非公開ランキング)
export default function FamilyIncentivePanel() {
  const [battle, setBattle] = useState<BattleData | null>(null);
  const [gcoins, setGcoins] = useState("100");
  const [exp, setExp] = useState("50");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    try {
      const b = await fetch("/api/family/battle").then(r => r.json());
      if (b && Array.isArray(b.ranking)) setBattle(b);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function bulkBoost() {
    setBusy(true); setMsg("");
    try {
      const r = await fetch("/api/family/boost", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gcoins: Number(gcoins) || 0, exp: Number(exp) || 0, message: message || undefined }),
      });
      const data = await r.json();
      if (!r.ok) setMsg(data.error ?? "配信に失敗しました");
      else { setMsg(`✓ ${data.count}人にブーストを配信しました`); setMessage(""); await load(); }
    } finally { setBusy(false); }
  }

  const children = battle?.ranking ?? [];
  if (children.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
      <h2 className="font-bold text-gray-800 text-sm">🏆 ファミリー・インセンティブ</h2>

      {/* 一括ブースト */}
      <div className="space-y-2">
        <div className="text-[11px] font-bold text-gray-500">一括ブースト(全員に同時配信)</div>
        <div className="flex gap-2">
          <label className="flex-1">
            <span className="text-[10px] text-gray-400">Gコイン</span>
            <input type="number" min="0" value={gcoins} onChange={e => setGcoins(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm" />
          </label>
          <label className="flex-1">
            <span className="text-[10px] text-gray-400">EXP</span>
            <input type="number" min="0" value={exp} onChange={e => setExp(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm" />
          </label>
        </div>
        <input value={message} onChange={e => setMessage(e.target.value)}
          placeholder="ひとこと(例: 今週はみんな予算達成!)"
          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm" />
        <button onClick={bulkBoost} disabled={busy}
          className="w-full bg-amber-500 text-white rounded-xl py-2.5 font-bold text-sm disabled:opacity-50">
          🎁 全員に今週のご褒美ブースト!
        </button>
        {msg && <div className="text-xs text-center text-gray-500">{msg}</div>}
      </div>

      {/* きょうだい対抗シンクロバトル(2人以上のとき) */}
      {children.length >= 2 && (
        <div className="space-y-2 border-t border-gray-100 pt-3">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-bold text-gray-500">きょうだい対抗・シンクロバトル</div>
            <span className="text-[9px] text-gray-300">今週 · 金額は非公開</span>
          </div>
          <div className="space-y-1.5">
            {children.map(c => (
              <div key={c.id} className="flex items-center gap-2 rounded-xl border border-gray-100 p-2"
                style={{ borderLeft: `4px solid ${c.color}` }}>
                <span className="text-sm w-5 text-center">{c.rank <= 3 ? RANK_MEDAL[c.rank - 1] : c.rank}</span>
                <span className="text-lg">{c.avatar}</span>
                <span className="text-sm font-bold text-gray-700 flex-1">{c.name}</span>
                <div className="flex gap-2 text-right">
                  <Metric label="シンクロ" value={c.quizAccuracy} hint={`${c.quizCount}問`} />
                  <Metric label="予算" value={c.budgetAchievement} />
                  <div className="w-12">
                    <div className="text-[9px] text-gray-400">総合</div>
                    <div className="text-base font-black" style={{ color: c.color }}>
                      {c.syncScore ?? "—"}{c.syncScore !== null && <span className="text-[10px]">%</span>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {battle?.weeklyBudget == null && (
            <p className="text-[10px] text-gray-400">
              ※「予算」率は、設定で週予算を入力すると表示されます。
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, hint }: { label: string; value: number | null; hint?: string }) {
  return (
    <div className="w-11">
      <div className="text-[9px] text-gray-400">{label}</div>
      <div className="text-sm font-bold text-gray-600">
        {value ?? "—"}{value !== null && <span className="text-[9px]">%</span>}
      </div>
      {hint && <div className="text-[8px] text-gray-300">{hint}</div>}
    </div>
  );
}
