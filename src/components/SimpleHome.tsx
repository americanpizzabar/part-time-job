"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { formatJPY, today, DAY_NAMES_JA } from "@/lib/dateUtils";

// 簡易モードのホーム: お手伝い+お年玉だけのスリム表示。
// Optis・クイズ・ダークウェブ等は一切レンダリングしない。
interface DayChore {
  id: number;
  name: string;
  amount: number;
  amountOverride?: number | null;
  completed: boolean;
  logId: number | null;
  isExtra: boolean;
}

export default function SimpleHome() {
  const [unpaidTotal, setUnpaidTotal] = useState<number | null>(null);
  const [todayChores, setTodayChores] = useState<DayChore[] | null>(null);
  const [todayEarned, setTodayEarned] = useState(0);
  const [giftBalance, setGiftBalance] = useState<number | null>(null);

  const fetchData = useCallback(() => {
    const d = today();
    fetch("/api/allowance").then(r => r.json()).then(periods => {
      if (Array.isArray(periods)) {
        setUnpaidTotal(periods.filter(p => !p.isPaid).reduce((s, p) => s + p.totalAmount, 0));
      }
    }).catch(() => {});
    fetch(`/api/logs?startDate=${d}&endDate=${d}`).then(r => r.json()).then(days => {
      const day = Array.isArray(days) ? days[0] : null;
      if (day) {
        setTodayChores(day.chores ?? []);
        setTodayEarned(day.totalAmount ?? 0);
      }
    }).catch(() => {});
    fetch("/api/gift-money").then(r => r.json()).then(g => {
      setGiftBalance(g.balance ?? 0);
    }).catch(() => {});
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const now = new Date(today() + "T00:00:00");
  const doneCount = todayChores?.filter(c => c.completed).length ?? 0;
  const totalCount = todayChores?.length ?? 0;

  async function toggleChore(chore: DayChore) {
    const d = today();
    if (chore.logId == null) {
      const res = await fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ choreId: chore.id, date: d, isExtra: chore.isExtra ?? false }),
      });
      const log = await res.json();
      await fetch(`/api/logs/${log.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: true }),
      });
    } else {
      await fetch(`/api/logs/${chore.logId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !chore.completed }),
      });
    }
    fetchData();
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">
          {now.getMonth() + 1}月{now.getDate()}日（{DAY_NAMES_JA[now.getDay()]}）
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">きょうも おてつだい がんばろう！</p>
      </div>

      {/* 未払いのお小遣い */}
      <Link href="/allowance" className="block bg-gradient-to-r from-amber-50 to-yellow-50 rounded-2xl border border-amber-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-amber-700">たまっているお小遣い</div>
            <div className="text-2xl font-bold text-amber-800 mt-0.5">
              {unpaidTotal == null ? "—" : formatJPY(unpaidTotal)}
            </div>
          </div>
          <span className="text-3xl">💰</span>
        </div>
      </Link>

      {/* 今日のお手伝い */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="font-bold text-gray-800">📅 きょうのお手伝い</div>
          <div className="text-sm text-gray-500">
            {totalCount > 0 ? `${doneCount}/${totalCount} かんりょう` : ""}
            {todayEarned > 0 && <span className="ml-2 font-bold text-green-600">{formatJPY(todayEarned)}</span>}
          </div>
        </div>
        {todayChores == null ? (
          <div className="text-center text-gray-300 py-4 text-sm">よみこみ中…</div>
        ) : todayChores.length === 0 ? (
          <div className="text-center text-gray-400 py-4 text-sm">きょうのお手伝いはありません</div>
        ) : (
          <div className="space-y-2">
            {todayChores.map(c => (
              <button
                key={c.id}
                onClick={() => toggleChore(c)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all
                  ${c.completed ? "border-green-300 bg-green-50" : "border-gray-200 bg-white active:bg-gray-50"}`}
              >
                <span className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-sm shrink-0
                  ${c.completed ? "border-green-500 bg-green-500 text-white" : "border-gray-300 text-transparent"}`}>
                  ✓
                </span>
                <span className={`flex-1 font-medium ${c.completed ? "text-green-700 line-through" : "text-gray-800"}`}>
                  {c.name}
                </span>
                <span className={`text-sm font-bold ${c.completed ? "text-green-600" : "text-gray-400"}`}>
                  {formatJPY(c.amountOverride ?? c.amount)}
                </span>
              </button>
            ))}
          </div>
        )}
        <Link href="/tasks" className="block text-center text-xs text-blue-500 mt-3">
          カレンダーでぜんぶ見る →
        </Link>
      </div>

      {/* お年玉・お祝い金 */}
      <Link href="/gift" className="block bg-gradient-to-r from-rose-50 to-amber-50 rounded-2xl border border-rose-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-rose-700">🧧 お年玉・お祝い金</div>
            <div className="text-2xl font-bold text-rose-800 mt-0.5">
              {giftBalance == null ? "—" : formatJPY(giftBalance)}
            </div>
            <div className="text-[10px] text-rose-400 mt-0.5">おうちの人がべつに貯めてくれているお金</div>
          </div>
          <span className="text-3xl">🎁</span>
        </div>
      </Link>
    </div>
  );
}
