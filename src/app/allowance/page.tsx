"use client";

import { useState, useEffect } from "react";
import { today, formatJPY } from "@/lib/dateUtils";
import { addDays, subDays, format } from "date-fns";
import { useRole } from "@/lib/useRole";

interface AllowancePeriod {
  id: number;
  startDate: string;
  endDate: string;
  baseAmount: number;
  choreAmount: number;
  totalAmount: number;
  isPaid: boolean;
  paidAt: string | null;
  notes: string | null;
  snapshot: string | null;
  createdAt: string;
}

interface Config {
  aggregation: { periodDays: number; startDayOfWeek: number };
  allowance: { period: string; amount: number; startDate: string } | null;
}

export default function AllowancePage() {
  const { role, mounted } = useRole();
  const isParent = mounted && role === "PARENT";
  const [periods, setPeriods] = useState<AllowancePeriod[]>([]);
  const [config, setConfig] = useState<Config | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");
  const [notes, setNotes] = useState("");
  const [creating, setCreating] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const fetchData = () => {
    fetch("/api/allowance").then(r => r.json()).then(setPeriods);
    fetch("/api/config").then(r => r.json()).then(setConfig);
  };

  useEffect(() => { fetchData(); }, []);

  function openCreate() {
    const periodDays = config?.aggregation?.periodDays ?? 7;
    const end = today();
    const start = format(subDays(new Date(end + "T00:00:00"), periodDays - 1), "yyyy-MM-dd");
    setNewStart(start);
    setNewEnd(end);
    setNotes("");
    setShowCreate(true);
  }

  async function handleCreate() {
    setCreating(true);
    try {
      await fetch("/api/allowance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startDate: newStart, endDate: newEnd, notes }),
      });
      await fetchData();
      setShowCreate(false);
    } finally {
      setCreating(false);
    }
  }

  async function handleTogglePaid(period: AllowancePeriod) {
    await fetch(`/api/allowance/${period.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPaid: !period.isPaid }),
    });
    fetchData();
  }

  async function handleDelete(period: AllowancePeriod) {
    if (!confirm("この集計を削除しますか？")) return;
    await fetch(`/api/allowance/${period.id}`, { method: "DELETE" });
    fetchData();
  }

  async function handleRecalculate(period: AllowancePeriod) {
    await fetch(`/api/allowance/${period.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recalculate: true }),
    });
    fetchData();
  }

  const unpaidTotal = periods.filter(p => !p.isPaid).reduce((s, p) => s + p.totalAmount, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">お小遣い</h1>
        {isParent && (
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors"
          >
            集計する
          </button>
        )}
      </div>
      {mounted && !isParent && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-700">
          📋 集計・支払いの操作は親の端末から行ってください。
        </div>
      )}

      {unpaidTotal > 0 && (
        <div className="bg-yellow-50 border border-yellow-300 rounded-xl p-4">
          <div className="text-sm text-yellow-700 font-medium">未払いのお小遣い</div>
          <div className="text-2xl font-bold text-yellow-800 mt-1">{formatJPY(unpaidTotal)}</div>
        </div>
      )}

      <div className="space-y-3">
        {periods.map(period => {
          const snapshot: Record<string, { name: string; amount: number; scheduled: number; completed: number }> =
            period.snapshot ? JSON.parse(period.snapshot) : {};
          const isExpanded = expandedId === period.id;

          return (
            <div key={period.id} className={`bg-white rounded-xl border ${period.isPaid ? "border-gray-200 opacity-70" : "border-gray-200"}`}>
              <button
                onClick={() => setExpandedId(isExpanded ? null : period.id)}
                className="w-full p-4 text-left"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-500">{period.startDate} 〜 {period.endDate}</div>
                    <div className="text-xl font-bold text-gray-800 mt-1">{formatJPY(period.totalAmount)}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      基本 {formatJPY(period.baseAmount)} + お手伝い {formatJPY(period.choreAmount)}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${period.isPaid ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                      {period.isPaid ? "支払済" : "未払い"}
                    </span>
                    <svg
                      className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 space-y-3 border-t">
                  {Object.values(snapshot).length > 0 && (
                    <div className="mt-3">
                      <div className="text-sm font-medium text-gray-700 mb-2">お手伝いの内訳</div>
                      <div className="space-y-1.5">
                        {Object.values(snapshot).map(item => (
                          <div key={item.name} className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">{item.name}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-gray-400">{item.completed}/{item.scheduled}回</span>
                              <span className="font-medium text-gray-800">{formatJPY(item.completed * item.amount)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {period.notes && (
                    <p className="text-sm text-gray-500 italic">"{period.notes}"</p>
                  )}
                  {isParent && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleTogglePaid(period)}
                        className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors
                          ${period.isPaid ? "bg-gray-100 text-gray-600 hover:bg-gray-200" : "bg-green-600 text-white hover:bg-green-700"}`}
                      >
                        {period.isPaid ? "未払いに戻す" : "支払い済みにする"}
                      </button>
                      {!period.isPaid && (
                        <button
                          onClick={() => handleRecalculate(period)}
                          className="px-3 py-2.5 rounded-lg text-sm text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors font-medium"
                        >
                          再集計
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(period)}
                        className="px-4 py-2.5 rounded-lg text-sm text-red-500 hover:bg-red-50 transition-colors"
                      >
                        削除
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {periods.length === 0 && (
          <div className="text-center text-gray-400 py-12">まだ集計がありません</div>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-bold">お小遣いを集計</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">開始日</label>
                  <input
                    type="date"
                    value={newStart}
                    onChange={e => setNewStart(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">終了日</label>
                  <input
                    type="date"
                    value={newEnd}
                    onChange={e => setNewEnd(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">メモ（任意）</label>
                <input
                  type="text"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例：5月第1週"
                />
              </div>
              <button
                onClick={handleCreate}
                disabled={creating || !newStart || !newEnd}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {creating ? "集計中..." : "集計する"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
