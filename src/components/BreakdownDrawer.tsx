"use client";

import { formatJPY } from "@/lib/dateUtils";

export interface BreakdownRow {
  id: number | string;
  date: string;
  label: string;
  sublabel?: string;
  amount: number;
  positive: boolean;
}

interface Props {
  title: string;
  note?: string;
  total: number;
  totalPositive?: boolean;
  rows: BreakdownRow[];
  loading: boolean;
  onClose: () => void;
}

export default function BreakdownDrawer({ title, note, total, totalPositive = true, rows, loading, onClose }: Props) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-end justify-center z-50" onClick={onClose}>
      <div
        className="w-full max-w-md bg-white rounded-t-2xl shadow-xl max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-gray-800">{title}</h3>
            {note && <p className="text-xs text-gray-400 mt-0.5">{note}</p>}
          </div>
          <div className={`text-lg font-bold ${totalPositive ? "text-gray-800" : "text-red-500"}`}>
            {totalPositive ? "" : "-"}{formatJPY(Math.abs(total))}
          </div>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-3">
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="w-7 h-7 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            </div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">データがありません</p>
          ) : (
            <div className="space-y-0 divide-y divide-gray-50">
              {rows.map(row => (
                <div key={row.id} className="flex items-center gap-3 py-2.5">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-800 truncate">{row.label}</div>
                    <div className="text-xs text-gray-400">{row.date}{row.sublabel ? ` · ${row.sublabel}` : ""}</div>
                  </div>
                  <div className={`text-sm font-bold flex-shrink-0 ${row.positive ? "text-blue-600" : "text-red-500"}`}>
                    {row.positive ? "+" : "-"}{formatJPY(row.amount)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-5 pb-5 pt-2 border-t border-gray-100">
          <button
            onClick={onClose}
            className="w-full bg-gray-100 text-gray-700 rounded-xl py-2.5 font-semibold text-sm"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
