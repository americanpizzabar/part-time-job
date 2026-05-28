"use client";

import { useState, useEffect, useCallback } from "react";
import { formatJPY, today } from "@/lib/dateUtils";
import ImageUpload from "@/components/ImageUpload";

interface SavingsTransaction {
  id: number;
  amount: number;
  date: string;
  memo: string | null;
}

interface Goal {
  id: number;
  name: string;
  targetAmount: number;
  deadline: string | null;
  imageUrl: string | null;
  isAchieved: boolean;
  saved: number;
  progress: number;
  remaining: number;
  contributions: SavingsTransaction[];
}

interface Balance {
  free: number;
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [deadline, setDeadline] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [contributeFor, setContributeFor] = useState<Goal | null>(null);
  const [contributeAmount, setContributeAmount] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [g, b] = await Promise.all([
        fetch("/api/goals").then(r => r.json()),
        fetch("/api/balance").then(r => r.json()),
      ]);
      setGoals(g);
      setBalance(b);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleCreate() {
    if (!name || !targetAmount) return;
    setSaving(true);
    try {
      await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, targetAmount: Number(targetAmount), deadline, imageUrl }),
      });
      setName(""); setTargetAmount(""); setDeadline(""); setImageUrl(null);
      setShowForm(false);
      fetchData();
    } finally {
      setSaving(false);
    }
  }

  async function handleContribute() {
    if (!contributeFor || !contributeAmount) return;
    const res = await fetch(`/api/goals/${contributeFor.id}/contribute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: Number(contributeAmount) }),
    });
    if (!res.ok) {
      const err = await res.json();
      alert(err.error ?? "貯金できませんでした");
      return;
    }
    setContributeFor(null);
    setContributeAmount("");
    fetchData();
  }

  async function handleWithdraw(goal: Goal) {
    const input = prompt(`「${goal.name}」からいくら引き出しますか？（貯金額: ${formatJPY(goal.saved)}）`);
    if (!input) return;
    const amt = Number(input);
    if (!amt || amt <= 0) return;
    const res = await fetch(`/api/goals/${goal.id}/contribute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: -amt }),
    });
    if (!res.ok) {
      const err = await res.json();
      alert(err.error ?? "引き出せませんでした");
      return;
    }
    fetchData();
  }

  async function handleDelete(goal: Goal) {
    if (!confirm(`目標「${goal.name}」を削除しますか？貯金記録も消えます。`)) return;
    await fetch(`/api/goals/${goal.id}`, { method: "DELETE" });
    fetchData();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">目標貯金</h1>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          目標追加
        </button>
      </div>

      {balance && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
          <span className="text-sm text-green-700">自由に使えるお金（貯金に回せる額）: </span>
          <span className="font-bold text-green-800">{formatJPY(balance.free)}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      ) : goals.length === 0 ? (
        <div className="text-center text-gray-400 py-12">
          欲しいものを目標に設定して、<br />計画的に貯金しよう！
        </div>
      ) : (
        <div className="space-y-3">
          {goals.map(goal => (
            <div key={goal.id} className={`bg-white rounded-xl border overflow-hidden
              ${goal.isAchieved ? "border-green-300" : "border-gray-200"}`}>
              {goal.imageUrl && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={goal.imageUrl} alt={goal.name} className="w-full h-36 object-cover" />
              )}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-gray-800">{goal.name}</h3>
                      {goal.isAchieved && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">達成🎉</span>
                      )}
                    </div>
                    {goal.deadline && (
                      <div className="text-xs text-gray-400 mt-0.5">期日: {goal.deadline}</div>
                    )}
                  </div>
                  <button onClick={() => handleDelete(goal)} className="text-gray-300 hover:text-red-500 flex-shrink-0">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>

                {/* 貯金メーター */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-bold text-blue-600">{formatJPY(goal.saved)}</span>
                    <span className="text-gray-400">/ {formatJPY(goal.targetAmount)}</span>
                  </div>
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${goal.progress}%`,
                        background: goal.isAchieved
                          ? "linear-gradient(90deg,#22c55e,#16a34a)"
                          : "linear-gradient(90deg,#3b82f6,#6366f1)",
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs font-medium text-gray-600">{goal.progress}%</span>
                    {!goal.isAchieved && (
                      <span className="text-xs text-gray-400">あと {formatJPY(goal.remaining)}</span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => { setContributeFor(goal); setContributeAmount(""); }}
                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                  >
                    貯金する
                  </button>
                  {goal.saved > 0 && (
                    <button
                      onClick={() => handleWithdraw(goal)}
                      className="px-4 py-2 rounded-lg text-sm text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors"
                    >
                      引き出す
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 目標作成モーダル */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white">
              <h2 className="text-lg font-bold">目標を追加</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <ImageUpload value={imageUrl} onChange={setImageUrl} />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ターゲット名 *</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例：スニーカー、ライブのチケット"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">目標金額（円）*</label>
                <input
                  type="number"
                  value={targetAmount}
                  onChange={e => setTargetAmount(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="10000"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">目標達成期日（任意）</label>
                <input
                  type="date"
                  value={deadline}
                  onChange={e => setDeadline(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={handleCreate}
                disabled={saving || !name || !targetAmount}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {saving ? "保存中..." : "目標を作る"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 貯金モーダル */}
      {contributeFor && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-bold">「{contributeFor.name}」に貯金</h2>
              <button onClick={() => setContributeFor(null)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-5 space-y-4">
              {balance && (
                <p className="text-sm text-gray-500">
                  自由に使えるお金: <span className="font-bold text-green-600">{formatJPY(balance.free)}</span>
                </p>
              )}
              <input
                type="number"
                value={contributeAmount}
                onChange={e => setContributeAmount(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="金額"
                min="0"
                autoFocus
              />
              <button
                onClick={handleContribute}
                disabled={!contributeAmount || Number(contributeAmount) <= 0}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                貯金する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
