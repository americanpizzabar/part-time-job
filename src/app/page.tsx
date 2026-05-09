"use client";

import { useState, useEffect, useCallback } from "react";
import { addDays, subDays } from "date-fns";
import { today, toDateStr, formatJPY } from "@/lib/dateUtils";
import DayView from "@/components/DayView";

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

const RANGE_OPTIONS = [
  { label: "1日", days: 1 },
  { label: "3日", days: 3 },
  { label: "1週間", days: 7 },
  { label: "2週間", days: 14 },
];

export default function HomePage() {
  const [days, setDays] = useState<DayData[]>([]);
  const [rangeIndex, setRangeIndex] = useState(0);
  const [centerDate, setCenterDate] = useState(today());
  const [loading, setLoading] = useState(true);
  const [seeded, setSeeded] = useState(false);

  const rangeDays = RANGE_OPTIONS[rangeIndex].days;
  const startDate = toDateStr(subDays(new Date(centerDate + "T00:00:00"), Math.floor(rangeDays / 2)));
  const endDate = toDateStr(addDays(new Date(startDate + "T00:00:00"), rangeDays - 1));

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
    if (!seeded) {
      fetch("/api/seed", { method: "POST" }).then(() => {
        setSeeded(true);
        fetchData();
      });
    } else {
      fetchData();
    }
  }, [fetchData, seeded]);

  const totalCompleted = days.reduce(
    (s, d) => s + d.chores.filter(c => c.completed).reduce((ss, c) => ss + c.amount, 0),
    0
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">お手伝いカレンダー</h1>
        <div className="text-right">
          <div className="text-xs text-gray-500">表示期間の合計</div>
          <div className="text-lg font-bold text-green-600">{formatJPY(totalCompleted)}</div>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex bg-white rounded-lg border border-gray-200 p-0.5 gap-0.5">
          {RANGE_OPTIONS.map((opt, i) => (
            <button
              key={i}
              onClick={() => { setRangeIndex(i); setCenterDate(today()); }}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all
                ${rangeIndex === i ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setCenterDate(today())}
          className="ml-auto text-xs text-blue-600 font-medium hover:underline"
        >
          今日に戻る
        </button>
      </div>

      {rangeDays > 1 && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCenterDate(toDateStr(subDays(new Date(centerDate + "T00:00:00"), rangeDays)))}
            className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            前の期間
          </button>
          <span className="text-xs text-gray-500">{startDate} 〜 {endDate}</span>
          <button
            onClick={() => setCenterDate(toDateStr(addDays(new Date(centerDate + "T00:00:00"), rangeDays)))}
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
              isExpanded={rangeDays === 1 || day.date === today()}
              onRefresh={fetchData}
            />
          ))}
        </div>
      )}
    </div>
  );
}
