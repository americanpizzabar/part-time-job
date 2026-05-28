"use client";

import { useState } from "react";
import { today } from "@/lib/dateUtils";
import { EXPENSE_CATEGORIES, CATEGORY_ICONS } from "@/lib/budget";
import ImageUpload from "@/components/ImageUpload";

interface AddTransactionModalProps {
  defaultDate?: string;
  onSaved: () => void;
  onClose: () => void;
}

export default function AddTransactionModal({ defaultDate, onSaved, onClose }: AddTransactionModalProps) {
  const [type, setType] = useState<"EXPENSE" | "INCOME">("EXPENSE");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [needsWants, setNeedsWants] = useState<"NEEDS" | "WANTS">("WANTS");
  const [date, setDate] = useState(defaultDate ?? today());
  const [memo, setMemo] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const isLunch = type === "EXPENSE" && category === "昼食";

  async function handleSave() {
    if (!amount || Number(amount) <= 0) return;
    setSaving(true);
    try {
      await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          amount: Number(amount),
          category: type === "EXPENSE" ? category : undefined,
          needsWants: type === "EXPENSE" ? needsWants : undefined,
          date,
          memo,
          isPrivate,
          imageUrl: isLunch ? imageUrl : undefined,
        }),
      });
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white">
          <h2 className="text-lg font-bold">記録を追加</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* 収支タイプ */}
          <div className="flex gap-2">
            <button
              onClick={() => setType("EXPENSE")}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold border transition-all
                ${type === "EXPENSE" ? "border-red-400 bg-red-50 text-red-600" : "border-gray-200 text-gray-500"}`}
            >
              支出
            </button>
            <button
              onClick={() => setType("INCOME")}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold border transition-all
                ${type === "INCOME" ? "border-blue-400 bg-blue-50 text-blue-600" : "border-gray-200 text-gray-500"}`}
            >
              収入
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">金額（円）*</label>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0"
              min="0"
              autoFocus
            />
          </div>

          {type === "EXPENSE" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">仕分けタグ *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setNeedsWants("NEEDS")}
                    className={`p-3 rounded-lg border text-left transition-all
                      ${needsWants === "NEEDS" ? "border-blue-500 bg-blue-50" : "border-gray-200"}`}
                  >
                    <div className="font-bold text-sm text-blue-700">必要 (Needs)</div>
                    <div className="text-xs text-gray-500 mt-0.5">ノート・部活の消耗品など</div>
                  </button>
                  <button
                    onClick={() => setNeedsWants("WANTS")}
                    className={`p-3 rounded-lg border text-left transition-all
                      ${needsWants === "WANTS" ? "border-orange-500 bg-orange-50" : "border-gray-200"}`}
                  >
                    <div className="font-bold text-sm text-orange-600">欲しい (Wants)</div>
                    <div className="text-xs text-gray-500 mt-0.5">お菓子・ゲーム・買い食い</div>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">カテゴリ</label>
                <div className="grid grid-cols-3 gap-2">
                  {EXPENSE_CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setCategory(cat)}
                      className={`p-2 rounded-lg border text-xs font-medium transition-all
                        ${category === cat ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600"}`}
                    >
                      <div className="text-lg">{CATEGORY_ICONS[cat]}</div>
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {isLunch && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">食べたものの写真</label>
                  <p className="text-xs text-gray-500 mb-2">🍱 昼食の写真は親も見ることができます。</p>
                  <ImageUpload value={imageUrl} onChange={setImageUrl} />
                </div>
              )}
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">日付</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">メモ（任意）</label>
            <input
              type="text"
              value={memo}
              onChange={e => setMemo(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="例：コンビニでおやつ"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer bg-gray-50 rounded-lg p-3">
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={e => setIsPrivate(e.target.checked)}
              className="rounded"
            />
            <div>
              <span className="font-medium">この記録を親に見せない</span>
              <div className="text-xs text-gray-400">金額は合計に含まれますが、詳細は非公開になります</div>
            </div>
          </label>

          <button
            onClick={handleSave}
            disabled={saving || !amount || Number(amount) <= 0}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "保存中..." : "保存する"}
          </button>
        </div>
      </div>
    </div>
  );
}
