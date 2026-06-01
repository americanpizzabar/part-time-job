"use client";

import { useState, useEffect, useCallback } from "react";
import { formatJPY, currentMonthRange } from "@/lib/dateUtils";
import { STATUS_LABELS, STATUS_COLORS, needsWantsFeedback } from "@/lib/budget";
import NeedsWantsPie from "@/components/NeedsWantsPie";
import MissionManager from "@/components/MissionManager";
import { useRole } from "@/lib/useRole";

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
}

interface LunchRecord {
  id: number;
  date: string;
  amount: number;
  memo: string | null;
  imageUrl: string | null;
}

export default function ParentPage() {
  const [balance, setBalance] = useState<Balance | null>(null);
  const [presentations, setPresentations] = useState<Presentation[]>([]);
  const [lunches, setLunches] = useState<LunchRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState<Presentation | null>(null);
  const [message, setMessage] = useState("");
  const { role, mounted } = useRole();

  const { start, end } = currentMonthRange();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [b, p, l] = await Promise.all([
        fetch(`/api/balance?monthStart=${start}&monthEnd=${end}`).then(r => r.json()),
        fetch("/api/presentations").then(r => r.json()),
        fetch(`/api/transactions?category=昼食&startDate=${start}&endDate=${end}`).then(r => r.json()),
      ]);
      setBalance(b);
      setPresentations(p);
      setLunches((l as LunchRecord[]).filter(t => t.imageUrl));
    } finally {
      setLoading(false);
    }
  }, [start, end]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function respond(p: Presentation, status: string) {
    await fetch(`/api/presentations/${p.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, parentMessage: message || undefined }),
    });
    setResponding(null);
    setMessage("");
    fetchData();
  }

  const pending = presentations.filter(p => p.status === "PENDING" || p.status === "HOLD");

  if (mounted && role === "CHILD") {
    return (
      <div className="text-center text-gray-400 py-16 space-y-2">
        <div className="text-4xl">🔒</div>
        <p className="text-sm">この画面は親専用です。</p>
        <p className="text-xs">設定で利用者を「親」に切り替えると表示されます。</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">親ビュー</h1>
        <p className="text-sm text-gray-500 mt-1">
          お子さんのプライバシーに配慮し、表示は残高・総額・割合のみです。
          個別の購入履歴（非公開設定分）は表示されません。
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* 残高サマリー */}
          {balance && (
            <>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
                  <div className="text-xs text-gray-500">財布残高</div>
                  <div className="text-base font-bold text-gray-800 mt-0.5">{formatJPY(balance.wallet)}</div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
                  <div className="text-xs text-gray-500">今月の支出</div>
                  <div className="text-base font-bold text-red-500 mt-0.5">{formatJPY(balance.month.expense)}</div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
                  <div className="text-xs text-gray-500">貯金中</div>
                  <div className="text-base font-bold text-indigo-600 mt-0.5">{formatJPY(balance.saved)}</div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h3 className="font-bold text-gray-800 mb-4">今月のNeeds / Wants</h3>
                <NeedsWantsPie
                  needs={balance.month.needs}
                  wants={balance.month.wants}
                  needsRatio={balance.month.needsRatio}
                  wantsRatio={balance.month.wantsRatio}
                />
                <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
                  💡 {needsWantsFeedback(balance.month.needsRatio, balance.month.wantsRatio, balance.month.total)}
                </div>
              </div>
            </>
          )}

          {/* 昼食の記録 */}
          <div>
            <h2 className="font-bold text-gray-800 mb-2">今月の昼食</h2>
            {lunches.length === 0 ? (
              <div className="text-center text-gray-400 py-8 bg-white rounded-xl border border-gray-200">
                写真付きの昼食記録はありません
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {lunches.map(l => (
                  <div key={l.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={l.imageUrl!} alt="昼食" className="w-full h-28 object-cover" />
                    <div className="p-2">
                      <div className="text-xs text-gray-500">{l.date}</div>
                      <div className="text-sm font-bold text-gray-700">{formatJPY(l.amount)}</div>
                      {l.memo && <div className="text-xs text-gray-400 truncate">{l.memo}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* シークレット・ミッション */}
          <MissionManager />

          {/* おねだり承認 */}
          <div>
            <h2 className="font-bold text-gray-800 mb-2">
              おねだりプレゼン
              {pending.length > 0 && (
                <span className="ml-2 text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">{pending.length}</span>
              )}
            </h2>
            {presentations.length === 0 ? (
              <div className="text-center text-gray-400 py-8 bg-white rounded-xl border border-gray-200">
                申請はありません
              </div>
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
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[p.status]}`}>
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
                          <div className="text-xs text-gray-400">本人負担</div>
                          <div className="text-sm font-bold text-gray-700">{formatJPY(p.selfAmount)}</div>
                        </div>
                        <div className="bg-blue-50 rounded-lg p-2">
                          <div className="text-xs text-blue-500">補助希望</div>
                          <div className="text-sm font-bold text-blue-700">{formatJPY(p.requestAmount)}</div>
                        </div>
                      </div>

                      {p.parentMessage && (
                        <div className="mt-3 p-3 bg-yellow-50 rounded-lg text-sm text-yellow-800">
                          {p.parentMessage}
                        </div>
                      )}

                      {responding?.id === p.id ? (
                        <div className="mt-3 space-y-2">
                          <textarea
                            value={message}
                            onChange={e => setMessage(e.target.value)}
                            rows={2}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="応援メッセージやアドバイス（任意）"
                          />
                          <div className="flex gap-2">
                            <button onClick={() => respond(p, "APPROVED")} className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700">承認</button>
                            <button onClick={() => respond(p, "HOLD")} className="flex-1 bg-yellow-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-yellow-600">保留</button>
                            <button onClick={() => respond(p, "REJECTED")} className="flex-1 bg-red-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-red-600">却下</button>
                          </div>
                          <button onClick={() => { setResponding(null); setMessage(""); }} className="w-full text-xs text-gray-400 py-1">キャンセル</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setResponding(p); setMessage(p.parentMessage ?? ""); }}
                          className="mt-3 w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
                        >
                          {p.status === "PENDING" ? "返信する" : "ステータスを変更"}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
