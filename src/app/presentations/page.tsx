"use client";

import { useState, useEffect, useCallback } from "react";
import { formatJPY } from "@/lib/dateUtils";
import { STATUS_LABELS, STATUS_COLORS } from "@/lib/budget";
import ImageUpload from "@/components/ImageUpload";

interface Presentation {
  id: number;
  itemName: string;
  reason: string;
  totalAmount: number;
  selfAmount: number;
  requestAmount: number;
  status: string;
  parentMessage: string | null;
  imageUrl: string | null;
  createdAt: string;
  respondedAt: string | null;
}

export default function PresentationsPage() {
  const [presentations, setPresentations] = useState<Presentation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // form state
  const [itemName, setItemName] = useState("");
  const [reason, setReason] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [selfAmount, setSelfAmount] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const requestAmount =
    totalAmount && selfAmount
      ? Math.max(0, Number(totalAmount) - Number(selfAmount))
      : 0;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetch("/api/presentations").then(r => r.json());
      setPresentations(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleCreate() {
    if (!itemName || !reason || !totalAmount) return;
    setSaving(true);
    try {
      await fetch("/api/presentations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemName,
          reason,
          totalAmount: Number(totalAmount),
          selfAmount: Number(selfAmount || 0),
          requestAmount,
          imageUrl,
        }),
      });
      setItemName(""); setReason(""); setTotalAmount(""); setSelfAmount(""); setImageUrl(null);
      setShowForm(false);
      fetchData();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("この申請を取り消しますか？")) return;
    await fetch(`/api/presentations/${id}`, { method: "DELETE" });
    fetchData();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">おねだりプレゼン</h1>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          申請
        </button>
      </div>

      <p className="text-sm text-gray-500">
        高額なものは、理由と「自分で出す額」を添えて親に交渉しよう。承認されると補助額がお小遣いに入るよ。
      </p>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      ) : presentations.length === 0 ? (
        <div className="text-center text-gray-400 py-12">まだ申請はありません</div>
      ) : (
        <div className="space-y-3">
          {presentations.map(p => (
            <div key={p.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {p.imageUrl && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={p.imageUrl} alt={p.itemName} className="w-full h-36 object-cover" />
              )}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-gray-800">{p.itemName}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${STATUS_COLORS[p.status]}`}>
                    {STATUS_LABELS[p.status]}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1.5">{p.reason}</p>

                <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                  <div className="bg-gray-50 rounded-lg p-2">
                    <div className="text-xs text-gray-400">総額</div>
                    <div className="text-sm font-bold text-gray-700">{formatJPY(p.totalAmount)}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2">
                    <div className="text-xs text-gray-400">自分で</div>
                    <div className="text-sm font-bold text-gray-700">{formatJPY(p.selfAmount)}</div>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-2">
                    <div className="text-xs text-blue-500">おねだり</div>
                    <div className="text-sm font-bold text-blue-700">{formatJPY(p.requestAmount)}</div>
                  </div>
                </div>

                {p.parentMessage && (
                  <div className="mt-3 p-3 bg-yellow-50 rounded-lg">
                    <div className="text-xs font-medium text-yellow-600 mb-0.5">親からのメッセージ</div>
                    <p className="text-sm text-yellow-800">{p.parentMessage}</p>
                  </div>
                )}

                {p.status === "PENDING" && (
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="mt-3 text-xs text-gray-400 hover:text-red-500"
                  >
                    申請を取り消す
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 申請フォーム */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white">
              <h2 className="text-lg font-bold">おねだりプレゼン申請</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <ImageUpload value={imageUrl} onChange={setImageUrl} />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ほしいもの *</label>
                <input
                  type="text"
                  value={itemName}
                  onChange={e => setItemName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例：英語の参考書"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">なぜ欲しいのか（理由）*</label>
                <textarea
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例：テストで良い点を取りたいから。毎日使う予定。"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">総額（円）*</label>
                  <input
                    type="number"
                    value={totalAmount}
                    onChange={e => setTotalAmount(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="10000"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">自分で出す額</label>
                  <input
                    type="number"
                    value={selfAmount}
                    onChange={e => setSelfAmount(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="4000"
                    min="0"
                  />
                </div>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <span className="text-sm text-blue-600">親におねだりする額: </span>
                <span className="font-bold text-blue-800">{formatJPY(requestAmount)}</span>
              </div>
              <button
                onClick={handleCreate}
                disabled={saving || !itemName || !reason || !totalAmount}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {saving ? "送信中..." : "親に申請する"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
