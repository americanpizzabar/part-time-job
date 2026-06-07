"use client";

import { useState, useEffect, useCallback } from "react";
import { formatJPY } from "@/lib/dateUtils";

type Range = "1y" | "3y" | "all";

interface AssetItem {
  key?: string;
  category?: string; // API returns this field name
  color?: string;    // API provides a ready color
  emoji?: string;
  label?: string;
  total?: number;
  pct?: number;
}
interface MercariItem {
  date?: string;
  itemName?: string;
  amount?: number;
}
interface GenreAccuracy {
  genre?: string;
  label?: string;
  total?: number;
  correct?: number;
  accuracy?: number;
}
interface PortfolioData {
  assetBreakdown?: AssetItem[];
  mercari?: { total?: number; count?: number; items?: MercariItem[] };
  quizAccuracy?: {
    perGenre?: GenreAccuracy[];
    overall?: { total?: number; correct?: number; accuracy?: number };
  };
  summary?: {
    totalIncome?: number;
    totalExpense?: number;
    needsTotal?: number;
    wantsTotal?: number;
    needsRatio?: number;
    wantsTotal2?: number;
    period?: { from?: string; to?: string };
  };
}

const RANGE_OPTIONS: { key: Range; label: string }[] = [
  { key: "1y", label: "1年" },
  { key: "3y", label: "3年" },
  { key: "all", label: "すべて" },
];

// Color map keyed by asset key OR label (defensive).
const ASSET_COLORS: Record<string, string> = {
  STEM: "#38bdf8",
  ART_CULTURE: "#f472b6",
  HEALTH_SOCIAL: "#34d399",
};

function colorForAsset(item: AssetItem, index: number): string {
  const fallbacks = ["#38bdf8", "#f472b6", "#34d399", "#a78bfa", "#fb923c"];
  if (item.color) return item.color; // API provides a ready color
  const k = (item.key ?? item.category ?? "").toUpperCase();
  if (ASSET_COLORS[k]) return ASSET_COLORS[k];
  const label = item.label ?? "";
  if (label.includes("STEM")) return ASSET_COLORS.STEM;
  if (label.includes("ART") || label.includes("文化") || label.includes("芸術")) return ASSET_COLORS.ART_CULTURE;
  if (label.includes("HEALTH") || label.includes("健康") || label.includes("社会")) return ASSET_COLORS.HEALTH_SOCIAL;
  return fallbacks[index % fallbacks.length];
}

function fmtDate(s?: string): string {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

export default function PortfolioPage() {
  const [range, setRange] = useState<Range>("1y");
  const [data, setData] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/portfolio?range=${range}`);
      const json = await res.json();
      setData(json);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function downloadCsv() {
    window.location.href = `/api/export/csv?range=${range}`;
  }

  const summary = data?.summary ?? {};
  const assets = data?.assetBreakdown ?? [];
  const mercari = data?.mercari ?? {};
  const quiz = data?.quizAccuracy ?? {};
  const overall = quiz.overall ?? {};
  const perGenre = quiz.perGenre ?? [];

  const needsRatio = summary.needsRatio ?? 0;
  const topAsset =
    assets.length > 0
      ? [...assets].sort((a, b) => (b.total ?? 0) - (a.total ?? 0))[0]
      : null;
  const topAssetLabel = topAsset?.label ?? topAsset?.key ?? "—";

  const maxAssetPct = Math.max(1, ...assets.map((a) => a.pct ?? 0));
  const maxGenreAcc = 100;

  const hasData =
    assets.length > 0 ||
    (mercari.total ?? 0) > 0 ||
    perGenre.length > 0 ||
    (summary.totalIncome ?? 0) > 0;

  return (
    <div className="space-y-4 pb-24">
      {/* Controls (hidden when printing) */}
      <div className="print:hidden space-y-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">未来へのポートフォリオ</h1>
          <p className="text-sm text-gray-500 mt-1">
            総合型選抜(AO)に添付できる、自己管理・自己投資の記録レポート。
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setRange(opt.key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-colors ${
                  range === opt.key
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-gray-500"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="flex-1" />
          <button
            onClick={() => window.print()}
            className="bg-indigo-600 text-white rounded-xl px-4 py-2 text-sm font-bold active:scale-95 transition-transform"
          >
            🖨️ PDFで保存
          </button>
          <button
            onClick={downloadCsv}
            className="bg-emerald-600 text-white rounded-xl px-4 py-2 text-sm font-bold active:scale-95 transition-transform"
          >
            ⬇️ CSVをダウンロード
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      ) : !hasData ? (
        <div className="text-center text-gray-400 py-16 bg-white rounded-2xl">
          <div className="text-4xl mb-2">📭</div>
          <p className="text-sm">この期間の記録はまだありません。</p>
          <p className="text-xs mt-1">活動を続けると、ここにポートフォリオが生成されます。</p>
        </div>
      ) : (
        /* ===== Printable report ===== */
        <div className="report bg-white text-gray-800 rounded-2xl shadow-sm print:shadow-none print:rounded-none p-6 sm:p-8 space-y-8 print:p-0">
          {/* Title header */}
          <header className="text-center border-b border-gray-200 pb-5">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
              未来へのポートフォリオ
            </h2>
            <p className="text-sm text-gray-500 mt-1">〜自己管理・自己投資の記録〜</p>
            <p className="text-xs text-gray-400 mt-2">
              対象期間: {fmtDate(summary.period?.from)} 〜 {fmtDate(summary.period?.to)}
            </p>
          </header>

          {/* サマリー */}
          <section>
            <h3 className="text-base font-bold mb-3 flex items-center gap-2">
              <span>📊</span>サマリー
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <SummaryCell label="総収入" value={formatJPY(summary.totalIncome ?? 0)} tone="text-emerald-600" />
              <SummaryCell label="総支出" value={formatJPY(summary.totalExpense ?? 0)} tone="text-red-500" />
              <SummaryCell label="NEEDS(自己投資)合計" value={formatJPY(summary.needsTotal ?? 0)} tone="text-indigo-600" />
              <SummaryCell label="WANTS合計" value={formatJPY(summary.wantsTotal ?? 0)} tone="text-gray-700" />
              <SummaryCell label="NEEDS比率" value={`${Math.round(needsRatio)}%`} tone="text-indigo-600" />
            </div>
          </section>

          {/* 自己投資の内訳 */}
          <section>
            <h3 className="text-base font-bold mb-3 flex items-center gap-2">
              <span>🎯</span>自己投資の内訳
            </h3>
            {assets.length === 0 ? (
              <p className="text-sm text-gray-400">データがありません。</p>
            ) : (
              <div className="space-y-3">
                {assets.map((a, i) => {
                  const color = colorForAsset(a, i);
                  const pct = a.pct ?? 0;
                  return (
                    <div key={a.key ?? a.label ?? i}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="font-medium">{a.label ?? a.key ?? "—"}</span>
                        <span className="text-gray-500">
                          {formatJPY(a.total ?? 0)}
                          <span className="ml-2 text-xs text-gray-400">{Math.round(pct)}%</span>
                        </span>
                      </div>
                      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.min(100, (pct / maxAssetPct) * 100)}%`,
                            backgroundColor: color,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* メルカリ商取引実績 */}
          <section>
            <h3 className="text-base font-bold mb-3 flex items-center gap-2">
              <span>🛍️</span>メルカリ商取引実績
            </h3>
            <div className="flex gap-3 mb-3">
              <div className="flex-1 bg-gray-50 rounded-xl p-3 text-center print:border print:border-gray-200">
                <div className="text-xs text-gray-500">累計売上</div>
                <div className="text-lg font-bold text-emerald-600 mt-0.5">{formatJPY(mercari.total ?? 0)}</div>
              </div>
              <div className="flex-1 bg-gray-50 rounded-xl p-3 text-center print:border print:border-gray-200">
                <div className="text-xs text-gray-500">取引件数</div>
                <div className="text-lg font-bold text-gray-700 mt-0.5">{mercari.count ?? 0}件</div>
              </div>
            </div>
            {(mercari.items ?? []).length > 0 && (
              <ul className="divide-y divide-gray-100 text-sm">
                {(mercari.items ?? []).slice(0, 8).map((it, i) => (
                  <li key={i} className="flex items-center justify-between py-1.5">
                    <span className="text-gray-700 truncate mr-2">{it.itemName ?? "—"}</span>
                    <span className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-xs text-gray-400">{fmtDate(it.date)}</span>
                      <span className="font-medium text-emerald-600">{formatJPY(it.amount ?? 0)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* 時事問題の正答率 */}
          <section>
            <h3 className="text-base font-bold mb-3 flex items-center gap-2">
              <span>🧠</span>時事問題の正答率
            </h3>
            {perGenre.length === 0 ? (
              <p className="text-sm text-gray-400">データがありません。</p>
            ) : (
              <div className="space-y-3">
                {perGenre.map((g, i) => {
                  const acc = g.accuracy ?? 0;
                  return (
                    <div key={g.genre ?? g.label ?? i}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="font-medium">{g.label ?? g.genre ?? "—"}</span>
                        <span className="text-gray-500">
                          {Math.round(acc)}%
                          <span className="ml-2 text-xs text-gray-400">
                            {g.correct ?? 0}/{g.total ?? 0}
                          </span>
                        </span>
                      </div>
                      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-indigo-500"
                          style={{ width: `${Math.min(100, (acc / maxGenreAcc) * 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                <div className="mt-3 rounded-xl bg-indigo-50 px-4 py-3 text-center print:border print:border-indigo-200">
                  <div className="text-xs text-indigo-500">総合正答率</div>
                  <div className="text-3xl font-bold text-indigo-600">{Math.round(overall.accuracy ?? 0)}%</div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {overall.correct ?? 0} / {overall.total ?? 0} 問正解
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* 自己PR文例 */}
          <section className="border-t border-gray-200 pt-5">
            <h3 className="text-base font-bold mb-2 flex items-center gap-2">
              <span>✍️</span>自己PR文例
            </h3>
            <p className="text-sm leading-relaxed text-gray-700">
              私は中学時代、フリマアプリで不要品を販売して累計{formatJPY(mercari.total ?? 0)}を自分で稼ぎ、
              その資金を含め自己投資(NEEDS)に全支出の{Math.round(needsRatio)}%を配分してきました。
              特に{topAssetLabel}分野へ重点的に投資し、時事・経済の学習でも正答率{Math.round(overall.accuracy ?? 0)}%を達成しました。
            </p>
          </section>

          <footer className="text-center text-[10px] text-gray-300 pt-2">
            このレポートはアプリの記録データから自動生成されました。
          </footer>
        </div>
      )}
    </div>
  );
}

function SummaryCell({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="bg-gray-50 rounded-xl p-3 print:border print:border-gray-200">
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`text-base font-bold mt-0.5 ${tone}`}>{value}</div>
    </div>
  );
}
