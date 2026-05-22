"use client";

import { useState, useEffect, useCallback } from "react";
import { addDays, subDays, getDay, getDaysInMonth, startOfYear, endOfYear, format } from "date-fns";
import { formatJPY, toDateStr, today } from "@/lib/dateUtils";

interface ChoreStatItem {
  choreId: number;
  choreName: string;
  amount: number;
  scheduled: number;
  completed: number;
  earned: number;
  rate: number;
}

interface WeeklyTrendItem {
  label: string;
  rate: number;
  earned: number;
}

interface StatsData {
  choreStats: ChoreStatItem[];
  totalScheduled: number;
  totalCompleted: number;
  totalEarned: number;
  overallRate: number;
  weeklyTrend: WeeklyTrendItem[];
  dates: { startDate: string; endDate: string; dayCount: number };
}

type PresetKey = "today" | "week" | "month" | "year" | "custom";

const PRESETS: { key: PresetKey; label: string }[] = [
  { key: "today", label: "今日" },
  { key: "week", label: "今週" },
  { key: "month", label: "今月" },
  { key: "year", label: "今年" },
  { key: "custom", label: "カスタム" },
];

function computePresetRange(
  preset: PresetKey,
  startDayOfWeek: number
): { startDate: string; endDate: string } {
  const todayDate = new Date(today() + "T00:00:00");

  switch (preset) {
    case "today":
      return { startDate: today(), endDate: today() };

    case "week": {
      const dayDiff = (getDay(todayDate) - startDayOfWeek + 7) % 7;
      const weekStart = subDays(todayDate, dayDiff);
      return {
        startDate: toDateStr(weekStart),
        endDate: toDateStr(addDays(weekStart, 6)),
      };
    }

    case "month": {
      const monthStart = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1);
      const monthEnd = new Date(
        todayDate.getFullYear(),
        todayDate.getMonth(),
        getDaysInMonth(monthStart)
      );
      return { startDate: toDateStr(monthStart), endDate: toDateStr(monthEnd) };
    }

    case "year": {
      const yearStart = startOfYear(todayDate);
      const yearEnd = endOfYear(todayDate);
      return { startDate: toDateStr(yearStart), endDate: toDateStr(yearEnd) };
    }

    default:
      return { startDate: today(), endDate: today() };
  }
}

function rateColor(rate: number) {
  if (rate >= 80) return "#22c55e";
  if (rate >= 50) return "#3b82f6";
  return "#f59e0b";
}

export default function StatsPage() {
  const [preset, setPreset] = useState<PresetKey>("week");
  const [customStart, setCustomStart] = useState(today());
  const [customEnd, setCustomEnd] = useState(today());
  const [startDayOfWeek, setStartDayOfWeek] = useState(1);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/config")
      .then(r => r.json())
      .then(data => setStartDayOfWeek(data.aggregation?.startDayOfWeek ?? 1));
  }, []);

  const { startDate, endDate } = preset === "custom"
    ? { startDate: customStart, endDate: customEnd }
    : computePresetRange(preset, startDayOfWeek);

  const fetchStats = useCallback(async () => {
    if (!startDate || !endDate || startDate > endDate) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/stats?startDate=${startDate}&endDate=${endDate}`);
      const data = await res.json();
      setStats(data);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const sorted = stats?.choreStats.slice().sort((a, b) => b.rate - a.rate) ?? [];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-800">統計</h1>

      {/* 期間セレクター */}
      <div className="space-y-2">
        <div className="flex bg-white rounded-lg border border-gray-200 p-0.5 gap-0.5">
          {PRESETS.map(p => (
            <button
              key={p.key}
              onClick={() => setPreset(p.key)}
              className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-all
                ${preset === p.key ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {preset === "custom" ? (
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl p-3">
            <input
              type="date"
              value={customStart}
              onChange={e => setCustomStart(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-gray-400 text-sm">〜</span>
            <input
              type="date"
              value={customEnd}
              onChange={e => setCustomEnd(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        ) : (
          <div className="text-center text-xs text-gray-500">
            {startDate} 〜 {endDate}（{stats?.dates.dayCount ?? "…"}日間）
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      ) : !stats || stats.totalScheduled === 0 ? (
        <div className="text-center text-gray-400 py-12">
          この期間にお手伝いのデータがありません
        </div>
      ) : (
        <>
          {/* サマリーカード */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-xs text-gray-500">達成率</div>
              <div
                className="text-3xl font-bold mt-1"
                style={{ color: rateColor(stats.overallRate) }}
              >
                {stats.overallRate}%
              </div>
              <div className="text-xs text-gray-400 mt-0.5">
                {stats.totalCompleted}/{stats.totalScheduled}回
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-xs text-gray-500">お手伝い報酬</div>
              <div className="text-2xl font-bold text-green-600 mt-1">
                {formatJPY(stats.totalEarned)}
              </div>
              <div className="text-xs text-gray-400 mt-0.5">
                {sorted.length}種類のお手伝い
              </div>
            </div>
          </div>

          {/* お手伝い別達成率 */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h2 className="font-bold text-gray-800 mb-4">お手伝い別の達成率</h2>
            <div className="space-y-3.5">
              {sorted.map(stat => (
                <div key={stat.choreId}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-gray-700 truncate max-w-[40%]">
                      {stat.choreName}
                    </span>
                    <div className="flex items-center gap-2 text-sm flex-shrink-0">
                      <span className="text-gray-400">{stat.completed}/{stat.scheduled}回</span>
                      <span
                        className="font-bold w-10 text-right"
                        style={{ color: rateColor(stat.rate) }}
                      >
                        {stat.rate}%
                      </span>
                      <span className="text-green-600 font-medium w-16 text-right">
                        {formatJPY(stat.earned)}
                      </span>
                    </div>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${stat.rate}%`, backgroundColor: rateColor(stat.rate) }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 週ごとの推移（7日以上のみ） */}
          {stats.weeklyTrend.length >= 2 && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h2 className="font-bold text-gray-800 mb-4">週ごとの推移</h2>
              <div className="space-y-2.5">
                {stats.weeklyTrend.map((week, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1 text-sm">
                      <span className="text-gray-600 text-xs">{week.label}</span>
                      <div className="flex items-center gap-3">
                        <span
                          className="font-semibold"
                          style={{ color: rateColor(week.rate) }}
                        >
                          {week.rate}%
                        </span>
                        <span className="text-green-600 font-medium text-xs">
                          {formatJPY(week.earned)}
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${week.rate}%`, backgroundColor: rateColor(week.rate) }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* 最高・最低週 */}
              {stats.weeklyTrend.length >= 3 && (() => {
                const best = stats.weeklyTrend.reduce((a, b) => a.rate >= b.rate ? a : b);
                const worst = stats.weeklyTrend.reduce((a, b) => a.rate <= b.rate ? a : b);
                return best.rate !== worst.rate ? (
                  <div className="mt-3 pt-3 border-t border-gray-100 flex gap-3">
                    <div className="flex-1 bg-green-50 rounded-lg p-2 text-center">
                      <div className="text-xs text-green-600 font-medium">最高週</div>
                      <div className="text-sm font-bold text-green-700 mt-0.5">{best.rate}%</div>
                      <div className="text-xs text-green-500">{best.label}</div>
                    </div>
                    <div className="flex-1 bg-orange-50 rounded-lg p-2 text-center">
                      <div className="text-xs text-orange-600 font-medium">最低週</div>
                      <div className="text-sm font-bold text-orange-700 mt-0.5">{worst.rate}%</div>
                      <div className="text-xs text-orange-500">{worst.label}</div>
                    </div>
                  </div>
                ) : null;
              })()}
            </div>
          )}
        </>
      )}
    </div>
  );
}
