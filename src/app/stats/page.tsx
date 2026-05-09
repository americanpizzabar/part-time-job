"use client";

import { useState, useEffect } from "react";
import { formatJPY } from "@/lib/dateUtils";

interface AllowancePeriod {
  id: number;
  startDate: string;
  endDate: string;
  baseAmount: number;
  choreAmount: number;
  totalAmount: number;
  isPaid: boolean;
  snapshot: string | null;
}

interface ChoreStats {
  name: string;
  amount: number;
  totalScheduled: number;
  totalCompleted: number;
  totalEarned: number;
  rate: number;
}

export default function StatsPage() {
  const [periods, setPeriods] = useState<AllowancePeriod[]>([]);

  useEffect(() => {
    fetch("/api/allowance").then(r => r.json()).then(setPeriods);
  }, []);

  const choreStatsMap: Record<string, ChoreStats> = {};
  let totalEarned = 0;
  let totalBase = 0;

  for (const period of periods) {
    totalBase += period.baseAmount;
    totalEarned += period.choreAmount;
    if (!period.snapshot) continue;
    const snapshot: Record<string, { name: string; amount: number; scheduled: number; completed: number }> =
      JSON.parse(period.snapshot);
    for (const item of Object.values(snapshot)) {
      if (!choreStatsMap[item.name]) {
        choreStatsMap[item.name] = { name: item.name, amount: item.amount, totalScheduled: 0, totalCompleted: 0, totalEarned: 0, rate: 0 };
      }
      choreStatsMap[item.name].totalScheduled += item.scheduled;
      choreStatsMap[item.name].totalCompleted += item.completed;
      choreStatsMap[item.name].totalEarned += item.completed * item.amount;
    }
  }

  const choreStats = Object.values(choreStatsMap).map(s => ({
    ...s,
    rate: s.totalScheduled > 0 ? Math.round((s.totalCompleted / s.totalScheduled) * 100) : 0,
  })).sort((a, b) => b.rate - a.rate);

  const overallRate = choreStats.length > 0
    ? Math.round(choreStats.reduce((s, c) => s + c.rate, 0) / choreStats.length)
    : 0;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-800">統計</h1>

      {periods.length === 0 ? (
        <div className="text-center text-gray-400 py-12">
          まだ集計データがありません。<br />
          「お小遣い」ページで集計してください。
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-xs text-gray-500">集計回数</div>
              <div className="text-2xl font-bold text-gray-800 mt-1">{periods.length}回</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-xs text-gray-500">お手伝い達成率</div>
              <div className="text-2xl font-bold text-blue-600 mt-1">{overallRate}%</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-xs text-gray-500">基本お小遣い合計</div>
              <div className="text-xl font-bold text-gray-800 mt-1">{formatJPY(totalBase)}</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-xs text-gray-500">お手伝い報酬合計</div>
              <div className="text-xl font-bold text-green-600 mt-1">{formatJPY(totalEarned)}</div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h2 className="font-bold text-gray-800 mb-4">お手伝い別の達成率</h2>
            <div className="space-y-3">
              {choreStats.map(stat => (
                <div key={stat.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">{stat.name}</span>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-gray-500">{stat.totalCompleted}/{stat.totalScheduled}回</span>
                      <span className="font-semibold text-gray-800">{stat.rate}%</span>
                      <span className="text-green-600 font-medium">{formatJPY(stat.totalEarned)}</span>
                    </div>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${stat.rate}%`,
                        backgroundColor: stat.rate >= 80 ? "#22c55e" : stat.rate >= 50 ? "#3b82f6" : "#f59e0b",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h2 className="font-bold text-gray-800 mb-3">期間別の履歴</h2>
            <div className="space-y-2">
              {periods.slice(0, 10).map(period => (
                <div key={period.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <div className="text-sm font-medium text-gray-700">{period.startDate} 〜 {period.endDate}</div>
                    <div className="text-xs text-gray-400">
                      {period.snapshot
                        ? (() => {
                            const snap = JSON.parse(period.snapshot);
                            const total = Object.values(snap).reduce((s: number, v: unknown) => {
                              const item = v as { scheduled: number; completed: number };
                              return s + item.scheduled;
                            }, 0);
                            const done = Object.values(snap).reduce((s: number, v: unknown) => {
                              const item = v as { scheduled: number; completed: number };
                              return s + item.completed;
                            }, 0);
                            return `${done}/${total}回完了`;
                          })()
                        : ""}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-800">{formatJPY(period.totalAmount)}</div>
                    <div className={`text-xs ${period.isPaid ? "text-green-600" : "text-yellow-600"}`}>
                      {period.isPaid ? "支払済" : "未払い"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
