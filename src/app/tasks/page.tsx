"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { addDays, subDays, getDay, getDaysInMonth } from "date-fns";
import { today, toDateStr, formatJPY, currentMonthRange } from "@/lib/dateUtils";
import DayView from "@/components/DayView";
import BalanceCard from "@/components/BalanceCard";

interface ChoreItem {
  id: number;
  name: string;
  amount: number;
  description?: string | null;
  isScheduled: boolean;
  logId: number | null;
  completed: boolean;
  isExtra: boolean;
  completedAt: string | null;
}

interface DayData {
  date: string;
  chores: ChoreItem[];
  totalAmount: number;
}

interface BalanceSummary {
  wallet: number;
  free: number;
  saved: number;
}

interface GoalSummary {
  id: number;
  name: string;
  progress: number;
  saved: number;
  targetAmount: number;
  remaining: number;
  isAchieved: boolean;
}

const RANGE_OPTIONS = ["1日", "3日", "1週間", "2週間", "1カ月"] as const;

function computeRange(
  rangeIndex: number,
  offset: number,
  startDayOfWeek: number
): { startDate: string; endDate: string } {
  const todayDate = new Date(today() + "T00:00:00");

  // 直近の週開始日（startDayOfWeek以下の最新の日）
  const dayDiff = (getDay(todayDate) - startDayOfWeek + 7) % 7;
  const currentWeekStart = subDays(todayDate, dayDiff);

  switch (rangeIndex) {
    case 0: { // 1日
      const d = addDays(todayDate, offset);
      return { startDate: toDateStr(d), endDate: toDateStr(d) };
    }
    case 1: { // 3日: 本日を含む過去3日間
      const end = addDays(todayDate, offset * 3);
      const start = subDays(end, 2);
      return { startDate: toDateStr(start), endDate: toDateStr(end) };
    }
    case 2: { // 1週間: 週開始曜日から本日を含む1週間
      const start = addDays(currentWeekStart, offset * 7);
      return { startDate: toDateStr(start), endDate: toDateStr(addDays(start, 6)) };
    }
    case 3: { // 2週間: 週開始曜日から本日を含む過去2週間
      const start = addDays(subDays(currentWeekStart, 7), offset * 14);
      return { startDate: toDateStr(start), endDate: toDateStr(addDays(start, 13)) };
    }
    case 4: { // 1カ月: 本日の月
      const base = new Date(todayDate.getFullYear(), todayDate.getMonth() + offset, 1);
      const start = new Date(base.getFullYear(), base.getMonth(), 1);
      const end = new Date(base.getFullYear(), base.getMonth(), getDaysInMonth(start));
      return { startDate: toDateStr(start), endDate: toDateStr(end) };
    }
    default:
      return { startDate: today(), endDate: today() };
  }
}

export default function TasksPage() {
  const [days, setDays] = useState<DayData[]>([]);
  const [rangeIndex, setRangeIndex] = useState(0);
  const [offset, setOffset] = useState(0);
  const [startDayOfWeek, setStartDayOfWeek] = useState(1);
  const [loading, setLoading] = useState(true);
  const [seeded, setSeeded] = useState(false);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [balance, setBalance] = useState<BalanceSummary | null>(null);
  const [topGoal, setTopGoal] = useState<GoalSummary | null>(null);

  useEffect(() => {
    fetch("/api/config")
      .then(r => r.json())
      .then(data => {
        setStartDayOfWeek(data.aggregation?.startDayOfWeek ?? 1);
        setConfigLoaded(true);
      });
  }, []);

  const fetchSummary = useCallback(async () => {
    const [b, goals] = await Promise.all([
      fetch("/api/balance").then(r => r.json()),
      fetch("/api/goals").then(r => r.json()),
    ]);
    setBalance(b);
    const active = (goals as GoalSummary[]).filter(g => !g.isAchieved);
    setTopGoal(active.length > 0 ? active[0] : null);
  }, []);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  const { startDate, endDate } = computeRange(rangeIndex, offset, startDayOfWeek);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/logs?startDate=${startDate}&endDate=${endDate}`);
      const data = await res.json();
      setDays(data);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    if (!configLoaded) return;
    if (!seeded) {
      fetch("/api/seed", { method: "POST" }).then(() => {
        setSeeded(true);
        fetchData();
      });
    } else {
      fetchData();
    }
  }, [fetchData, seeded, configLoaded]);

  const totalCompleted = days.reduce(
    (s, d) => s + d.chores.filter(c => c.completed).reduce((ss, c) => ss + c.amount, 0),
    0
  );

  const isMultiDay = rangeIndex > 0;

  function handlePrev() {
    setOffset(o => o - 1);
  }
  function handleNext() {
    setOffset(o => o + 1);
  }
  function handleToday() {
    setOffset(0);
  }
  function handleLastWeek() {
    setRangeIndex(2); // 1週間
    setOffset(-1);
  }

  const isLastWeek = rangeIndex === 2 && offset === -1;

  return (
    <div className="space-y-4">
      {/* 残高サマリー */}
      {balance && <BalanceCard wallet={balance.wallet} free={balance.free} saved={balance.saved} />}

      {/* 貯金メーター（進行中の目標） */}
      {topGoal && (
        <Link href="/goals" className="block bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-300 transition-all">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
              🎯 {topGoal.name}
            </span>
            <span className="text-xs text-gray-400">あと {formatJPY(topGoal.remaining)}</span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${topGoal.progress}%`, background: "linear-gradient(90deg,#3b82f6,#6366f1)" }}
            />
          </div>
          <div className="flex items-center justify-between mt-1 text-xs">
            <span className="font-medium text-blue-600">{topGoal.progress}% 達成</span>
            <span className="text-gray-400">{formatJPY(topGoal.saved)} / {formatJPY(topGoal.targetAmount)}</span>
          </div>
        </Link>
      )}

      <div className="flex items-center justify-between pt-1">
        <h1 className="text-xl font-bold text-gray-800">お手伝いカレンダー</h1>
        <div className="text-right">
          <div className="text-xs text-gray-500">表示期間の合計</div>
          <div className="text-lg font-bold text-green-600">{formatJPY(totalCompleted)}</div>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex bg-white rounded-lg border border-gray-200 p-0.5 gap-0.5">
          {RANGE_OPTIONS.map((label, i) => (
            <button
              key={i}
              onClick={() => { setRangeIndex(i); setOffset(0); }}
              className={`px-2.5 py-1.5 rounded-md text-sm font-medium transition-all
                ${rangeIndex === i && offset === 0 ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          onClick={handleLastWeek}
          className={`px-2.5 py-1.5 rounded-md text-sm font-medium border transition-all
            ${isLastWeek ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50"}`}
        >
          先週
        </button>
        {offset !== 0 && (
          <button
            onClick={handleToday}
            className="ml-auto text-xs text-blue-600 font-medium hover:underline"
          >
            今日に戻る
          </button>
        )}
      </div>

      {isMultiDay && (
        <div className="flex items-center justify-between">
          <button
            onClick={handlePrev}
            className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            前の期間
          </button>
          <span className="text-xs text-gray-500">{startDate} 〜 {endDate}</span>
          <button
            onClick={handleNext}
            className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
          >
            次の期間
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          {days.map(day => (
            <DayView
              key={day.date}
              day={day}
              isToday={day.date === today()}
              isExpanded={rangeIndex === 0 || day.date === today()}
              onRefresh={fetchData}
            />
          ))}
        </div>
      )}
    </div>
  );
}
