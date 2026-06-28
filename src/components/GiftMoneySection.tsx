"use client";

import { useState, useEffect, useCallback } from "react";
import { formatJPY, today } from "@/lib/dateUtils";
import { useRole } from "@/lib/useRole";

interface GiftEntry {
  id: number;
  amount: number;
  label: string;
  fromWhom: string | null;
  note: string | null;
  date: string;
}

// お年玉・お祝い金: 別管理の特別残高。
// 親が入金/引き出しを記録し、子は残高と履歴を閲覧する(引き出しは親へ口頭依頼)。
export default function GiftMoneySection({ onChange }: { onChange?: () => void }) {
  const { role, mounted } = useRole();
  const isParent = mounted && role === "PARENT";
  const [balance, setBalance] = useState(0);
  const [entries, setEntries] = useState<GiftEntry[]>([]);
  const [open, setOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [mode, setMode] = useState<"deposit" | "withdraw">("deposit");
  const [amount, setAmount] = useState("");
  const [label, setLabel] = useState("");
  const [fromWhom, setFromWhom] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/gift-money");
    const data = await res.json();
    setBalance(data.balance ?? 0);
    setEntries(data.entries ?? []);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function submit() {
    const n = Number(amount);
    if (!n || n <= 0) { setError("金額を入力してください"); return; }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/gift-money", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: mode === "deposit" ? n : -n,
          label: label || (mode === "deposit" ? "お祝い金" : "引き出し"),
          fromWhom: mode === "deposit" ? fromWhom : null,
          date: today(),
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || "保存に失敗しました");
        return;
      }
      setAmount(""); setLabel(""); setFromWhom("");
      setShowForm(false);
      await load();
      onChange?.();
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    if (!confirm("この記録を削除しますか？")) return;
    await fetch(`/api/gift-money?id=${id}`, { method: "DELETE" });
    await load();
    onChange?.();
  }

  return (
    <div className="bg-gradient-to-br from-rose-50 to-amber-50 border border-rose-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div>
          <div className="text-sm font-medium text-rose-700">🧧 お年玉・お祝い金</div>
          <div className="text-[10px] text-rose-400 mt-0.5">財布とは別に貯めている特別なお金</div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-rose-800">{formatJPY(balance)}</span>
          <svg className={`w-4 h-4 text-rose-400 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3">
          {!isParent && (
            <div className="text-xs text-rose-600 bg-rose-100/60 rounded-lg px-3 py-2">
              💡 使いたいときは、おうちの人に直接お願いしてね。
            </div>
          )}

          {entries.length === 0 ? (
            <div className="text-center text-rose-300 text-sm py-4">まだ記録がありません</div>
          ) : (
            <div className="space-y-1.5">
              {entries.map(e => (
                <div key={e.id} className="flex items-center justify-between bg-white/70 rounded-lg px-3 py-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-800 truncate">
                      {e.label}{e.fromWhom ? ` (${e.fromWhom})` : ""}
                    </div>
                    <div className="text-[10px] text-gray-400">{e.date}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-sm font-bold ${e.amount >= 0 ? "text-rose-700" : "text-gray-500"}`}>
                      {e.amount >= 0 ? "+" : "−"}{formatJPY(Math.abs(e.amount))}
                    </span>
                    {isParent && (
                      <button onClick={() => remove(e.id)} className="text-gray-300 hover:text-red-400 text-xs">✕</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {isParent && !showForm && (
            <div className="flex gap-2">
              <button
                onClick={() => { setMode("deposit"); setShowForm(true); setError(""); }}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-rose-600 text-white hover:bg-rose-700 transition-colors"
              >
                ＋ もらった
              </button>
              <button
                onClick={() => { setMode("withdraw"); setShowForm(true); setError(""); }}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-white text-rose-700 border border-rose-300 hover:bg-rose-50 transition-colors"
              >
                － 渡した
              </button>
            </div>
          )}

          {isParent && showForm && (
            <div className="bg-white rounded-lg border border-rose-200 p-3 space-y-2">
              <div className="text-xs font-medium text-rose-700">
                {mode === "deposit" ? "もらったお金を記録" : "渡した金額を記録(残高から引く)"}
              </div>
              <input
                type="number"
                inputMode="numeric"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="金額"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
              <input
                type="text"
                value={label}
                onChange={e => setLabel(e.target.value)}
                placeholder={mode === "deposit" ? "名目(例: お年玉)" : "メモ(任意)"}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
              {mode === "deposit" && (
                <input
                  type="text"
                  value={fromWhom}
                  onChange={e => setFromWhom(e.target.value)}
                  placeholder="くれた人(例: おじいちゃん・任意)"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
              )}
              {error && <div className="text-xs text-red-500">{error}</div>}
              <div className="flex gap-2">
                <button
                  onClick={submit}
                  disabled={busy}
                  className="flex-1 py-2 rounded-lg text-sm font-medium bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 transition-colors"
                >
                  {busy ? "保存中..." : "保存"}
                </button>
                <button
                  onClick={() => { setShowForm(false); setError(""); }}
                  className="px-4 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  キャンセル
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
