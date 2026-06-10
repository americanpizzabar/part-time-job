"use client";

import { useState, useEffect, useCallback } from "react";
import { formatJPY, monthRange, DAY_NAMES_JA, today } from "@/lib/dateUtils";
import { CATEGORY_ICONS, needsWantsFeedback } from "@/lib/budget";
import NeedsWantsPie from "@/components/NeedsWantsPie";
import AddTransactionModal from "@/components/AddTransactionModal";
import BreakdownDrawer, { BreakdownRow } from "@/components/BreakdownDrawer";

interface Transaction {
  id: number;
  type: string;
  amount: number;
  category: string | null;
  needsWants: string | null;
  date: string;
  memo: string | null;
  imageUrl: string | null;
  isPrivate: boolean;
  source: string;
}

interface Balance {
  wallet: number;
  free: number;
  saved: number;
  month: {
    needs: number;
    wants: number;
    total: number;
    income: number;
    expense: number;
    needsRatio: number;
    wantsRatio: number;
  };
}

export default function BudgetPage() {
  const [now] = useState(new Date());
  const [year, setYear] = useState(now.getFullYear());
  const [month0, setMonth0] = useState(now.getMonth());
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [breakdown, setBreakdown] = useState<{
    title: string; note?: string; total: number; totalPositive: boolean;
    rows: BreakdownRow[]; loading: boolean;
  } | null>(null);

  const { start, end } = monthRange(year, month0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [txRes, balRes] = await Promise.all([
        fetch(`/api/transactions?startDate=${start}&endDate=${end}`),
        fetch(`/api/balance?monthStart=${start}&monthEnd=${end}`),
      ]);
      setTransactions(await txRes.json());
      setBalance(await balRes.json());
    } finally {
      setLoading(false);
    }
  }, [start, end]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function prevMonth() {
    const d = new Date(year, month0 - 1, 1);
    setYear(d.getFullYear());
    setMonth0(d.getMonth());
  }
  function nextMonth() {
    const d = new Date(year, month0 + 1, 1);
    setYear(d.getFullYear());
    setMonth0(d.getMonth());
  }

  async function openBreakdown(type: "wallet" | "free" | "saved" | "income" | "expense") {
    const titles: Record<string, string> = {
      wallet: "財布残高の内訳",
      free: "自由に使える内訳",
      saved: "貯金中の内訳",
      income: `${month0 + 1}月の収入`,
      expense: `${month0 + 1}月の支出`,
    };
    const notes: Record<string, string> = {
      wallet: "全期間の収入 − 支出の合計",
      free: "財布残高 − 貯金中の合計",
      saved: "各目標への積立合計",
      income: `${start} 〜 ${end}`,
      expense: `${start} 〜 ${end}`,
    };
    setBreakdown({ title: titles[type], note: notes[type], total: 0, totalPositive: type !== "expense", rows: [], loading: true });

    if (type === "income") {
      const rows: BreakdownRow[] = transactions
        .filter(t => t.type === "INCOME")
        .sort((a, b) => b.date.localeCompare(a.date))
        .map(t => ({ id: t.id, date: t.date, label: t.memo || "収入", sublabel: t.category ?? undefined, amount: t.amount, positive: true }));
      const total = rows.reduce((s, r) => s + r.amount, 0);
      setBreakdown(prev => prev ? { ...prev, rows, total, loading: false } : null);
      return;
    }
    if (type === "expense") {
      const rows: BreakdownRow[] = transactions
        .filter(t => t.type === "EXPENSE")
        .sort((a, b) => b.date.localeCompare(a.date))
        .map(t => ({ id: t.id, date: t.date, label: t.category || "支出", sublabel: t.memo ?? undefined, amount: t.amount, positive: false }));
      const total = rows.reduce((s, r) => s + r.amount, 0);
      setBreakdown(prev => prev ? { ...prev, rows, total, totalPositive: false, loading: false } : null);
      return;
    }

    // wallet / free / saved — fetch all-time data
    const [allTxRes, goalsRes] = await Promise.all([
      fetch("/api/transactions").then(r => r.json()).catch(() => []),
      fetch("/api/goals").then(r => r.json()).catch(() => []),
    ]);
    const allTx: Transaction[] = Array.isArray(allTxRes) ? allTxRes : [];
    const goals: { id: number; name: string; saved: number; contributions: { id: number; date: string; amount: number; memo: string | null }[] }[] =
      Array.isArray(goalsRes) ? goalsRes : [];

    if (type === "wallet") {
      const rows: BreakdownRow[] = allTx
        .sort((a, b) => b.date.localeCompare(a.date))
        .map(t => ({
          id: t.id,
          date: t.date,
          label: t.type === "INCOME" ? (t.memo || "収入") : (t.category || "支出"),
          sublabel: t.type === "INCOME" ? t.category ?? undefined : t.memo ?? undefined,
          amount: t.amount,
          positive: t.type === "INCOME",
        }));
      const income = allTx.filter(t => t.type === "INCOME").reduce((s, t) => s + t.amount, 0);
      const expense = allTx.filter(t => t.type === "EXPENSE").reduce((s, t) => s + t.amount, 0);
      setBreakdown(prev => prev ? { ...prev, rows, total: income - expense, loading: false } : null);
    } else if (type === "free") {
      const savings = goals.flatMap(g =>
        g.contributions.map(c => ({
          id: `${g.id}-${c.id}`,
          date: c.date,
          label: g.name,
          sublabel: c.memo ?? undefined,
          amount: c.amount,
          positive: false,
        }))
      ).sort((a, b) => b.date.localeCompare(a.date));
      const savedTotal = goals.reduce((s, g) => s + g.saved, 0);
      setBreakdown(prev => prev ? { ...prev, rows: savings, total: (balance?.free ?? 0), note: `財布 ${formatJPY(balance?.wallet ?? 0)} − 貯金 ${formatJPY(savedTotal)}`, loading: false } : null);
    } else {
      // saved
      const rows: BreakdownRow[] = goals.flatMap(g =>
        g.contributions.map(c => ({
          id: `${g.id}-${c.id}`,
          date: c.date,
          label: g.name,
          sublabel: c.memo ?? undefined,
          amount: c.amount,
          positive: false,
        }))
      ).sort((a, b) => b.date.localeCompare(a.date));
      const savedTotal = goals.reduce((s, g) => s + g.saved, 0);
      setBreakdown(prev => prev ? { ...prev, rows, total: savedTotal, totalPositive: false, loading: false } : null);
    }
  }

  async function handleDelete(tx: Transaction) {
    const label = tx.type === "INCOME" ? (tx.memo || "収入") : (tx.category || "支出");
    const isMercari = tx.source === "MERCARI";
    const msg = isMercari
      ? `「${label}」をかけいぼから削除しますか？\nメルカリ売上履歴と累計も同時に削除されます。`
      : `「${label}」を削除しますか？`;
    if (!confirm(msg)) return;
    const res = await fetch(`/api/transactions/${tx.id}`, { method: "DELETE" });
    if (!res.ok) {
      const err = await res.json();
      alert(err.error ?? "削除できませんでした");
      return;
    }
    fetchData();
  }

  // カレンダー用に日ごと集計
  const daysInMonth = new Date(year, month0 + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month0, 1).getDay();
  const dayMap: Record<string, { income: number; expense: number }> = {};
  for (const t of transactions) {
    if (!dayMap[t.date]) dayMap[t.date] = { income: 0, expense: 0 };
    if (t.type === "INCOME") dayMap[t.date].income += t.amount;
    else dayMap[t.date].expense += t.amount;
  }

  const selectedTx = selectedDate
    ? transactions.filter(t => t.date === selectedDate)
    : [];

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  function dateStr(d: number) {
    return `${year}-${String(month0 + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">かけいぼ</h1>
        <button
          onClick={() => { setSelectedDate(null); setShowAdd(true); }}
          className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          記録
        </button>
      </div>

      {/* 残高 */}
      {balance && (
        <div className="grid grid-cols-3 gap-2">
          <button onClick={() => openBreakdown("wallet")} className="bg-white rounded-xl border border-gray-200 p-3 text-center active:bg-gray-50 transition-colors">
            <div className="text-xs text-gray-500">財布残高</div>
            <div className="text-base font-bold text-gray-800 mt-0.5">{formatJPY(balance.wallet)}</div>
            <div className="text-[9px] text-gray-300 mt-0.5">タップで明細</div>
          </button>
          <button onClick={() => openBreakdown("free")} className="bg-white rounded-xl border border-gray-200 p-3 text-center active:bg-gray-50 transition-colors">
            <div className="text-xs text-gray-500">自由に使える</div>
            <div className="text-base font-bold text-green-600 mt-0.5">{formatJPY(balance.free)}</div>
            <div className="text-[9px] text-gray-300 mt-0.5">タップで明細</div>
          </button>
          <button onClick={() => openBreakdown("saved")} className="bg-white rounded-xl border border-gray-200 p-3 text-center active:bg-gray-50 transition-colors">
            <div className="text-xs text-gray-500">貯金中</div>
            <div className="text-base font-bold text-indigo-600 mt-0.5">{formatJPY(balance.saved)}</div>
            <div className="text-[9px] text-gray-300 mt-0.5">タップで明細</div>
          </button>
        </div>
      )}

      {/* 月ナビ */}
      <div className="flex items-center justify-between">
        <button onClick={prevMonth} className="p-2 text-gray-600 hover:text-gray-900">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="font-bold text-gray-800">{year}年 {month0 + 1}月</span>
        <button onClick={nextMonth} className="p-2 text-gray-600 hover:text-gray-900">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* カレンダー */}
          <div className="bg-white rounded-xl border border-gray-200 p-3">
            <div className="grid grid-cols-7 gap-1 mb-1">
              {DAY_NAMES_JA.map((d, i) => (
                <div key={i} className={`text-center text-xs font-medium py-1
                  ${i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : "text-gray-500"}`}>
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {cells.map((d, i) => {
                if (d === null) return <div key={i} />;
                const ds = dateStr(d);
                const day = dayMap[ds];
                const isToday = ds === today();
                const isSelected = ds === selectedDate;
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDate(isSelected ? null : ds)}
                    className={`aspect-square rounded-lg p-1 flex flex-col items-center justify-start text-xs border transition-all
                      ${isSelected ? "border-blue-500 bg-blue-50" : isToday ? "border-blue-300" : "border-transparent hover:bg-gray-50"}`}
                  >
                    <span className={`font-medium ${isToday ? "text-blue-600" : "text-gray-700"}`}>{d}</span>
                    {day?.income > 0 && (
                      <span className="text-[9px] text-blue-500 leading-tight">+{day.income.toLocaleString()}</span>
                    )}
                    {day?.expense > 0 && (
                      <span className="text-[9px] text-red-500 leading-tight">-{day.expense.toLocaleString()}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 選択日の詳細 */}
          {selectedDate && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-gray-800">{selectedDate} の記録</h3>
                <button
                  onClick={() => { setShowAdd(true); }}
                  className="text-sm text-blue-600 font-medium"
                >
                  + 追加
                </button>
              </div>
              {selectedTx.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">記録はありません</p>
              ) : (
                <div className="space-y-2">
                  {selectedTx.map(t => (
                    <div key={t.id} className="py-2 border-b last:border-0">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">
                        {t.type === "INCOME" ? "💰" : CATEGORY_ICONS[t.category ?? "その他"] ?? "📦"}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-800 flex items-center gap-1.5">
                          {t.type === "INCOME" ? (t.memo || "収入") : (t.category ?? "支出")}
                          {t.isPrivate && <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 rounded-full">非公開</span>}
                          {t.needsWants && (
                            <span className={`text-[10px] px-1.5 rounded-full ${t.needsWants === "NEEDS" ? "bg-blue-100 text-blue-600" : "bg-orange-100 text-orange-600"}`}>
                              {t.needsWants === "NEEDS" ? "必要" : "欲しい"}
                            </span>
                          )}
                        </div>
                        {t.memo && t.type === "EXPENSE" && <div className="text-xs text-gray-400 truncate">{t.memo}</div>}
                      </div>
                      <span className={`text-sm font-bold ${t.type === "INCOME" ? "text-blue-600" : "text-red-500"}`}>
                        {t.type === "INCOME" ? "+" : "-"}{formatJPY(t.amount)}
                      </span>
                      {(t.source === "MANUAL" || t.source === "MERCARI") && (
                        <button onClick={() => handleDelete(t)} className="text-gray-300 hover:text-red-500 p-0.5">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                    {t.imageUrl && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={t.imageUrl} alt={t.category ?? "写真"} className="mt-2 w-full h-40 object-cover rounded-lg" />
                    )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 月末レポート */}
          {balance && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="font-bold text-gray-800 mb-4">{month0 + 1}月のNeeds / Wants</h3>
              <NeedsWantsPie
                needs={balance.month.needs}
                wants={balance.month.wants}
                needsRatio={balance.month.needsRatio}
                wantsRatio={balance.month.wantsRatio}
              />
              <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
                💡 {needsWantsFeedback(balance.month.needsRatio, balance.month.wantsRatio, balance.month.total)}
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3 text-center">
                <button onClick={() => openBreakdown("income")} className="bg-gray-50 rounded-lg p-2 active:bg-gray-100 transition-colors">
                  <div className="text-xs text-gray-500">今月の収入</div>
                  <div className="text-sm font-bold text-blue-600">{formatJPY(balance.month.income)}</div>
                  <div className="text-[9px] text-gray-300 mt-0.5">タップで明細</div>
                </button>
                <button onClick={() => openBreakdown("expense")} className="bg-gray-50 rounded-lg p-2 active:bg-gray-100 transition-colors">
                  <div className="text-xs text-gray-500">今月の支出</div>
                  <div className="text-sm font-bold text-red-500">{formatJPY(balance.month.expense)}</div>
                  <div className="text-[9px] text-gray-300 mt-0.5">タップで明細</div>
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {showAdd && (
        <AddTransactionModal
          defaultDate={selectedDate ?? undefined}
          onSaved={fetchData}
          onClose={() => setShowAdd(false)}
        />
      )}

      {breakdown && (
        <BreakdownDrawer
          title={breakdown.title}
          note={breakdown.note}
          total={breakdown.total}
          totalPositive={breakdown.totalPositive}
          rows={breakdown.rows}
          loading={breakdown.loading}
          onClose={() => setBreakdown(null)}
        />
      )}
    </div>
  );
}
